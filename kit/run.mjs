#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * run.mjs — Constitution Kit gate entrypoint.
 *
 * Locates the project's constitution-kit.json (by walking up from this
 * file), runs every drift + competing-systems check it declares, and
 * exits non-zero on any violation. Wire it into `npm test`:
 *
 *   "test:constitution": "node constitution-kit/run.mjs"
 *
 * When the kit is scaffolded into another project by init.mjs this
 * file lands at scripts/constitution/run.mjs and the same walk-up
 * locates that project's constitution-kit.json — no path edits needed.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { runAll } from './lib/gate-runner.mjs';

function findRepoRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (existsSync(path.join(dir, 'constitution-kit.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('constitution-kit: no constitution-kit.json found walking up from ' + start);
}

const here = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(here);
const manifestPath = path.join(repoRoot, 'constitution-kit.json');

const { ok, violations, warnings, manifest } = await runAll(manifestPath, repoRoot);

for (const w of warnings) console.warn('  [warn] ' + w);

if (!ok) {
  console.error(`[FAIL] constitution-kit (${manifest.project}): ${violations.length} violation(s):`);
  for (const v of violations) console.error('  - ' + v);
  process.exit(1);
}

const regCount = (manifest.registries || []).length;
const conceptCount = (manifest.single_value_concepts || []).length;
console.log(
  `[pass] constitution-kit (${manifest.project}) — ${regCount} registry/registries drift-free, ` +
    `${conceptCount} single-value concept(s) uniform`,
);
