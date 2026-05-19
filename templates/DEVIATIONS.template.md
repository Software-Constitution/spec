<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Template for constitution/DEVIATIONS.md per Software Constitution Standard v1.0 §3.3 + §RULE-5 -->

# Deviations from `<PROJECT NAME>` Constitution

> Every adopting project (including this one) MUST keep a
> DEVIATIONS.md at this path. Silent deviations are constitutional
> violations and block CI. Adding an entry here makes the deviation
> explicit and auditable.
>
> **Zero-Deviation Mandate (§RULE-5).** Active deviations are a
> regression. This file's `## Active deviations` section MUST be
> empty by default; non-emptiness is itself a constitutional
> violation enforced by the `zero-deviation-mandate` CI gate.

**Project:** `<PROJECT NAME>`
**Constitution version:** 1.0

---

## Active deviations

_(none — last cleared `<YYYY-MM-DD>`)_

The expectation is that this section is empty. A deviation entry
here requires: a named owner, a hard deadline, a concrete closure
plan, and owner approval. If the entry is actually a time-boxed
clause of a rule, move it to `DECAY-WINDOWS.md` instead — those
are not deviations.

---

## Schema (when adding an entry)

```
### <YYYY-MM-DD>: §<doc>.<section> — <one-line summary>
**Reason.** <why the deviation exists>
**Scope.** <which paths / surfaces are affected>
**Owner.** <GitHub handles>
**Deadline.** <YYYY-MM-DD>
**Plan.** <what closes the deviation>
**Gate behaviour.** <how the gate treats this entry during the window>
**Approved by.** <owner GitHub handles>
```

---

## Historical (resolved) deviations

_(closure notes go here — one per resolved entry)_
