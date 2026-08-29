# GitHub–AI delivery-system implementation status

**Current-state review:** 30 August 2026

This document describes the current delivery-system implementation. It supersedes the historical bootstrap assessment that described Pourfolio as React 18/Vite 5 with no `AGENTS.md`, workflows, lockfile or end-to-end tests. Those statements are no longer current project facts.

## Current repository state

Pourfolio is a JavaScript/JSX React 19.2 application built by Vite 8, governed on Node.js 20 through `.nvmrc` and `package.json`, and managed with npm/package-lock.

The repository includes:

- authoritative project controls in `PROJECT.md`, `STATUS.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `ROADMAP.md` and `SYSTEM_MAP.md`;
- repository-level AI operating rules in `AGENTS.md`;
- the adopted PR lifecycle contract in `PR_LIFECYCLE_STANDARD.md`;
- accepted decision records in the established `docs/DECISIONS/` directory;
- GitHub Actions source validation, browser/accessibility validation, Dependency Review and CodeQL;
- Node policy/unit tests, Playwright tests and axe accessibility checks;
- NoCodeBackend contract/audit tooling and connected evidence workflows;
- release checks and Vercel deployment configuration.

A second root `DECISIONS/` directory is deliberately not created because `docs/DECISIONS/` is the existing canonical ADR authority.

## Autonomous continuation control plane

The repository is designed so an AI agent can resume work without depending on previous chat history:

1. `AGENTS.md` defines the mandatory project-entry sequence, whole-system analysis, continuation semantics, stop/escalation conditions, duplicate-work prevention, PR lifecycle and evidence rules.
2. `STATUS.md` provides machine-readable phase/stage/gate/execution state plus the durable human handoff.
3. `ROADMAP.md` records dependency order and launch gates.
4. GitHub issues/PRs and their current-head checks identify active implementation contracts and evidence.
5. Repository/provider/deployment evidence overrides stale chat or historical documentation.

`Continue`, `Next` or an equivalent scheduled supervisory instruction means continuing the highest-priority dependency-correct actionable work until a real escalation condition is reached. Finishing one task is not itself a stop condition.

## Canonical validation

The one source-validation entry point is:

```bash
npm run platform:validate
```

It composes repository/documentation/environment governance guards, lint, Node tests, production dependency audit, production build, bundle containment/budget and release-security checks.

Pull requests also run hosted browser/accessibility, Dependency Review and CodeQL validation. There is no TypeScript configuration or separate typecheck command, so typecheck is not applicable to the current JavaScript/JSX codebase.

Repository validation does not prove provider authorisation, deployed configuration, exact deployed SHA, migrations or connected production behaviour.

## Governing delivery lifecycle

Pourfolio follows:

**Draft → Implementing → Validating → Ready → Mergeable → Merged**

The project may autonomously manage routine implementation, commits, validation, review fixes and safe lifecycle metadata. GitHub remains the independent enforcement layer for the Mergeable boundary.

`.github/workflows/pr-lifecycle.yml` may synchronise lifecycle labels from GitHub-native PR/validation state and safely remove a merged same-repository source branch. It does not self-certify `pr:mergeable`, bypass branch controls or equate `MERGED` with `COMPLETE`.

## Current enforcement gap

Observed remotely on 30 August 2026:

- default branch: `main`;
- observed `main` SHA: `af7a4b721103d98c61ccb6d37dcd750741f41764`;
- `main` reports `protected: false`;
- no required status checks are configured through branch protection;
- repository rulesets are empty;
- CI workflows exist and produce useful evidence but are not yet independently merge-blocking.

This is tracked by #143 and remains an active release/governance blocker. Until independent enforcement is proved, a non-trivial PR may become **Ready** after current-head validation but must not be treated as **Mergeable** merely because GitHub reports a clean merge or exposes a merge button.

Successful check/job names observed on PR #247 before the autonomous-continuation edits were `Release gate`, `Browser and accessibility`, `Dependency review` and CodeQL `Analyse JavaScript`. They are context-discovery evidence only; required checks must be configured and reverified against the governed candidate SHA.

See `docs/GITHUB_CONFIGURATION.md` for the current administrator evidence checklist.

## Duplicate-work control

Before opening implementation work, agents must search open/draft PRs, issues, visible branches, `STATUS.md`, TODO/state documentation and partial implementation.

Current example: governance work is consolidated in PR #247. Overlapping PR #246 is superseded after its durable documentation evidence is preserved; its separate Vercel auto-deployment policy experiment is not silently folded into governance scope and remains a deployment concern under #224. Existing NoCodeBackend source-configuration work continues in PR #248 rather than being reimplemented on another branch.

## Provider boundary

NoCodeBackend remains the active backend provider. Browser code uses Pourfolio's same-origin server boundary rather than privileged direct provider access.

Canonical server-side configuration names are:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

Provider authorisation, schema migration and same-state connected certification are not proved by source validation. Relevant work remains tracked under #225, #165 and #144, with backend-dependent catalogue certification under #154.

## Deployment boundary

Vercel remains the deployment provider. Exact production SHA, environment configuration, runtime version and connected health/readiness must be verified as runtime evidence rather than inferred from source files. Issue #224 remains authoritative for current-main production deployment evidence.

Normal deployment-policy changes, including automatic branch-deployment suppression, belong with deployment/release governance and should not be coupled to unrelated repository-governance work without evidence that the scopes are inseparable.

## Remaining delivery-system work

1. Validate PR #247 on its exact latest head and move it to **Ready** when Change/Integration evidence passes.
2. Close overlapping PR #246 as superseded after confirming its remaining unique files are deployment-specific rather than lost governance requirements.
3. Complete #143 GitHub ruleset/protection/security/reviewer evidence; only then can PRs cross the independently enforced **Mergeable** boundary.
4. Continue existing PR #248 and repair its current-head validation before creating any competing NoCodeBackend configuration work.
5. Restore exact-SHA current-main production evidence under #224.
6. Continue connected backend/catalogue certification only against verified provider/runtime state.

## Deliberate boundaries

- No `CODEOWNERS` ownership is invented without reliable ownership evidence.
- No production/provider success is inferred from source tests.
- No branch/ruleset setting is marked complete until observed remotely.
- No administrator bypass is used to compensate for missing required evidence.
- No duplicate project document, ADR tree, CI workflow or implementation PR is created merely to conform to a template.
- No major unrelated dependency migration is introduced into the launch path merely because an automated dependency PR exists.
