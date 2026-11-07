#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
// Repository-scope reference gates. This package is a spec, not its external production site.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const rule = process.argv[2], read = p => JSON.parse(readFileSync(p,'utf8'));
function fail(reason) { console.error('[FAIL] ' + rule + ': ' + reason); process.exit(1); }
if (!['RULE-1','RULE-2','RULE-3','RULE-4','RULE-5','RULE-6'].includes(rule)) fail('unknown rule');
const registry = read('implementation/registry.json');
const concepts = registry.concepts || [];
function unique(a) { return new Set(a).size === a.length; }
if (rule === 'RULE-1') {
  if (!concepts.length || !unique(concepts.map(x=>x.concept_id)) ||
      !concepts.every(x=>existsSync(x.ssot_module))) fail('duplicate/missing canonical implementation');
}
if (rule === 'RULE-2') {
  const scope = read('constitution/deployment-scope.json');
  if (scope.repository !== 'Software-Constitution/spec' || scope.mode !== 'specification-only' ||
      !Array.isArray(scope.deployments) || scope.deployments.length) fail('deployment requires external attestation');
  const workflows = existsSync('.github/workflows') ? readdirSync('.github/workflows') : [];
  for (const f of workflows) {
    const t = readFileSync(join('.github/workflows',f),'utf8');
    if (/(wrangler\s+(deploy|pages\s+deploy)|netlify\s+deploy|vercel\s+--prod)/i.test(t)) fail('deployment workflow outside scope');
  }
}
if (rule === 'RULE-3') {
  const paths = ['scct/scct.mjs','kit/lib/gate-runner.mjs','kit/run.mjs','gates/zero-deviation-mandate.mjs'];
  const markers = [String.fromCharCode(84,79,68,79),'FIX'+'ME','XXX','coming'+' soon'];
  for (const p of paths) if (markers.some(x=>readFileSync(p,'utf8').includes(x))) fail('placeholder in ' + p);
}
if (rule === 'RULE-4') {
  const registry = read('constitution/event-registry.json');
  const emitter = readFileSync('scct/scct.mjs','utf8');
  if (!registry.events?.some(x=>x.id==='software-constitution.scct-verdict.v1' && x.emitter==='scct/scct.mjs') ||
      !emitter.includes('software-constitution.scct-verdict.v1')) fail('undeclared verdict event');
}
if (rule === 'RULE-5') {
  const p = spawnSync('node',['gates/zero-deviation-mandate.mjs'],{encoding:'utf8'});
  if (p.status !== 0) fail(p.stderr || 'active deviation');
}
if (rule === 'RULE-6') {
  if (!concepts.length || !unique(concepts.map(c=>c.ssot_module))) fail('implementation surface not bijective');
  for (const c of concepts) if (!existsSync(c.ssot_module)) fail('orphan: ' + c.ssot_module);
}
console.log('[PASS] ' + rule);
