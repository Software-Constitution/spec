<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Template for constitution/DECAY-WINDOWS.md per Software Constitution Standard v1.0 §3.4 + §7 -->

# Decay Windows · `<PROJECT NAME>`

> **What this is.** Some constitutional rules are themselves
> time-boxed by design — the rule sets a baseline, a decay
> trajectory, and a hard-strict date. Code that's not yet at the
> strict target is still conforming during the window, because the
> window is **part of the rule**, not an exception to it.
>
> **What this is not.** This is not DEVIATIONS.md. A deviation is
> an exception to a rule. A decay window is the rule itself.

**Project:** `<PROJECT NAME>`
**Constitution version:** 1.0

---

## Active decay windows

_(none yet — add entries when a rule with a built-in decay
trajectory ships)_

---

## Schema (when adding an entry)

```
### §<rule-ref> — <one-line>

**Rule.** <quote the constitutional clause that defines the decay>
**Current state (<YYYY-MM-DD>).** <baseline value>
**Gate.** <path/to/gate.<ext>> runs in advisory mode while <condition>;
strict on <YYYY-MM-DD>.
**Resolution paths.** <how to drive the baseline to 0>
**Closure date.** <YYYY-MM-DD>
**Owner.** <GitHub handles>
```

---

## Closure protocol

When a decay window closes:

1. The rule's strict-mode flag flips in its gate.
2. The entry moves to the Historical section below.
3. A one-line note lands in the project's IMPLEMENTATION-PLAN
   confirming the decay reached zero on time.

If a decay window will MISS its closure date, an amendment PR to
the owning rule is required — extending the window is a
constitutional amendment, not a deviation.

---

## Historical (closed) decay windows

_(closure notes go here — one per closed window)_
