# GitHub–AI delivery-system implementation status

**Current-state review:** 28 August 2026

This document describes the current delivery-system implementation. It supersedes the repository bootstrap assessment that previously described the project as React 18.3/Vite 5 with no `AGENTS.md`, workflows, lockfile or end-to-end testing. Those statements are historical and must not be used as current implementation facts.

## Current repository state

Pourfolio is a JavaScript/JSX React 19.2 application built by Vite 8, pinned to Node.js 20 through `.nvmrc` and managed with npm/package-lock. The repository includes project control documents, repository instructions, GitHub Actions validation, Node policy/unit tests, Playwright browser tests, axe accessibility checks, NoCodeBackend contract/audit tooling, release checks and Vercel deployment configuration.

The canonical source-validation command is:

```bash
npm run platform:validate
```

`platform:validate` covers repository/documentation/environment guards, lint, Node tests, production dependency audit, production build, bundle containment/budget and release-security checks. Pull requests also run hosted browser/accessibility, Dependency Review and CodeQL validation.

There is no TypeScript configuration or separate typecheck command.

## Governing delivery lifecycle

The repository inherits the current master PR lifecycle through `PROJECT.md` and `AGENTS.md`:

**Draft → Implementing → Validating → Ready → Mergeable → Merged**

The project may manage routine lifecycle progress, implementation, commits and validation. GitHub must remain the independent enforcement layer for the Mergeable boundary. Passing tests or exposing a merge button does not itself establish Mergeable state.

## Current enforcement gap

Observed remotely on 28 August 2026:

- GitHub `main` SHA: `3575ec54c4383226f1c31dfc45bb0e46a1285890`;
- `main` reports `protected: false`;
- branch-protection enforcement is disabled and there are no required status checks on the branch;
- repository rulesets are empty;
- CI workflows exist and run useful validation, but are not yet independently merge-blocking through a branch rule/ruleset.

This is tracked by Phase 0 issue #143 and is an active release blocker. Until enforcement is verified, non-trivial implementation PRs must remain Draft rather than using the absence of protection as permission to merge.

## Current deployment gap

The Vercel project is linked to `jeremytheva/pourfolio`, but the latest observed production deployment is based on GitHub SHA `2fca3584875221e216464d187cf5c9c26962ff8f`, which is behind current `main`.

The Vercel project is also configured for Node.js `22.x`, while the repository's governed runtime is Node.js 20. Production certification therefore requires both runtime alignment and a fresh exact-SHA deployment.

Recent implementation activity also exhausted the Hobby-plan deployment allowance. Draft/Implementing/Validating work should rely primarily on GitHub source validation; connected deployment evidence belongs at the appropriate Ready/Release boundary rather than on every incremental implementation commit.

Issue #224 remains authoritative for current-main production deployment evidence.

## Provider boundary

NoCodeBackend remains the active backend provider. Browser code uses the Pourfolio same-origin server boundary rather than privileged direct provider access. The canonical server-only environment contract is:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

Provider authorisation, schema migration and same-state connected certification are not proven by repository validation. The currently owner-deferred provider/data work remains tracked under #225, #165 and #144, with backend-dependent catalogue certification under #154.

## Remaining delivery-system work

1. Complete repository-side standards/lifecycle/documentation alignment.
2. Configure and verify the `main` protection/ruleset/security controls under #143 using exact remotely observed check contexts.
3. Align Vercel project runtime to Node.js 20.
4. Govern preview/deployment frequency so incremental AI commits do not consume release deployment capacity unnecessarily.
5. Produce a fresh production deployment from current `main` and verify its SHA through `/api/health` and `/api/readiness` under #224.
6. Resume connected provider/data certification only when the product owner has supplied the required information.
7. Perform launch verification only on one exact candidate SHA whose source checks, governance and connected evidence all agree.

## Deliberate boundaries

- No `CODEOWNERS` ownership is invented without reliable ownership evidence.
- No production/provider success is inferred from source tests.
- No branch/ruleset setting is marked complete until observed remotely.
- No administrator bypass is used to compensate for missing required evidence.
- No major unrelated dependency migration is introduced into the launch path merely because Dependabot opened it.
