# NoCodeBackend Auth Proxy Setup Guide

## Overview

The auth proxy handles user authentication by proxying requests to the NoCodeBackend Auth API and managing session cookies.

**Key points:**
- Session cookies are the browser authentication mechanism.
- NoCodeBackend accepts Better Auth session cookies with or without the secure prefix.
- Provider secrets remain server-only and are never exposed to browser code.
- Authentication and generated data use independent server credentials.
- The NoCodeBackend instance is runtime configuration and is not stored in the repository.
- Authentication and generated data are separate NoCodeBackend provider surfaces with different upstream base URLs.

## Environment Variables

Use only these application variables:

```env
NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth
NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/
NOCODEBACKEND_AUTH_SECRET_KEY=<stored outside repository>
NOCODEBACKEND_SECRET_KEY=<stored outside repository>
NOCODEBACKEND_INSTANCE=<stored outside repository>
```

Rules:
- Read values only from `process.env`.
- Do not expose either secret or the configured instance to the browser.
- `NOCODEBACKEND_AUTH_SECRET_KEY` is used only by the server-side authentication/session adapter.
- `NOCODEBACKEND_SECRET_KEY` is used only by the generated-data adapter.
- Do not fall back from one provider secret to the other.
- Do not use public/browser-prefixed variables for either secret.
- Do not introduce alternate NoCodeBackend environment-variable aliases.
- Retired short-form NoCodeBackend environment-variable names are prohibited.
- Both secrets and `NOCODEBACKEND_INSTANCE` must be supplied by the deployment/runtime environment and must not have repository defaults.
- Do not use the auth base URL for generated table reads/writes.
- Do not use the data base URL for authentication or session operations.

## Provider Surface Contract

Pourfolio uses two distinct upstream NoCodeBackend surfaces:

| Purpose | Base URL variable | Credential variable | Canonical upstream base URL | Application-owned browser route |
| --- | --- | --- | --- | --- |
| Authentication/session | `NOCODEBACKEND_AUTH_BASE_URL` | `NOCODEBACKEND_AUTH_SECRET_KEY` | `https://app.nocodebackend.com/api/user-auth` | `/api/nocodebackend/auth/*` |
| Generated data CRUD | `NOCODEBACKEND_DATA_BASE_URL` | `NOCODEBACKEND_SECRET_KEY` | `https://api.nocodebackend.com/` | `/api/nocodebackend/*` |

Both server-side adapters use the runtime `NOCODEBACKEND_INSTANCE`, but credentials, upstream routes, cookie, header, and transport requirements remain separate.

## Auth Proxy Contract

- Browser authentication requests use the same-origin `/api/nocodebackend/auth/*` interface.
- The application auth proxy forwards those requests through `NOCODEBACKEND_AUTH_BASE_URL`.
- Include the runtime `NOCODEBACKEND_INSTANCE` via query/header where required by the upstream API.
- Use `NOCODEBACKEND_AUTH_SECRET_KEY` only on the server.
- Fail closed with a safe configuration error when the auth secret or instance is missing.
- Forward only Better Auth cookies when session context is needed.
- Preserve session cookies through the application proxy.
- Provider discovery must be authoritative and drive the rendered auth methods.
- Sign-out must clear local Better Auth cookies even if the upstream sign-out call fails.

## Providers

Expected shape:

```json
{
  "providers": {
    "email": true,
    "google": false,
    "emailOTP": false
  }
}
```

`email`, `google`, and `emailOTP` are separate providers and must not be conflated.

## Application Auth Endpoints

- Session: `GET /api/nocodebackend/auth/get-session`
- Email sign-in: `POST /api/nocodebackend/auth/sign-in/email`
- Email sign-up: `POST /api/nocodebackend/auth/sign-up/email`
- OTP send: `POST /api/nocodebackend/auth/email-otp/send-verification-otp`
- OTP verify: `POST /api/nocodebackend/auth/sign-in/email-otp`
- Sign-out: `POST /api/nocodebackend/auth/sign-out`

These are Pourfolio same-origin routes. The auth proxy maps their action suffixes onto `NOCODEBACKEND_AUTH_BASE_URL`; they are not the NoCodeBackend upstream base URL themselves.

## Completion Checklist

- [ ] Provider list is fetched from the server.
- [ ] UI renders only enabled auth methods.
- [ ] Email/password sign-in/sign-up works when enabled.
- [ ] Google OAuth works when enabled.
- [ ] Email OTP works when enabled.
- [ ] Session endpoint returns user info.
- [ ] Refresh preserves the session.
- [ ] Sign-out clears cookies and UI state.
- [ ] Auth operations use `NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth` and `NOCODEBACKEND_AUTH_SECRET_KEY`.
- [ ] Data operations use `NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/` and `NOCODEBACKEND_SECRET_KEY`.
- [ ] Browser auth routes use `/api/nocodebackend/auth/*` and browser data routes use `/api/nocodebackend/*`.
- [ ] Both provider secrets and `NOCODEBACKEND_INSTANCE` are configured outside the repository.

## Data Operations

CRUD/data operations are a separate concern from authentication. The repository data adapter uses `NOCODEBACKEND_DATA_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`, and `NOCODEBACKEND_INSTANCE`; authentication uses `NOCODEBACKEND_AUTH_BASE_URL`, `NOCODEBACKEND_AUTH_SECRET_KEY`, and the same runtime-configured instance.

The generated data contract is:

```text
GET https://api.nocodebackend.com/read/{collection}?Instance=<runtime instance>
Authorization: Bearer <NOCODEBACKEND_SECRET_KEY>
```

Authentication cookies and generated-data transport requirements must not be assumed to be interchangeable.
