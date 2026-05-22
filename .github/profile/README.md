<!-- SPDX-License-Identifier: Apache-2.0 -->
<!--
  GitHub org profile README.
  Lives at github.com/Software-Constitution/.github/profile/README.md
  and renders on github.com/Software-Constitution.
-->

<div align="center">

<img src="https://softwareconstitution.com/assets/logo.jpg" alt="software/constitution" width="520" />

### The open standard for codebases that govern themselves.

[![License](https://img.shields.io/badge/license-Apache_2.0-E63935?style=for-the-badge)](https://www.apache.org/licenses/LICENSE-2.0)
[![Spec](https://img.shields.io/badge/spec-v1.0-0B0B0F?style=for-the-badge&labelColor=E63935)](https://github.com/Software-Constitution/spec/blob/main/SPEC.md)
[![SCCT](https://img.shields.io/badge/SCCT-L0–L4-2A2A36?style=for-the-badge)](https://github.com/Software-Constitution/spec/tree/main/scct)
[![Patent-safe](https://img.shields.io/badge/patent--safe-yes-2A2A36?style=for-the-badge)](https://github.com/Software-Constitution/spec/blob/main/LICENSE)

[**softwareconstitution.com**](https://softwareconstitution.com) · [**Spec**](https://github.com/Software-Constitution/spec/blob/main/SPEC.md) · [**SCCT**](https://github.com/Software-Constitution/spec/tree/main/scct) · [**Templates**](https://github.com/Software-Constitution/spec/tree/main/templates)

</div>

---

## What is a software constitution?

The set of design principles your codebase enforces **at CI time** — versioned, machine-readable, blocking on violation. Wiki pages don't enforce design principles. **Gates do.**

## What is the Standard?

An **Apache-2.0** open specification that defines:

- **5 rule classes** every conformant codebase addresses
- **5 conformance levels** (L0 → L4)
- **SCCT** — the Software Constitution Conformance Test CLI that emits an objective verdict per repo

Closest analogues: **12-Factor App** (heroku, 2011), **OpenAPI** (Linux Foundation), **ADRs** (Architecture Decision Records). We borrow from all three.

## The 5 rule classes

| # | Class | Enforces |
|---|-------|----------|
| 1 | **Zero Competing Systems** | One canonical implementation per named capability |
| 2 | **Zero Repo ↔ Prod Drift** | Declared = deployed; reconciler proves the bijection |
| 3 | **Zero Stubs / Mocks in Prod** | No `TODO`, `FIXME`, placeholders, or mock data reachable from production |
| 4 | **Self-Governance + Canonical-First** | Privileged actions emit the project's audit chain; vocabulary declared before referenced |
| 5 | **Zero-Deviation Mandate** | Active deviations are a regression; empty-Active is steady state |

## The 5 conformance levels

| Level | Means |
|-------|-------|
| **L0** | No constitution found |
| **L1** | Structural — canonical artefacts exist, schemas validate |
| **L2** | Gated — every rule has a passing CI gate |
| **L3** | Self-governed — project emits its own audit chain |
| **L4** | **Platform-bijected** — every named surface is in a generated meta-index; declared = deployed end-to-end |

## Adopt in 5 steps

```bash
# 1. Copy the templates into your repo
cp -r software-constitution/templates/* your-repo/constitution/

# 2. Author your rules (one document per rail, numbered)
$EDITOR your-repo/constitution/00-INDEX.md

# 3. Declare your implementation registry
$EDITOR your-repo/private/specs/implementation/registry.json

# 4. Wire the reference gates into CI
cp software-constitution/gates/*.mjs your-repo/scripts/gates/

# 5. Run the conformance test
npx scct your-repo
```

## Repos in this org

| Repo | What |
|------|------|
| [`spec`](https://github.com/Software-Constitution/spec) | The standard — SPEC, templates, schemas, reference gates, SCCT |

More language ports (Python / Go / Rust) land as separate repos when ready.

## The governance stack

software/constitution™ is the **build layer** of a three-layer open-standards stack — each layer Apache-2.0, each standing on its own, composing into one chain from regulation to runtime evidence:

| Layer | Standard | Answers |
|---|---|---|
| **Model** | [Compliance-to-Architecture™](https://github.com/Compliance-to-Architecture) | *What must be true?* |
| **Build** | **software/constitution™** | *Does the codebase honour its own rules?* |
| **Runtime** | [KYE Protocol™](https://github.com/KYE-Protocol) | *Was the action validly authorised — provably?* |

Compliance-to-Architecture™ models the obligations and controls; **software/constitution™** proves the codebase stays honest to them at CI time; KYE Protocol™ proves the runtime honoured authority and emits the evidence.

## Reference conformer

[**KYE Protocol™**](https://github.com/KYE-Protocol) is the L4 reference. The standard was extracted from its internal constitution; KYE remains the canonical conformer — ~40 constitutional documents, ~85 CI gates, ~1,700 named surfaces tracked in a generated meta-index.

## License

Apache 2.0. Patent-safe. The spec, schemas, templates, and reference gates carry the explicit Apache-2.0 patent grant. Adoption requires no relicensing of your code.

---

<div align="center">
<sub>software/constitution™ is a trademark used to identify the standard. Adopt it; conform to it; don't fork it under the same name.</sub>
</div>
