#!/usr/bin/env node
/* SPDX-License-Identifier: Apache-2.0 */
/**
 * Software Constitution Standard v1.0 §RULE-5 — reference gate.
 *
 * Contract:
 *   - Read `constitution/DEVIATIONS.md` (path configurable via $SCS_DEVIATIONS).
 *   - Find the `## Active deviations` heading.
 *   - The active section MUST be empty. Whitespace and the exact
 *     `_(none)_` marker alone are permitted. Headings, unstructured
 *     entries, duplicate active sections and comments all FAIL.
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
const starts = lines.flatMap((line, i) =>
  /^##\s+Active deviations\s*$/i.test(line) ? [i] : []);
if (starts.length !== 1) {
  console.error(`[FAIL] zero-deviation-mandate — ${PATH} must have exactly one active section`);
  process.exit(1);
}
const start = starts[0] + 1;
const end = lines.findIndex((line, i) => i >= start && /^##\s+(?!#)/.test(line));
const entries = lines.slice(start, end < 0 ? undefined : end)
  .map((line) => line.trim()).filter((line) => line && line !== '_(none)_');

if (entries.length > 0) {
  console.error(`[FAIL] zero-deviation-mandate — ${entries.length} active deviation(s) declared in ${PATH}:`);
  for (const e of entries) console.error(`  • ${e.trim()}`);
  process.exit(1);
}

console.log(`[OK] zero-deviation-mandate — Software Constitution §RULE-5 satisfied; 0 active deviations.`);
