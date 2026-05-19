#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * Software Constitution Standard v1.0 §RULE-5 — reference gate.
 *
 * Contract:
 *   - Read `constitution/DEVIATIONS.md` (path configurable via $SCS_DEVIATIONS).
 *   - Find the `## Active deviations` heading.
 *   - Between that heading and the next ## heading, count `###`
 *     headings. Any count > 0 = FAIL.
 *
 * Exit code: 0 = pass, 1 = fail.
 *
 * Port this contract to any language. The reference Python and Go
 * implementations are in `gates/zero-deviation-mandate.py` and
 * `gates/zero-deviation-mandate.go` (planned).
 */
import { readFileSync, existsSync } from "node:fs";

const PATH = process.env.SCS_DEVIATIONS || "constitution/DEVIATIONS.md";

if (!existsSync(PATH)) {
  console.error(`[FAIL] zero-deviation-mandate — ${PATH} missing (Software Constitution §3.3)`);
  process.exit(1);
}

const lines = readFileSync(PATH, "utf8").split(/\r?\n/);
let inActive = false;
let activeStart = -1;
let activeEnd = lines.length;

for (let i = 0; i < lines.length; i++) {
  if (/^##\s+Active deviations\s*$/i.test(lines[i])) {
    inActive = true;
    activeStart = i;
    continue;
  }
  if (inActive && /^##\s+(?!#)/.test(lines[i])) {
    activeEnd = i;
    break;
  }
}

if (activeStart < 0) {
  console.error(`[FAIL] zero-deviation-mandate — ${PATH} has no "## Active deviations" section`);
  process.exit(1);
}

const entries = lines.slice(activeStart + 1, activeEnd).filter((l) => /^###\s+\S/.test(l));

if (entries.length > 0) {
  console.error(`[FAIL] zero-deviation-mandate — ${entries.length} active deviation(s) declared in ${PATH}:`);
  for (const e of entries) console.error(`  • ${e.trim()}`);
  process.exit(1);
}

console.log(`[OK] zero-deviation-mandate — Software Constitution §RULE-5 satisfied; 0 active deviations.`);
