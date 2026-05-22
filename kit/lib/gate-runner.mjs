/* SPDX-License-Identifier: Apache-2.0 */
/**
 * gate-runner.mjs — the Constitution Kit enforcement engine.
 *
 * Reads a constitution-kit manifest and runs two families of check:
 *
 *   1. registry drift — every declared registry is validated against
 *      its JSON Schema (when one is declared), then its generator is
 *      run with --check; a non-zero exit means a generated artifact
 *      has drifted from the registry that is its single source of
 *      truth.
 *
 *   2. single-value concepts — every fact declared as "must appear
 *      exactly once" is scanned across its globs; more than one
 *      distinct value is a zero-competing-systems violation.
 *
 * Zero runtime dependencies. JSON Schema validation uses `ajv` when it
 * is importable in the host project and is skipped (with a warning)
 * when it is not — the kit never forces a dependency on the adopter.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

export function loadManifest(manifestPath) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    throw new Error(`constitution-kit: manifest is not readable JSON (${manifestPath}): ${e.message}`);
  }
  if (!manifest.project || !manifest.constitution_dir) {
    throw new Error('constitution-kit: manifest must declare "project" and "constitution_dir"');
  }
  return manifest;
}

// --- dependency-free glob -------------------------------------------------
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += '.*';
      i++;
      if (glob[i + 1] === '/') i++;
    } else if (c === '*') {
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

function walkFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}

function matchGlob(repoRoot, glob) {
  const re = globToRegExp(glob);
  const firstWild = glob.search(/[*?]/);
  const base = firstWild === -1 ? '' : glob.slice(0, glob.lastIndexOf('/', firstWild) + 1);
  return walkFiles(path.join(repoRoot, base))
    .map((f) => path.relative(repoRoot, f).replace(/\\/g, '/'))
    .filter((rel) => re.test(rel));
}

// --- single-value concepts (zero competing systems) ----------------------
export function checkSingleValueConcepts(manifest, repoRoot) {
  const violations = [];
  for (const concept of manifest.single_value_concepts || []) {
    const re = new RegExp(concept.pattern, 'g');
    const values = new Set();
    const files = new Set();
    for (const glob of concept.globs) {
      for (const rel of matchGlob(repoRoot, glob)) files.add(rel);
    }
    for (const rel of files) {
      const text = readFileSync(path.join(repoRoot, rel), 'utf8');
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(text)) !== null) values.add(m[1] ?? m[0]);
    }
    if (values.size > 1) {
      violations.push(
        `concept "${concept.id}": ${values.size} distinct values across ${files.size} file(s) — ${[...values].join(', ')}`,
      );
    }
  }
  return violations;
}

// --- registry drift -------------------------------------------------------
async function getAjv() {
  try {
    const Ajv = (await import('ajv/dist/2020.js')).default;
    const addFormats = (await import('ajv-formats')).default;
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    return ajv;
  } catch {
    return null;
  }
}

export async function checkRegistries(manifest, repoRoot) {
  const violations = [];
  const warnings = [];
  const ajv = await getAjv();
  for (const reg of manifest.registries || []) {
    const sourcePath = path.join(repoRoot, reg.source);
    if (!existsSync(sourcePath)) {
      violations.push(`registry "${reg.id}": source not found — ${reg.source}`);
      continue;
    }
    if (reg.schema) {
      const schemaPath = path.join(repoRoot, reg.schema);
      if (!existsSync(schemaPath)) {
        violations.push(`registry "${reg.id}": schema not found — ${reg.schema}`);
      } else if (ajv) {
        const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));
        if (!validate(JSON.parse(readFileSync(sourcePath, 'utf8')))) {
          violations.push(`registry "${reg.id}": source fails schema — ${ajv.errorsText(validate.errors)}`);
        }
      } else {
        warnings.push(`registry "${reg.id}": ajv not installed — schema validation skipped`);
      }
    }
    const generatorPath = path.join(repoRoot, reg.generator);
    if (!existsSync(generatorPath)) {
      violations.push(`registry "${reg.id}": generator not found — ${reg.generator}`);
      continue;
    }
    try {
      execFileSync('node', [generatorPath, '--check'], { cwd: repoRoot, stdio: 'pipe' });
    } catch (e) {
      const out = ((e.stdout?.toString() || '') + (e.stderr?.toString() || '')).trim();
      const tail = out.split('\n').slice(-3).join(' / ') || 'non-zero exit';
      violations.push(`registry "${reg.id}": generator --check failed (drift) — ${tail}`);
    }
  }
  return { violations, warnings };
}

/**
 * Run every check declared by the manifest.
 * @param {string} manifestPath absolute or cwd-relative path to constitution-kit.json
 * @param {string} [repoRootOverride] repo root; defaults to the manifest's directory
 */
export async function runAll(manifestPath, repoRootOverride) {
  const repoRoot = repoRootOverride || path.dirname(path.resolve(manifestPath));
  const manifest = loadManifest(manifestPath);
  const conceptViolations = checkSingleValueConcepts(manifest, repoRoot);
  const { violations: registryViolations, warnings } = await checkRegistries(manifest, repoRoot);
  const violations = [...conceptViolations, ...registryViolations];
  return { ok: violations.length === 0, violations, warnings, manifest };
}
