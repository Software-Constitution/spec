#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * init.mjs — scaffold the Constitution Kit into a target project.
 *
 *   node public/oss/software-constitution/kit/init.mjs <target-dir>
 *
 * The Constitution Kit is the enforcement toolkit of the
 * software/constitution™ OSS standard. init copies the kit's engine
 * plus the standard's constitution skeleton into the target and writes
 * a starter constitution-kit.json. After running it the target project
 * is constitution-bound: wire the printed `test:constitution` script
 * into its `npm test` and start declaring registries + single-value
 * concepts in constitution-kit.json.
 *
 * Nothing is overwritten — existing files are left untouched and
 * reported as skipped, so re-running init is safe.
 */
import { existsSync, mkdirSync, copyFileSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const STANDARD_ROOT = path.resolve(here, '..'); // public/oss/software-constitution
const target = process.argv[2];

if (!target) {
  console.error('usage: node public/oss/software-constitution/kit/init.mjs <target-dir>');
  process.exit(1);
}
const targetRoot = path.resolve(target);
if (!existsSync(targetRoot)) {
  console.error(`init: target directory does not exist — ${targetRoot}`);
  process.exit(1);
}

const placed = [];
const skipped = [];

function place(srcAbs, relDest) {
  const dest = path.join(targetRoot, relDest);
  if (existsSync(dest)) {
    skipped.push(relDest);
    return;
  }
  mkdirSync(path.dirname(dest), { recursive: true });
  copyFileSync(srcAbs, dest);
  placed.push(relDest);
}

// 1. enforcement engine → scripts/constitution/
place(path.join(here, 'lib', 'gate-runner.mjs'), 'scripts/constitution/lib/gate-runner.mjs');
place(path.join(here, 'run.mjs'), 'scripts/constitution/run.mjs');
place(path.join(here, 'schema', 'constitution-kit.manifest.json'), 'scripts/constitution/constitution-kit.manifest.json');

// 2. constitution skeleton from the software/constitution standard → constitution/
place(path.join(STANDARD_ROOT, 'templates', '00-INDEX.template.md'), 'constitution/00-INDEX.md');

// 3. starter manifest at the project root
const manifestDest = path.join(targetRoot, 'constitution-kit.json');
if (existsSync(manifestDest)) {
  skipped.push('constitution-kit.json');
} else {
  const starter = {
    $schema: './scripts/constitution/constitution-kit.manifest.json',
    project: path.basename(targetRoot),
    constitution_dir: 'constitution',
    registries: [],
    single_value_concepts: [],
  };
  writeFileSync(manifestDest, JSON.stringify(starter, null, 2) + '\n');
  placed.push('constitution-kit.json');
}

console.log(`Constitution Kit → ${targetRoot}`);
for (const p of placed) console.log('  + ' + p);
for (const s of skipped) console.log('  · ' + s + ' (exists — skipped)');

const pkgPath = path.join(targetRoot, 'package.json');
const hasScript =
  existsSync(pkgPath) &&
  JSON.parse(readFileSync(pkgPath, 'utf8')).scripts?.['test:constitution'];
if (!hasScript) {
  console.log('\nNext: add this to package.json "scripts" and include it in `npm test`:');
  console.log('  "test:constitution": "node scripts/constitution/run.mjs"');
}
console.log('\nThen declare your registries + single-value concepts in constitution-kit.json.');
