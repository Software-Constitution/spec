# SCCT 1.1 conformance

Run `node scct/scct.mjs <candidate> --require-level=L2`. Exit 0 means the required level was reached; 1 means it was not; 2 means invalid arguments.

L1 requires canonical artifacts, all six rule declarations, one valid canonical implementation registry and JSON Schema validation. The external verifier uses Python 3 with `jsonschema==4.26.0` and fails closed if it is missing.

L2 requires a `constitution/gates.json` manifest with **six runnable gates** (RULE-1 to RULE-6), all returning zero, and a pull request workflow that explicitly invokes SCCT at L2. SCCT runs candidate commands and therefore must be executed in an isolated runner for untrusted code.

L3 **additionally** requires an **out-of-tree** attestation (`--attestation=/absolute/path`) signed by an Ed25519 key whose public half was independently supplied via `--trusted-key=/absolute/path`. Both files must be outside the candidate repo. The attestation has `commit_sha`, `events`, and base64 `signature`; events link SHA-256 hashes of JSON objects with fields `type`, `decision`, `commit_sha`, `prev_hash`. The signature authenticates `JSON.stringify({commit_sha,events})` and is bound to the current Git HEAD. Generating a key inside the candidate repo is **not** trusted.

L4 additionally requires `platform/manifest-index.json` listing JSON manifest paths and `platform/meta-index.generated.json` whose `surfaces` bijectively correspond to the declared manifest surfaces, with all paths resolvable. This is a structural bijection check, not a proof of complete runtime discovery.

Evidence collection, trusted key custody, external deployment reconciliation and independently verified CI provenance are required before claiming full production-grade governance. No badge should exceed its measured scope.
