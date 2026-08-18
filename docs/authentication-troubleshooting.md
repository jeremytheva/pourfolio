# Authentication troubleshooting

## NoCodeBackend authentication returns 503

When browser console entries show `/api/nocodebackend/auth/get-session`,
`/api/nocodebackend/auth/providers`, `/api/nocodebackend/auth/sign-in/email` or
`/api/nocodebackend/auth/sign-up/email` returning `503 Service Unavailable`, first
inspect only the safe `code` and `requestId` fields in the API response. Provider
discovery now fails closed, so a failed request deliberately shows no password
form instead of guessing that password authentication is available.

| Safe response code | Meaning | First check |
| --- | --- | --- |
| `auth_configuration_missing` | The authentication proxy is missing `NOCODEBACKEND_SECRET_KEY`. | Verify the server-only authentication secret in the affected live deployment scope. |
| `rate_limit_configuration_missing` | At least one required shared-limiter setting is absent. | Verify `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `RATE_LIMIT_KEY_SECRET` in the affected live deployment scope. |
| `rate_limit_service_unavailable` | The configured shared limiter failed to initialise, execute or return a valid result. | Use the request ID to inspect safe limiter telemetry and the Upstash/Vercel service state. Do not assume that presence-only configuration proves connectivity. |
| No recognised code | The auth provider, proxy transport or another policy boundary failed. | Use the request ID and status to inspect redacted proxy telemetry and provider health. |

Resolution steps:

1. Configure any missing value as a server-only variable for the affected Vercel
   environment. Do not add a `VITE_` prefix and do not expose values in client
   code, screenshots, logs or pull-request text.
2. Confirm any deliberate `NOCODEBACKEND_AUTH_BASE_URL` override is also
   server-only and points at the expected NoCodeBackend user-auth endpoint.
3. Redeploy or restart the affected deployment so the serverless functions read
   the updated environment.
4. Re-test sign-up, sign-in, provider discovery and session refresh from the
   affected deployment, recording only the deployment SHA, timestamp, request IDs
   and redacted evidence.

The proxy intentionally returns safe messages and codes only. Upstream details,
Redis addresses, credential presence, command text and raw errors must be
diagnosed from authorised provider consoles and correlated, redacted server-side
telemetry rather than browser output.

## Authentication endpoint returns 2xx but the app remains signed out

Password sign-in, sign-up and OTP verification first resolve a user from the
successful response. When the provider returns only an acknowledgement, the
browser makes one `GET /get-session` request so the cookie-backed session remains
authoritative. If that refresh is unsuccessful or malformed, the operation fails
with a visible authentication error instead of returning a null success. A local
`auth_session_missing` code means both successful response bodies lacked a stable
user identity; a non-2xx session refresh retains its safe server error instead.