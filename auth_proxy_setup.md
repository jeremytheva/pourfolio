# NoCodeBackend Auth Proxy Setup Guide

## Overview

The auth proxy handles user authentication by proxying requests to the NoCodeBackend Auth API and managing session cookies.

**Key points:**
- Session cookies are the browser authentication mechanism.
- NoCodeBackend accepts Better Auth session cookies with or without the secure prefix.
- The NoCodeBackend server secret remains server-only.
- The NoCodeBackend instance is runtime configuration and is not stored in the repository.

## Environment Variables

Use only these application variables:

```env
NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth
NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/
NOCODEBACKEND_SECRET_KEY=<stored outside repository>
NOCODEBACKEND_INSTANCE=<stored outside repository>
```

Rules:
- Read values only from `process.env`.
- Do not expose the secret or configured instance to the browser.
- Do not use public/browser-prefixed variables.
- Do not introduce alternate NoCodeBackend environment-variable aliases.
- Retired short-form NoCodeBackend environment-variable names are prohibited.
- `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE` must be supplied by the deployment/runtime environment and must not have repository defaults.

## Auth Proxy Contract

- Proxy authentication through `NOCODEBACKEND_AUTH_BASE_URL`.
- Include the runtime `NOCODEBACKEND_INSTANCE` via query/header where required by the upstream API.
- Use `NOCODEBACKEND_SECRET_KEY` only on the server.
- Fail closed with a safe configuration error when either the secret or instance is missing.
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

## Endpoints

- Session: `GET /api/auth/get-session`
- Email sign-in: `POST /api/auth/sign-in/email`
- Email sign-up: `POST /api/auth/sign-up/email`
- OTP send: `POST /api/auth/email-otp/send-verification-otp`
- OTP verify: `POST /api/auth/sign-in/email-otp`
- Sign-out: `POST /api/auth/sign-out`

## Completion Checklist

- [ ] Provider list is fetched from the server.
- [ ] UI renders only enabled auth methods.
- [ ] Email/password sign-in/sign-up works when enabled.
- [ ] Google OAuth works when enabled.
- [ ] Email OTP works when enabled.
- [ ] Session endpoint returns user info.
- [ ] Refresh preserves the session.
- [ ] Sign-out clears cookies and UI state.
- [ ] Data operations use `NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/`.
- [ ] `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE` are configured outside the repository.

## Data Operations

CRUD/data operations are a separate concern from authentication. The repository data adapter uses `NOCODEBACKEND_DATA_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`, and `NOCODEBACKEND_INSTANCE`; authentication uses `NOCODEBACKEND_AUTH_BASE_URL` with the same server-only secret and runtime-configured instance.
