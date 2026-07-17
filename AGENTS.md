# Pourfolio repository instructions

## Project overview
Pourfolio is an in-development beverage discovery and community application. It helps general users, producers, venue operators, and administrators discover beverages and producers, record ratings, manage a personal cellar, and work with venues, events, and producer claims.

## Verified technology stack
- **Client:** React 18.3 with React Router 6, built by Vite 5; JavaScript/JSX (ES modules).
- **Runtime/package manager:** Node.js 20 LTS (defined in `.nvmrc`) and npm with `package-lock.json`.
- **Styling and visualisation:** Tailwind CSS, PostCSS, Framer Motion, ECharts, and React Icons.
- **Data and authentication:** NoCodeBackend collections accessed through `src/lib/nocodeBackend.js`; email/password, OTP, and Google authentication are proxied by `api/nocodebackend/auth/[...path].js`.
- **Storage:** NoCodeBackend is the persistent data service; browser `localStorage` is currently used for selected client-side preferences and some prototype flows. There is no committed SQL migration runner.
- **Testing:** Node.js built-in `node:test` and `node:assert` for unit tests.
- **Deployment:** Vite static client plus the repository's serverless auth proxy under `api/`; no hosting provider configuration is committed.

## Repository structure
- `src/` — application source.
  - `pages/` — route-level screens; routes are declared in `App.jsx`.
  - `components/` and `common/` — reusable UI and UI safety primitives.
  - `services/` — collection-specific data operations and relationship hydration.
  - `lib/` — shared backend/auth transport client.
  - `hooks/` — shared React state and browser-storage hooks.
  - `utils/` — pure calculations, client helpers, constants, and validation helpers; unit tests live in `utils/__tests__/`.
- `api/` — server-side/serverless handlers. Keep secrets and privileged upstream calls here.
- `data/` — source CSV input; `scripts/` — generation utilities; `out/` — committed generated beverage data.
- `docs/` — product, architecture, delivery, security, and NoCodeBackend schema documentation; archived Supabase SQL is historical only.
- Root configuration: `package.json`, `.nvmrc`, Vite, ESLint, Tailwind, and PostCSS configuration.

## Architecture and security rules
- Keep route composition in `pages/`/`App.jsx`, reusable presentation in `components/`, business/data orchestration in `services/`, and backend transport in `lib/`.
- Do not call privileged NoCodeBackend auth endpoints from browser code. `NOCODEBACKEND_SECRET_KEY` is server-only and must never use a `VITE_` prefix.
- Treat every collection write and role-sensitive action as requiring server-side/NoCodeBackend permission enforcement; client route guards are not authorisation.
- Keep validation close to the relevant form/helper, validate untrusted API data before use, and return or display safe errors without secrets, tokens, passwords, raw request bodies, or private user data.
- Browser state belongs in React hooks; use `localStorage` only for the existing non-sensitive, device-local flows. Do not place authentication secrets or sensitive records there.
- Update `docs/nocodebackend/schema-mapping.md` for collection, field, relationship, or permission changes. This project has no executable migrations; do not add or run Supabase migrations for the active backend without an approved architecture decision.
- Prefer existing dependencies and patterns. Add a dependency only when necessary, justified in the PR, and locked with npm.

## Coding standards
- Use JavaScript/JSX, ES modules, descriptive camelCase names, PascalCase React component files, and focused modules.
- Preserve the existing ESLint configuration. Do not weaken linting or suppress errors merely to pass checks.
- Keep components accessible: semantic controls, labels, keyboard operation, visible focus, meaningful alternative text, and errors announced or associated with inputs.
- Handle asynchronous failures explicitly and log only actionable, non-sensitive diagnostic context.
- Add or update focused Node.js tests for changed pure logic and service behaviour where feasible. Keep tests next to utilities in `__tests__` or add an equivalent focused test location.
- Update product/architecture/security/testing documentation whenever implemented behaviour changes. Use Australian English in new documentation.

## Change constraints
Keep work within the linked issue and avoid unrelated refactors or replacement of working systems. Preserve backwards compatibility unless explicitly authorised. Never commit secrets, weaken tests, disable linting, or bypass permission checks. Add schema documentation and an approved migration approach before changing persistent data. Do not introduce dependencies without a clear need.

## Required validation
Run from the repository root:
```bash
npm run lint
npm test
npm run build
npm run validate
```
`npm run validate` runs the first three commands in order. There is no TypeScript configuration or separate typecheck command; do not claim one has run.

## Definition of done and review
Work is complete only when acceptance criteria are met; relevant tests and documentation are updated; the required validation passes; data changes are documented with their safe rollout/migration approach; security and accessibility are considered; and the PR records evidence without unrelated changes.

Reviewers must check regressions and edge cases, authorisation bypasses, unsafe data operations, missing schema/migration documentation, missing tests, accessibility and security regressions, unnecessary complexity, scope creep, and inaccurate documentation.
