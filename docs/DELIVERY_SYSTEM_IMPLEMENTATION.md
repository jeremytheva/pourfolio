# GitHub–AI delivery-system implementation status

**Current-state review:** 28 August 2026

This document describes the current delivery-system implementation. It supersedes the repository bootstrap assessment that previously described the project as React 18.3/Vite 5 with no `AGENTS.md`, workflows, lockfile or end-to-end testing. Those statements are historical and must not be used as current implementation facts.

## Current repository state

Pourfolio is a JavaScript/JSX React 19.2 application built by Vite 8, governed on Node.js 20 through `.nvmrc` and `package.json` `engines.node: 20.x`, and managed with npm/package-lock. The package engine pin is also the source-level Vercel runtime override; its effect must still be verified on a fresh deployment.

The repository includes project control documents, repository instructions, GitHub Actions validation, Node policy/unit tests, Playwright browser tests, axe accessibility checks, NoCodeBackend contract/audit tooling, release checks and Vercel deployment configuration.

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

Exact successful check names observed on prior PR #245 candidate SHA `45654e62ad1a0d7f814eff0f0a86d33ae374b87c` are `Release gate`, `Browser and accessibility`, `Dependency review`, and CodeQL job `Analyse JavaScript`. These are context-discovery evidence only; the final Phase 0 rule and evidence must be verified against the governed candidate SHA.

This is tracked by Phase 0 issue #143 and is an active release blocker. Until enforcement is verified, non-trivial implementation PRs must remain Draft rather than using the absence of protection as permission to merge.

## Deployment lifecycle and capacity control

`vercel.json` now keeps normal implementation branch families CI-first by disabling automatic Vercel Git deployments for:

- `codex/**`;
- `chore/**`;
- `docs/**`;
- `fix/**`;
- `feature/**`;
- `phase-*/**`;
- `observability/**`;
- `dependabot/**`.

When connected preview evidence is genuinely required, create a short-lived `preview/<pr-number>` branch pointing to the **same already-validated candidate SHA**. `preview/**` is deliberately not disabled, so connected evidence can be created without a new implementation commit. `main` is also not disabled and remains eligible for the governed production path after merge.

This policy addresses the deployment-churn problem that exhausted the Hobby-plan build allowance during rapid AI implementation. GitHub CI remains the primary Draft/Implementing/Validating evidence layer; Vercel preview evidence is collected deliberately at the Ready/Release boundary.

## Current production gap

The Vercel project is linked to `jeremytheva/pourfolio`, but the latest observed production deployment is based on GitHub SHA `2fca3584875221e216464d187cf5c9c26962ff8f`, which is behind current `main`.

The Vercel project setting reports Node.js `22.x`, while the repository contract is Node.js 20. The active governance PR adds `package.json` `engines.node: 20.x`, which Vercel uses as the source-level version override. The runtime blocker remains open until a new production-equivalent deployment proves Node.js 20 and the exact release SHA.

Issue #224 remains authoritative for current-main production deployment evidence.

## Provider boundary

NoCodeBackend remains the active backend provider. Browser code uses the Pourfolio same-origin server boundary rather than privileged direct provider access. The canonical server-only environment contract is:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

Provider authorisation, schema migration and same-state connected certification are not proven by repository validation. The currently owner-deferred provider/data work remains tracked under #225, #165 and #144, with backend-dependent catalogue certification under #154.

## Remaining delivery-system work

1. Validate Draft PR #246 on its exact latest SHA.
2. Create/assign the Phase 0 milestone if still absent.
3. Configure and verify the `main` protection/ruleset/security controls under #143 using exact remotely observed current check contexts.
4. Move PR #246 through Ready → Mergeable only after the independent enforcement boundary exists and the latest SHA satisfies it.
5. Merge without bypass and produce a fresh production deployment from current `main`.
6. Verify the deployed SHA through `/api/health` and `/api/readiness` and verify Node.js 20 is actually used.
7. Resume connected provider/data certification only when the product owner has supplied the required information.
8. Perform launch verification only on one exact candidate SHA whose source checks, governance and connected evidence all agree.

## Deliberate boundaries

- No `CODEOWNERS` ownership is invented without reliable ownership evidence.
- No production/provider success is inferred from source tests.
- No branch/ruleset setting is marked complete until observed remotely.
- No administrator bypass is used to compensate for missing required evidence.
- No major unrelated dependency migration is introduced into the launch path merely because Dependabot opened it.
