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

**Result:** Blocked. The procedure was re-run from this repository workspace at
commit `af13281edaffc2aaa508c19c7e8a85b35c46f989`. This environment has no
authenticated access to staging or production deployment settings, the
NoCodeBackend tenant, the Upstash database, deployed endpoint logs, deployment
provider inventories or the private evidence store. Therefore this public
record cannot prove that any credential is configured in server-side
staging/production scopes, cannot confirm provider endpoint identity, cannot
supply deployment request IDs, and cannot name an independent approver. Do not
close G01 or G08 from this record.

Repository-local controls that could be completed without secret access:

| Check | Evidence captured | Result |
| --- | --- | --- |
| Candidate commit identity | Git SHA `af13281edaffc2aaa508c19c7e8a85b35c46f989` | pass |
| Runtime disclosure | Local shell reported Node.js `v24.15.0`; required launch validation must be repeated with Node.js 20 LTS before using this as release evidence | warning |
| Browser production build | `npm run build` completed and emitted only `dist/index.html`, CSS and JavaScript assets; no `.map` artefacts were emitted | pass |
| Browser secret/source-map scanner | `npm run check:release-security` reported `Browser release security check passed.` | pass |
| Artefact manifest hashes | SHA-256 hashes for generated `dist/` files were retained in the command transcript for this documentation change | pass |
| Full repository validation | `npm run validate` ran lint, unit/policy tests and production audit; lint and tests passed, but `npm audit --omit=dev --audit-level=high` failed with `403 Forbidden` from the npm security advisory endpoint before the later validation steps could run | warning |
| Playwright browser installation | `npx playwright install --with-deps chromium` failed while installing system/browser dependencies because Ubuntu, mise and LLVM package requests returned proxy `403 Forbidden` responses | warning |
| Browser end-to-end run | `npm run test:e2e` started but all Chromium tests failed before page execution because the Playwright Chromium executable was absent after the blocked install | warning |

Evidence that remains missing and must be supplied only in the access-controlled
private release record before G01 or G08 can close:

- presence-only provider inventory rows for `NOCODEBACKEND_SECRET_KEY`,
  `NOCODEBACKEND_DATA_BASE_URL`, `UPSTASH_REDIS_REST_URL`,
  `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_KEY_SECRET` and any configured
  `NOCODEBACKEND_AUTH_BASE_URL` or `ALLOWED_ORIGINS` in both staging and
  production server-side scopes;
- explicit negative proof that the same names and values are absent from Vite,
  client/browser, preview-public and repository/evidence scopes;
- redacted request IDs or provider correlation IDs for each least-privilege
  NoCodeBackend, Upstash limiter and origin-policy probe;
- immutable deployment SHA and deployed endpoint/environment identity for both
  staging and production;
- deployed browser bundle and source-map absence checks for the promoted
  artefacts, including any private monitoring upload restrictions if source
  maps are generated outside this repository build;
- redacted application, platform, NoCodeBackend, Upstash and central-log query
  output proving the failure probes omitted secrets, cookies, tokens, raw
  request/response bodies, provider URLs, emails, owner IDs and synthetic
  sentinel values;
- individually named rotation owner, rollback owner and independent approver
  for each credential family; and
- private evidence-store reference that ties the dated evidence package to the
  exact candidate deployment.

## Current public status

As of 5 August 2026, this repository environment has no access to the staging or
production deployment settings, NoCodeBackend tenant, Upstash database, central
logs or private evidence store. Therefore no credential presence, provider
identity, least-privilege probe, production bundle inspection, redacted-log
inspection, rotation rehearsal, rollback rehearsal or approver identity is
claimed here. The corresponding launch gates remain blocked until the private
ledger above is completed and independently approved.
