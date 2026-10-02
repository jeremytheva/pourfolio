# PROJECT.md

## Project

**Pourfolio**  
Beer-first discovery, structured rating and private cellar platform.

**Repository:** `jeremytheva/pourfolio`  
**Primary branch:** `main`  
**Project control baseline:** 3 September 2026

## Purpose

Pourfolio is a beer-first portfolio that lets authenticated users:

- discover and search a live beer catalogue;
- open stable product detail routes;
- submit structured 1–7 ratings;
- review and delete their own rating history;
- maintain a private cellar;
- maintain a basic display profile.

The launch product is deliberately narrower than the broader prototype. Social, event, venue, producer administration, platform administration, analytics, photo upload, non-beer rating modes and other prototype modules are deferred unless separately approved and implemented against production-grade backend, privacy and permission controls.

## Current launch outcome

The intended first public release is a reliable beer portfolio with:

1. NoCodeBackend authentication through an application-owned same-origin server boundary.
2. Server-authoritative user identity and ownership.
3. Live catalogue browse/search and stable product routes.
4. Normalised structured ratings.
5. Owner-scoped personal rating history.
6. Owner-scoped private cellar CRUD.
7. Explicit failure handling rather than simulated success or prototype data.

Ratings and cellar records do **not** require a sharing series or edition. Those relationships are optional and must remain null when not applicable.

## Master standards inherited

Pourfolio inherits the current master software-development rules supplied for the portfolio, including:

- **AI-First Platform Development Framework v3.1** — overarching architecture, whole-system, autonomy, continuity and project-managed PR governance framework;
- **AI Platform Development Standard v1.2** — implementation protocol, execution gates, Continue/Next behaviour, repository/PR management and work-state rules;
- **Pull Request Lifecycle Standard** — Implementing → Validating → Ready → Mergeable → Merged progression, with GitHub Draft reserved for exceptional incomplete/non-reviewable work;
- **Testing, Validation & Release Standard** — project-owned evidence, deployment and completion rules;
- **Project Documentation Standard** — project-document ownership, continuity, PR/gate status integration and source-of-truth rules;
- the applicable Platform Engineering, Design, Data/Migration, Security, Observability and provider reference standards where their rules apply to this project.

Project-specific facts and exceptions belong in this repository. Master rules should be referenced rather than copied into project documents. `PR_LIFECYCLE_STANDARD.md` is retained in this repository as the adopted lifecycle contract used by repository automation and project continuity.

### Project-specific deviations

No intentional project deviation currently overrides the master security or data-integrity rules. Provider limitations and unresolved runtime evidence are recorded rather than treated as complete.

Autonomous project work uses normal, non-draft pull requests by default. Lifecycle state is recorded in repository/PR metadata rather than GitHub's draft flag. GitHub Draft is used only when a change genuinely should not be reviewable/mergeable yet or substantial intended implementation is deliberately incomplete. This project-specific policy prevents ordinary autonomous continuation from depending on a Draft → Ready transition.

GitHub Actions/CI is diagnostic evidence under the current project PR policy, not an automatic merge prerequisite. A failing check that exposes a real implementation, security, data-integrity or release defect remains actionable. An empty/zero-step Platform Validation wrapper is treated as unavailable evidence rather than an application failure. Issue #143 tracks repository governance hardening and is not a blanket blocker on otherwise mergeable work.

Portfolio importance and execution capacity are distinct. This repository uses the portfolio states `PLANNED`, `READY`, `ACTIVE`, `VALIDATING`, `BLOCKED`, `MAINTENANCE`, and `COMPLETE` where relevant, plus an execution slot of `BUILDING`, `INTEGRATING`, `VERIFYING`, `WAITING`, or `NONE`. Only work actively consuming delivery capacity should occupy BUILDING or INTEGRATING.

Default WIP limits are three ordinary open implementation PRs and a dependent PR stack depth of two. Exceeding either limit shifts work to integration/reconciliation until the queue is back within limits.

## Product principles

- Beer-first launch scope.
- Server-side authority for identity, ownership, permissions and derived rating totals.
- Fail closed on malformed provider data, unavailable authentication discovery, ownership uncertainty and unsupported workflows.
- No production secret in browser code.
- No fake success, demonstration data or placeholder workflow presented as real.
- Preserve stable identifiers and deterministic data relationships.
- Treat provider integration as a controlled adapter boundary rather than direct browser-to-provider access.
- Prefer root-cause corrections over local workarounds.
- Keep each implementation issue focused enough to produce one reviewable pull request.
- Prefer integration throughput over accumulating overlapping implementation; respect the repository WIP/stack limits unless an explicit exception is recorded.
- Reuse template patterns before introducing shared runtime packages across projects.
- Keep required failing work open for remediation; close without merge only when work is intentionally excluded, superseded, duplicated or cancelled.

## Technology

| Area | Current implementation |
|---|---|
| Frontend | React 19.3 |
| Build tooling | Vite |
| Runtime | Node.js 22 |
| Package manager | npm |
| Hosting | Vercel with BonoHost host-neutral runtime support |
| Backend provider | NoCodeBackend |
| Server boundary | Same-origin handlers under `api/`, with Vercel and standard Node adapters |
| Rate limiting | Upstash-compatible Redis integration |
| Validation | Project-owned validation plus diagnostic GitHub Actions |
| PR lifecycle | Normal PRs plus repository/PR lifecycle metadata and `.github/workflows/pr-lifecycle.yml` |
| Browser routing | Small same-origin History API router |

Node.js 22 is the governed repository/deployment target. BonoHost provides Node.js 22.23.2, which satisfies Vite 8's Node 22 minimum. `.nvmrc`, `package.json`, validation and deployment evidence must remain aligned.

## Provider configuration contract

The repository standardises on these server-only NoCodeBackend variables:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_AUTH_SECRET_KEY`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`
- `NOCODEBACKEND_USER_EMAIL`
- `NOCODEBACKEND_USER_SECRET_KEY`
- `NOCODEBACKEND_ADMIN_EMAIL`
- `NOCODEBACKEND_ADMIN_SECRET_KEY`

Canonical URL defaults where a fallback is required:

- Data: `https://api.nocodebackend.com/`
- Authentication: `https://app.nocodebackend.com/api/user-auth`

`NOCODEBACKEND_AUTH_SECRET_KEY`, `NOCODEBACKEND_SECRET_KEY`, `NOCODEBACKEND_INSTANCE`, `NOCODEBACKEND_USER_EMAIL`, `NOCODEBACKEND_USER_SECRET_KEY`, `NOCODEBACKEND_ADMIN_EMAIL` and `NOCODEBACKEND_ADMIN_SECRET_KEY` must be supplied by the runtime/environment and must not have repository defaults or committed production values.

Browser code must not receive the provider secret or bypass the Pourfolio same-origin server boundary.

## Repository authority

Use the following project source hierarchy, while applying the inherited master standards as governing rules:

1. implemented code and configuration;
2. `AGENTS.md`;
3. current project documentation and accepted decisions;
4. active provider/deployment state where the fact is provider/runtime-owned;
5. tests and runtime evidence;
6. GitHub issues, PRs, review state and validation evidence;
7. prior chat/context;
8. inference.

Routine ChatGPT/Codex responses are an operational summary only, not a project-state store. Detailed implementation state and evidence must remain in the repository/GitHub hierarchy above, with `STATUS.md` as the primary continuity/status document.

For PR lifecycle facts, GitHub is authoritative for open/closed/merged state, latest head, review conversations and conflicts. Repository/PR metadata is authoritative for the project's Implementing/Validating/Ready/Mergeable lifecycle state. GitHub Draft is exceptional and must not be used as the routine lifecycle mechanism. Hosted checks are diagnostic evidence unless the project policy explicitly makes a particular underlying result material to the change. Conflicts must be investigated rather than silently reconciled.

## Canonical repository documents

- `PROJECT.md` — durable project purpose, scope, inheritance and operating context.
- `STATUS.md` — primary continuity/status document for current implementation, completed/active/next work, execution gate, active PR/lifecycle state, validation evidence, blockers, deferred work and owner actions.
- `PR_LIFECYCLE_STANDARD.md` — adopted repository PR progression and merge-governance contract.
- `ARCHITECTURE.md` — concise current architecture summary.
- `DATA_MODEL.md` — concise current domain/data authority and provider/schema source mapping.
- `contracts/pourfolio-data-contract.json` — machine-readable NoCodeBackend-facing collection/field/classification contract.
- `docs/nocodebackend/launch-schema-contract.md` and `docs/nocodebackend/schema-mapping.md` — provider deployment classification and detailed provider mapping.
- `exports/schema.sql` — reference/target SQL artefact only; it is not evidence of deployed NoCodeBackend state.
- `ROADMAP.md` — intended phase/milestone direction and dependencies.
- `SYSTEM_MAP.md` — compact implementation relationship map for whole-system analysis.
- `docs/ARCHITECTURE.md` — detailed technical architecture.
- `docs/DATA_MODEL.md` — detailed deployed data contract.
- `docs/SECURITY.md` — security model and controls.
- `docs/TESTING.md` — validation strategy.
- `docs/LAUNCH_READINESS.md` — production gate evidence.
- `docs/RELEASE_TRACKING.md` — release evidence and phase tracking.
- `docs/BONOHOST_DEPLOYMENT.md` — BonoHost host-neutral Node deployment runbook.
- `docs/DECISIONS/` — accepted decision records.

## Definition of launch-ready

Pourfolio is launch-ready only when:

- all required launch workflows work against the connected production-equivalent backend;
- authentication, session, ownership and rate-limit controls are proven;
- canonical catalogue and imported data are reconciled;
- rating writes are reliable and data-integrity controls are deployed;
- project-owned validation is sufficient and material defects identified by diagnostic checks are resolved;
- environment configuration and provider permissions are verified;
- the exact production deployment SHA is verified;
- required provider/runtime smoke evidence passes;
- all P0/P1 launch gates are closed with evidence;
- current documentation matches the implemented state;
- no deferred prototype module is accidentally routed, bundled or represented as production-ready.

See `STATUS.md` for the current gate and `ROADMAP.md` for the dependency-correct path to this outcome.
