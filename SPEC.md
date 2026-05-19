<!-- SPDX-License-Identifier: Apache-2.0 -->

# Software Constitution Standard

**Version:** 1.0 (Draft) · **Status:** RFC · **Adopted:** 2026-05-19
**Home:** <https://softwareconstitution.com> · **License:** Apache-2.0

---

## Abstract

A **Software Constitution** is a versioned, machine-readable set of
rules that a software project commits to honour, plus the CI gates
that enforce those rules at merge-time. This document specifies the
required artefacts, schemas, and conformance levels of a
**Software-Constitution-conforming** project.

The standard is **programming-language-agnostic**, **runtime-agnostic**,
**provider-agnostic**, and **domain-agnostic**. It applies equally to
a Python data-platform, a Go microservice fleet, a Rust embedded
system, a TypeScript web app, or a polyglot monorepo. The artefacts
are plain markdown and JSON; the gates are CONTRACTS (defined by
their semantics, not their implementation language).

---

## 1. Why

Engineering teams accumulate implicit rules — design principles,
architectural invariants, naming conventions, security constraints
— that live in tribal knowledge or scattered documents. The rules
decay because there is no enforcement layer that knows when they
have been broken.

A Software Constitution makes those rules explicit, versioned, and
machine-checkable. Every rule has:

- a **canonical declaration** in a numbered constitution document,
- a **manifest** that maps named capabilities to their authoritative
  implementations,
- a **gate** that fails CI when the rule is violated,
- a **deviation** entry (in DEVIATIONS.md) when a time-boxed
  exception is approved.

The expectation is that the deviation surface is **empty by
default** (Zero-Deviation Mandate, §RULE-5 below).

---

## 2. Conformance terms

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be
interpreted as described in BCP 14 (RFC 2119 + RFC 8174) when, and
only when, they appear in all capitals.

---

## 3. Required artefacts

A conforming project MUST publish the following artefacts at the
specified paths (relative to the project root):

| # | Path | Purpose |
|---|---|---|
| 3.1 | `constitution/00-INDEX.md` | Master index — declares every constitution document and the universal rules |
| 3.2 | `constitution/<NN>-<TOPIC>.md` × N | One document per constitutional rail. Numbered `01`..`NN`; once locked, the number is permanent |
| 3.3 | `constitution/DEVIATIONS.md` | Time-boxed exceptions to the rules. Active section MUST be empty by default |
| 3.4 | `constitution/DECAY-WINDOWS.md` | Time-boxed clauses of rules (rule itself decays over time). Separate from deviations |
| 3.5 | `<spec-root>/implementation/registry.json` | The Implementation Registry — canonical capabilities → SSOT modules |
| 3.6 | `<spec-root>/schemas/` | JSON Schema 2020-12 files for every structured artefact |
| 3.7 | `<gates-root>/*` | CI gate scripts that fail on violation |

`<spec-root>` and `<gates-root>` are project-defined paths (e.g.
`private/specs/` and `scripts/gates/` in the KYE Protocol™ reference
implementation).

---

## 4. The five RULE classes (any constitution MUST address all five)

A conforming constitution MUST contain rules of all five RULE classes
below. Naming and numbering of individual rules is project-specific;
the existence of at least one rule per class is the conformance bar.

### §RULE-1 — Zero Competing Systems (Single-Implementation Mandate)

Every named capability has EXACTLY ONE canonical implementation.
A second implementation of an existing capability is a violation.

Required artefacts: `implementation/registry.json` (the manifest of
named capabilities → canonical implementation paths), plus a drift
gate that fails on any duplicate.

### §RULE-2 — Zero Repo↔Prod Drift

What runs in production MUST be exactly what's in the repository.
No out-of-band deploys. No silent config overrides.

Required: a reconciliation gate that compares declared (repo) state
to deployed (production) state on a defined cadence.

### §RULE-3 — Zero Stubs / Placeholders / Mocks reachable from production

No `TODO`, `FIXME`, `XXX`, "coming soon", "under construction", or
mock data in any code path reachable from production. Test
fixtures live in test directories only.

Required: a static-analysis gate (e.g. grep-based) that runs on
production-reachable code paths.

### §RULE-4 — Self-Governance + Canonical-First

Every privileged action emits a canonical evidence event. Every
canonical event family is declared in the registry BEFORE any
code references it. References to undeclared events fail CI.

Required: an event registry + a canonical-first gate.

### §RULE-5 — Zero-Deviation Mandate

Active deviations are a regression. `DEVIATIONS.md` MUST keep its
`## Active deviations` section empty by default; non-emptiness is
itself a constitutional violation. Decay-windowed rules (rules that
themselves specify a time-boxed compliance trajectory) live in
`DECAY-WINDOWS.md`, NOT `DEVIATIONS.md`.

Required: a zero-deviation gate that fails when DEVIATIONS.md has
any heading in its Active section.

---

## 5. Conformance levels

| Level | Requirements |
|---|---|
| **L1 — Structural** | All artefacts at §3.1-§3.7 exist with the correct names. Schemas validate. The five RULE classes (§RULE-1..§RULE-5) each have at least one declared rule. |
| **L2 — Gate-enforced** | L1 + every declared rule has a corresponding CI gate that runs on every merge to the default branch. Failing gates block merge. |
| **L3 — Self-Governed** | L2 + the project itself emits the §RULE-4 evidence event family on every CI run. The repo can re-derive any decision from its own audit chain. |

A project MAY self-declare its conformance level in its README. The
**SCCT (Software Constitution Conformance Test)** at
`scct/` in this repo is the canonical conformance checker — it
parses any candidate repo and emits a JSON conformance verdict.

---

## 6. The Implementation Registry — required schema

The Implementation Registry (§3.5) MUST validate against
`schemas/software-constitution-implementation-registry.v1.json`.

Minimum required shape:

```jsonc
{
  "schema": "software-constitution.implementation_registry.v1",
  "version": "1.0",
  "concepts": [
    {
      "concept_id": "policy.decision",
      "name": "Policy decision",
      "ssot_module": "path/to/the/canonical/implementation",
      "transport_wrappers": [
        { "module": "path/to/a/wrapper", "transport": "http", "must_import": "ssot-package-name" }
      ]
    }
  ]
}
```

Wrappers MUST import the SSOT package. A wrapper that reimplements
the concept's logic is a §RULE-1 violation.

---

## 7. Decay Windows — when a rule is itself time-boxed

Some rules cannot be enforced strictly from day one (e.g. existing
legacy code has 322 unresolved references that decay to 0 over 60
days). Such rules are NOT deviations — they are explicit temporal
clauses of the rule itself.

These rules MUST be declared in `DECAY-WINDOWS.md` with:

- the rule reference (e.g. `§RULE-4 — Canonical-First baseline`)
- the current baseline (e.g. "322 unresolved refs")
- the closure trajectory (e.g. "baseline drops to 0 by 2026-07-14")
- the gate's behaviour during the window (e.g. "advisory until
  closure date, strict thereafter")

---

## 8. Language and provider neutrality

This standard makes no assumption about:

- the programming language of the project,
- the CI provider (GitHub Actions, GitLab CI, Buildkite, Circle CI,
  Jenkins, internal tooling — any),
- the hosting provider (Cloudflare, AWS, Azure, GCP, on-prem, bare
  metal — any),
- the runtime (Node, Python, Go, Rust, Java, .NET, anything),
- the application domain (payments, AI governance, healthcare, gaming,
  industrial control — any).

The artefacts (§3) are plain text. The gates are CONTRACTS defined
by their semantic behaviour (what they accept, what they reject), not
their implementation language. The `gates/` directory in this repo
ships REFERENCE implementations in multiple languages; conformers
MAY use them or implement their own.

---

## 9. Reference implementation

The canonical reference implementation of this standard is the
**KYE Protocol™** repository at <https://github.com/KYE-Protocol/app>.
It demonstrates L3 conformance with ~40 constitutional documents,
~80 CI gates, and the full Implementation Registry pattern. The
Software Constitution Standard was extracted from KYE Protocol™'s
internal constitution; KYE remains the reference conformer.

---

## 10. Versioning and amendments

This standard follows semver:

- **Major bumps** break backward compatibility of the artefact
  schemas. Conformers MUST re-validate against the new schema.
- **Minor bumps** add new conformance levels or optional artefacts.
- **Patch bumps** clarify existing language without changing
  conformance behaviour.

Amendments proceed through public RFC at
`<https://github.com/software-constitution/spec>` (planned). Until
the repo is split out, amendments are tracked in this file's git
history at `public/oss/software-constitution/SPEC.md` under the
KYE Protocol™ repo.

---

## 11. Trademarks and patents

"Software Constitution" and "SCCT" are descriptive names; this
standard does not claim them as trademarks. The Apache 2.0 license
grants explicit patent rights for the methodology described herein.

The reference implementation (KYE Protocol™) carries its own
trademarks (KYE™, KYE Protocol™, Replay-Proof™, etc.) and patent
portfolio — those are NOT licensed under this standard. Patent
licensing for the KYE Protocol™ implementation is governed by its
own `LICENSE` and patent disclosures, separate from this document.

---

**End of v1.0 (Draft).** Status: RFC. Feedback:
<https://github.com/KYE-Protocol/app/issues> (issue prefix `[scs]`).
