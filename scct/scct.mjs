#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
// SCCT 1.1: fail-closed, evidence-aware conformance evaluator.
// WARNING: L2 executes the candidate repository's declared gate commands.
// Run against trusted code or in an isolated CI runner.
import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, resolve, dirname, relative, isAbsolute, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash, verify as verifySignature } from 'node:crypto';
import { verifyNegativeProbes } from './lib/probe-runner.mjs';

const LEVELS = ['L0', 'L1', 'L2', 'L3', 'L4'];
const args = process.argv.slice(2);
const positional = args.filter(x => !x.startsWith('--'));
const root = resolve(positional[0] || '.');
const arg = name => { const p = args.find(x => x.startsWith('--' + name + '=')); return p ? p.slice(name.length + 3) : null; };
const required = arg('require-level');
if (required && !LEVELS.includes(required)) {
  console.error('Invalid --require-level; choose L0 through L4');
  process.exit(2);
}
if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error('Candidate root is not a directory: ' + root);
  process.exit(2);
}

const canonicalRoot = realpathSync(root);
function inside(base, candidate) {
  const rel = relative(base, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}
function independentlyHeldFile(input) {
  if (!input || !isAbsolute(input) || !existsSync(input)) return false;
  try {
    const lexical = resolve(input), physical = realpathSync(input);
    // Reject in-repo aliases, symlinks that lead into the checkout,
    // and files whose path has unresolved symlink aliases.
    return !inside(canonicalRoot, lexical) && !inside(canonicalRoot, physical) &&
      lexical === physical && statSync(physical).isFile();
  } catch { return false; }
}
function immutableHead() {
  const git = (command, values) => spawnSync('git', [command, ...values], {
    cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 1048576,
  });
  const head = git('rev-parse', ['HEAD']);
  const top = git('rev-parse', ['--show-toplevel']);
  const status = git('status', ['--porcelain=v1', '--untracked-files=all']);
  const normal = head.status === 0 && /^[a-f0-9]{40}$/.test(head.stdout.trim());
  const rootExact = top.status === 0 && realpathSync(top.stdout.trim()) === canonicalRoot;
  const unchanged = status.status === 0 && !status.stdout.trim();
  return { ok: normal && rootExact && unchanged, head: normal ? head.stdout.trim() : null };
}

// Capture identity BEFORE parsing candidate input or executing any of its
// gates. A gate that rewrites itself and restores HEAD cannot launder a dirty
// preflight into authenticated L3 evidence.
const entryGitState = immutableHead();
const checks = { structural: {}, gate_enforced: {}, self_governed: {}, platform_bijected: {} };
const findings = [];
const record = (group, id, ok, reason) => {
  checks[group][id] = { ok: !!ok, ...(!ok && reason ? { detail: String(reason) } : {}) };
  if (!ok) findings.push(group + '/' + id + ': ' + (reason || 'failed'));
  return !!ok;
};
// Every evaluated input, gate command and referenced artefact must remain
// under the canonical candidate root even across symlinks/path aliases.
function safePath(p) {
  if (typeof p !== 'string' || !p || isAbsolute(p) ||
      p.split(/[\\/]/).includes('..')) return false;
  try {
    const absolute = resolve(root, p);
    if (!inside(root, absolute)) return false;
    return inside(canonicalRoot, realpathSync(absolute));
  } catch { return false; }
}
function file(p) { return safePath(p) && statSync(join(root, p)).isFile(); }
function dir(p) { return safePath(p) && statSync(join(root, p)).isDirectory(); }
function json(p) {
  if (!file(p)) throw Error('missing or escaped canonical file: ' + p);
  return JSON.parse(readFileSync(join(root, p), 'utf8'));
}
function activeDeviationRows(markdown) {
  const lines = markdown.split(/\r?\n/);
  const headings = lines.flatMap((line,i) =>
    /^##\s+Active deviations\s*$/i.test(line) ? [i] : []);
  if (headings.length !== 1) return null;
  const start = headings[0] + 1;
  const stop = lines.findIndex((line,i) => i >= start && /^##\s+(?!#)/.test(line));
  return lines.slice(start, stop < 0 ? undefined : stop)
    .map(line => line.trim()).filter(line => line && line !== '_(none)_');
}
function walk(d, depth = 0) {
  if (depth > 7 || !dir(d)) return [];
  let out = [];
  for (const ent of readdirSync(join(root, d), { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', 'build', '.lake'].includes(ent.name) || ent.isSymbolicLink()) continue;
    const p = join(d, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, depth + 1));
    else if (ent.isFile()) out.push(p);
  }
  return out;
}
function evaluateSchema(schemaPath, sourcePath) {
  const code = 'import json,sys\nfrom jsonschema import Draft202012Validator,FormatChecker\nschema=json.load(open(sys.argv[1])); document=json.load(open(sys.argv[2])); Draft202012Validator.check_schema(schema); Draft202012Validator(schema,format_checker=FormatChecker()).validate(document)';
  const result = spawnSync('python3', ['-c', code, join(root, schemaPath), join(root, sourcePath)], { encoding: 'utf8', timeout: 15000, maxBuffer: 200000 });
  return result.status === 0 ? null : ((result.stderr || result.error?.message || 'schema validator unavailable').slice(-1200));
}
let level = 'L0';
const constitution = dir('constitution');
record('structural', 'constitution', constitution, 'constitution directory required');
if (constitution) {
  const mandatory = ['constitution/00-INDEX.md', 'constitution/DEVIATIONS.md', 'constitution/DECAY-WINDOWS.md'];
  const basic = mandatory.map(p => record('structural', p, file(p), 'missing required document'));
  const numbered = readdirSync(join(root, 'constitution')).filter(n => /^\d{2}-[A-Z0-9-]+\.md$/.test(n) && n !== '00-INDEX.md');
  const docOk = record('structural', 'numbered-rails', numbered.length > 0, 'at least one numbered rail required');
  const indexText = file(mandatory[0]) ? readFileSync(join(root, mandatory[0]), 'utf8') : '';
  const names = ['Zero Competing Systems', 'Repo', 'Stubs', 'Self-Governance', 'Zero-Deviation', 'Coherent Integration'];
  const ruleOk = names.every(n => indexText.toLowerCase().includes(n.toLowerCase()));
  record('structural', 'six-rule-classes', ruleOk, 'all six rule class declarations required');
  const deviations = file(mandatory[1]) ? readFileSync(join(root, mandatory[1]), 'utf8') : '';
  const activeRows = activeDeviationRows(deviations);
  const emptyActive = activeRows !== null && activeRows.length === 0;
  record('structural', 'zero-active-deviations', emptyActive, 'active deviation entries forbidden');
  const registryPaths = walk('.').filter(p => /(^|\/)implementation\/registry\.json$/.test(p));
  const unique = record('structural', 'one-implementation-registry', registryPaths.length === 1, 'expected exactly one implementation/registry.json, found ' + registryPaths.length);
  let registryOk = false;
  if (unique) {
    const rp = registryPaths[0];
    try {
      const r = json(rp);
      const schemaFile = 'schemas/software-constitution-implementation-registry.v1.json';
      const schemaPresent = record('structural', 'registry-schema-file', file(schemaFile), 'implementation registry JSON Schema missing');
      const schemaError = schemaPresent ? evaluateSchema(schemaFile, rp) : 'schema missing';
      const valid = record('structural', 'registry-schema-valid', schemaError === null, schemaError || undefined);
      const concepts = Array.isArray(r.concepts) ? r.concepts : [];
      const ids = concepts.map(x => x.concept_id);
      const distinct = new Set(ids).size === ids.length && ids.length > 0;
      const resolved = concepts.every(x => safePath(x.ssot_module) && (file(x.ssot_module) || dir(x.ssot_module)));
      registryOk = valid && record('structural', 'unique-concept-ids', distinct, 'duplicate or missing canonical concept IDs') && record('structural', 'ssot-paths-exist', resolved, 'missing canonical implementation path');
    } catch (e) { record('structural', 'registry-parse', false, e.message); }
  }
  const l1 = basic.every(Boolean) && docOk && ruleOk && emptyActive && registryOk;
  if (l1) level = 'L1';
  const gateManifest = 'constitution/gates.json';
  let allGates = false;
  if (l1 && record('gate_enforced', 'manifest-present', file(gateManifest), 'six executable gate declarations required')) {
    try {
      const m = json(gateManifest);
      const gates = Array.isArray(m.gates) ? m.gates : [];
      const schemaPath = 'schemas/software-constitution-gates.v2.json';
      const schemaValid = file(schemaPath) &&
        evaluateSchema(schemaPath, gateManifest) === null;
      record('gate_enforced','challenge-manifest-schema',schemaValid,
        'T0 gate manifest v2 must validate against mandatory challenge schema');
      const ruleNames = Array.from({length: 6}, (_, i) => 'RULE-' + (i + 1));
      const exact = gates.length === 6 && ruleNames.every(n => gates.filter(g => g.rule === n).length === 1);
      const shape = gates.every(g => Array.isArray(g.argv) && g.argv.length >= 2 &&
        ['node', 'python3'].includes(g.argv[0]) && safePath(g.argv[1]) && file(g.argv[1]) &&
        g.argv.every(v => typeof v === 'string'));
      const okManifest = record('gate_enforced', 'complete-executable-manifest', schemaValid && exact && shape,
        'six executable gates with independently runnable negative probes required');
      let success = 0;
      if (okManifest) {
        for (const g of gates) {
          const p = spawnSync(g.argv[0], g.argv.slice(1), { cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 200000 });
          if (record('gate_enforced', g.rule, p.status === 0, (p.stderr || p.error?.message || 'gate failed').slice(-800))) success++;
        }
      }
      const challenged = [];
      if(okManifest && success===6){
        for(const g of gates){
          const proof=verifyNegativeProbes(root,g);
          challenged.push(record('gate_enforced',g.rule+'-negative-probe',proof.ok,proof.reason));
        }
      }
      const workflow = walk('.github/workflows').some(p => /\.ya?ml$/.test(p) &&
        /pull_request\s*:/.test(readFileSync(join(root,p),'utf8')) &&
        /--require-level[= ]L2/.test(readFileSync(join(root,p),'utf8')));
      allGates = success === 6 && challenged.length === 6 && challenged.every(Boolean) &&
        record('gate_enforced', 'blocking-ci-contract', workflow,
          'CI must run SCCT at >= L2 on pull requests');
      if (allGates) level = 'L2';
    } catch(e) { record('gate_enforced', 'manifest-parse', false, e.message); }
  }
  if (allGates) {
    const attestation = arg('attestation');
    const trust = arg('trusted-key');
    let audited = false;
    if (record('self_governed', 'external-evidence', independentlyHeldFile(attestation), 'attestation must be independent, regular, canonical, external file')) {
      try {
        const a = JSON.parse(readFileSync(attestation, 'utf8'));
        const sourceBefore = entryGitState;
        const head = sourceBefore.head;
        const bound = sourceBefore.ok && head === a.commit_sha;
        const events = Array.isArray(a.events) ? a.events : [];
        let prev = 'GENESIS';
        let replay = events.length > 0;
        for (const e of events) {
          const payload = JSON.stringify({type:e.type,decision:e.decision,commit_sha:e.commit_sha,prev_hash:e.prev_hash});
          const hash = createHash('sha256').update(payload).digest('hex');
          replay = replay && e.prev_hash === prev && hash === e.hash && e.commit_sha === head;
          prev = e.hash;
        }
        const trusted = independentlyHeldFile(trust);
        let authenticated = false;
        if (trusted && typeof a.signature === 'string') {
          try {
            authenticated = verifySignature(null,
              Buffer.from(JSON.stringify({commit_sha:a.commit_sha,events:a.events})),
              readFileSync(trust), Buffer.from(a.signature,'base64'));
          } catch { authenticated = false; }
        }
        const b1 = record('self_governed','head-bound',bound,'attestation must bind to current git HEAD');
        const b2 = record('self_governed','replayable-chain',replay,'invalid or empty SHA-256 evidence chain');
        const b3 = record('self_governed','trusted-ed25519-signature',trusted && authenticated,'external trust root and valid Ed25519 signature required');
        const after = immutableHead();
        const b4 = record('self_governed','immutable-source-verified',sourceBefore.ok && after.ok && after.head === head,
          'source must be clean before any gate executes and remain head-bound afterward');
        audited = b1 && b2 && b3 && b4;
      } catch(e) { record('self_governed','attestation-parse',false,e.message); }
    }
    if (audited) level = 'L3';
  }
  if (level === 'L3') {
    const idx = 'platform/meta-index.generated.json';
    const pmi = 'platform/manifest-index.json';
    if (record('platform_bijected','files',file(idx) && file(pmi),'meta-index and manifest-index required')) {
      try {
        const entries = json(idx).surfaces;
        const manifests = json(pmi).manifests;
        const declared = [];
        for (const m of manifests) {
          if (!safePath(m) || !file(m)) throw Error('missing manifest: ' + m);
          for (const s of json(m).surfaces) declared.push({ ...s, owner_manifest: m });
        }
        const key = s => [s.id,s.path,s.owner_manifest].join('|');
        const out = entries.map(key); const source = declared.map(key);
        const complete = entries.length > 0 && new Set(out).size === out.length &&
          new Set(source).size === source.length && out.length === source.length &&
          out.every(x => source.includes(x)) &&
          entries.every(s => safePath(s.path) && (file(s.path) || dir(s.path)));
        if (record('platform_bijected','bidirectional-reconciliation',complete,'both directions and referenced paths must match')) level = 'L4';
      } catch(e) { record('platform_bijected','parse',false,e.message); }
    }
  }
}
const target = required || 'L1';
const ok = LEVELS.indexOf(level) >= LEVELS.indexOf(target);
const verdict = { schema: 'software-constitution.scct-verdict.v1', scct_version:'1.2.0',
  commit_sha:entryGitState.head, source_clean_at_entry:entryGitState.ok, level,
  required_level: target, ok, checks, findings };
console.log(JSON.stringify(verdict, null, 2));
process.exit(ok ? 0 : 1);
