# Pourfolio repository instructions

## Authority

This repository operates under the Project Master AI-first platform development framework and the engineering, security, testing, documentation, data, observability, provider and pull-request lifecycle standards recorded in `PROJECT.md` where applicable.

Repository-specific requirements override generic defaults only when they are explicitly documented in this repository. When repository evidence conflicts with stale chat history or older prose, inspect and reconcile the repository evidence rather than silently choosing the older statement.

## Required project-entry sequence

Whenever an AI agent begins or resumes meaningful work:

1. Read `AGENTS.md`.
2. Read `PROJECT.md`.
3. Read `STATUS.md`.
4. Review `ROADMAP.md`, `SYSTEM_MAP.md`, relevant architecture/data/security/testing documents and accepted records in `docs/DECISIONS/`.
5. Inspect the current repository state, recent relevant commits and partially implemented code.
6. Inspect open pull requests and their latest-head evidence before creating implementation work.
7. Inspect relevant issues/tasks, deployment/provider evidence and external blockers where they affect the task.
8. Determine the highest-priority dependency-correct actionable work.
9. Check for existing branches, pull requests, issues, TODO/state documentation or partial implementation before creating anything new.

Chat history is supporting context only. The repository and live provider/GitHub evidence are the durable execution authority.

The repository inherits the master AI-first platform standards recorded in `PROJECT.md`. Treat their Project Entry, Change, Integration, Release and Completion gates as evidence boundaries. Do not advance work state because code exists, a PR merges or a deployment is created unless the relevant project-owned evidence supports that state.

## Project overview

Pourfolio's launch scope is a beer-first MVP. Reachable production journeys are authentication, product catalogue/search/details, rating creation/history, cellar management, and profile editing. Social, event, venue, analytics, producer-claim, administrator, photo and non-beer prototype modules are deferred and must not be made reachable without a separate reviewed delivery.

## Verified technology stack

- **Client:** React 19.2 with a small same-origin History API router, built by Vite 8; JavaScript/JSX (ES modules).
- **Runtime/package manager:** Node.js 24 (defined in `.nvmrc` and `package.json`) and npm with `package-lock.json`.
- **Styling:** Tailwind CSS 3, PostCSS, Framer Motion, and React Icons.
- **Data and authentication:** Browser requests use same-origin endpoints in `src/lib/nocodeBackend.js`. `api/auth-proxy.js` is the authentication proxy; the server data gateways enforce application policy before NoCodeBackend access.
- **Storage:** Canonical NoCodeBackend collections are `products`, `producers`, `categories`, `ratings`, `rating_scores`, `rating_attributes`, `bonus_attributes`, `bonus_attribute_rating_mapping`, and `cellar`. Provider schema changes require the governed migration/evidence path; do not infer deployment from source files.
- **Testing:** Node.js built-in `node:test`/`node:assert`, plus Playwright and axe for browser/accessibility tests.
- **Deployment:** Vercel configuration, SPA rewrites and security headers are committed in `vercel.json`; actual deployed SHA/configuration/readiness must be verified in Vercel/runtime evidence.

Node.js 24 is the governed runtime target. Vercel reported Node 20 as deprecated with a 1 October 2026 build cutoff, so agents must not reintroduce a Node 20 runtime pin. A runtime-major change requires project-owned validation and Vercel runtime evidence appropriate to the release claim.

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
- `docs/DECISIONS/` — the pre-existing canonical ADR directory. Do not create a second root `DECISIONS/` authority unless a deliberate repository migration is approved.
- Root project controls: `PROJECT.md`, `STATUS.md`, `PR_LIFECYCLE_STANDARD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md`, `SYSTEM_MAP.md`.

## Architecture and security rules

- Keep route composition in `pages/`/`App.jsx`, reusable presentation in `components/`, business/data orchestration in `services/`, browser transport in `lib/`, and trusted server policy/provider access in `api/`.
- Do not call NoCodeBackend collection or privileged auth endpoints from browser code. `NOCODEBACKEND_SECRET_KEY`, `NOCODEBACKEND_INSTANCE` and privileged provider configuration are server-only and must never use a `VITE_` prefix or committed production values.
- Treat every collection write and role-sensitive action as requiring server-side/provider permission enforcement; client route guards are not authorisation.
- Keep validation close to the relevant domain boundary, validate untrusted API data before use, and return/display safe errors without secrets, tokens, passwords, raw request bodies or private user data.
- Browser state belongs in React hooks. Do not persist authentication secrets, roles, privacy settings, ratings, cellar records or sensitive records in `localStorage`.
- Update `docs/nocodebackend/schema-mapping.md` for collection, field, relationship or permission changes. Use the governed provider migration/evidence tooling for persistent schema work; do not add or run Supabase migrations for the active backend without an approved architecture decision.
- Prefer existing dependencies and patterns. Add a dependency only when necessary, justified in the PR and locked with npm.

## Whole-system rule

Before applying a local fix:

- inspect the surrounding architecture, callers, data/policy boundaries, tests and configuration that can produce the symptom;
- determine whether the symptom represents a broader integration or source-of-truth defect;
- search for the existing abstraction or convention before adding another one;
- avoid duplicate adapters, competing validation paths, contradictory state documents and temporary workarounds where the existing system should be repaired;
- prefer the smallest effective correction that preserves sound existing work.

## Autonomous continuation semantics

`Continue`, `Next`, a scheduled supervisory run, or equivalent instruction means:

> Continue the highest-priority dependency-correct work that can safely be completed autonomously.

Do not stop merely because one task, commit or pull-request subtask has finished. After completing a task:

1. validate it using the applicable repository gate;
2. update durable project state and implementation evidence;
3. determine the next dependency-correct task from current repository/GitHub evidence;
4. continue when it can be performed safely.

The same continuation loop applies after review fixes, diagnostic-CI repairs, documentation corrections and routine PR lifecycle transitions.

## Valid stop and escalation conditions

Stop and require product-owner involvement only when one of these conditions is real and blocks further dependency-correct work:

- a genuine product or business decision is required;
- required credentials, provider capability or external access are unavailable;
- an irreversible or destructive operation requires approval;
- conflicting requirements cannot be resolved from repository evidence;
- a security, privacy or legal decision requires owner authority;
- an external dependency prevents further dependency-correct work;
- no actionable work remains.

Minor implementation choices, refactoring decisions, regression repairs, documentation maintenance, test fixes and routine PR-state transitions should not normally be escalated.

## Change protocol

Before a meaningful change:

1. identify the user/system outcome;
2. inspect the existing implementation and callers;
3. check affected auth, policy, data/provider, configuration, UI, tests, deployment and documentation layers as applicable;
4. check for overlapping/partial/planned/deprecated work;
5. select the smallest complete architecturally consistent correction;
6. implement, integrate and validate it;
7. update `STATUS.md` and other project documents where their meaning changed.

## Pull-request lifecycle

Use `PR_LIFECYCLE_STANDARD.md` as the repository's canonical PR operating contract:

**Implementing → Validating → Ready → Mergeable → Merged**, with `BLOCKED` as an overlay and GitHub Draft reserved for exceptional incomplete/non-reviewable work.

Before creating a pull request or branch:

- search open PRs (including intentional drafts), relevant issues, visible branches, `STATUS.md`, TODO/state documentation and partially implemented code;
- reuse or repair an appropriate existing PR where practical;
- avoid competing implementation branches for the same outcome.

Lifecycle rules:

- Create normal, non-draft PRs by default for autonomous project work once the branch has an initial coherent change to publish.
- Record lifecycle state in repository/PR metadata, labels and `STATUS.md` rather than using GitHub's draft flag as the lifecycle mechanism.
- Use a GitHub Draft PR only when the change genuinely should not be reviewed or merged yet, or substantial intended implementation is deliberately incomplete.
- Pending validation alone is not a reason to create or keep an autonomous PR in Draft.
- Keep required failing work open and remediate it in the same coherent PR unless the work is deliberately superseded, duplicated, cancelled or rejected.
- Treat changed implementation as requiring sufficient current project-owned validation; hosted CI results remain useful diagnostic evidence but are not automatically mandatory merge gates.
- A failed, pending, unavailable or runner-blocked GitHub check does not by itself prevent merge. Any real defect exposed by that check still requires remediation.
- Move lifecycle metadata to Ready when implementation is complete and the Change/Integration evidence is sufficient; normal PRs do not require a Draft → Ready GitHub transition.
- Mergeable requires implementation complete, canonical project-owned validation sufficient, applicable browser/runtime and deployment evidence sufficient for the change, no merge conflicts, material review findings resolved, and no material blocker.
- Issue #143 tracks repository governance hardening and is not a blanket blocker on ordinary mergeable work.
- After a successful merge, delete the source branch where safe and continue downstream deployment/provider/runtime verification; `MERGED` is not `COMPLETE`.
- Record only continuity-critical lifecycle state in `STATUS.md`; do not duplicate CI logs or full PR discussions.

`.github/workflows/pr-lifecycle.yml` may synchronise safe lifecycle labels from GitHub-native state. It must not fabricate project-owned validation, conceal a material defect, or require Draft → Ready transitions for ordinary autonomous work.

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

From the repository root with Node.js 24, the canonical source-validation entry point is:

```bash
npm run platform:validate
```

For browser-facing changes, use the repository Playwright/browser-accessibility coverage when material to the changed behaviour:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

`platform:validate` composes the repository's package-lock/documentation/runtime/environment governance guards, lint, unit/policy tests, production dependency audit, production build, bundle containment/budget and release-security checks. It does **not** prove provider authorisation, deployed configuration, exact deployed SHA, migrations or connected production behaviour.

GitHub Actions runs remain useful diagnostic evidence. Do not weaken, delete or ignore a real defect merely because hosted CI is not itself a mandatory merge gate.

There is no TypeScript configuration or separate typecheck command; `typecheck` is therefore genuinely `NOT_APPLICABLE` unless a type-checking step is introduced later.

Never claim validation passed unless it was actually run or externally verified. Distinguish clearly between:

- implemented;
- project-owned validation complete;
- diagnostic CI evidence available;
- deployed;
- runtime verified;
- production verified.

## State maintenance

`STATUS.md` is the durable execution handoff and must remain useful without access to prior chat history. After material changes update it to reflect, as applicable:

- current phase, stage, gate and execution state;
- current concrete objective and active issue/PR/branch;
- completed work and known partial work;
- highest-priority next actions;
- actual validation state and last verified commit where known;
- blockers and whether owner intervention is genuinely required;
- owner decisions that remain open;
- technical debt discovered;
- deployment/provider state when it affects the next action.

Do not populate PASS/VERIFIED states without evidence. Use `NOT_RUN`, `PENDING`, `UNVERIFIED` or `NOT_APPLICABLE` truthfully.

## Reporting

Keep handoff and chat summaries concise. Report:

- what changed;
- validation evidence;
- current phase/stage/gate/execution state;
- genuine blockers requiring intervention;
- the next dependency-correct work.

Do not require the product owner to reconstruct technical state manually from commit history, CI logs or prior chats.

## Completion and review

Work is COMPLETE only when its acceptance outcome and relevant real-system evidence exist, known dependent work is not hidden by the completion claim, project state is current and the required release/completion evidence is sufficient. Otherwise use the explicit state supported by evidence (for example IMPLEMENTING, VALIDATING, READY, BLOCKED, DEPLOYED or VERIFIED).

Reviewers must check regressions and edge cases, authorisation bypasses, unsafe data operations, missing schema/migration evidence, missing tests, accessibility/security regressions, unnecessary complexity, scope creep, stale project documentation and inaccurate provider/deployment claims.
