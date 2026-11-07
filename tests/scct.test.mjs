/* SPDX-License-Identifier: Apache-2.0 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function put(root,p,content) { const x=join(root,p); mkdirSync(dirname(x),{recursive:true}); writeFileSync(x,content); }
function fixture() {
 const root=mkdtempSync(join(tmpdir(),'scct-test-'));
 put(root,'constitution/00-INDEX.md','Zero Competing Systems\nZero Repo-Prod Drift\nZero Stubs\nSelf-Governance\nZero-Deviation\nCoherent Integration\n');
 put(root,'constitution/01-TEST.md','# Test rail');
 put(root,'constitution/DEVIATIONS.md','## Active deviations\n\n_(none)_\n## Historical\n');
 put(root,'constitution/DECAY-WINDOWS.md','## Active decay windows\n');
 mkdirSync(join(root,'schemas'),{recursive:true});
 copyFileSync(join(repo,'schemas/software-constitution-implementation-registry.v1.json'),join(root,'schemas/software-constitution-implementation-registry.v1.json'));
 put(root,'implementation/registry.json',JSON.stringify({schema:'software-constitution.implementation_registry.v1',version:'1.0',concepts:[{concept_id:'test.capability',name:'Test capability',ssot_module:'scripts/gates/one.mjs'}]}));
 for(let i=1;i<=6;i++) put(root,'scripts/gates/'+i+'.mjs', 'process.exit(0);\n');
 put(root,'scripts/gates/one.mjs','process.exit(0);\n');
 put(root,'constitution/gates.json',JSON.stringify({gates:Array.from({length:6},(_,i)=>({rule:'RULE-'+(i+1),argv:['node','scripts/gates/'+(i+1)+'.mjs']}))}));
 put(root,'.github/workflows/ci.yml','on:\n  pull_request:\njobs:\n  check:\n    steps:\n      - run: node scct/scct.mjs . --require-level=L2\n');
 return root;
}
function run(root,requireLevel='L2',options=[]) {
 const p=spawnSync('node',[join(repo,'scct/scct.mjs'),root,'--require-level='+requireLevel,...options],{encoding:'utf8'});
 assert.ok(p.stdout,'CLI emits JSON');
 return {code:p.status, verdict:JSON.parse(p.stdout),stderr:p.stderr};
}
test('fail closed: L0 on missing constitution',()=>{
 const root=mkdtempSync(join(tmpdir(),'scct-empty-'));
 try { const r=run(root); assert.equal(r.code,1); assert.equal(r.verdict.level,'L0'); } finally {rmSync(root,{recursive:true,force:true});}
});
test('six executable gates are required and all run',()=>{
 const root=fixture();
 try {
  assert.equal(run(root,'L2').code,0);
  assert.equal(run(root,'L3').code,1);
  assert.equal(run(root,'L4').code,1);
  put(root,'scripts/gates/6.mjs','process.exit(1);\n');
  const fail=run(root);
  assert.equal(fail.code,1);assert.equal(fail.verdict.level,'L1');assert.equal(fail.verdict.checks.gate_enforced['RULE-6'].ok,false);
 } finally { rmSync(root,{recursive:true,force:true}); }
});
test('missing one gate is a hard failure',()=>{
 const root=fixture();
 try{
  put(root,'constitution/gates.json', JSON.stringify({gates:Array.from({length:5},(_,i)=>({rule:'RULE-'+(i+1),argv:['node','scripts/gates/'+(i+1)+'.mjs']}))}));
  assert.equal(run(root).code,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('invalid schema and duplicate capability IDs are blocked',()=>{
 const root=fixture();
 try{
   put(root,'implementation/registry.json',JSON.stringify({schema:'software-constitution.implementation_registry.v1',version:'1.0',concepts:[
    {concept_id:'duplicate',name:'Test one',ssot_module:'scripts/gates/one.mjs'},
    {concept_id:'duplicate',name:'Test two',ssot_module:'scripts/gates/one.mjs'}]}));
   const v=run(root);
   assert.equal(v.code,1);assert.equal(v.verdict.level,'L0');
 } finally {rmSync(root,{recursive:true,force:true});}
});
test('active deviation blocks L1 and above',()=>{
 const root=fixture();
 try{
   put(root,'constitution/DEVIATIONS.md','## Active deviations\n### Unapproved\n## Historical\n');
   assert.equal(run(root,'L1').code,1);
 }finally {rmSync(root,{recursive:true,force:true});}
});
test('empty kit manifest does not pass',()=>{
 const root=mkdtempSync(join(tmpdir(),'scct-kit-'));
 try{
  put(root,'constitution-kit.json',JSON.stringify({project:'Test',constitution_dir:'constitution',registries:[],single_value_concepts:[]}));
  mkdirSync(join(root,'scripts/constitution/lib'),{recursive:true});
  const entry=join(repo,'kit/run.mjs');
  const kit=spawnSync('node',[entry],{cwd:root,encoding:'utf8'});
  // The kit entry locates the manifest by its own path; exercise exported engine directly instead.
  const testCode='import {runAll} from '+JSON.stringify('file://'+join(repo,'kit/lib/gate-runner.mjs'))+'; const r=await runAll('+JSON.stringify(join(root,'constitution-kit.json'))+');process.exit(r.ok?0:1);';
  const p=spawnSync('node',['--input-type=module','-e',testCode],{encoding:'utf8'});
  assert.equal(p.status,1);
 } finally {rmSync(root,{recursive:true,force:true});}
});


test('L3 requires canonical out-of-tree trust and an immutable evaluated HEAD',()=>{
 const root=fixture();
 const ext=mkdtempSync(join(tmpdir(),'scct-trust-'));
 try{
   const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
   git('init','-q');
   git('add','.');
   git('-c','user.name=Conformance Test','-c','user.email=tests@example.invalid','commit','-qm','locked test fixture');
   const head=git('rev-parse','HEAD');
   const {publicKey,privateKey}=generateKeyPairSync('ed25519');
   const trust=join(ext,'authority.pem');
   writeFileSync(trust,publicKey.export({type:'spki',format:'pem'}));
   const event={type:'scct.conformance',decision:'pass',commit_sha:head,prev_hash:'GENESIS'};
   const hashed={...event,hash:createHash('sha256').update(JSON.stringify(event)).digest('hex')};
   const a={commit_sha:head,events:[hashed]};
   a.signature=sign(null,Buffer.from(JSON.stringify({commit_sha:a.commit_sha,events:a.events})),privateKey).toString('base64');
   const attestation=join(ext,'attestation.json');
   writeFileSync(attestation,JSON.stringify(a));
   const opts=['--attestation='+attestation,'--trusted-key='+trust];
   const good=run(root,'L3',opts);
   assert.equal(good.code,0,JSON.stringify(good.verdict.findings));
   assert.equal(good.verdict.level,'L3');
   // Codex P1 regression: uncommitted gate launders its own modification by
   // restoring HEAD before SCCT reaches the old L3 preflight location.
   put(root,'scripts/gates/1.mjs',
     "const {execFileSync}=require('node:child_process');"+
     "execFileSync('git',['checkout','HEAD','--','scripts/gates/1.mjs']);"+
     "process.exit(0);\n");
   const laundering=run(root,'L3',opts);
   assert.equal(laundering.code,1,'must reject dirty entry even when gate restores HEAD');
   assert.equal(laundering.verdict.level,'L2');
   assert.equal(git('status','--porcelain'),'','gate actually restored committed content');
   put(root,'README.md','uncommitted payload\n');
   const dirty=run(root,'L3',opts);
   assert.equal(dirty.code,1);
   assert.equal(dirty.verdict.level,'L2');
   rmSync(join(root,'README.md'));
   symlinkSync(trust,join(root,'authority-alias.pem'));
   const badAlias=run(root,'L3',['--attestation='+attestation,
       '--trusted-key='+join(root,'..',basename(root),'authority-alias.pem')]);
   assert.equal(badAlias.code,1);
   assert.equal(badAlias.verdict.level,'L2');
 } finally {
   rmSync(root,{recursive:true,force:true});
   rmSync(ext,{recursive:true,force:true});
 }
});

test('plain-text deviation, duplicate section and symlinked SSOT are all denied at T0',()=>{
 const root=fixture(), external=mkdtempSync(join(tmpdir(),'scct-foreign-'));
 try {
  assert.equal(run(root,'L1').code,0);
  for (const bad of [
    '## Active deviations\nTemporary exception allowed by operator\n## Historical\n',
    '## Active deviations\n_(none)_\n## Active deviations\n_(none)_\n'
  ]) {
    put(root,'constitution/DEVIATIONS.md',bad.replaceAll('\\n','\n'));
    assert.equal(run(root,'L1').code,1,'unstructured/duplicate deviations fail');
  }
  put(root,'constitution/DEVIATIONS.md','## Active deviations\n_(none)_\n## Historical\n');
  const owned=join(root,'scripts/gates/one.mjs');
  rmSync(owned);
  put(external,'foreign.mjs','process.exit(0);');
  symlinkSync(join(external,'foreign.mjs'),owned);
  const invalid=run(root,'L1');
  assert.equal(invalid.code,1,'external symlink cannot become canonical SSOT');
 } finally {rmSync(root,{recursive:true,force:true});rmSync(external,{recursive:true,force:true});}
});
