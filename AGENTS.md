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

- **Client:** React 19.3 with a small same-origin History API router, built by Vite 8; JavaScript/JSX (ES modules).
- **Runtime/package manager:** Node.js 22 (defined in `.nvmrc` and `package.json`) and npm with `package-lock.json`.
- **Styling:** Tailwind CSS 3, PostCSS, Framer Motion, and React Icons.
- **Data and authentication:** Browser requests use same-origin endpoints in `src/lib/nocodeBackend.js`. `api/auth-proxy.js` is the authentication proxy; the server data gateways enforce application policy before NoCodeBackend access.
- **Storage:** Canonical NoCodeBackend collections are `products`, `producers`, `categories`, `ratings`, `rating_scores`, `rating_attributes`, `bonus_attributes`, `bonus_attribute_rating_mapping`, and `cellar`. Provider schema changes require the governed migration/evidence path; do not infer deployment from source files.
- **Testing:** Node.js built-in `node:test`/`node:assert`, plus Playwright and axe for browser/accessibility tests.
- **Deployment:** Vercel remains supported through `vercel.json`; the host-neutral production entry point is `server/index.mjs` and the BonoHost runbook is `docs/BONOHOST_DEPLOYMENT.md`. Actual deployed SHA/configuration/readiness must be verified in runtime evidence.

Node.js 22 is the governed runtime target. BonoHost provides Node.js 22.23.2, which satisfies Vite 8's Node 22 minimum requirement. A runtime-major change requires project-owned validation and runtime evidence appropriate to the release claim.

## Repository structure

- `src/` — application source.
  - `pages/` — route-level screens; routes are declared in `App.jsx`.
  - `components/` and `common/` — reusable UI and UI safety primitives.
  - `services/` — launch-domain API operations.
  - `lib/` — same-origin backend/auth transport client.
  - `hooks/` — shared React state.
  - `data/` and `utils/` — canonical contract and pure validation/calculation helpers.
- `api/` — server-side authentication, provider adapters and data-policy handlers. Keep secrets and privileged upstream calls here.
- `server/` — host-neutral Node.js production runtime used by BonoHost and other standard Node hosts.
- `e2e/` — deterministic browser and accessibility tests.
- `release-check/` — controlled connected staging release checks.
- `scripts/` — deterministic validation/audit utilities.
- `docs/` — detailed product, architecture, delivery, security, testing and NoCodeBackend evidence/contracts.
- `docs/DECISIONS/` — the pre-existing canonical ADR directory. Do not create a second root `DECISIONS/` authority unless a deliberate repository migration is approved.
- Root project controls: `PROJECT.md`, `STATUS.md`, `PR_LIFECYCLE_STANDARD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md`, `SYSTEM_MAP.md`.

## Architecture and security rules

- Keep route composition in `pages/`/`App.jsx`, reusable presentation in `components/`, business/data orchestration in `services/`, browser transport in `lib/`, and trusted server policy/provider access in `api/`.
- Do not call NoCodeBackend collection or privileged auth endpoints from browser code. `NOCODEBACKEND_AUTH_SECRET_KEY`, `NOCODEBACKEND_SECRET_KEY`, `NOCODEBACKEND_INSTANCE`, `NOCODEBACKEND_USER_EMAIL`, `NOCODEBACKEND_USER_SECRET_KEY`, `NOCODEBACKEND_ADMIN_EMAIL`, `NOCODEBACKEND_ADMIN_SECRET_KEY` and privileged provider configuration are server-only and must never use a `VITE_` prefix or committed production values.
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

If the highest-priority item is blocked but other useful work is dependency-safe, record the blocker and automatically continue the next valid unblocked item. Ask the product owner to choose the next task only when repository priority/dependency evidence is genuinely insufficient.

The same continuation loop applies after review fixes, diagnostic-CI repairs, documentation corrections and routine PR lifecycle transitions.

## GitHub connector and write-action failure protocol

GitHub authentication, repository authorization and individual connector write actions are separate concerns. Do not treat every rejected mutation as a disconnected GitHub account.

When a GitHub mutation fails:

1. verify repository read access and current PR/branch state;
2. verify the connected actor and repository permission when those checks are available;
3. distinguish the failure class:
   - **authentication/connection failure** — the account, installation or repository can no longer be read or authenticated;
   - **repository authorization/policy failure** — GitHub receives the operation but repository permissions, rules, branch protection or merge requirements reject it;
   - **connector write-action/safety failure** — reads and repository permissions remain healthy but the mutation is rejected before GitHub applies it;
4. request reconnection only for evidence of a genuine authentication/connection failure. Do not ask the owner to reconnect merely because a merge, comment, file write or other mutation is blocked;
5. do not weaken branch protection, repository rules, permissions or security controls to work around a connector-layer failure;
6. retry only when useful evidence suggests the operation may now succeed. Avoid repeated identical mutations that cannot change the outcome;
7. record a persistent mutation failure as a scoped execution/tooling blocker and continue the highest-priority dependency-safe work that does not require that mutation.

A connector write-action block is not, by itself, a reason to mark the whole project `BLOCKED`, disable scheduled autonomous continuation, or stop analysis/validation/evidence preparation. Scheduled continuation should remain enabled when useful dependency-safe work can still be performed. Disable it only when repeated runs have no productive action available, would create unsafe/duplicate work, or require owner intervention under the valid stop conditions below.

If a mutation later succeeds, reconcile `STATUS.md`, PR metadata and any queued continuity state before creating overlapping work.

## Work-in-progress and productive-work control

Autonomous delivery must not produce implementation faster than the repository can validate and integrate it.

Default limits, unless a documented project-specific exception exists:

- maximum ordinary open implementation PRs: **3**;
- maximum dependent PR stack depth: **2**.

Before opening another implementation PR, inspect live GitHub state. If either limit is exceeded, stop creating overlapping implementation, validate and reconcile the existing work, merge eligible PRs, update `STATUS.md`, then resume implementation. Integration throughput is part of delivery capacity.

Dependency-scoped blockers do not consume the whole project when independent work remains. Conversely, autonomous continuation does not justify inventing work indefinitely. New implementation should normally be grounded in at least one of: roadmap/phase requirements, an accepted issue, a known defect, failed validation, a material review finding, security/data requirements, documented technical debt, dependency-correct release work, or an accepted product requirement.

If no such productive work exists, move the project to the appropriate READY, WAITING/BLOCKED, MAINTENANCE or COMPLETE state rather than manufacturing speculative micro-refactors or endless hardening tasks.

## Valid stop and escalation conditions

Stop and require product-owner involvement only when one of these conditions is real and blocks further dependency-correct work:

- a genuine product or business decision is required;
- required credentials, provider capability or external access are unavailable;
- an irreversible or destructive operation requires approval, including a production database/provider migration;
- conflicting requirements cannot be resolved from repository evidence;
- a security, privacy or legal decision requires owner authority;
- an external dependency prevents further dependency-correct work;
- external account configuration, billing/subscription action or unavailable third-party approval is required;
- physical/manual verification cannot be performed with available project tooling;
- no actionable work remains.

Minor implementation choices, refactoring decisions, regression repairs, documentation maintenance, test fixes, issue management, dependency sequencing, routine architecture choices and routine PR-state transitions should not normally be escalated.

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

`.github/workflows/pr-lifecycle.yml` may synchronise safe lifecycle labels from GitHub-native state. Label mutation and branch cleanup are advisory, best-effort operations; their token/API failures must not block implementation or merging. It must not fabricate project-owned validation, conceal a material defect, or require Draft → Ready transitions for ordinary autonomous work.

## Coding standards

- Use JavaScript/JSX, ES modules, descriptive camelCase names, PascalCase React component files, and focused modules.
- Preserve the existing ESLint configuration. Do not weaken linting or suppress errors merely to pass checks.
- Keep components accessible: semantic controls, labels, keyboard operation, visible focus, meaningful alternative text, and errors announced or associated with inputs.
- Handle asynchronous failures explicitly and log only actionable, non-sensitive diagnostic context.
- Add/update focused Node.js tests for changed pure logic and service behaviour where feasible.
- Use Australian English in new documentation.

## Change constraints

Keep focused changes reviewable and avoid unrelated refactors. Preserve supported behaviour unless intentionally changing it. Never commit secrets, weaken tests, disable linting, bypass permission checks or fabricate provider/deployment evidence. Do not remove PARTIAL/PLANNED/LEGACY code until its role and exit condition are understood.

## Template and pattern reuse

This repository may consume reusable master templates for repository guidance, GitHub workflow patterns, validation, database/provider governance, features and decisions. Reuse the **pattern before sharing runtime implementation**.

Do not create a shared package or common runtime abstraction merely because another project contains similar code. Prefer stable contracts, copied/adapted templates and project-local implementations until the behaviour is demonstrably stable across projects. When a project-specific implementation is already stronger than a generic template, retain it and document the mapping rather than replacing it with a weaker duplicate.

## Data, provider and migration governance

Canonical provider URL variables are `NOCODEBACKEND_AUTH_BASE_URL` and `NOCODEBACKEND_DATA_BASE_URL`; the complete variable contract lives in `contracts/pourfolio-data-contract.json` and `.env.example`.

For Pourfolio:

- `DATA_MODEL.md` is the concise application/domain authority;
- `docs/DATA_MODEL.md` provides the detailed domain/data contract;
- `contracts/pourfolio-data-contract.json` is the machine-readable provider-facing contract/classification;
- `docs/nocodebackend/launch-schema-contract.md` and `docs/nocodebackend/schema-mapping.md` are the verified/deferred provider representation and detailed mapping;
- `docs/nocodebackend/` migration/evidence records govern controlled provider transitions;
- `exports/schema.sql` is a **target/reference schema artefact**, not proof of the deployed NoCodeBackend schema and not an executable migration authority unless a future provider mechanism explicitly makes it so.

Do not create fictional SQL and call it provider authority. Application code, domain documentation, provider contract evidence and deployed provider state must not silently diverge.

Distinguish capability states:

- **IMPLEMENTED** — source/application logic exists;
- **PROVIDER VERIFIED** — required provider capability/state is evidenced in the relevant environment;
- **APPLICATION VERIFIED** — the application behaviour is proven against that provider capability/state.

Provider certification should cover the relevant subset of configuration, authentication, server-only credentials, CRUD, ownership/isolation, filtering, pagination, error semantics, idempotency, uniqueness, optimistic concurrency, transaction/atomic behaviour, schema contract, migration capability, backup/snapshot and restore/recovery. Generic provider documentation is not sufficient evidence when application safety depends on the capability.

Before any irreversible or production-impacting provider/schema change, assemble a migration approval package covering the change, affected resources, existing-data scope, current/proposed schema, constraints, backup/snapshot evidence, restore/recovery evidence, backfill algorithm, duplicate/conflict handling, dry run where possible, rollback/safe-forward path, post-migration verification, exact irreversible operation and required owner approval. Perform all reversible preparation before escalating. For #165, the existing rating migration evidence gate and runbook are the project-specific package and should be extended rather than duplicated.

## Required validation

From the repository root with Node.js 22, the canonical source-validation entry point is:

```bash
npm run platform:validate
```

For browser-facing changes, use the repository Playwright/browser-accessibility coverage when material to the changed behaviour:

```bash
npx playwright install --with-deps chromium
npm run test:e2e
```

`platform:validate` composes the repository's package-lock/documentation/runtime/environment governance guards, lint, unit/policy tests, production dependency audit, production build, bundle containment/budget and release-security checks. It does **not** prove provider authorisation, deployed configuration, exact deployed SHA, migrations or connected production behaviour.

GitHub Actions runs remain useful diagnostic evidence. Do not weaken, delete or ignore a real defect merely because hosted CI is not itself a mandatory merge gate. An empty or zero-step Platform Validation wrapper is **no validation evidence**, but it is not by itself an application validation failure.

When the preferred validation environment is unavailable, use this order:

1. canonical repository executor;
2. trusted alternate execution environment;
3. exact-commit deployment/build that executes equivalent required commands;
4. mark **VALIDATION WAITING**.

Never convert an unexecuted check into PASS. When validation capacity is unavailable, retain explicit validation debt and avoid creating an unlimited queue of overlapping PRs; continue only independent work that does not materially increase integration risk.

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
- actual validation state and exact evidence commits where known, including validated, deployed, runtime-verified and browser-verified commits without implying one from another;
- current WIP/open-PR and dependent-stack state when it affects continuation;
- blockers and whether owner intervention is genuinely required;
- owner decisions that remain open;
- technical debt discovered;
- deployment/provider state when it affects the next action.

Do not populate PASS/VERIFIED states without evidence. Use `NOT_RUN`, `PENDING`, `UNVERIFIED` or `NOT_APPLICABLE` truthfully.

Offline `npm run check:project-docs` checks retained GitHub issue-state evidence for contradictory current blockers; it cannot prove fresh live state. Refresh that evidence with `npm run check:status-github -- --write-issue-evidence` when authenticated GitHub access is available. `npm run check:status-github` provides a lightweight live drift check for active PR/branch state, WIP counts, dependent stack depth and the observed-main baseline. It is a connected reconciliation aid, not part of the offline canonical validation gate; if GitHub access is unavailable it reports WAITING rather than fabricating PASS.

## Reporting

### Owner-facing response standard

Repository/GitHub evidence is the detailed source of truth. Keep implementation history, validation detail, PR evidence, blocker analysis, deferred work and technical decisions in the appropriate issue, PR, `STATUS.md` or other governed repository document rather than repeating them in routine ChatGPT/Codex responses.

For routine implementation, continuation, review, merge, deployment and status work, the final owner-facing response should normally contain only:

```text
Done
- <1–3 material completed outcomes>

Next
- <single best next action or work item>

You
- Nothing required.
```

The `You` section is mandatory. When owner intervention is necessary, replace `Nothing required.` with one specific action or one specific information request. Use `Provide: <specific information>` when information is required. Do not use vague prompts such as “check the configuration” or ask the owner to choose work when repository priority/dependency evidence is sufficient.

`Done` includes material outcomes only, such as a PR created/merged, bug fixed, validation completed, deployment completed, issue/phase completed or blocker removed. Usually use 1–3 bullets. Do not list every file edited, command run, internal reasoning step, routine refactor or PR metadata transition.

`Next` states the single best dependency-correct next action. If that item is non-critically blocked, automatically continue the next valid unblocked work and keep the blocker in durable project state.

Add an extra section only when it materially changes owner action or understanding:

- `Blocked` — a genuine blocker prevents the stated work;
- `Problem` — implementation/validation/deployment exposed a meaningful failure or defect;
- `Decision needed` — repository conventions cannot safely resolve a materially different product/business choice.

Keep these extra sections concise. Do not routinely add executive summaries, validation tables, file-by-file lists, command logs, acceptance matrices, future-work catalogues or repeated background unless requested.

When all required validation passes, summarise it as a material outcome rather than enumerating commands, for example: `Implementation and required validation completed.` If validation fails, report only the meaningful failure in `Problem`; retain detailed command output in repository/PR evidence.

For normal PR progression, prefer concise outcome reporting such as `PR #123 implemented, validated and merged.` Do not reproduce the PR lifecycle history unless requested. For a project-status request, return the current material outcome(s), one next action and the mandatory `You` section; do not produce a full project report unless explicitly requested.

The concise chat format does not reduce engineering discipline or evidence requirements. `STATUS.md` remains the primary durable continuity/status document, and detailed evidence remains in repository/GitHub sources.

Do not require the product owner to reconstruct technical state manually from commit history, CI logs or prior chats.

## Completion and review

Work is COMPLETE only when its acceptance outcome and relevant real-system evidence exist, known dependent work is not hidden by the completion claim, project state is current and the required release/completion evidence is sufficient. Otherwise use the explicit state supported by evidence (for example IMPLEMENTING, VALIDATING, READY, BLOCKED, DEPLOYED or VERIFIED).

Reviewers must check regressions and edge cases, authorisation bypasses, unsafe data operations, missing schema/migration evidence, missing tests, accessibility/security regressions, unnecessary complexity, scope creep, stale project documentation and inaccurate provider/deployment claims.
