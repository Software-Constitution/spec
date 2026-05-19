#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * SCCT — Software Constitution Conformance Test (v1.0 reference).
 *
 * Run against any candidate repository and emit a JSON verdict:
 *   L0 — no constitution found
 *   L1 — structural conformance (artefacts exist, schemas validate)
 *   L2 — gate-enforced (every rule has a passing gate)
 *   L3 — self-governed (project emits its own audit chain)
 *
 * Usage:
 *   node scct.mjs /path/to/candidate-repo
 *   node scct.mjs .                 # current dir
 *
 * Output is JSON on stdout; exit code mirrors the verdict (0 if
 * L1+ achieved, non-zero if L0).
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] || ".");

const verdict = {
  scct_version: "1.0",
  repo: root,
  level: "L0",
  checks: {
    structural: {},
    gate_enforced: {},
    self_governed: {},
  },
  notes: [],
};

function exists(rel) { return existsSync(join(root, rel)); }
function read(rel)   { return existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null; }

// ---------- L1 — structural ----------
verdict.checks.structural["constitution/"] = exists("constitution");
verdict.checks.structural["constitution/00-INDEX.md"] = exists("constitution/00-INDEX.md");
verdict.checks.structural["constitution/DEVIATIONS.md"] = exists("constitution/DEVIATIONS.md");
verdict.checks.structural["constitution/DECAY-WINDOWS.md"] = exists("constitution/DECAY-WINDOWS.md");

// Implementation registry — accept any path of the form
// */implementation/registry.json with the canonical schema field.
let registryFound = false;
function findRegistry(dir, depth = 0) {
  if (depth > 5 || registryFound) return;
  let entries = [];
  try { entries = readdirSync(join(root, dir)); } catch { return; }
  for (const e of entries) {
    if (["node_modules", ".git", "dist", "build"].includes(e)) continue;
    const p = join(dir, e);
    let s; try { s = statSync(join(root, p)); } catch { continue; }
    if (s.isDirectory()) findRegistry(p, depth + 1);
    else if (e === "registry.json" && /implementation/i.test(dir)) {
      try {
        const j = JSON.parse(readFileSync(join(root, p), "utf8"));
        if (j.schema === "software-constitution.implementation_registry.v1"
            || j.schema === "kye.implementation_registry.v1"
            || /implementation_registry\.v1$/i.test(String(j.schema || ""))) {
          registryFound = true;
          verdict.checks.structural["implementation-registry"] = p;
        }
      } catch { /* not JSON or wrong shape */ }
    }
  }
}
findRegistry(".");
if (!registryFound) verdict.checks.structural["implementation-registry"] = false;

const constitutionDocs = exists("constitution")
  ? readdirSync(join(root, "constitution")).filter((f) => /^\d{2}-.*\.md$/.test(f))
  : [];
verdict.checks.structural["numbered_documents"] = constitutionDocs.length;

const L1 = verdict.checks.structural["constitution/00-INDEX.md"]
        && verdict.checks.structural["constitution/DEVIATIONS.md"]
        && registryFound
        && constitutionDocs.length >= 1;

if (L1) verdict.level = "L1";

// ---------- L2 — gate-enforced ----------
// Look for the four conformance gates by either canonical name or
// the project's own naming. We check for the presence of at least
// one gate corresponding to each of the five RULE classes.
const gateGlobs = [
  { rule: "RULE-1", patterns: [/implementation-canonical/i, /single-impl/i, /competing-systems/i] },
  { rule: "RULE-2", patterns: [/repo-prod-drift/i, /reconcil/i, /deploy.*declared/i] },
  { rule: "RULE-3", patterns: [/no-stubs/i, /placeholders/i, /mocks/i] },
  { rule: "RULE-4", patterns: [/canonical-first/i, /event-registry/i, /self-govern/i] },
  { rule: "RULE-5", patterns: [/zero-deviation/i] },
];

function walkScripts(dir) {
  let out = [];
  let entries = [];
  try { entries = readdirSync(join(root, dir)); } catch { return out; }
  for (const e of entries) {
    if (["node_modules", ".git", "dist", "build"].includes(e)) continue;
    const p = join(dir, e);
    let s; try { s = statSync(join(root, p)); } catch { continue; }
    if (s.isDirectory()) out = out.concat(walkScripts(p));
    else if (/\.(mjs|js|ts|py|go|rb|sh)$/i.test(e)) out.push(p);
  }
  return out;
}

const scriptFiles = walkScripts("scripts").concat(walkScripts(".github"));
let gatesMatched = 0;
for (const g of gateGlobs) {
  const found = scriptFiles.find((f) => g.patterns.some((re) => re.test(f)));
  if (found) {
    gatesMatched += 1;
    verdict.checks.gate_enforced[g.rule] = found;
  } else {
    verdict.checks.gate_enforced[g.rule] = false;
  }
}

if (L1 && gatesMatched >= 4) verdict.level = "L2";
verdict.checks.gate_enforced["matched_count"] = gatesMatched;
verdict.checks.gate_enforced["required_count"] = 5;

// ---------- L3 — self-governed ----------
// Look for evidence that the project itself emits its own audit chain.
const auditMarkers = [
  /kye\.evidence\.decision_map/,
  /kye\.compliance\.attestation/,
  /software-constitution\.evidence/,
  /AuditEmitter/,
];
let selfGoverned = false;
for (const f of scriptFiles.slice(0, 200)) {
  let txt = "";
  try { txt = readFileSync(join(root, f), "utf8"); } catch { continue; }
  if (auditMarkers.some((re) => re.test(txt))) { selfGoverned = true; break; }
}
verdict.checks.self_governed["audit_chain_emission_detected"] = selfGoverned;
if (verdict.level === "L2" && selfGoverned) verdict.level = "L3";

// ---------- output ----------
console.log(JSON.stringify(verdict, null, 2));
process.exit(verdict.level === "L0" ? 1 : 0);
