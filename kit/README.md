<!-- SPDX-License-Identifier: Apache-2.0 -->

# Constitution Kit

> The enforcement toolkit of the **software/constitution™** OSS
> standard ([`../SPEC.md`](../SPEC.md)). The standard defines *what* a
> conforming constitution is; this kit is *how* you scaffold and
> enforce one. Governed by KYE constitution §42.

A portable, dependency-free kit for making any project **constitution-bound**:
governed by a numbered constitution, with every enforceable fact in a
machine-readable registry and a CI gate that fails on drift or on a
concept defined twice.

It is the KYE Protocol governance method — *registry → generator →
`--check`*, and *zero competing systems* — extracted so other projects
can adopt it. Governed by `constitution/42-CONSTITUTION-KIT.md`.

## What it is not

Not a framework, not a runtime, not a build tool. It adds three things
and nothing else: a constitution skeleton, an enforcement engine, and a
manifest that ties your registries and invariants to CI.

## The method

1. **Machine-readable enforceable facts.** Every fact the project can
   be wrong about — a count, a roster, an identifier, a mapping — lives
   in a registry, never hand-copied. Prose cites registries; it never
   restates them.
2. **Registry → generator → check.** Each registry has one generator
   that projects it into derived artifacts, and the generator supports
   `--check` (exit non-zero on drift). Generated artifacts are never
   hand-edited.
3. **Zero competing systems.** Every concept appears exactly once.
   Facts that must be uniform are declared as single-value concepts and
   scanned across the surface.

## Adopt it in three steps

```sh
# 1. scaffold the engine + constitution skeleton into your project
node public/oss/software-constitution/kit/init.mjs /path/to/your-project

# 2. wire the gate into package.json "scripts" and `npm test`
#    "test:constitution": "node scripts/constitution/run.mjs"

# 3. declare your registries + invariants in constitution-kit.json
```

`init.mjs` never overwrites — re-running it is safe.

## The manifest — `constitution-kit.json`

Lives at the project root. Schema:
`public/oss/software-constitution/kit/schema/constitution-kit.manifest.json`.

```json
{
  "project": "Your Project",
  "constitution_dir": "constitution",
  "registries": [
    {
      "id": "page-registry",
      "source": "registry/pages.json",
      "schema": "schema/pages.json",
      "generator": "scripts/build-pages.mjs",
      "outputs": ["dist/pages.html"]
    }
  ],
  "single_value_concepts": [
    {
      "id": "asset-cache-bust",
      "pattern": "[?&]v=([0-9]{8,12})",
      "globs": ["public/**/*.html"]
    }
  ]
}
```

- **`registries`** — each `generator` is run with `--check`; a non-zero
  exit is drift. When a `schema` is given and `ajv` is installed, the
  `source` is validated against it first.
- **`single_value_concepts`** — each `pattern` is scanned across its
  `globs`; the first capture group is the value that must be uniform.
  More than one distinct value fails the gate.

## The gate

`run.mjs` walks up from itself to find `constitution-kit.json`, runs
every check, and exits non-zero on any violation. It has **zero
runtime dependencies**; JSON Schema validation uses `ajv` when the host
project already has it and is skipped with a warning when it does not.

## Layout

```
public/oss/software-constitution/
├── SPEC.md                                the standard (defines conformance)
├── kit/
│   ├── README.md                          this file
│   ├── run.mjs                            gate entrypoint (wire into npm test)
│   ├── init.mjs                           scaffolder
│   ├── lib/gate-runner.mjs                the enforcement engine
│   └── schema/constitution-kit.manifest.json  manifest JSON Schema
└── templates/00-INDEX.template.md         constitution skeleton (the standard's)
```

The kit lives inside the software/constitution standard — one OSS
project, Apache-2.0. The standard's `templates/` are the single source
of the constitution skeleton; the kit does not ship its own.

## Dogfooding

KYE Protocol is itself an adopter: `constitution-kit.json` at the repo
root is a real manifest, and `npm run test:constitution-kit` runs this
kit against KYE's own registries. The kit is held to the standard it
ships — KYE is the standard's reference conformer.
