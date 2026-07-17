# Pourfolio

Pourfolio is an in-development beverage discovery and community application for ratings, cellar tracking, producers, venues, events, and producer claims.

## Local development

Use Node.js 20 (see `.nvmrc`) and npm:

```bash
cp .env.example .env.local
npm install
npm run dev
```

For repeatable CI/local installs, use `npm ci` after the lockfile is present. Validate changes with:

```bash
npm run validate
```

## Environment configuration

Copy `.env.example` to `.env.local` and fill in the NoCodeBackend values required by your deployment. The browser must never receive or send `NOCODEBACKEND_SECRET_KEY`; it is server-only and is used by the app-owned auth proxy at `/api/nocodebackend/auth/*`.

NoCodeBackend is the active app-data backend. Create and maintain collections and permissions using [the schema mapping](docs/nocodebackend/schema-mapping.md). Archived Supabase SQL is historical reference only and must not be used for new setup.

## Documentation

- [Product](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model and NoCodeBackend schema](docs/DATA_MODEL.md)
- [Testing](docs/TESTING.md)
- [Contributing and delivery process](docs/CONTRIBUTING.md)
- [Security](docs/SECURITY.md)
- [Codex workflows](docs/CODEX_WORKFLOWS.md)
- [Manual GitHub configuration](docs/GITHUB_CONFIGURATION.md)
