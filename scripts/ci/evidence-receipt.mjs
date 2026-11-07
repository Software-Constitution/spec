#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
// GitHub Actions source-bound L2 receipt, not an independently signed L3 proof.
// No release side effects, secrets, webhook, remote calls or privileged token.
import { existsSync, readFileSync, writeFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root=process.cwd();
const input=resolve(root,'scct-verdict.json'),output=resolve(root,'ci-evidence.json');
const errors=[];
const sha=value=>createHash('sha256').update(value).digest('hex');
function command(args){
  const r=spawnSync('git',args,{cwd:root,encoding:'utf8',timeout:12000});
  if(r.status!==0){errors.push('GIT_PROOF_UNAVAILABLE');return null}
  return r.stdout.trim();
}
const head=command(['rev-parse','HEAD']);
const expected=process.env.GITHUB_SHA||'';
const run=process.env.GITHUB_RUN_ID||'';
const attempt=process.env.GITHUB_RUN_ATTEMPT||'';
const repo=process.env.GITHUB_REPOSITORY||'';
const previous=process.env.SCCT_PREVIOUS_JOB_STATUS||'';
if(!/^[0-9a-f]{40}$/.test(head||'')||expected!==head)errors.push('HEAD_NOT_BOUND_TO_GITHUB_SHA');
if(repo!=='Software-Constitution/spec')errors.push('WRONG_REPOSITORY');
if(!/^[1-9]\d*$/.test(run)||!/^[1-9]\d*$/.test(attempt))errors.push('RUN_ID_UNVERIFIED');
if(previous!=='success')errors.push('PREVIOUS_GATES_NOT_SUCCESS');
const tracked=command(['diff','--name-only','HEAD','--']);
const staged=command(['diff','--cached','--name-only']);
const extra=command(['ls-files','--others','--exclude-standard']);
if(tracked||staged||extra===null||
  (extra&&extra.split(/\r?\n/).some(name=>name!=='scct-verdict.json')))errors.push('EVALUATED_TREE_NOT_CLEAN');
let verdict=null,bytes=null;
try{
  if(!existsSync(input)||!lstatSync(input).isFile())throw Error('missing regular verdict file');
  bytes=readFileSync(input);
  verdict=JSON.parse(bytes.toString('utf8'));
}catch{errors.push('MISSING_OR_INVALID_SCCT_VERDICT')}
if(!verdict||typeof verdict!=='object'||Array.isArray(verdict)){
  errors.push('SCCT_VERDICT_NOT_OBJECT');
}else{
  if(verdict.schema!=='software-constitution.scct-verdict.v1'||
    verdict.commit_sha!==head||verdict.source_clean_at_entry!==true||
    verdict.level!=='L2'||verdict.required_level!=='L2'||verdict.ok!==true)
    errors.push('VERDICT_NOT_BOUND_TO_CLEAN_L2_SOURCE');
  const gates=verdict.checks?.gate_enforced;
  for(let i=1;i<=6;i++){
    if(gates?.['RULE-'+i]?.ok!==true)errors.push('MISSING_RULE_'+i);
    if(gates?.['RULE-'+i+'-negative-probe']?.ok!==true)
      errors.push('MISSING_NEGATIVE_CHALLENGE_'+i);
  }
  if(gates?.['challenge-manifest-schema']?.ok!==true)
    errors.push('GATE_CHALLENGE_SCHEMA_UNVERIFIED');
  if(gates?.['blocking-ci-contract']?.ok!==true)errors.push('MISSING_BLOCKING_CI_DECLARATION');
}
const receipt={
  schema:'software-constitution.ci-evidence.v1',
  repository:repo,
  commit_sha:head,
  github_sha:expected,
  run_id:run,
  run_attempt:attempt,
  verdict_sha256:bytes?sha(bytes):null,
  status:errors.length?'HELD':'PASS_LOCAL_L2',
  authenticated_external_signer:false,
  merge_protection_verified:false,
  source:'github-actions-conformance-job',
  findings:errors
};
writeFileSync(output,JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({schema:receipt.schema,commit_sha:receipt.commit_sha,
  run_id:receipt.run_id,status:receipt.status,findings:receipt.findings}));
if(errors.length)process.exitCode=1;
