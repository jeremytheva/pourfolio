# Authentication troubleshooting

## NoCodeBackend authentication returns 503

When browser console entries show `/api/nocodebackend/auth/get-session`,
`/api/nocodebackend/auth/providers`, `/api/nocodebackend/auth/sign-in/email` or
`/api/nocodebackend/auth/sign-up/email` returning `503 Service Unavailable`, first
confirm whether the API response body contains `code: "auth_configuration_missing"`.
That code is emitted by the server-side authentication proxy when the deployment
is missing `NOCODEBACKEND_SECRET_KEY`.

Resolution steps:

1. Configure `NOCODEBACKEND_SECRET_KEY` as a server-only variable for the affected
   Vercel environment. Do not add a `VITE_` prefix and do not expose the value in
   client code, screenshots, logs or pull-request text.
2. Confirm any deliberate `NOCODEBACKEND_AUTH_BASE_URL` override is also
   server-only and points at the expected NoCodeBackend user-auth endpoint.
3. Redeploy or restart the affected deployment so the serverless functions read
   the updated environment.
4. Re-test sign-up, sign-in, provider discovery and session refresh from the
   affected deployment, recording only the deployment SHA, timestamp, request IDs
   and redacted evidence.

If the response does not include `auth_configuration_missing`, use the returned
request ID to inspect redacted server logs. The proxy intentionally returns safe
messages only, so upstream outages, timeouts, rate-limit store failures and
policy failures must be diagnosed from correlated server-side telemetry rather
than browser console output.
