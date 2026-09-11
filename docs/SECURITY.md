# Security

## Contained game surface

Brew Done It is not present in browser routing or navigation. Direct route
requests use the launch catch-all and cannot load its client service or trigger
game API traffic. Independently, the dedicated Brew Done It gateway fails closed
for every game path unless the server-only `BREW_DONE_IT_POLICY_ENABLED` value is
exactly `true`. The flag must remain unset in normal environments and must never
be published with a `VITE_` prefix. Enabling the gateway alone does not make the
feature a supported product surface.

[ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md) approves a
persistent cross-device model, but the provider collections remain deferred.
Contained source may implement the approved boundary before deployment; it must
not be made reachable until the schema, permissions, secret projection and
connected two-device evidence are certified.

## Brew Done It trust boundary

Brew Done It is a two-account asynchronous game, so the server is authoritative
for participant identity, role, selected beer, sequence, correctness, scoring
and terminal state.

The selected beer is sensitive game state while a round is active. The server
must project different round views to the two participants:

- the selector may receive `selected_product_id` for the round they created;
- the guesser must not receive `selected_product_id` or an equivalent answer
  field before the round becomes completed or forfeited;
- the guesser must not receive server-added product, producer, category or other
  data that directly reveals the selected beer;
- a correct/incorrect result is calculated server-side from the protected
  product identifier; and
- the selected beer may be revealed to both players only after terminal state.

React visibility is not an authorisation control. Tests must inspect the raw
HTTP response received by the guesser's device.

State-changing game requests use optimistic versions and idempotency keys.
Browser-supplied participant IDs, turn numbers, correctness, score totals or
completion state are ignored. A stale or repeated request must not create a
second question, guess, round or score award.

Base-game questions use only public catalogue facts. Shared rating history,
cellar data, account data and relationship data are outside the approved base
question boundary. Free-text questions are not approved for the first delivery.

## Trust boundaries

- The browser is untrusted and never receives the NoCodeBackend secret.
- Client-side route guards are navigation only, not authorisation.
- Every data request is authenticated server-side.
- Owner IDs, roles, totals and provider secrets supplied by a browser are discarded.
- Remote NoCodeBackend permissions remain a required defence in depth and must be tested independently.

## Account export projection boundary

The future export's source-only projection is implemented in
`api/_lib/accountExport.js`, but no export route exists. The module derives its
owner solely from a supplied server-authenticated account identity, exact-matches
`user_id`, rejects ambiguous/missing relationships and returns no partial
manifest on validation failure. Explicit field objects prevent provider
secrets, raw owner fields, idempotency keys, fingerprints, workflow versions and
unrecognised metadata from crossing the projection boundary. Other-user rows and
unreferenced catalogue rows are excluded even if they appear in the supplied
snapshot.

`api/_lib/accountExportArtifact.js` adds the source-only serialization boundary.
It emits deterministic UTF-8 JSON with an immutable constant ASCII filename,
`application/json; charset=utf-8`, `Cache-Control: no-store`, attachment content
disposition and `X-Content-Type-Options: nosniff`. It calculates byte length and
SHA-256 over the exact body. No request or personal-data value can enter a
header, and the helper performs no response write, persistence or logging.

These modules are not authentication, authorisation of an HTTP request or proof
of snapshot consistency. They must remain unreachable until the provider
supplies a server-verifiable recent-authentication contract and a consistent
snapshot (or an approved equivalent fence/reconciliation workflow). A future
endpoint must add same-origin and export-specific rate controls, apply the
artifact helper's fixed response metadata, prove actual response bytes, provide
all-or-nothing provider failure handling, and pass connected
other-user/expired-session tests. Exported values, artifact checksums, account
IDs, emails, cookies, tokens and provider responses must never be logged. See the
[portable export contract](account-export-contract.md).

## Account-deletion discovery boundary

`api/_lib/accountDeletionPlan.js` implements only the pure discovery projection
for a future whole-account deletion workflow. It requires all five owner-data
collections, exact-matches the supplied server identity, rejects ambiguous and
cross-owner relationships, and returns only immutable record IDs and counts in
the fixed child-first order. It excludes every record body, catalogue
definition, provider workflow field and request value. It adds
no separate authentication-identity field, although a profile record ID may
equal the account ID under the canonical schema.

Provider record IDs remain sensitive operational data. The planner must not be
imported by a route or worker, returned to a browser, logged or persisted until
a reviewed job-store and retention contract exists. It does not verify a recent
session, confirmation phrase, snapshot completeness, write fence, provider
ownership at deletion time, idempotent retry, final absence, session revocation
or authentication-identity deletion. Those controls and connected negatives are
mandatory before any destructive workflow; see the
[deletion-plan contract](account-deletion-plan-contract.md).

`api/_lib/accountDeletionReconciliation.js` consumes that sensitive plan only
inside a pure function, strictly validates its allowlisted shape and compares
its IDs with a later snapshot without returning any identifier. Its immutable
output contains per-collection and aggregate counts and remains incomplete when
new owner records appear after discovery. Unexpected plan fields and count or
ordering drift fail closed without echoing the supplied values.

This count-only result is not provider-backed erasure evidence. The reconciler
does not query the provider, prove a complete/consistent snapshot, authenticate
a request, fence writes, inspect job state, delete data, revoke sessions or
remove an identity. It must remain unreachable until the same destructive-entry
criteria pass; see the
[reconciliation contract](account-deletion-reconciliation-contract.md).

`api/_lib/accountDeletionConfirmation.js` adds only exact request-shape and
phrase validation. It requires one enumerable data property, performs no
trimming/case-folding/Unicode normalisation/coercion, rejects accessors and every
extra identity/record/job field, and returns no supplied text. Symbols and
non-enumerable smuggled values also fail. Generic errors do not echo inputs.

The result is not authentication, recent-authentication evidence, CSRF/origin
protection, rate limiting, account identity, replay protection or deletion
authorisation. It must remain unreachable until a size-limited protected route
derives identity only from the session and every destructive-entry criterion
passes; see the
[confirmation contract](account-deletion-confirmation-contract.md).

## Implemented launch controls

- Fixed auth action/method allowlist.
- Fixed application data route/workflow allowlist.
- Same-origin checks for unsafe requests, with an explicit optional allowlist.
- Per-client throttling and request body limits.
- Upstream timeouts and safe error mapping.
- Host-only, root-path session cookies with enforced `HttpOnly` and `Secure` attributes.
- Server-derived immutable user identity.
- Owner checks for profile, cellar and rating mutation.
- Explicit response projections that exclude `secret_key`, raw provider payloads and private owner fields.
- Catalogue product details expose rating aggregates only (count and average), never rating, submission or cellar identifiers, dates, or individual scores; personal history remains owner-only at `/ratings/mine`.
- Both browser catalogue reads validate an exact render-safe public response
  contract before updating state. Unknown, hidden, symbolic or accessor fields,
  incoherent pagination, duplicate/invalid stable IDs, relationship mismatch,
  malformed aggregates and individual rating entries fail with one non-echoing
  error and use the existing alert/retry UI. The validator copies and deeply
  freezes accepted data without mutating its input; see the
  [catalogue response contract](catalogue-response-contract.md).
- Provider pagination must match the requested page/size and reconcile its
  totals with the exact full/terminal item count. Direct and fallback provider
  reads accept only the requested record ID; the gateway and browser repeat the
  product-detail ID check. Non-canonical product route IDs fail before browser
  network access, preventing a substituted product from driving rating or
  cellar links.
- Complete 1–7 rating validation, server-calculated totals, idempotency and compensating rollback.
- CSP, HSTS, clickjacking, MIME-sniffing, referrer and permissions headers.
- Production source maps disabled.
- CodeQL, dependency review, Dependabot and production dependency audit.

The authoritative authentication limiter is shared Upstash Redis and uses atomic
increment-and-expiry operations. The local limiter remains bounded defence in
depth: expired entries are removed and at most 5,000 buckets are retained. Vercel
documents that `x-vercel-forwarded-for` is overwritten by its proxy; only that
deployment-controlled header is trusted in production, never client-selectable
`x-forwarded-for`. Outside Vercel, the socket peer address is used.

`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and
`RATE_LIMIT_KEY_SECRET` are server-only variables and must not use a `VITE_`
prefix. The Upstash client is initialised with `Redis.fromEnv()`. The health
endpoint reports only whether required configuration is present; it does not
return configuration values or test the shared store.

If Redis is unavailable, malformed or unconfigured, authentication fails closed
with HTTP 503; the request is not sent to NoCodeBackend. Monitor Redis error and
latency metrics, authentication 429/503 rates, key count and memory, and alert on
sustained changes. Never log Redis tokens, opaque keys, account identifiers or
request bodies. Rotate the REST token and `RATE_LIMIT_KEY_SECRET` through encrypted
Vercel environment settings; rotation intentionally starts fresh buckets.

The public 503 body remains generic but includes one safe diagnostic code:
`rate_limit_configuration_missing` only when required limiter configuration is
absent, or `rate_limit_service_unavailable` for client, connection, command and
result failures. These codes must not reveal which Redis variable is absent,
provider identity, addresses, credential validity, keys or raw errors. Provider
discovery exposes no authentication control while pending or failed.

## Logging

Server errors log only correlation ID, status/name and operation counts needed for support. Never log request bodies, passwords, tokens, cookies, user IDs, cellar contents, rating selections, email addresses, selected Brew Done It beers, challenge credentials or provider responses. Return the correlation ID to the client for support.

## Brew Done It provider controls required before enablement

The approved cross-device capability requires four persistent collections and
participant-scoped enforcement described in
[`nocodebackend/brew-done-it-schema-target.md`](nocodebackend/brew-done-it-schema-target.md).
The application currently treats those collections as deferred and does not
claim provider permission evidence.

Before enablement, connected tests must prove:

- an outsider cannot enumerate or read another pair's series/rounds;
- the selector cannot submit guesser actions and the guesser cannot replace the selected beer;
- the guesser's raw active-round response never contains the selected beer;
- stale versions and repeated idempotency keys cannot duplicate actions or points;
- a terminal round reveals the beer only after the terminal state is durable;
- persistent statistics reconcile exactly to terminal round rows; and
- invitation, archive and eventual deletion/retention controls behave as documented.

The legacy shared-rating-history implementation in `api/data-proxy.js` remains
quarantined source and is not the approved game gateway. It must not regain a
routing path merely because its older tests still exist for regression history.

## Photos and deferred features

Photo upload, privacy controls, chat, social sharing, events, venues, producer claims and administration are disabled in launch routing. They require their own permission, retention, moderation, validation and deletion controls before reactivation.

## Production proof required

Before launch:

1. Rotate any credential that may have matched the former published admin hint.
2. Configure the server variables only in encrypted deployment settings.
3. Test unauthenticated, owner, other-user and privileged negative cases against the remote collections.
4. Enable GitHub secret scanning/push protection and branch protection in repository settings.
5. Complete an external security/privacy review appropriate to the Australian launch context.
6. Verify edge rate limits, alerting, backup restore and incident response.

Report vulnerabilities using GitHub’s private security-advisory flow. Do not open a public issue containing exploit details, credentials or personal data.
