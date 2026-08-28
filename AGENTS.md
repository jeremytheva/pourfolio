# Pourfolio repository instructions

## Project entry
For meaningful work, start from the current repository state rather than chat history. Read `PROJECT.md` and `STATUS.md`, then use `ROADMAP.md`, `SYSTEM_MAP.md`, the relevant architecture/data documents and accepted decisions for the area being changed. Check current issues, pull requests, deployment/provider state when they affect the task.

The repository inherits the master AI-first platform standards recorded in `PROJECT.md`. Treat their Project Entry, Change, Integration, Release and Completion gates as mandatory evidence boundaries. Do not advance work state because code exists, tests pass, a PR merges or a deployment is created unless the relevant gate evidence supports that state.

## Project overview
Pourfolio's launch scope is a beer-first MVP. Reachable production journeys are authentication, product catalogue/search/details, rating creation/history, cellar management, and profile editing. Social, event, venue, analytics, producer-claim, administrator, photo and non-beer prototype modules are deferred and must not be made reachable without a separate reviewed delivery.

## Verified technology stack
- **Client:** React 19.2 with a small same-origin History API router, built by Vite 8; JavaScript/JSX (ES modules).
- **Runtime/package manager:** Node.js 20 LTS (defined in `.nvmrc`) and npm with `package-lock.json`.
- **Styling:** Tailwind CSS 3, PostCSS, Framer Motion, and React Icons.
- **Data and authentication:** Browser requests use same-origin endpoints in `src/lib/nocodeBackend.js`. `api/auth-proxy.js` is the authentication proxy; the server data gateways enforce application policy before NoCodeBackend access.
- **Storage:** Canonical NoCodeBackend collections are `products`, `producers`, `categories`, `ratings`, `rating_scores`, `rating_attributes`, `bonus_attributes`, `bonus_attribute_rating_mapping`, and `cellar`. Provider schema changes require the governed migration/evidence path; do not infer deployment from source files.
- **Testing:** Node.js built-in `node:test`/`node:assert`, plus Playwright and axe for browser/accessibility tests.
- **Deployment:** Vercel configuration, SPA rewrites and security headers are committed in `vercel.json`; actual deployed SHA/configuration/readiness must be verified in Vercel/runtime evidence.

## Repository structure
- `src/` — application source.
  - `pages/` — route-level screens; routes are declared in `App.jsx`.
  - `components/` and `common/` — reusable UI and UI safety primitives.
  - `services/` — launch-domain API operations.
  - `lib/` — same-origin backend/auth transport client.
  - `hooks/` — shared React state.
  - `data/` and `utils/` — canonical contract and pure validation/calculation helpers.
- `api/` — server-side authentication, provider adapters and data-policy handlers. Keep secrets and privileged upstream calls here.
- `e2e/` — deterministic browser and accessibility tests.
- `release-check/` — controlled connected staging release checks.
- `scripts/` — deterministic validation/audit utilities.
- `docs/` — detailed product, architecture, delivery, security, testing and NoCodeBackend evidence/contracts.
- Root project controls: `PROJECT.md`, `STATUS.md`, `PR_LIFECYCLE_STANDARD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md`, `SYSTEM_MAP.md`.

## Architecture and security rules
- Keep route composition in `pages/`/`App.jsx`, reusable presentation in `components/`, business/data orchestration in `services/`, browser transport in `lib/`, and trusted server policy/provider access in `api/`.
- Do not call NoCodeBackend collection or privileged auth endpoints from browser code. `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE_URL` are server-only and must never use a `VITE_` prefix.
- Treat every collection write and role-sensitive action as requiring server-side/provider permission enforcement; client route guards are not authorisation.
- Keep validation close to the relevant domain boundary, validate untrusted API data before use, and return/display safe errors without secrets, tokens, passwords, raw request bodies or private user data.
- Browser state belongs in React hooks. Do not persist authentication secrets, roles, privacy settings, ratings, cellar records or sensitive records in `localStorage`.
- Update `docs/nocodebackend/schema-mapping.md` for collection, field, relationship or permission changes. Use the governed provider migration/evidence tooling for persistent schema work; do not add or run Supabase migrations for the active backend without an approved architecture decision.
- Prefer existing dependencies and patterns. Add a dependency only when necessary, justified in the PR and locked with npm.

## Change protocol
Before a meaningful change:
1. identify the user/system outcome;
2. inspect the existing implementation and callers;
3. check affected auth, policy, data/provider, configuration, UI, tests, deployment and documentation layers as applicable;
4. check for overlapping/partial/planned/deprecated work;
5. select the smallest complete architecturally consistent correction;
6. implement, integrate and validate it;
7. update `STATUS.md` and other project documents only where their meaning changed.

`Continue` or `Next` means proceed with the next dependency-correct work autonomously. Stop only for a genuine blocker, destructive/irreversible approval or material product-owner decision.

## Pull-request lifecycle
Use `PR_LIFECYCLE_STANDARD.md` as the repository's canonical PR operating contract.

- Create or reuse a draft PR as the durable implementation container for meaningful work.
- Keep required failing work open and remediate it in the same coherent PR unless the work is deliberately superseded, duplicated, cancelled or rejected.
- Treat a changed PR head as invalidating stale validation evidence; required checks must apply to the latest intended commit.
- Move Draft → Ready only when the implementation gate is genuinely satisfied.
- Do not treat Ready as Mergeable. GitHub rules/protection, current checks, conflicts and required review evidence remain authoritative.
- Do not mark `pr:mergeable`, enable auto-merge or merge while #143 repository enforcement is incomplete unless independent GitHub evidence proves the required merge gate has been established.
- After a successful merge, delete the source branch where safe and continue downstream deployment/provider/runtime verification; `MERGED` is not `COMPLETE`.
- Record only continuity-critical lifecycle state in `STATUS.md`; do not duplicate CI logs or full PR discussions.

`.github/workflows/pr-lifecycle.yml` may synchronise safe lifecycle labels from GitHub-native state and validation evidence. It must not bypass branch protection or fabricate merge evidence.

## Coding standards
- Use JavaScript/JSX, ES modules, descriptive camelCase names, PascalCase React component files, and focused modules.
- Preserve the existing ESLint configuration. Do not weaken linting or suppress errors merely to pass checks.
- Keep components accessible: semantic controls, labels, keyboard operation, visible focus, meaningful alternative text, and errors announced or associated with inputs.
- Handle asynchronous failures explicitly and log only actionable, non-sensitive diagnostic context.
- Add/update focused Node.js tests for changed pure logic and service behaviour where feasible.
- Use Australian English in new documentation.

## Change constraints
Keep focused changes reviewable and avoid unrelated refactors. Preserve supported behaviour unless intentionally changing it. Never commit secrets, weaken tests, disable linting, bypass permission checks or fabricate provider/deployment evidence. Do not remove PARTIAL/PLANNED/LEGACY code until its role and exit condition are understood.

## Required validation
From the repository root with Node.js 20, the canonical source-validation entry point is:

```bash
npm run platform:validate
```

For browser-facing changes, the hosted `Browser and accessibility` gate remains required; local execution is:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

`platform:validate` composes the repository's package-lock/documentation/environment guards, lint, unit/policy tests, production dependency audit, production build, bundle containment/budget and release-security checks. It does **not** prove provider authorisation, deployed configuration, exact deployed SHA, migrations or connected production behaviour.

There is no TypeScript configuration or separate typecheck command; do not claim one has run. Under the master merge formula, `typecheck` is therefore genuinely not applicable unless a type-checking step is introduced later.

## Completion and review
Work is COMPLETE only when its acceptance outcome and relevant real-system evidence exist, known dependent work is not hidden by the completion claim, project state is current and the required release/completion gates pass. Otherwise use the explicit state supported by evidence (for example INTEGRATED, VALIDATING, BLOCKED, DEPLOYED or VERIFIED).

Reviewers must check regressions and edge cases, authorisation bypasses, unsafe data operations, missing schema/migration evidence, missing tests, accessibility/security regressions, unnecessary complexity, scope creep, stale project documentation and inaccurate provider/deployment claims.
