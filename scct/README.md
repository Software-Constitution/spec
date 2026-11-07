# SCCT 1.1 conformance

Run `node scct/scct.mjs <candidate> --require-level=L2`. Exit 0 means the required level was reached; 1 means it was not; 2 means invalid arguments.

L1 requires canonical artifacts, all six rule declarations, one valid canonical implementation registry and JSON Schema validation. The external verifier uses Python 3 with `jsonschema==4.26.0` and fails closed if it is missing.

L2 requires a `constitution/gates.json` manifest with **six runnable gates** (RULE-1 to RULE-6), all returning zero, and a pull request workflow that explicitly invokes SCCT at L2. SCCT runs candidate commands and therefore must be executed in an isolated runner for untrusted code.

L3 **additionally** requires an **out-of-tree** attestation (`--attestation=/absolute/path`) signed by an Ed25519 key whose public half was independently supplied via `--trusted-key=/absolute/path`. Both files must be outside the candidate repo. The attestation has `commit_sha`, `events`, and base64 `signature`; events link SHA-256 hashes of JSON objects with fields `type`, `decision`, `commit_sha`, `prev_hash`. The signature authenticates `JSON.stringify({commit_sha,events})` and is bound to the current Git HEAD. Generating a key inside the candidate repo is **not** trusted.

L4 additionally requires `platform/manifest-index.json` listing JSON manifest paths and `platform/meta-index.generated.json` whose `surfaces` bijectively correspond to the declared manifest surfaces, with all paths resolvable. This is a structural bijection check, not a proof of complete runtime discovery.

Evidence collection, trusted key custody, external deployment reconciliation and independently verified CI provenance are required before claiming full production-grade governance. No badge should exceed its measured scope.

### Immutable evaluation and independent path authority

The L3 evaluator now canonicalizes the candidate root and both externally supplied files with `realpath` and rejects in-repository paths, path aliases and symbolic-link-based provenance escapes. A valid Git checkout must have no tracked changes or untracked files at the time of L3 evaluation; SCCT rechecks after running candidate gates. This protects against accepting an attestation for a different working tree, but it does **not** make running untrusted gates safe: perform SCCT in an isolated immutable CI environment, without privileged credentials. The real production trust-root lifecycle and branch-protection requirements remain explicit separate acceptance gates.

### T0 source admission and deviation semantics

SCCT captures the Git HEAD/clean working-tree state **at process entry, before parsing source or executing any gate**. L3 requires an authenticated attestation of that initial HEAD and another clean, identical HEAD after gate execution. A gate that self-restores dirty inputs during evaluation cannot upgrade them to L3. Candidate code still runs in the invoking process's OS sandbox; only independent runner isolation can bound transient side effects.

Every referenced file, manifest and executable is resolved canonically; symlink escapes and path traversal are rejected. The Active Deviations section is empty only when it contains whitespace or the exact `_(none)_` marker; unstructured text, comments and duplicate sections fail in both JS/Python gates. **Local L2 is not proof of protected GitHub merges**: repository rulesets must separately require the actual CI checks with a verified blocked-merge negative control. Public key proximity alone does not establish independent trust custody.

### Reproducible consumer packaging (no registry publication assumed)

The reference CLI is distributed as the `scct` npm package. `bin.scct`
points to the actual `scct.mjs` shebang entrypoint. To validate package
installability **without network, registry access or release credentials**:

```sh
node --test tests/package-smoke.test.mjs
```

The test runs `npm pack --offline`, installs the generated archive in a fresh
consumer directory using `npm install --offline`, invokes the installed
`scct` executable against this repository at L2, and confirms an empty
candidate fails L1. This proves the local package is loadable and preserves
deny-by-default behavior. It does **not** claim an npm registry version is
published or that GitHub merge rules are protected.

The current CLI requires Node.js >=20, `python3` and the separately pinned
`jsonschema` Python package for schema validation. Before using on a new
CI runner, provision `requirements-verification.txt`. A missing verifier
remains a hard L1/L2 failure.
