# Brew-Buds-Mobile-App-Design-3577

Repository created by Greta.

## Environment configuration

Copy `.env.example` to `.env.local` and fill in the required values.

### NoCodeBackend auth proxy

NoCodeBackend authenticated auth calls must go through the app-owned server endpoint at `/api/nocodebackend/auth/*`. The browser should never receive or send `NOCODEBACKEND_SECRET_KEY`; keep it as a server-side environment variable only.

Supported auth actions are proxied generically, including session lookup, email sign in, email sign up, OTP, Google auth, and sign out. The proxy forwards cookies/session headers and attaches the NoCodeBackend bearer token on the server.
### NoCodeBackend data schema

NoCodeBackend is the active backend for app data. Create and maintain the required collections using the schema and permission mapping in [`docs/nocodebackend/schema-mapping.md`](docs/nocodebackend/schema-mapping.md). Former Supabase SQL migrations have been removed from `src/` and archived under `docs/archive/supabase-migrations/` for historical reference only; do not run them for new setup.

