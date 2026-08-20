# NoCodeBackend Auth Proxy Setup Guide

> **IMPORTANT:** Save this file as `auth_proxy_setup.md` in your project root.

## Overview

The auth proxy handles user authentication by proxying requests to NCB Auth API and managing session cookies.

**Key Points:**
- Session cookies are the only authentication mechanism needed
- NCB accepts cookies in BOTH formats:
  - `better-auth.session_token` (without prefix)
  - `__Secure-better-auth.session_token` (with prefix)
- NCB dynamically finds any cookie ending with `better-auth.session_token`

## Environment Variables

Create `.env.local` in the project root:

```env
NCB_INSTANCE=54026_rating
NCB_AUTH_API_URL=https://app.nocodebackend.com/api/user-auth
NCB_DATA_API_URL=https://app.nocodebackend.com/api/data
NCB_APP_URL=https://app.nocodebackend.com
NCB_SECRET_KEY=<the server-only key returned by create_database>
```

**Rules:**
- Read values only from `process.env`
- Do NOT hardcode values
- Do NOT expose to client
- Do NOT use `NEXT_PUBLIC_*`
- `NCB_SECRET_KEY` is required by the Account gateway and must remain server-only

## Auth Proxy Contract

- Proxy auth requests to `NCB_AUTH_API_URL`.
- Send `Instance=<NCB_INSTANCE>` and `X-Database-Instance: <NCB_INSTANCE>`.
- Forward only Better Auth session cookies.
- Forward the validated request origin.
- Do not use the database secret as the normal authentication mechanism for auth requests.
- Preserve/normalise Better Auth `Set-Cookie` headers for the Pourfolio host.
- Sign-out must clear local Better Auth cookies even when the upstream sign-out request fails.

## Cookie Handling

### When Receiving from NCB (Set-Cookie)

NCB sends cookies with `__Secure-` prefix. Localhost development may strip `__Secure-`/`__Host-`, `Domain`, and `Secure`, and use `SameSite=Lax`. Production should retain secure cookie semantics on HTTPS.

### When Forwarding to NCB

NCB accepts cookies in BOTH formats:
- `better-auth.session_token`
- `__Secure-better-auth.session_token`

Forward only Better Auth cookies stored by the browser.

## Auth Providers Endpoint

Fetch enabled providers from the server before rendering authentication controls. Do not hardcode providers.

Expected provider shape:

```json
{
  "providers": {
    "email": true,
    "google": false,
    "emailOTP": false
  }
}
```

Provider types are distinct:
- `email`: email + password
- `google`: Google OAuth
- `emailOTP`: passwordless email OTP

## Authentication Usage

### Session Retrieval

`GET /api/auth/get-session` with credentials included.

### Email/password

- Sign in: `POST /api/auth/sign-in/email` with `{ email, password }`
- Sign up: `POST /api/auth/sign-up/email` with `{ email, password, name }`

### Google OAuth

Only render when `providers.google === true`. Route through the auth proxy and return through an application callback page.

### Email OTP

Only render when `providers.emailOTP === true`.

- Send: `POST /api/auth/email-otp/send-verification-otp` with `{ email, type: "sign-in" }`
- Verify: `POST /api/auth/sign-in/email-otp` with `{ email, otp }`

### Sign Out

`POST /api/auth/sign-out`; always clear local Better Auth cookies.

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
