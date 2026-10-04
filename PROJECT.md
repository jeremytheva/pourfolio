# PROJECT.md

## Project

**Pourfolio**  
Beer-first discovery, structured rating and private cellar platform.

**Repository:** `jeremytheva/pourfolio`  
**Primary branch:** `main`  
**Project control baseline:** 5 October 2026

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

- **AI-First Platform Development Framework v3.2** — overarching architecture, whole-system, autonomy, continuity and project-managed PR governance framework;
- **AI Platform Development Standard v1.5** — implementation protocol, execution gates, Continue/Next behaviour, repository/PR management and work-state rules;
- **Project Documentation Standard v1.5** — project-document ownership, continuity, source reconciliation and source-of-truth rules;
- **Pull Request Lifecycle Standard v1.1** — normal-PR progression, latest-head evidence and merge governance;
- **GitHub Reference Guide v1.2** — repository state, least-privilege automation and GitHub evidence boundaries;
- **Testing, Validation & Release Standard v1.2** — project-owned evidence, deployment and completion rules;
- the retained current Platform Engineering, Design, Data/Migration, Security, Observability, NoCodeBackend and Vercel standards indexed by Project Master's `MASTER_SOURCE_MANIFEST.md`.

Project-specific facts and exceptions belong in this repository. Master rules should be referenced rather than copied into project documents. `PR_LIFECYCLE_STANDARD.md` is retained in this repository as the adopted lifecycle contract used by repository automation and project continuity.

### Project-specific deviations

No intentional project deviation currently overrides the master security or data-integrity rules. Provider limitations and unresolved runtime evidence are recorded rather than treated as complete.

Routine agent execution belongs in `AGENTS.md`; the repository-local `PR_LIFECYCLE_STANDARD.md` is a concise Pourfolio binding to the inherited lifecycle rather than a competing master standard. The owner's current terminology uses `MERGEABLE` for the state equivalent to the master lifecycle's merge-ready state. No project exception changes the normal-PR, latest-head-evidence or advisory-CI defaults.

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

`contracts/pourfolio-data-contract.json` owns canonical provider variable names and URLs; `.env.example` is the setup template. `ARCHITECTURE.md` explains server-side use and the user/admin certification boundary. Runtime identities, instance and secrets have no committed values and never enter browser code.

## Repository authority

Authority follows the fact being resolved; code proves implemented behaviour and does not automatically override intended domain/provider meaning.

| Fact | Owning source |
|---|---|
| Implemented behaviour/configuration | Code and configuration |
| Agent workflow | `AGENTS.md` |
| PR acceptance/progression | `PR_LIFECYCLE_STANDARD.md` |
| Scope/identity | `PROJECT.md` |
| Current continuity/blockers | `STATUS.md` |
| Intended architecture/model | `ARCHITECTURE.md`, `DATA_MODEL.md` and their detailed specialist records |
| Significant decisions | `docs/DECISIONS/` |
| Live PR/issue/review/conflict state | GitHub |
| Deployed schema/capability | Provider and dated verified evidence |
| Deployed version | Deployment platform |
| Validation result | Executed commands/runtime evidence |

Master adoption release: **2026-10-04**, as indexed by Project Master's `MASTER_SOURCE_MANIFEST.md`. Local operating bindings remain in the existing repository guidance. Chat provides supporting context and concise operational summaries.

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
