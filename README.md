<!-- SPDX-License-Identifier: Apache-2.0 -->

<div align="center">

<img src="https://softwareconstitution.com/assets/logo-wordmark.svg" alt="software/constitution" width="520" />

### The open standard for codebases that govern themselves.

[![License](https://img.shields.io/badge/license-Apache_2.0-E63935?style=flat-square)](./LICENSE)
[![Spec](https://img.shields.io/badge/spec-v1.0-0B0B0F?style=flat-square&labelColor=E63935)](./SPEC.md)
[![SCCT](https://img.shields.io/badge/SCCT-L0–L4-2A2A36?style=flat-square)](./scct)
[![Patent-safe](https://img.shields.io/badge/patent--safe-yes-2A2A36?style=flat-square)](./LICENSE)
[![Reference](https://img.shields.io/badge/reference_conformer-KYE_Protocol-E63935?style=flat-square)](https://github.com/KYE-Protocol)

[**softwareconstitution.com**](https://softwareconstitution.com) · [**Spec**](./SPEC.md) · [**SCCT**](./scct) · [**Templates**](./templates) · [**Schemas**](./schemas)

</div>

---

> **Language-agnostic. Provider-agnostic. Domain-agnostic.**
> A standard for projects that want to enforce their own design
> principles at CI time, with versioned rules, an implementation
> registry, and drift gates that block merges on violation.

**Status:** v1.0 · **License:** Apache-2.0 · **Home:** <https://softwareconstitution.com>

---

## What this is

A specification you point at your repo to answer: **"is this project
governed by an explicit, machine-enforceable constitution?"**

The full spec is in [`SPEC.md`](./SPEC.md). The conformance test is
the **SCCT** (`scct/`). The schemas are in `schemas/`. Reference CI
gates are in `gates/`. Project templates are in `templates/`.

---

## Who it's for

- **Engineering leaders** who want to encode design principles as
  code, not wiki pages.
- **Banks, healthcare, regulated industries** that need auditable
  evidence the codebase honours its own rules.
- **Open-source maintainers** who want forks to inherit the
  governance discipline, not just the code.
- **Procurement teams** evaluating vendors — a "Software Constitution
  L3 conformant" badge is a real signal about engineering maturity.

---

## What you get

1. **A spec** ([`SPEC.md`](./SPEC.md)) — 11 sections defining the standard, the
   five required rule classes, the five conformance levels.
2. **Templates** (`templates/`) — copy-paste starting points for
   the four required canonical artefacts:
   - `00-INDEX.template.md` — the master constitution index
   - `DEVIATIONS.template.md` — empty Active section + schema
   - `DECAY-WINDOWS.template.md` — for rules that decay over time
   - `implementation-registry.template.json` — capability ↔ SSOT map
3. **Schemas** (`schemas/`) — JSON Schema 2020-12 files that validate
   the structured artefacts.
4. **Reference CI gates** (`gates/`) — drop-in implementations in
   multiple languages. Pick the one that matches your CI runtime, or
   write your own to the documented contract:
   - `gates/zero-deviation-mandate.mjs` — Node.js / TypeScript
   - `gates/zero-deviation-mandate.py` — Python (planned)
   - `gates/zero-deviation-mandate.go` — Go (planned)
5. **SCCT** (`scct/`) — the Software Constitution Conformance Test
   CLI. Runs against any candidate repo and emits a JSON verdict
   (L0 / L1 / L2 / L3 / L4).

---

## Adoption path

```bash
# 1. Copy the templates into your repo
cp -r software-constitution/templates/* your-repo/constitution/

# 2. Author your rules
$EDITOR your-repo/constitution/00-INDEX.md
$EDITOR your-repo/constitution/01-YOUR-FIRST-RAIL.md
# ... (one document per rail, numbered)

# 3. Declare your implementation registry
$EDITOR your-repo/private/specs/implementation/registry.json

# 4. Wire the reference gates into your CI
cp software-constitution/gates/*.mjs your-repo/scripts/gates/
$EDITOR your-repo/.github/workflows/ci.yml  # or your CI config

# 5. Run the conformance test
npx scct your-repo
```

The SCCT emits one of:

- `L0` — no constitution found
- `L1` — structural conformance (artefacts exist, schemas validate)
- `L2` — gate-enforced (every rule has a passing gate)
- `L3` — self-governed (project emits its own audit chain)
- `L4` — platform-bijected (every named surface tracked in a generated meta-index)

---

## The five rule classes (every constitution MUST address)

1. **Zero Competing Systems** (Single-Implementation Mandate)
2. **Zero Repo ↔ Prod Drift**
3. **Zero Stubs / Placeholders / Mocks** reachable from production
4. **Self-Governance + Canonical-First**
5. **Zero-Deviation Mandate** — Active deviations are a regression

Naming and numbering of individual rules is project-specific; the
existence of at least one rule per class is the conformance bar.

---

## Reference conformer

The **KYE Protocol™** monorepo at
<https://github.com/KYE-Protocol> is the canonical reference
conformer. It demonstrates L4 conformance with ~40
constitutional documents, ~85 CI gates, ~1,700 named surfaces tracked
in a generated meta-index, and the full Implementation Registry pattern.
The standard was extracted from KYE Protocol™'s internal constitution;
KYE remains the reference conformer.

---

## Why "standard" not "framework"

- **Protocol** doesn't fit: there is no wire format, no two parties
  communicating through it.
- **Framework** is too low-stakes: implies "install this and inherit
  conventions" — people upgrade past frameworks.
- **Standard** is right: a spec that says "to call yourself a
  conforming software constitution, you MUST have …".

Closest analogues: **12-Factor App** (heroku.com, 2011), **OpenAPI**
(Linux Foundation), **ADR (Architecture Decision Records)**.

---

## Governance

This is v1.0. Feedback issues at
<https://github.com/Software-Constitution/spec/issues>.

---

## License

Apache-2.0. See [`LICENSE`](./LICENSE).

The methodology, schemas, templates, and reference gates are
patent-safe — the Apache 2.0 license grants explicit patent rights
for the published surface. The reference conformer
(KYE Protocol™) carries its own trademarks and patent portfolio,
licensed separately.
