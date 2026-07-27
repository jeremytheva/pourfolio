# Pourfolio repository instructions

## Project overview
Pourfolio's launch scope is a beer-first MVP. Reachable production journeys are authentication, product catalogue/search/details, rating creation/history, cellar management, and profile editing. Social, event, venue, analytics, producer-claim, administrator, photo and non-beer prototype modules are deferred and must not be made reachable without a separate reviewed delivery.

## Verified technology stack
- **Client:** React 19.2 with a small same-origin History API router, built by Vite 7; JavaScript/JSX (ES modules).
- **Runtime/package manager:** Node.js 20 LTS (defined in `.nvmrc`) and npm with `package-lock.json`.
- **Styling:** Tailwind CSS, PostCSS, Framer Motion, and React Icons.
- **Data and authentication:** Browser requests use same-origin endpoints in `src/lib/nocodeBackend.js`. Auth is proxied by `api/nocodebackend/auth/[...path].js`; application data is mediated by the owner-enforcing gateway in `api/nocodebackend/[...path].js`.
- **Storage:** Canonical NoCodeBackend collections are `products`, `producers`, `categories`, `ratings`, `rating_scores`, `rating_attributes`, `bonus_attributes`, `bonus_attribute_rating_mapping`, and `cellar`. There is no committed SQL migration runner.
- **Testing:** Node.js built-in `node:test`/`node:assert`, plus Playwright and axe for browser/accessibility tests.
- **Deployment:** Vercel configuration, SPA rewrites and security headers are committed in `vercel.json`.

## Repository structure
- `src/` — application source.
  - `pages/` — route-level screens; routes are declared in `App.jsx`.
  - `components/` and `common/` — reusable UI and UI safety primitives.
  - `services/` — launch-domain API operations.
  - `lib/` — same-origin backend/auth transport client.
  - `hooks/` — shared React state.
  - `data/` and `utils/` — canonical contract and pure validation/calculation helpers.
- `api/` — server-side authentication and data-policy handlers. Keep secrets and privileged upstream calls here.
- `e2e/` — deterministic browser and accessibility tests.
- `data/` — source CSV input; `scripts/` — generation utilities; `out/` — committed generated beverage data.
- `docs/` — product, architecture, delivery, security, and NoCodeBackend schema documentation; archived Supabase SQL is historical only.
- Root configuration: `package.json`, `.nvmrc`, Vite, ESLint, Tailwind, and PostCSS configuration.

## Architecture and security rules
- Keep route composition in `pages/`/`App.jsx`, reusable presentation in `components/`, business/data orchestration in `services/`, browser transport in `lib/`, and server policy in `api/`.
- Do not call NoCodeBackend collection or privileged auth endpoints from browser code. `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE_URL` are server-only and must never use a `VITE_` prefix.
- Treat every collection write and role-sensitive action as requiring server-side/NoCodeBackend permission enforcement; client route guards are not authorisation.
- Keep validation close to the relevant form/helper, validate untrusted API data before use, and return or display safe errors without secrets, tokens, passwords, raw request bodies, or private user data.
- Browser state belongs in React hooks. Do not persist authentication secrets, roles, privacy settings, ratings, cellar records, or sensitive records in `localStorage`.
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
Run from the repository root with Node.js 20:
```bash
npm run validate
npx playwright install --with-deps chromium
npm run test:e2e
```
`npm run validate` runs lint, unit/policy tests, production dependency audit,
production build, and bundle-budget checks. There is no TypeScript configuration
or separate typecheck command; do not claim one has run.

## Definition of done and review
Work is complete only when acceptance criteria are met; relevant tests and documentation are updated; the required validation passes; data changes are documented with their safe rollout/migration approach; security and accessibility are considered; and the PR records evidence without unrelated changes.

Reviewers must check regressions and edge cases, authorisation bypasses, unsafe data operations, missing schema/migration documentation, missing tests, accessibility and security regressions, unnecessary complexity, scope creep, and inaccurate documentation.
