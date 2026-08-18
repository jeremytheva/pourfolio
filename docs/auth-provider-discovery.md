# Authentication provider discovery

The browser discovers sign-in methods with `GET /api/nocodebackend/auth/providers`.
This remains a same-origin request through the authentication proxy; provider
discovery does not require browser environment variables or expose credentials.

## Authoritative response shapes

The response is authoritative only when it has exactly one of these shapes:

- an array of provider entries;
- `{ "providers": entries }`, `{ "authProviders": entries }`, or
  `{ "enabledProviders": entries }`;
- `{ "data": { "providers": entries } }` (with `authProviders` and
  `enabledProviders` also accepted); or
- a provider map at the response root.

An entry may be a recognised alias string, such as `email-password`, `otp`, or
`google`; an object with one of `name`, `provider`, `id`, `type`, or `key`; or a
provider map whose keys are recognised aliases. Named entries and provider-map
values may report state through a boolean `enabled`, `isEnabled`, or `active`
property. An omitted state on a named entry means enabled. Multiple state
properties must be booleans and agree.

Optional email OTP and Google sign-in are enabled only by a positively reported
entry. Email/password remains enabled when absent and becomes disabled only when
a recognised email/password entry explicitly reports `false`. Empty, malformed,
ambiguous, and wholly unrecognised responses are rejected.

Provider discovery is fail-closed in the browser. No authentication control is
shown while the request is pending. A rejected payload, HTTP error, timeout or
network failure leaves every method disabled and shows an accessible deployment
or service error, including the safe request ID when supplied. The browser must
never infer that email/password is enabled after `/providers` fails.