/* SPDX-License-Identifier: Apache-2.0 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const src=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const paths=['implementation/registry.json','constitution/deployment-scope.json','constitution/event-registry.json','constitution/DEVIATIONS.md','scct/scct.mjs','kit/lib/gate-runner.mjs','kit/run.mjs','gates/zero-deviation-mandate.mjs','gates/zero-deviation-mandate.py','scripts/gates/constitutional-gate.mjs'];
function fixture(){
  const d=mkdtempSync(join(tmpdir(),'scs-gates-'));
  for (const p of paths) {
    mkdirSync(dirname(join(d,p)),{recursive:true});
    copyFileSync(join(src,p),join(d,p));
  }
  return d;
}
function alter(d,p,f){ const a=join(d,p);writeFileSync(a,f(readFileSync(a,'utf8'))); }
function gate(d,n){ const p=spawnSync('node',['scripts/gates/constitutional-gate.mjs','RULE-'+n],{cwd:d,encoding:'utf8'});return p.status; }
const cases=[
 [1,(d)=>alter(d,'implementation/registry.json',s=>{const j=JSON.parse(s);j.concepts.push({...j.concepts[0]});return JSON.stringify(j);})],
 [2,(d)=>alter(d,'constitution/deployment-scope.json',s=>{const j=JSON.parse(s);j.deployments.push({id:'unverified'});return JSON.stringify(j);})],
 [3,(d)=>alter(d,'scct/scct.mjs',s=>s+'\n// TO'+'DO violation\n')],
 [4,(d)=>alter(d,'constitution/event-registry.json',s=>{const j=JSON.parse(s);j.events=[];return JSON.stringify(j);})],
 [5,(d)=>alter(d,'constitution/DEVIATIONS.md',s=>s.replace('## Active deviations','## Active deviations\n### Unauthorized exception'))],
 [6,(d)=>alter(d,'implementation/registry.json',s=>{const j=JSON.parse(s);j.concepts[0].ssot_module='missing/orphan.js';return JSON.stringify(j);})]
];
for (const [id,mutation] of cases) test('RULE-'+id+' rejects its negative fixture',()=>{
 const d=fixture();
 try {
  assert.equal(gate(d,id),0,'baseline gate must pass');
  mutation(d);
  assert.notEqual(gate(d,id),0,'mutated gate must fail');
 } finally {rmSync(d,{recursive:true,force:true});}
});

test('RULE-5 rejects unstructured and duplicate active entries in both language ports',()=>{
 const d=fixture();
 try {
  for (const mutation of [
    '## Active deviations\nHidden waiver without heading\n## Historical deviations\n',
    '## Active deviations\n_(none)_\n## Active deviations\n_(none)_\n'
  ]) {
    writeFileSync(join(d,'constitution/DEVIATIONS.md'),mutation);
    for (const cmd of [['node','gates/zero-deviation-mandate.mjs'],['python3','gates/zero-deviation-mandate.py']]) {
      const x=spawnSync(cmd[0],[cmd[1]],{cwd:d,encoding:'utf8'});
      assert.notEqual(x.status,0,cmd[0]+' must reject raw deviation');
    }
  }
 } finally {rmSync(d,{recursive:true,force:true});}
});
