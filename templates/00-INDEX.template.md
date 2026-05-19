<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Template for constitution/00-INDEX.md per Software Constitution Standard v1.0 §3.1 -->

# `<PROJECT NAME>` — Constitution Master Index

**Project:** `<PROJECT NAME>` · **Adopted:** `<YYYY-MM-DD>` · **Constitution version:** 1.0

---

## §0 — Zero Competing Systems (red line, never crossed)

Every named capability has EXACTLY ONE canonical implementation.
A second implementation of an existing capability is a §0 violation.
See `constitution/<NN>-IMPLEMENTATION-CANONICAL.md` and
`<spec-root>/implementation/registry.json`.

**Gate:** `<gates-root>/implementation-canonical.<ext>`

### §0.1 — Zero Repo↔Prod Drift

What runs in production MUST be exactly what's in the repository.
No out-of-band deploys. No silent config overrides.

**Gate:** `<gates-root>/repo-prod-drift.<ext>`

### §0.2 — Zero Stubs / Placeholders / Mocks (reachable from production)

No `TODO`, `FIXME`, `XXX`, `HACK`, "coming soon", "lorem ipsum",
`example.com`, mock data, or other placeholder content in any code
path reachable from production.

**Gate:** `<gates-root>/no-stubs-placeholders-mocks.<ext>`

### §0.3 — Self-Governance + Canonical-First

Every privileged action emits a canonical evidence event family.
Every `<project>.<ns>.*` reference in code MUST resolve to a
canonical schema, vocabulary entry, or constitution declaration
authored in the SAME PR as the reference.

**Gates:** `<gates-root>/canonical-first.<ext>`,
`<gates-root>/self-governance-coverage.<ext>`

### §0.5 — Zero-Deviation Mandate

Active deviations are a regression. `constitution/DEVIATIONS.md`
MUST keep its `## Active deviations` section empty by default;
non-emptiness is itself a constitutional violation.

Decay windows (time-boxed clauses of a rule) are NOT deviations —
they live in `constitution/DECAY-WINDOWS.md` separately.

**Gate:** `<gates-root>/zero-deviation-mandate.<ext>`

---

## Constitution documents (locked, numbered, immutable order)

| # | Document | Locks |
|---|---|---|
| 1 | `01-NAMING.md` | Core vocabulary, identifier format, namespace |
| 2 | `02-INFORMATION-ARCHITECTURE.md` | Navigation, hubs, breadcrumb depth |
| 3 | `03-DESIGN.md` | Design tokens, components, accessibility floors |
| ... | _(add one row per rail, in lock order)_ | |
| NN | `NN-IMPLEMENTATION-CANONICAL.md` | The Implementation Registry — single-impl mandate per capability |

Plus:

- `DEVIATIONS.md` — time-boxed exceptions (Active section MUST be empty)
- `DECAY-WINDOWS.md` — time-boxed clauses of rules

---

## Amendment process

1. Open a PR titled `[constitution] §<NN> — <change>`.
2. CI runs every gate.
3. At least two owner approvals required.
4. Merge only after CI green + approvals.

Silent deviations from this constitution are themselves
constitutional violations and block CI.
