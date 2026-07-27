# Security

## Trust boundaries

- The browser is untrusted and never receives the NoCodeBackend secret.
- Client-side route guards are navigation only, not authorisation.
- Every data request is authenticated server-side.
- Owner IDs, roles, totals and provider secrets supplied by a browser are discarded.
- Remote NoCodeBackend permissions remain a required defence in depth and must be tested independently.

## Implemented controls

- Fixed auth action/method allowlist.
- Fixed application data route/workflow allowlist.
- Same-origin checks for unsafe requests, with an explicit optional allowlist.
- Per-client throttling and request body limits.
- Upstream timeouts and safe error mapping.
- Secure session cookie attributes.
- Server-derived immutable user identity.
- Owner checks for profile, cellar and rating mutation.
- Explicit response projections that exclude `secret_key`, raw provider payloads and private owner fields.
- Complete 1–7 rating validation, server-calculated totals, idempotency and compensating rollback.
- CSP, HSTS, clickjacking, MIME-sniffing, referrer and permissions headers.
- Production source maps disabled.
- CodeQL, dependency review, Dependabot and production dependency audit.

The in-memory rate limiter is a baseline abuse control for individual serverless instances. Production must also enable platform/edge rate limiting because instance-local counters are not globally authoritative.

## Logging

Server errors log only correlation ID, status/name and operation counts needed for support. Never log request bodies, passwords, tokens, cookies, user IDs, cellar contents, rating selections, email addresses or provider responses. Return the correlation ID to the client for support.

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
