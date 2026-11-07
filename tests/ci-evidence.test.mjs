/* SPDX-License-Identifier: Apache-2.0 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync,unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve,join,dirname } from 'node:path';
import { execFileSync,spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const tool=resolve(dirname(fileURLToPath(import.meta.url)),'../scripts/ci/evidence-receipt.mjs');
const git=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'scct-evidence-'));
 git(root,'init','-q');
 writeFileSync(join(root,'README.md'),'source');
 git(root,'add','.');
 git(root,'-c','user.name=SCCT','-c','user.email=ci@example.invalid','commit','-qm','fixture');
 const sha=git(root,'rev-parse','HEAD');
 const verdict={
  schema:'software-constitution.scct-verdict.v1',commit_sha:sha,
  source_clean_at_entry:true,level:'L2',required_level:'L2',ok:true,
  checks:{gate_enforced:{'blocking-ci-contract':{ok:true}}}
 };
 for(let i=1;i<=6;i++){
  verdict.checks.gate_enforced['RULE-'+i]={ok:true};
  verdict.checks.gate_enforced['RULE-'+i+'-negative-probe']={ok:true};
 }
 verdict.checks.gate_enforced['challenge-manifest-schema']={ok:true};
 return {root,sha,verdict};
}
function validate(f,options={}){
 const env={...process.env,GITHUB_REPOSITORY:'Software-Constitution/spec',
  GITHUB_SHA:f.sha,GITHUB_RUN_ID:'90001',GITHUB_RUN_ATTEMPT:'1',
  SCCT_PREVIOUS_JOB_STATUS:'success',...(options.env||{})};
 writeFileSync(join(f.root,'scct-verdict.json'),
  JSON.stringify(Object.hasOwn(options,'verdict')?options.verdict:f.verdict));
 const p=spawnSync(process.execPath,[tool],{cwd:f.root,env,encoding:'utf8'});
 const result=JSON.parse(readFileSync(join(f.root,'ci-evidence.json'),'utf8'));
 unlinkSync(join(f.root,'ci-evidence.json'));
 return {status:p.status,receipt:result};
}
test('CI evidence requires exact SHA, six gates, clean source and prior success',()=>{
 const f=fixture();
 try{
  const good=validate(f);
  assert.equal(good.status,0);
  assert.equal(good.receipt.status,'PASS_LOCAL_L2');
  assert.equal(good.receipt.commit_sha,f.sha);
  assert.equal(good.receipt.authenticated_external_signer,false);
  assert.equal(validate(f,{env:{GITHUB_SHA:'0'.repeat(40)}}).receipt.status,'HELD');
  assert.equal(validate(f,{env:{SCCT_PREVIOUS_JOB_STATUS:'failure'}}).status,1);
  // Codex P2: valid JSON primitive is NOT valid conformance evidence.
  for(const primitive of [null,false,0,'',[]]){
    const r=validate(f,{verdict:primitive});
    assert.equal(r.status,1,'primitive JSON cannot certify');
    assert.equal(r.receipt.status,'HELD');
    assert.ok(r.receipt.findings.includes('SCCT_VERDICT_NOT_OBJECT'));
  }
  const bad=structuredClone(f.verdict);
  bad.checks.gate_enforced['RULE-4'].ok=false;
  assert.equal(validate(f,{verdict:bad}).receipt.status,'HELD');
  const replay=structuredClone(f.verdict);replay.commit_sha='0'.repeat(40);
  assert.equal(validate(f,{verdict:replay}).status,1);
  writeFileSync(join(f.root,'README.md'),'changed tracked source');
  assert.equal(validate(f).receipt.status,'HELD','dirty tracked input must not certify');
 } finally{rmSync(f.root,{recursive:true,force:true});}
});
