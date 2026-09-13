# GitHub–AI delivery-system implementation status

**Current-state review:** 13 September 2026

This document describes the current delivery-system implementation and supersedes historical bootstrap/governance snapshots.

## Current repository state

Pourfolio is a JavaScript/JSX React 19.2 application built by Vite 8, governed on Node.js 22 through `.nvmrc` and `package.json`, and managed with npm/package-lock.

The repository includes:

- authoritative project controls in `PROJECT.md`, `STATUS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md` and `SYSTEM_MAP.md`;
- repository-level AI operating rules in `AGENTS.md`;
- the adopted PR lifecycle contract in `PR_LIFECYCLE_STANDARD.md`;
- accepted decision records in `docs/DECISIONS/`;
- GitHub Actions source, browser/accessibility, dependency and CodeQL diagnostics;
- Node policy/unit tests, Playwright tests and axe accessibility checks;
- NoCodeBackend contract/audit tooling and connected evidence workflows;
- release checks, Vercel deployment configuration and a host-neutral Node runtime for BonoHost.

A second root `DECISIONS/` directory is deliberately not created because `docs/DECISIONS/` is the canonical ADR authority.

## Autonomous continuation control plane

The repository is designed so an AI agent can resume work without depending on previous chat history:

1. `AGENTS.md` defines the project-entry sequence, whole-system analysis, continuation semantics, stop/escalation conditions, duplicate-work prevention, PR lifecycle and evidence rules.
2. `STATUS.md` provides the durable execution handoff.
3. `ROADMAP.md` records dependency order and launch gates.
4. GitHub issues/PRs identify active implementation contracts and integration state.
5. Repository/provider/deployment evidence overrides stale chat or historical documentation.

`Continue`, `Next` or an equivalent scheduled supervisory instruction means continuing the highest-priority dependency-correct actionable work until a real escalation condition is reached. Finishing one task is not itself a stop condition.

## Runtime contract

Node.js 22 is the governed repository/deployment runtime. BonoHost provides Node.js 22.23.2, which satisfies Vite 8's Node 22 minimum requirement. The same major also aligns with the current Vercel project runtime setting.

Runtime alignment is guarded by:

- `.nvmrc`;
- `package.json` `engines.node`;
- `scripts/check-runtime-contract.js`;
- active runtime documentation; and
- the existing GitHub validation workflow's `.nvmrc` references.

Preview/runtime evidence and production runtime evidence remain distinct. A successful source build does not by itself prove the production runtime.

## Canonical validation

The source-validation entry point is:

```bash
npm run platform:validate
```

It composes package/documentation/runtime/environment guards, lint, Node tests, production dependency audit, production build, bundle containment/budget and release-security checks.

GitHub Actions additionally provide browser/accessibility, Dependency Review and CodeQL diagnostic evidence. Under the current project lifecycle policy, hosted CI status is not an automatic merge prerequisite. Any real defect exposed by a diagnostic check remains actionable and must not be concealed or bypassed.

There is no TypeScript configuration or separate typecheck command, so typecheck is not applicable to the current JavaScript/JSX codebase.

Repository validation does not prove provider authorisation, deployed configuration, exact deployed SHA, migrations or connected production behaviour.

## Governing delivery lifecycle

Pourfolio follows:

**Implementing → Validating → Ready → Mergeable → Merged**

`MERGE_ALLOWED` requires implementation complete, sufficient project-owned validation, no merge conflicts, material review findings resolved, and no material blocker.

Issue #143 tracks additional GitHub governance hardening. It is not a blanket blocker on otherwise mergeable project work.

## Duplicate-work control

Before opening implementation work, agents must search open/draft PRs, issues, visible branches, `STATUS.md`, TODO/state documentation and partial implementation. Superseded Draft PRs may be closed without merge when a replacement preserves the implementation while resolving a tooling-only lifecycle obstruction or stale-base conflict.

## Provider boundary

NoCodeBackend remains the active backend provider. Browser code uses Pourfolio's same-origin server boundary rather than privileged direct provider access.

Canonical server-side configuration names are:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_AUTH_SECRET_KEY`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

The provider secrets and instance are runtime-only values with no committed production default. Missing required runtime configuration fails closed before privileged provider access.

Provider authorisation, schema migration and same-state connected certification are not proved by source validation. Owner-deferred backend work remains tracked under its existing issues until explicitly resumed.

## Deployment boundary

Vercel remains supported. BonoHost is supported through the host-neutral `server/index.mjs` runtime and the deployment procedure in `docs/BONOHOST_DEPLOYMENT.md`. Exact production SHA, environment configuration, runtime version and connected health/readiness must be verified as runtime evidence rather than inferred from source files.

## Current delivery-system direction

1. Keep the Node.js 22 runtime contract aligned across source validation and hosting.
2. Complete BonoHost staging setup using the merged host-neutral Node runtime.
3. Verify `/api/health`, `/api/readiness`, authentication and core data journeys on the BonoHost staging URL before any DNS cutover.
4. Preserve the current Vercel deployment until BonoHost runtime/browser evidence is sufficient for rollback-safe migration.
5. Preserve owner-deferred NoCodeBackend migration/certification work until explicitly resumed.

## Deliberate boundaries

- No `CODEOWNERS` ownership is invented without reliable ownership evidence.
- No production/provider success is inferred from source tests.
- No branch/ruleset setting is marked complete until observed remotely.
- No duplicate project document, ADR tree, CI workflow or implementation PR is created merely to conform to a template.
- No unrelated dependency migration is bundled into runtime work merely because automated dependency PRs exist.
