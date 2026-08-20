# NoCodeBackend Auth Proxy Setup Guide

## Overview

The auth proxy handles user authentication by proxying requests to NCB Auth API and managing session cookies.

**Key Points:**
- Session cookies are the only authentication mechanism needed
- NCB accepts cookies in BOTH formats:
  - `better-auth.session_token` (without prefix)
  - `__Secure-better-auth.session_token` (with prefix)
- NCB dynamically finds any cookie ending with `better-auth.session_token`

## Environment Variables

```env
NCB_INSTANCE=54026_rating
NCB_AUTH_API_URL=https://app.nocodebackend.com/api/user-auth
NCB_DATA_API_URL=https://app.nocodebackend.com/api/data
NCB_APP_URL=https://app.nocodebackend.com
NCB_SECRET_KEY=<server-only key returned by create_database>
```

**Rules:**
- Read values only from `process.env`
- Do not hardcode values
- Do not expose them to the client
- Do not use browser/public-prefixed variables
- `NCB_SECRET_KEY` is required by the Account gateway and remains server-only

## Auth Proxy Contract

- Proxy auth requests to `NCB_AUTH_API_URL`.
- Send `Instance=<NCB_INSTANCE>` and `X-Database-Instance: <NCB_INSTANCE>`.
- Forward only Better Auth session cookies.
- Forward the validated request origin.
- Do not use the database secret as the normal authentication mechanism for auth requests.
- Preserve/normalise Better Auth `Set-Cookie` headers for the Pourfolio host.
- Sign-out must clear local Better Auth cookies even when the upstream sign-out request fails.

## Cookie Handling

NCB accepts both prefixed and unprefixed Better Auth session cookies. Forward only Better Auth cookies stored by the browser.

## Provider Discovery

Fetch enabled providers from the server before rendering authentication controls. Do not hardcode providers.

```json
{
  "providers": {
    "email": true,
    "google": false,
    "emailOTP": false
  }
}
```

`email`, `google`, and `emailOTP` are distinct providers.

## Authentication Endpoints

- Session: `GET /api/auth/get-session`
- Email sign-in: `POST /api/auth/sign-in/email`
- Email sign-up: `POST /api/auth/sign-up/email`
- OTP send: `POST /api/auth/email-otp/send-verification-otp`
- OTP verify: `POST /api/auth/sign-in/email-otp`
- Sign-out: `POST /api/auth/sign-out`

## Completion Checklist

- [ ] Provider discovery returns provider list
- [ ] UI renders only enabled auth methods
- [ ] Email/password sign-in/sign-up works when enabled
- [ ] Google OAuth works when enabled
- [ ] Email OTP works when enabled
- [ ] Session endpoint returns user info
- [ ] Refresh preserves session
- [ ] Sign-out clears cookies and UI state

## Next Step

Use `data_proxy_setup.md` as the authoritative source for CRUD/data operations. Do not infer the data API contract from this auth guide.
