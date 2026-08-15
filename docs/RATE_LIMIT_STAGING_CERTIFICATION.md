# Shared authentication limiter staging certification

## Current certification status

**Blocked as at 3 August 2026.** This delivery environment was not supplied
with an isolated Vercel staging project, an Upstash staging database, server
configuration, deployment credentials, a monitoring destination or alerting
administrator access. No remote deployment, provider fault injection,
dashboard configuration or staging request is therefore claimed. Source-only
tests are useful evidence but do not constitute connected certification.

Never place the missing values, Redis addresses, deployment identifiers,
account identifiers, raw logs or screenshots in this repository or a pull
request. Store dated, redacted evidence in the private release record.

## Frozen candidate and server-only configuration

An authorised operator must deploy the exact candidate commit to an
access-isolated, non-production Vercel project connected to a dedicated Upstash
database. Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and a
separately generated `RATE_LIMIT_KEY_SECRET` as encrypted **server-only**
staging variables. Do not use a `VITE_` prefix, expose values to browser code,
reuse production credentials, or pass secrets in commands, workflow inputs or
test output. Confirm `/api/health` reports only the configuration Boolean and
that built browser assets pass `npm run check:release-security`.

Record the commit, immutable deployment reference, Upstash database reference,
UTC start/end, operator and independent reviewer privately. Rotate all three
values and destroy test buckets after certification.

## Connected test matrix

Use reserved documentation addresses and synthetic, non-deliverable account
identifiers. For each policy, start with a unique address/account pair and
record only the route template, request ordinal, status, safe headers,
correlation ID and elapsed time.

| Route | Boundary | Fixed window | Representative legitimate staging scenario |
| --- | ---: | ---: | --- |
| `sign-up/email` | 5 allowed; request 6 rejected | 60 minutes | One registration plus cautious retries; five per hour is deliberately conservative against account creation abuse. |
| `sign-in/email` | 10 allowed; request 11 rejected | 15 minutes | Password-manager retry and correction traffic remains below the boundary while password spraying is slowed. |
| `sign-in/otp` | 10 allowed; request 11 rejected | 15 minutes | Resend/correction traffic has headroom, but automation cannot request unlimited codes. |
| `verify-otp` | 8 allowed; request 9 rejected | 15 minutes | Several mistypes are tolerated while code guessing is constrained. |

For every row:

1. Send requests 1 through `limit + 1` sequentially. Requests through `limit`
   must proceed to the normal generic authentication response; request
   `limit + 1` must return generic `429` without contacting the auth provider.
2. Assert `X-RateLimit-Limit` equals the policy boundary,
   `X-RateLimit-Remaining` decreases to `0` and stays at `0`, and rejected
   responses include `Retry-After` rounded up to whole seconds. Do not assert
   secret-dependent Redis key text.
3. Repeat from an empty bucket with `limit + 1` simultaneously released
   requests. Exactly `limit` may pass the limiter and every atomic counter
   value must be unique from 1 through `limit + 1`.
4. Repeat with the same normalised account at a second documentation address,
   then a different account at the first address. Each must have an independent
   opaque bucket. Inspect Upstash only through an authorised console and record
   that neither raw address nor account text occurs in key names.
5. Send a request immediately before expiry: it must remain rejected and its
   remaining TTL must not reset. Send immediately after expiry: it must start
   at count 1 with a full new fixed window. Allow clock/network tolerance only
   in scheduling, never by weakening the asserted Redis TTL contract.

## Controlled failure and recovery matrix

Use provider-supported staging controls or a temporary network policy; never
damage production or print a raw exception. For each case, the auth provider
must not receive the request. Every response must retain the same generic `503`
message and correlation ID. Missing required configuration must return
`rate_limit_configuration_missing`; every runtime/provider failure must return
`rate_limit_service_unavailable`. The single application log event must contain
only its allowlisted safe category and that correlation ID.

| Simulation | Public code | Expected telemetry category |
| --- | --- | --- |
| Remove one variable in a disposable deployment | `rate_limit_configuration_missing` | `configuration` |
| Prevent client creation or provider connection | `rate_limit_service_unavailable` | `sdk_connection` |
| Reject or interrupt `EVAL` | `rate_limit_service_unavailable` | `sdk_command` |
| Return malformed tuple, non-integer count, `PTTL` `-1`/`-2`, or TTL beyond the configured window using an isolated contract stub | `rate_limit_service_unavailable` | `invalid_result` |
| Add provider latency below and above the function timeout | Successful decision or `rate_limit_service_unavailable`; never fail open | Platform-safe failure category |

Search the allowlisted central event fields for sentinel Redis address,
credential, HMAC secret, raw opaque key, documentation IP, synthetic account
and raw exception text; each query must return zero. Restore connectivity and
configuration, then prove the next request succeeds and starts or continues
the expected bucket without a deployment restart. Retain redacted query
exports and reviewer approval privately.

## Threshold review and monitoring

The staging review should include one ordinary sign-in, a password-manager
retry, several invalid passwords, OTP resend and mistype bursts, sign-up retry,
distributed account spraying, and high-concurrency single-bucket abuse. The
current limits provide reasonable MVP headroom for the representative cases;
do not change them from an artificial load test alone. Review real, aggregated
traffic after 30 days as required by the operations runbook.

Create dedicated dashboard panels for auth attempts, limiter `429` count/rate
by route template, limiter `503` count/rate and safe failure category, and auth
request latency. Apply the exact page and ticket thresholds in
`OPERATIONS_READINESS.md`, including minimum sample counts and the trailing
seven-day same-hour baseline. The central pipeline must discard all fields
outside its allowlist. Record dashboard and alert identifiers, test delivery,
primary/backup acknowledgement and redaction evidence privately; until then,
monitoring remains a release blocker.
