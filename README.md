# Pourfolio

Pourfolio is a beer-first portfolio for discovering products, recording structured ratings and managing a private cellar.

## Launch scope

- NoCodeBackend authentication and server-authoritative profile identity
- Live `products` catalogue, search and stable product routes
- Normalised 1–7 ratings and personal history
- Owner-scoped cellar CRUD
- Same-origin server gateways for auth and data

Prototype social, event, venue, analytics, producer/admin, photo and non-beer modules are not routed in the launch build.

## Runtime

- Node.js 20
- React 19.2
- Vite 7
- npm
- NoCodeBackend through the serverless gateways in `api/`

## Local setup

```bash
npm ci
cp .env.example .env.local
npx vercel dev
```

Configure the server-only variables described in `.env.example` before starting the
application. Use `vercel dev` for authenticated local journeys because the Vite
development server does not execute the serverless gateways in `api/`. The browser
receives no provider secret and always calls same-origin
`/api/nocodebackend/*` routes.

`npm run dev` remains suitable for UI-only work that mocks the same-origin API.

## Validation

```bash
npm run validate
```

This runs lint, unit/policy tests, production dependency audit, build and bundle budgets.

## Architecture and release evidence

- [Architecture](docs/ARCHITECTURE.md)
- [Canonical data contract](docs/nocodebackend/schema-mapping.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Launch readiness](docs/LAUNCH_READINESS.md)

Production remains blocked until the external gates in the launch-readiness checklist are completed against the connected backend and deployed environment.
