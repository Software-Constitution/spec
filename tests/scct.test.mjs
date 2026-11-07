/* SPDX-License-Identifier: Apache-2.0 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
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
function run(root,requireLevel='L2') {
 const p=spawnSync('node',[join(repo,'scct/scct.mjs'),root,'--require-level='+requireLevel],{encoding:'utf8'});
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
