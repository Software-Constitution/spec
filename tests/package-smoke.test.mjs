/* SPDX-License-Identifier: Apache-2.0 */
// End-user acceptance of the ACTUAL packed CLI, not a source-tree import.
// Fully offline: no npm registry, no privileged token, no publisher workflow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function command(bin,args,options={}) {
  return spawnSync(bin,args,{encoding:'utf8',timeout:60000,maxBuffer:1500000,...options});
}
test('packed SCCT installs offline and checks L2 and fail-closed L1 through its bin', {timeout:90000},()=>{
 const work=mkdtempSync(join(tmpdir(),'scct-consumer-'));
 try {
  const dist=join(work,'dist'),consumer=join(work,'consumer'),empty=join(work,'empty');
  for(const p of [dist,consumer,empty])mkdirSync(p,{recursive:true});
  const packed=command('npm',['pack','--offline','--json','--pack-destination',dist],{cwd:join(root,'scct')});
  assert.equal(packed.status,0,packed.stderr||packed.stdout);
  const artifacts=JSON.parse(packed.stdout);
  assert.equal(artifacts.length,1);
  assert.ok(artifacts[0].files.some(f=>f.path==='scct.mjs'),'packaged executable required');
  const archive=join(dist,artifacts[0].filename);
  assert.equal(existsSync(archive),true);
  const installed=command('npm',['install','--offline','--no-audit','--no-fund','--ignore-scripts',
    '--package-lock=false','--no-save','--prefix',consumer,archive]);
  assert.equal(installed.status,0,installed.stderr||installed.stdout);
  const cli=join(consumer,'node_modules','.bin',
    process.platform==='win32'?'scct.cmd':'scct');
  assert.equal(existsSync(cli),true,'consumer CLI binary linked');
  const good=command(cli,[root,'--require-level=L2']);
  assert.equal(good.status,0,good.stderr||good.stdout);
  const level=JSON.parse(good.stdout);
  assert.equal(level.level,'L2');
  assert.equal(level.ok,true);
  const reject=command(cli,[empty,'--require-level=L1']);
  assert.equal(reject.status,1,reject.stderr||reject.stdout);
  const verdict=JSON.parse(reject.stdout);
  assert.equal(verdict.level,'L0');
  assert.equal(verdict.ok,false);
 } finally { rmSync(work,{force:true,recursive:true}); }
});
