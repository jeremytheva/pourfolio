# Security

## Contained game surface

Brew Done It is not present in browser routing or navigation. Direct route
requests use the launch catch-all and cannot load its client service or trigger
game API traffic. Independently, the data gateway fails closed for every game
path unless the server-only `BREW_DONE_IT_POLICY_ENABLED` value is exactly
`true`. The flag must remain unset in normal environments and must never be
published with a `VITE_` prefix. Enabling the gateway alone does not make the
unapproved feature a supported product surface.

ADR 0001's accepted future model has no remote game trust boundary: one signed-in
player and a physically present second player use session-memory state on one
device. It does not read private rating history or persist rounds, scores or
statistics, and refresh or sign-out clears all game data.

## Trust boundaries

- The browser is untrusted and never receives the NoCodeBackend secret.
- Client-side route guards are navigation only, not authorisation.
- Every data request is authenticated server-side.
- Owner IDs, roles, totals and provider secrets supplied by a browser are discarded.
- Remote NoCodeBackend permissions remain a required defence in depth and must be tested independently.

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

Server errors log only correlation ID, status/name and operation counts needed for support. Never log request bodies, passwords, tokens, cookies, user IDs, cellar contents, rating selections, email addresses or provider responses. Return the correlation ID to the client for support.

## Unapproved remote proposal

The retained remote policy code proposes fixed shared-history predicates,
immutable two-account participation, bilateral game consent, block checks,
server-derived catalogue targets and cut-offs, restricted boolean responses,
two-predicate disclosure bounds, rate limits and replay prevention. These are
defence-in-depth properties of unreachable research code, not controls for or
authority to implement the accepted same-device model.

That proposal says shared-history question records retain only round ID, recognised predicate,
sequence, asking-participant ID, boolean answer and server timestamp. They are
retained with their parent game for 30 days after completion for abuse and
policy investigation, then hard-deleted; no rating snapshot is retained.
Waiting games expire after 24 hours. Consent timestamps and question records are
deleted with an expired or deleted game, subject only to encrypted backup expiry
within 30 further days. Operational logs must not contain predicates or answers.
Its invitation, shared-history, persisted scoring, durable statistics and this
retention schedule remain unapproved. They cannot be enabled until a
superseding ADR and privacy/security review accept a remote data lifecycle and
the required provider enforcement is proved.

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
