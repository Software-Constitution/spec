#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""
Software Constitution Standard v1.0 §RULE-5 — reference gate (Python).

Contract identical to gates/zero-deviation-mandate.mjs:
  - Read DEVIATIONS.md (path configurable via $SCS_DEVIATIONS).
  - Find the "## Active deviations" heading.
  - The active section must be empty (except whitespace or _(none)_).
  - Headings, text entries, comments and duplicate headings all fail.

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
    starts = [i for i, line in enumerate(lines)
              if re.match(r"^##\s+Active deviations\s*$", line, re.IGNORECASE)]
    if len(starts) != 1:
        print(f"[FAIL] zero-deviation-mandate — {path} must have exactly one active section", file=sys.stderr)
        return 1
    start = starts[0] + 1
    end = next((i for i in range(start, len(lines))
                if re.match(r"^##\s+(?!#)", lines[i])), len(lines))
    entries = [line.strip() for line in lines[start:end]
               if line.strip() and line.strip() != "_(none)_"]

    if entries:
        print(f"[FAIL] zero-deviation-mandate — {len(entries)} active deviation(s) declared in {path}:", file=sys.stderr)
        for e in entries:
            print(f"  • {e.strip()}", file=sys.stderr)
        return 1

    print("[OK] zero-deviation-mandate — Software Constitution §RULE-5 satisfied; 0 active deviations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
