# Brew-Buds-Mobile-App-Design-3577

Repository created by Greta.

## Environment configuration

Copy `.env.example` to `.env.local` and fill in the required values.

### NoCodeBackend auth proxy

NoCodeBackend authenticated auth calls must go through the app-owned server endpoint at `/api/nocodebackend/auth/*`. The browser should never receive or send `NOCODEBACKEND_SECRET_KEY`; keep it as a server-side environment variable only.

Supported auth actions are proxied generically, including session lookup, email sign in, email sign up, OTP, Google auth, and sign out. The proxy forwards cookies/session headers and attaches the NoCodeBackend bearer token on the server.
