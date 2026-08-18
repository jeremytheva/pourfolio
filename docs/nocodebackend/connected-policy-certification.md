# Connected provider policy certification

This report is the connected half of the Phase 1 evidence model. It certifies
provider policies and workflow behaviour that a structural SQL export cannot
establish. It must describe the same immutable release candidate, provider
environment and schema snapshot as the structural SQL audit. Store secrets,
session material and unredacted user data only in the approved private evidence
store.

## Current execution status

**Result: `BLOCKED` (connected staging could not be certified from this
checkout).** On 5 August 2026 UTC, this repository environment exposed only
`NOCODEBACKEND_DATA_BASE_URL` and no NoCodeBackend secret, auth base URL,
staging deployment URL, seeded owner accounts, reviewer-approved policy export
or private evidence destination. The requested connected probes would require
privileged staging credentials and live test accounts, so no write, delete or
session-forgery attempt was run and no provider request ID is claimed.

The matrix below is intentionally strict: a row can move to `PASS` only when
its provider-configuration evidence, positive owner flow, negative session
checks, before/after digests and cleanup proof all pass for the same staging
deployment and immutable release candidate. Do not use this public file for
secrets, bearer tokens, cookies, email addresses, raw response bodies or full
record identifiers.


## 5 August 2026 execution attempt

A connected staging execution was attempted from `/workspace/pourfolio` on
5 August 2026 UTC for the requested `profiles`, `ratings`, `rating_scores`,
`bonus_attribute_rating_mapping` and `cellar` permission matrix. The local
environment inspection found `NOCODEBACKEND_DATA_BASE_URL` only. It did not
provide the server-only NoCodeBackend secret, auth base URL, staging deployment
identity, seeded Owner A/Owner B accounts, expired or revoked session material,
reviewer-approved provider policy bundle reference, or approved private evidence
destination required to run mutable probes safely.

Because those inputs were absent, no connected request was sent, no disposable
row was created or deleted, no provider request ID was generated, and no
before/after digest or cleanup proof is claimed. The request ledger, invariant
matrix and cleanup proof therefore remain `BLOCKED`; Launch Readiness G06 and
G13 must remain open until a single connected staging run supplies passing
evidence for every row below.

## Report identity

| Item | Required evidence | Current result |
| --- | --- | --- |
| Environment and tenant | Production-equivalent NoCodeBackend tenant/environment identifier, staging host, region if available, and isolation statement proving the data set is not production. | **BLOCKED — not supplied.** Public environment inspection found only a data base URL; no connected staging host, tenant identifier or isolation record was available. |
| Deployed release | Full immutable Git commit SHA, Vercel deployment ID/URL or equivalent host deployment identity, build timestamp and source-map setting. | **BLOCKED — not supplied.** No deployed staging identity tied to this checkout was available. |
| Structural report | Export identifier, SHA-256, UTC export interval and zero-blocker `STRUCTURAL_SQL_AUDIT` result for the same snapshot. | **BLOCKED — not supplied.** No same-state structural export package or `PASS` report was available. |
| Provider policy bundle | Immutable policy/configuration version or export, reviewer-approved private evidence reference and least-privilege service identity scope. | **BLOCKED — not supplied.** No provider permission export or configuration screenshots were available. |
| Connected run | UTC start/end, operator, independent reviewer, redacted request IDs, redacted response summaries, before/after row digests and cleanup result. | **BLOCKED — not run.** Missing staging credentials and accounts prevented connected execution. |

## Required connected staging data set

Create disposable records with an unmistakable `policy-cert-<UTC timestamp>`
prefix or equivalent metadata, then remove them before the gate closes. The
private evidence package must include the generated values and hashes; this
public report may include only redacted stable references.

| Principal or fixture | Required properties | Current result |
| --- | --- | --- |
| Owner A | Active authenticated user with a profile row and permission to create/update/delete only that user's `profiles`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar` records through the launch gateway. | **BLOCKED — not supplied.** |
| Owner B | Separate active authenticated user used for cross-account reads/writes and parent/child ownership mismatches. | **BLOCKED — not supplied.** |
| Missing session | No cookie, no bearer token and no privileged secret on the request. | **BLOCKED — not run.** |
| Forged session | Syntactically plausible but unsigned/tampered token or cookie whose user claim attempts to become Owner A or Owner B. | **BLOCKED — not run.** |
| Expired session | Formerly valid Owner A session beyond provider expiry. | **BLOCKED — not run.** |
| Revoked session | Owner A session invalidated by logout, provider revocation or password/session reset before reuse. | **BLOCKED — not run.** |
| Product and attributes | Existing launch product, rating attributes and bonus attribute identifiers from the same staging snapshot. | **BLOCKED — not supplied.** |

## Connected permission matrix and request ledger

This matrix is deliberately collection-by-fixture rather than grouping several
collections behind one result. A connected operator must replace each
`BLOCKED` cell with the resolvable, redacted evidence from one run. `Before / after`
means a SHA-256 digest of a canonical, owner-scoped row inventory retained in
the private evidence package; denied requests must show the same digest on both
sides. Request IDs must be redacted enough for public review but resolvable in
the private log store by the independent reviewer.

| Collection | Fixture | Connected operation | Expected result | Redacted request ID | Before / after digest | No-mutation or owner-mutation proof | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `profiles` | Owner A | Read own profile; update only editable fields | 200; Owner A allowlisted fields only | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `profiles` | Owner B | Owner A reads and updates Owner B profile | 403/404; Owner B unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `profiles` | Missing session | Read and update Owner A profile | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `profiles` | Forged session | Read and update with a tampered Owner A/B claim | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `profiles` | Expired session | Read and update Owner A profile | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `profiles` | Revoked session | Read and update Owner A profile | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `ratings` | Owner A | Create, read through history and delete own rating | 200/201/204; exact owner graph only | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `ratings` | Owner B | Owner A reads, updates or deletes Owner B rating | 403/404; Owner B graph unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `ratings` | Missing session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `ratings` | Forged session | Create/read/update/delete with a tampered claim | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `ratings` | Expired session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `ratings` | Revoked session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `rating_scores` | Owner A | Create exact scores through Owner A rating flow; read and delete | Exact deterministic children; scores and owner preserved | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `rating_scores` | Owner B | Attach, alter or delete an Owner B score/parent as Owner A | 403/404; Owner B graph unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `rating_scores` | Missing session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `rating_scores` | Forged session | Create/read/update/delete with a tampered claim | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `rating_scores` | Expired session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `rating_scores` | Revoked session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `bonus_attribute_rating_mapping` | Owner A | Create optional mapping through own rating flow; read and delete | One deterministic owner mapping | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `bonus_attribute_rating_mapping` | Owner B | Attach, alter or delete Owner B mapping/parent as Owner A | 403/404; Owner B graph unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `bonus_attribute_rating_mapping` | Missing session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `bonus_attribute_rating_mapping` | Forged session | Create/read/update/delete with a tampered claim | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `bonus_attribute_rating_mapping` | Expired session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `bonus_attribute_rating_mapping` | Revoked session | Create/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `cellar` | Owner A | Create, list, read, update and delete own row | 200/201/204; Owner A row only | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `cellar` | Owner B | Owner A reads, updates, deletes or cross-links Owner B row | 403/404; Owner B row unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `cellar` | Missing session | Create/list/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `cellar` | Forged session | Create/list/read/update/delete with a tampered claim | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `cellar` | Expired session | Create/list/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |
| `cellar` | Revoked session | Create/list/read/update/delete | 401/403; unchanged | Not generated | Not captured | Not captured | **BLOCKED — not run** |

### Evidence references for this attempted run

| Evidence item | Public record |
| --- | --- |
| Redacted request-ID set | **Not generated:** no connected request was sent. |
| Before/after digest set | **Not captured:** no authorised owner-scoped baseline query was possible. |
| Denied-request no-mutation proof | **Not captured:** without both baseline access and the six fixtures, a digest comparison would be invalid. |
| Provider policy bundle reference | **Not supplied:** no immutable version/export or reviewer-approved private reference was available. |
| Environment identity | **Not supplied:** the available data base URL alone does not establish tenant, region, staging isolation or production equivalence. |
| Deployment identity | **Not supplied:** local checkout `e114e4754893095dd269b67813687e305b5c2f17` was not tied to an immutable staging deployment. |
| Cleanup proof | **Not generated:** no disposable fixture or mutation was created; this is not a substitute for post-run zero-row queries and unchanged seed-data digests. |

## Invariant evidence matrix

Every row requires all three evidence cells: provider configuration evidence, a
connected positive result and a connected negative result. “Implemented in the
gateway” is not provider evidence unless direct collection writes are denied
and the residual gateway control has named security/data approval.

| Invariant | Provider configuration evidence | Connected positive test | Connected negative test | Status |
| --- | --- | --- | --- | --- |
| Authentication and owner isolation on `profiles`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar` | Versioned read/write policy, service identity scope and direct-provider-denial evidence for browser clients | Owner A can complete profile read/update, rating create/history/delete and cellar CRUD through the gateway | Missing, forged, expired, revoked and Owner A-to-Owner B sessions are denied without mutation for every listed collection | **BLOCKED** |
| Server-controlled owner, parent, deterministic keys, fingerprint, totals, state, version and expected counts | Field-level create/update allowlists for all rating graph collections and profile/cellar owner fields | Gateway service creates a valid profile/cellar mutation and exact rating header/children | Browser/owner attempts to choose or alter protected fields are denied without mutation | **BLOCKED** |
| Parent and cross-row consistency | Relationship/delete policy plus approved residual control for matching child owner and optional cellar owner/product | Valid product, rating, attribute, bonus and owner relationships persist | Missing/wrong parent, mismatched child owner and mismatched cellar owner/product are rejected | **BLOCKED** |
| Parent deletion behaviour | Reviewed restrict/cascade configuration or approved child-first gateway policy | Approved owner deletion removes or preserves the complete graph as designed | Direct parent deletion cannot orphan scores or bonus mappings | **BLOCKED** |
| Score integer/range behaviour through the provider API | Provider field/check representation matching the structural export | Scores `1` and `7` persist exactly | Fractional, `0` and `8` scores are rejected without rows | **BLOCKED** |
| Non-negative workflow counters through the provider API | Provider check/type configuration matching the structural export | Zero and valid positive values persist via the service workflow | Negative and fractional version/count values are rejected without mutation | **BLOCKED** |
| Allowed workflow states and transitions | Versioned transition policy: `pending -> failed`, `pending|failed -> complete`, with `complete` terminal | Each allowed transition increments version exactly once | Unknown state, forbidden transition and repeat mutation of `complete` are denied | **BLOCKED** |
| Atomic compare-and-set | Provider configuration for matching `expected_version` | Current-version transition changes state and increments once | Stale/concurrent version loses with conflict and no mutation | **BLOCKED** |
| Create-time-only `date_rated` | Provider create/update field policy matching the structural default/no-update definition | Create supplies the server timestamp and an allowed non-date update preserves it byte-for-byte | Client create override and later timestamp update are denied without mutation | **BLOCKED** |
| Idempotent partial-write recovery | Provider/gateway policy and fault-injection mechanism | Identical sequential and concurrent retries converge to one complete graph | Each injected boundary failure returns no success and cannot duplicate or prematurely complete rows | **BLOCKED** |

## Cleanup proof required before any pass

The operator must retain before/after row digests for every test prefix and for
each affected collection: `profiles`, `ratings`, `rating_scores`,
`bonus_attribute_rating_mapping` and `cellar`. Cleanup passes only when all
provider queries by disposable IDs, owner IDs, product IDs, idempotency keys and
metadata prefixes return zero test records, while unrelated staging seed data
hashes remain unchanged.

| Cleanup query group | Collections covered | Required result | Current result |
| --- | --- | --- | --- |
| Disposable profile/account fixtures | `profiles` and auth-provider session inventory | Zero disposable profiles and zero reusable active test sessions unless explicitly retained in the private test-account register | **BLOCKED — not run** |
| Rating graph fixtures | `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` | Zero disposable rating headers, scores, bonus mappings, idempotency keys and orphaned children | **BLOCKED — not run** |
| Cellar fixtures | `cellar` | Zero disposable cellar rows and zero rating links to deleted cellar rows | **BLOCKED — not run** |
| Negative no-mutation checks | All five listed collections | Before and after digests identical for every denied request, including other-owner rows | **BLOCKED — not run** |

## Decision

The connected policy certification remains **`BLOCKED`**. Do not close
Launch Readiness G13 or related permission rows until every identity field,
request-ledger row, invariant row and cleanup query above is populated from the
same connected staging run and independently approved. The Phase 1 launch
decision is `PASS` only when this connected report and its matching structural
SQL audit both report zero blockers.