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

- Node.js 24
- React 19.2
- Vite 8
- npm
- NoCodeBackend through the serverless gateways in `api/`

Node.js 24 is the governed repository/deployment target. It replaces Node 20 before Vercel's 1 October 2026 Node 20 build cutoff; `.nvmrc`, `package.json` and CI must remain aligned with this runtime contract.

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
npm run platform:validate
```

This is the canonical full repository source-validation entry point. It composes the project-document and configuration guards, lint, unit/policy tests, production dependency audit, production build, bundle controls and browser release-security checks.

A passing source-validation run is not production certification. Provider authorization, migrations, exact deployed SHA, environment configuration, connected smoke flows and other release evidence are tracked separately in `STATUS.md` and the launch-readiness records.

## Project continuity

- [Project definition](PROJECT.md)
- [Current status and execution gate](STATUS.md)
- [Roadmap](ROADMAP.md)
- [System map](SYSTEM_MAP.md)

## Architecture and release evidence

- [Architecture](docs/ARCHITECTURE.md)
- [Canonical data contract](docs/nocodebackend/schema-mapping.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Launch readiness](docs/LAUNCH_READINESS.md)
- [Account lifecycle readiness and acceptance contract](docs/account-lifecycle-readiness.md)

Production remains blocked until the external gates in `STATUS.md` and the launch-readiness checklist are completed against the connected backend and exact deployed environment.
