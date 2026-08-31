# PROJECT.md

## Project

**Pourfolio**  
Beer-first discovery, structured rating and private cellar platform.

**Repository:** `jeremytheva/pourfolio`  
**Primary branch:** `main`  
**Project control baseline:** 29 August 2026

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
- **Pull Request Lifecycle Standard v1.0** — Draft → Implementing → Validating → Ready for Review → Mergeable → Merged progression, with GitHub as the independent enforcement layer;
- **Testing, Validation & Release Standard v1.2** — evidence, latest-head merge validation, canonical validation, deployment and completion rules;
- **Project Documentation Standard v1.2** — project-document ownership, continuity, PR/gate status integration and source-of-truth rules;
- the applicable Platform Engineering, Design, Data/Migration, Security, Observability and provider reference standards where their rules apply to this project.

Project-specific facts and exceptions belong in this repository. Master rules should be referenced rather than copied into project documents. `PR_LIFECYCLE_STANDARD.md` is retained in this repository as the adopted lifecycle contract used by repository automation and project continuity.

### Project-specific deviations

No intentional project deviation currently overrides the master security, data-integrity or validation rules. Provider limitations and unresolved runtime evidence are recorded as blockers rather than treated as exceptions.

Repository lifecycle automation may maintain PR state labels and validation state, but it must not self-certify `MERGEABLE` or bypass missing GitHub branch/ruleset enforcement. Until #143 closes with evidence, merge enforcement remains incomplete.

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
- Keep required failing work open for remediation; close without merge only when work is intentionally excluded, superseded, duplicated or cancelled.

## Technology

| Area | Current implementation |
|---|---|
| Frontend | React 19.2 |
| Build tooling | Vite |
| Runtime | Node.js 20 |
| Package manager | npm |
| Hosting | Vercel |
| Backend provider | NoCodeBackend |
| Server boundary | Vercel Functions under `api/` |
| Rate limiting | Vercel KV / Upstash-compatible Redis integration |
| CI / validation | GitHub Actions plus `npm run platform:validate` |
| PR lifecycle | GitHub PR state plus `.github/workflows/pr-lifecycle.yml`; merge enforcement tracked by #143 |
| Browser routing | Small same-origin History API router |

## Provider configuration contract

The repository standardises on these server-only NoCodeBackend variables:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

Canonical hard-coded defaults where a fallback is required:

- Data: `https://api.nocodebackend.com/`
- Authentication: `https://app.nocodebackend.com/api/user-auth`
- Instance: `54026_rating`

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

For PR lifecycle facts, GitHub is authoritative for draft/ready state, latest head, checks, review conversations, conflicts and merge state. Conflicts must be investigated rather than silently reconciled.

## Canonical repository documents

- `PROJECT.md` — durable project purpose, scope, inheritance and operating context.
- `STATUS.md` — current implementation, execution gate, active PR/lifecycle state and blocker state.
- `PR_LIFECYCLE_STANDARD.md` — adopted repository PR progression and merge-governance contract.
- `ARCHITECTURE.md` — concise current architecture summary.
- `DATA_MODEL.md` — concise current domain/data summary.
- `ROADMAP.md` — intended phase/milestone direction and dependencies.
- `SYSTEM_MAP.md` — compact implementation relationship map for whole-system analysis.
- `docs/ARCHITECTURE.md` — detailed technical architecture.
- `docs/DATA_MODEL.md` — detailed deployed data contract.
- `docs/SECURITY.md` — security model and controls.
- `docs/TESTING.md` — validation strategy.
- `docs/LAUNCH_READINESS.md` — production gate evidence.
- `docs/RELEASE_TRACKING.md` — release evidence and phase tracking.
- `docs/DECISIONS/` — accepted decision records.

## Definition of launch-ready

Pourfolio is launch-ready only when:

- all required launch workflows work against the connected production-equivalent backend;
- authentication, session, ownership and rate-limit controls are proven;
- canonical catalogue and imported data are reconciled;
- rating writes are reliable and data-integrity controls are deployed;
- required CI, security, accessibility and production build checks pass on the exact candidate SHA;
- environment configuration and provider permissions are verified;
- the exact production deployment SHA is verified;
- required provider/runtime smoke evidence passes;
- all P0/P1 launch gates are closed with evidence;
- required repository governance controls are active;
- current documentation matches the implemented state;
- no deferred prototype module is accidentally routed, bundled or represented as production-ready.

See `STATUS.md` for the current gate and `ROADMAP.md` for the dependency-correct path to this outcome.
