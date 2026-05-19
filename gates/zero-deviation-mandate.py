#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""
Software Constitution Standard v1.0 §RULE-5 — reference gate (Python).

Contract identical to gates/zero-deviation-mandate.mjs:
  - Read DEVIATIONS.md (path configurable via $SCS_DEVIATIONS).
  - Find the "## Active deviations" heading.
  - Between that heading and the next ## heading, count ### entries.
  - Any count > 0 = FAIL.

Exit code: 0 = pass, 1 = fail.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path


def main() -> int:
    path = Path(os.environ.get("SCS_DEVIATIONS", "constitution/DEVIATIONS.md"))
    if not path.exists():
        print(f"[FAIL] zero-deviation-mandate — {path} missing (Software Constitution §3.3)", file=sys.stderr)
        return 1

    lines = path.read_text(encoding="utf-8").splitlines()
    active_start = -1
    active_end = len(lines)
    in_active = False

    for i, line in enumerate(lines):
        if re.match(r"^##\s+Active deviations\s*$", line, re.IGNORECASE):
            in_active = True
            active_start = i
            continue
        if in_active and re.match(r"^##\s+(?!#)", line):
            active_end = i
            break

    if active_start < 0:
        print(f'[FAIL] zero-deviation-mandate — {path} has no "## Active deviations" section', file=sys.stderr)
        return 1

    entries = [l for l in lines[active_start + 1 : active_end] if re.match(r"^###\s+\S", l)]

    if entries:
        print(f"[FAIL] zero-deviation-mandate — {len(entries)} active deviation(s) declared in {path}:", file=sys.stderr)
        for e in entries:
            print(f"  • {e.strip()}", file=sys.stderr)
        return 1

    print("[OK] zero-deviation-mandate — Software Constitution §RULE-5 satisfied; 0 active deviations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
