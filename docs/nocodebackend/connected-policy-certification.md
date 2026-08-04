# Connected provider policy certification

This report is the connected half of the Phase 1 evidence model. It certifies
provider policies and workflow behaviour that a structural SQL export cannot
establish. It must describe the same immutable release candidate, provider
environment and schema snapshot as the structural SQL audit. Store secrets and
unredacted user data only in the approved private evidence store.

## Report identity

| Item | Required evidence | Result |
| --- | --- | --- |
| Environment and tenant | Production-equivalent non-production identifier | **BLOCKED — not supplied** |
| Deployed release | Full immutable commit/deployment identifier | **BLOCKED — not supplied** |
| Structural report | Export identifier, SHA-256 and zero-blocker `STRUCTURAL_SQL_AUDIT` result | **BLOCKED — not supplied** |
| Provider policy bundle | Immutable policy/configuration version and approved private evidence reference | **BLOCKED — not supplied** |
| Connected run | UTC time, operator, redacted request IDs and test-data cleanup result | **BLOCKED — not run** |

## Invariant evidence matrix

Every row requires all three evidence cells: provider configuration evidence,
a connected positive result, and a connected negative result. “Implemented in
the gateway” is not provider evidence unless direct collection writes are
denied and the residual gateway control has named security/data approval.

| Invariant | Provider configuration evidence | Connected positive test | Connected negative test | Status |
| --- | --- | --- | --- | --- |
| Authentication and owner isolation on ratings and children | Versioned read/write policy and service identity scope | Owner can use each allowed rating journey through the gateway | Unauthenticated and other-owner direct/gateway reads and writes are denied without mutation | **BLOCKED** |
| Server-controlled owner, parent, deterministic keys, fingerprint, totals, state, version and expected counts | Field-level create/update allowlists | Gateway service creates a valid header and exact children | Browser/owner attempts to choose or alter protected fields are denied without mutation | **BLOCKED** |
| Parent and cross-row consistency | Relationship/delete policy plus approved residual control for matching child owner and optional cellar owner/product | Valid product, rating, attribute, bonus and owner relationships persist | Missing/wrong parent, mismatched child owner, and mismatched cellar owner/product are rejected | **BLOCKED** |
| Parent deletion behaviour | Reviewed restrict/cascade configuration or approved child-first gateway policy | Approved deletion removes or preserves the complete graph as designed | Direct parent deletion cannot orphan scores or bonus mappings | **BLOCKED** |
| Score integer/range behaviour through the provider API | Provider field/check representation matching the structural export | Scores `1` and `7` persist exactly | Fractional, `0` and `8` scores are rejected without rows | **BLOCKED** |
| Non-negative workflow counters through the provider API | Provider check/type configuration matching the structural export | Zero and valid positive values persist via the service workflow | Negative and fractional version/count values are rejected without mutation | **BLOCKED** |
| Allowed workflow states and transitions | Versioned transition policy: `pending -> failed`, `pending|failed -> complete`, with `complete` terminal | Each allowed transition increments version exactly once | Unknown state, forbidden transition and repeat mutation of `complete` are denied | **BLOCKED** |
| Atomic compare-and-set | Provider configuration for matching `expected_version` | Current-version transition changes state and increments once | Stale/concurrent version loses with conflict and no mutation | **BLOCKED** |
| Create-time-only `date_rated` | Provider create/update field policy matching the structural default/no-update definition | Create supplies the server timestamp and an allowed non-date update preserves it byte-for-byte | Client create override and later timestamp update are denied without mutation | **BLOCKED** |
| Idempotent partial-write recovery | Provider/gateway policy and fault-injection mechanism | Identical sequential and concurrent retries converge to one complete graph | Each injected boundary failure returns no success and cannot duplicate or prematurely complete rows | **BLOCKED** |

Attach redacted request/response summaries, before/after row digests and
provider configuration screenshots or exports via safe evidence references.
Each result must state expected outcome, actual outcome and residual row count.

## Decision

**Current result: `BLOCKED` (10 invariant blockers plus 5 report-identity
blockers).** No connected provider evidence was available in this checkout.

Set this report to `PASS` only after every identity and invariant row is
complete, every positive and negative result passes, cleanup leaves zero test
records, and the named security/data and release reviewers approve the evidence.
The Phase 1 launch decision is `PASS` only when this connected report and its
matching structural SQL audit both report zero blockers.
