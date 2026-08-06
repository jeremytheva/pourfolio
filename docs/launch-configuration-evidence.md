# Launch configuration evidence procedure

Use this procedure to complete the launch configuration evidence referenced by
[Launch readiness](LAUNCH_READINESS.md) for staging and production. The public
repository must record only the evidence contract and blocked/pass status; the
completed artefacts belong in the access-controlled private release record.

## Scope and secrecy rules

Record presence only, never values, for these server-side variables in both
staging and production:

- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_DATA_BASE_URL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RATE_LIMIT_KEY_SECRET`
- `NOCODEBACKEND_AUTH_BASE_URL`, if deliberately configured
- `ALLOWED_ORIGINS`, if deliberately configured

Do not copy provider URLs, tokens, cookies, authorisation headers, response
bodies, row payloads, request bodies, email addresses, user IDs or private user
data into the public repository, public issues, pull requests or chat. Redacted
evidence may retain environment name, deployment identifier, full Git SHA, UTC
time, tool version, provider environment identifier, HTTP status class, request
ID/correlation ID and pass/fail result.

## Evidence ledger

Create one private ledger row per environment and variable. Each row must include
all columns below and must leave the value/fingerprint fields blank unless the
entry is a redacted negative statement such as `not exposed`.

| Environment | Variable | Presence recorded? | Server-only scope verified? | Least-privilege probe | Endpoint/environment identity confirmed? | Request ID(s) | Rotation owner | Rollback owner | Result | Approver |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Staging | `NOCODEBACKEND_SECRET_KEY` | presence only | no browser/public exposure | Provider gateway read/write-negative probe using the application server only | Provider tenant/environment label matches staging | private `X-Request-Id`/provider ID | named owner | named owner | pass/block | named reviewer |
| Staging | `NOCODEBACKEND_DATA_BASE_URL` | presence only | no browser/public exposure | Gateway collection list/filter/get/create/update/delete contract probe | Provider base environment label matches staging | private `X-Request-Id`/provider ID | named owner | named owner | pass/block | named reviewer |
| Staging | `UPSTASH_REDIS_REST_URL` | presence only | no browser/public exposure | Auth limiter `429` and safe `503` path using synthetic accounts | Upstash database/environment label matches staging | private `X-Request-Id`/Upstash request ID | named owner | named owner | pass/block | named reviewer |
| Staging | `UPSTASH_REDIS_REST_TOKEN` | presence only | no browser/public exposure | Same limiter probe, proving only limiter commands are exercised | Upstash database/environment label matches staging | private `X-Request-Id`/Upstash request ID | named owner | named owner | pass/block | named reviewer |
| Staging | `RATE_LIMIT_KEY_SECRET` | presence only | no browser/public exposure | Same limiter probe, proving opaque bucket keys and no account identifiers | Application deployment/environment label matches staging | private `X-Request-Id` | named owner | named owner | pass/block | named reviewer |
| Staging | `NOCODEBACKEND_AUTH_BASE_URL` if set | presence only | no browser/public exposure | Auth proxy providers/sign-in/session failure probe via same-origin proxy | Provider auth tenant/environment label matches staging | private `X-Request-Id`/provider ID | named owner | named owner | pass/block | named reviewer |
| Staging | `ALLOWED_ORIGINS` if set | presence only | no browser/public exposure | Allowed origin succeeds and disallowed origin fails with safe body | Deployment origin label matches staging | private `X-Request-Id` | named owner | named owner | pass/block | named reviewer |
| Production | Same rows as staging | presence only | no browser/public exposure | Production-safe smoke/probe with synthetic accounts and no destructive data | Provider/deployment labels match production | private IDs | named owner | named owner | pass/block | named reviewer |

## Operational probes

Run probes from the deployed server/runtime so privileged calls never originate
in browser code. Use dedicated synthetic accounts and test records approved for
that environment. Capture command names, UTC start/end, deployment SHA, provider
environment label, request IDs and aggregate result only.

1. **Configuration presence:** verify the deployment platform reports each
   variable as configured in the intended environment and not configured in
   browser/Vite scopes. Screenshot or export the environment-variable inventory
   with values hidden.
2. **NoCodeBackend data endpoint:** through `/api/nocodebackend/*`, exercise a
   representative list, filtered list, get, create, update, delete, not-found,
   duplicate/unique-conflict, malformed-response, timeout and upstream-failure
   path. Reconcile to the gateway response shapes and record only status,
   expected error code and request IDs.
3. **NoCodeBackend auth endpoint:** through `/api/nocodebackend/auth/*`, exercise
   providers/session and representative failed sign-in/OTP paths. Confirm any
   deliberately configured auth base URL identifies the intended provider
   environment. Do not record email addresses, OTP values, cookies or provider
   payloads.
4. **Upstash limiter:** using the shared auth limiter paths, prove ordinary
   requests are admitted, thresholded requests return `429`, Redis/provider
   failure returns the documented safe error, and rate-limit keys are opaque.
   Record only route template, result, request IDs and the Upstash environment
   identity.
5. **Origin policy:** when `ALLOWED_ORIGINS` is configured, prove the deployed
   origin is accepted and a synthetic disallowed origin receives the documented
   safe denial. Do not retain raw headers beyond the redacted origin category.

## Browser artefact and source-map inspection

For each deployment candidate, build the exact SHA and inspect the deployed
artefacts and generated source maps before promotion.

- Run `npm run build` and `npm run check:release-security` with the same
  server-only environment variables available to the deployment build process.
- Confirm production sourcemaps are absent from published assets and monitoring
  uploads. If maps exist for private monitoring, scan them before upload and
  prove access is restricted.
- Search built JavaScript, CSS, HTML and map artefacts for server-only variable
  names, configured values, distinctive value fragments/fingerprints, provider
  privileged URLs, direct NoCodeBackend/Upstash calls and secret-bearing header
  patterns.
- Record pass/fail, artefact manifest hash, deployment URL, deployment SHA and
  reviewer. Do not paste matches containing values; describe only the safe
  finding category.

The repository check in `scripts/check-browser-release-security.js` is a
minimum automated control. It scans browser source and `dist` for server-only
variable names and configured values, optional auth/origin configuration,
Upstash browser use, direct upstream NoCodeBackend URLs, source-map content or
references and secret-bearing header patterns.

## Failure and redacted-log evidence

Exercise representative failures in staging and a production-safe subset after
promotion authorisation:

- missing/invalid session;
- disallowed origin;
- bad request body shape;
- owner/other-user denial;
- provider timeout or upstream failure;
- Redis/rate-limiter unavailable path; and
- duplicate-rating/idempotency retry where applicable.

For each failure, retain the response status, safe error code, UTC time,
deployment SHA, route template and request ID. Query application, platform,
provider and central logs by request ID and prove the exported log rows omit
secrets, cookies, tokens, raw request bodies, response bodies, private user
data, provider URLs, emails, owner IDs and synthetic sentinel values. Keep the
redacted query output in the private release record.

## Rotation ownership and rollback

Before approving the gate, record named owners and tested rollback for every
credential family:

| Credential family | Rotation owner | Rotation trigger | Rollback owner | Rollback requirement |
| --- | --- | --- | --- | --- |
| NoCodeBackend secret and data/auth URLs | Named backend operator | suspected exposure, provider-role change, environment rebuild or scheduled rotation | Named release operator | reapply previous valid server-only configuration or roll back to the previous immutable deployment without exposing values |
| Upstash REST URL/token | Named platform operator | suspected exposure, database rebuild, limiter policy change or scheduled rotation | Named release operator | restore previous Redis environment binding or roll back deployment while preserving safe limiter behaviour |
| `RATE_LIMIT_KEY_SECRET` | Named security/platform owner | suspected exposure or scheduled rotation | Named release operator | deploy compatible new secret; accept bucket reset as expected, or roll back to previous deployment/configuration during the release window |
| `ALLOWED_ORIGINS` | Named release/platform owner | domain change, preview/production promotion or origin incident | Named release operator | revert to the last approved origin list or roll back deployment |

The approver must be an individually named independent reviewer, not merely a
team or role. Approval requires the dated deployment SHA, request IDs, probe
results, redaction proof, rotation owner, rollback owner and evidence-store
reference.

## 5 August 2026 execution record

**Result:** Pass. The access-controlled package
`PRR-2026-08-05-LAUNCH-CONFIG` is complete and independently approved for the
staging and production deployments of commit
`af13281edaffc2aaa508c19c7e8a85b35c46f989`. This public record deliberately
records the package identifier and aggregate conclusions only; credential
values, provider URLs, private endpoint identifiers, personal data and
operational log content remain in the private release record.

The approved presence ledger records `NOCODEBACKEND_SECRET_KEY`,
`NOCODEBACKEND_DATA_BASE_URL`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN` and `RATE_LIMIT_KEY_SECRET` as present in both
staging and production server-runtime scopes. It also records an explicit
configured/not-configured disposition for `NOCODEBACKEND_AUTH_BASE_URL` and
`ALLOWED_ORIGINS` in each environment. The inventory and candidate artefact
checks confirm that none of those names or values is exposed through Vite or
browser scopes, repository files, published bundles, source maps, command
transcripts or the public evidence.

The private package retains, for each environment:

- the immutable deployment SHA and deployment, provider tenant, data endpoint,
  auth endpoint (when configured) and Upstash database identities;
- redacted application and provider request/correlation IDs for the
  least-privilege data-gateway, authentication, limiter and origin-policy
  probes, including negative and safe-failure results;
- the exact deployed artefact manifest, browser secret scan and source-map
  absence result;
- redacted application, platform, NoCodeBackend, Upstash and central-log query
  results proving the exercised failures did not disclose secrets, tokens,
  cookies, raw request or response bodies, provider URLs, email addresses,
  owner IDs, private user data or synthetic sentinel values; and
- the individually named rotation owner and rollback owner for every credential
  family, the rollback rehearsal result, and the individually named independent
  approver and approval time.

| Evidence area | Staging | Production | Retained private evidence |
| --- | --- | --- | --- |
| Required-variable presence and server-only scope | pass | pass | Presence-only inventory, optional-variable disposition and public/browser negative checks |
| Endpoint and environment identity | pass | pass | Deployment, NoCodeBackend and Upstash identity records tied to the candidate SHA |
| Least-privilege probes | pass | pass | Redacted request IDs, route/operation identities, expected status classes and aggregate results |
| Browser artefact and source-map inspection | pass | pass | Deployed manifest, secret scan and source-map absence evidence |
| Failure and redacted-log inspection | pass | pass | Request-ID-correlated redacted queries and prohibited-field absence results |
| Rotation and rollback ownership | pass | pass | Named owners per credential family and successful rehearsal records |
| Independent approval | pass | pass | Named approver, approval time and immutable package reference |

G01 and G08 may be closed only for this frozen candidate and these approved
deployments. A credential change, endpoint change, environment rebuild or new
release candidate requires a new evidence package and approval; this record
must not be treated as proof for a later deployment.

## Current public status

As of 5 August 2026, the complete, independently approved evidence is retained
under `PRR-2026-08-05-LAUNCH-CONFIG` in the access-controlled private release
record. Its presence-only inventory, server-scope negatives, least-privilege
probes, endpoint/environment identity checks, deployed artefact inspection,
redacted-log checks, ownership records and rollback rehearsal pass for staging
and production at commit `af13281edaffc2aaa508c19c7e8a85b35c46f989`.
Credential values and sensitive operational evidence are intentionally not
reproduced here.
