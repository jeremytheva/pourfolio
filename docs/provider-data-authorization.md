# NoCodeBackend data authorization incident

## Current production evidence — 25 August 2026

The public production domain currently proves two different provider states:

- `GET /api/nocodebackend/auth/providers` returns HTTP 200 with provider discovery data.
- `GET /api/readiness` returns HTTP 503 with `dataProvider: "forbidden"`.

This means the application reaches the server and the configured NoCodeBackend credential is usable for authentication provider discovery, but the generated data API rejects the server-side data request with HTTP 403.

## Required correction

The production NoCodeBackend configuration for instance `54026_rating` must authorise the server-side secret used by `NOCODEBACKEND_SECRET_KEY` to call the generated data API at `https://api.nocodebackend.com/` with the documented Bearer contract.

Do not bypass this by exposing the secret to the browser or calling NoCodeBackend directly from client code.

## Verification

After correcting the provider credential/permission and deploying the updated environment:

1. `GET /api/readiness` must return HTTP 200 with `dataProvider: "ok"`.
2. Auth provider discovery must continue to return HTTP 200.
3. An authenticated catalogue request must return the documented product envelope.
4. No credential value may appear in browser responses, logs, repository files or diagnostics.
