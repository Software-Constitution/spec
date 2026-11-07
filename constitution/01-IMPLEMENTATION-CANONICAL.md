# Constitutional rails

**RULE-1:** one canonical implementation per named capability in implementation/registry.json.

**RULE-2:** this repo is specification-only; its deployment scope is constitution/deployment-scope.json. No production drift may be claimed for deployments outside this boundary.

**RULE-3:** no stubs/placeholders in executable implementation paths.

**RULE-4:** versioned SCCT verdict events must use the contract in constitution/event-registry.json.

**RULE-5:** Active deviations stay empty and are checked mechanically.

**RULE-6:** all registered implementation surfaces resolve in both directions; completeness for other categories requires later catalog expansion.

Conformance statements are limited to actual checked paths and scopes; audit existence does not imply proof of external runtime behavior.
