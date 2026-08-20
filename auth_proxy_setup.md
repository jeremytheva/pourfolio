# NoCodeBackend Auth Proxy Setup Guide

## Overview

The auth proxy handles user authentication by proxying requests to NCB Auth API and managing session cookies.

**Key Points:**
- Session cookies are the only authentication mechanism needed.
- NCB accepts cookies in both formats:
  - `better-auth.session_token`
  - `__Secure-better-auth.session_token`
- NCB dynamically finds any cookie ending with `better-auth.session_token`.

## Environment Variables

```env
NCB_INSTANCE=54026_rating
NCB_AUTH_API_URL=https://app.nocodebackend.com/api/user-auth
NCB_DATA_API_URL=https://app.nocodebackend.com/api/data
NCB_APP_URL=https://app.nocodebackend.com
NCB_SECRET_KEY=<the server-only key returned by create_database>
```

Rules:
- Read values only from `process.env`.
- Do not hardcode values.
- Do not expose them to the client.
- Do not use public/browser-prefixed variables.
- `NCB_SECRET_KEY` is required by the Account gateway and remains server-only.

## Auth Proxy Contract

- Proxy authentication through `NCB_AUTH_API_URL`.
- Include the database instance via query/header.
- Forward only Better Auth cookies.
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

## Next Step

Use `data_proxy_setup.md` as the authoritative source for CRUD/data operations. Do not infer the data API contract from this auth guide.
