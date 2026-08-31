---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Node 24 runtime certified; current-main/readiness and provider evidence remain"
gate: Release
execution_state: BLOCKED
current_work:
  objective: "Complete current-main deployment/readiness evidence without reopening explicitly deferred backend/provider work."
  issue: 224
  pr: null
  branch: main
next_actions:
  - "Recheck Vercel for a production deployment of current main after dd7b3dcf586c42b9d4a622afde8950b5cbcc71aa; verify /api/health and /api/readiness against that exact SHA when available."
  - "Keep #225, #165, #144 and backend-dependent #154 deferred until the product owner explicitly resumes backend/provider implementation with the required information."
  - "Continue only independent launch-scope work that does not duplicate merged changes or speculate about deferred provider state."
blockers:
  - "Issue #224 remains incomplete: production deployment 2ba2fec2435c2cfcdb7353a14dd8893dccaec7a6 proves Node 24, but current main is dd7b3dcf586c42b9d4a622afde8950b5cbcc71aa and /api/readiness payload collection on the protected deployment is still redirected through Vercel SSO."
  - "Backend/provider implementation remains explicitly owner-deferred pending additional information."
requires_owner_decision: false
owner_decision:
  question: null
  options: []
  recommendation: null
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: PASS
last_verified_commit: "305ed12b1d3cdfe7e1887afd8299459fd3f54154"
last_updated: "2026-08-31T13:14:00+10:00"
---

# STATUS.md

Last materially reviewed: 31 August 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Current objective

Complete the remaining release evidence for current `main` while preserving the explicit backend/provider deferral.

## Overall status

**Integrated source queue and Node 24 runtime migration complete; Pourfolio is not production-ready.**

The accumulated governance, frontend recovery/accessibility, NoCodeBackend configuration and Node runtime work is merged. Issue #249 is complete because the migrated Node 24 runtime has now been observed in a production Vercel deployment. Issue #224 remains open because its stronger current-main/readiness acceptance contract is not yet fully satisfied.

## AI execution gate

**Current gate:** Release  
**Gate state:** BLOCKED by current-main/readiness evidence and the explicit backend/provider deferral.  
**Current branch tip:** use live GitHub `main` as authoritative. At this review it is `dd7b3dcf586c42b9d4a622afde8950b5cbcc71aa`.  
**Node 24 implementation merge:** `b8a938c6e61bb8782a0effd43b40ffdc113d65d0`.  
**Node 24 validation head:** `305ed12b1d3cdfe7e1887afd8299459fd3f54154`.  
**Project-owned validation:** PASS on the migration head through the repository Release gate (`npm run platform:validate`), with Browser/accessibility, Dependency Review and CodeQL also passing.  
**Production Node runtime:** VERIFIED as Node 24.x on production deployment `dpl_AE83fY9HXFCvo69b2HuFR92Sqfgt` at release SHA `2ba2fec2435c2cfcdb7353a14dd8893dccaec7a6`.

GitHub Actions/CI remains diagnostic evidence under project policy. Real defects it exposes remain actionable, but hosted status is not itself the merge authority.

## Integrated recommendations

The previously accumulated implementation queue is reconciled and merged:

- governance/autonomous continuation: #261;
- profile rating-history recovery: #262;
- cellar load recovery: #263;
- product load recovery: #264;
- sign-out failure recovery: #265;
- catalogue load-error focus recovery: #266;
- zero-valued catalogue IBU preservation: #267;
- zero-valued product-detail IBU preservation: #268;
- catalogue pagination focus recovery: #269;
- NoCodeBackend runtime-instance externalisation: #270;
- Node.js 24 runtime migration: #271.

Overlapping frontend corrections were reconciled at patch level rather than replacing newer behaviour.

## Node 24 production evidence

Issue #249 is complete.

Vercel production deployment `dpl_AE83fY9HXFCvo69b2HuFR92Sqfgt` was built from `main` SHA `2ba2fec2435c2cfcdb7353a14dd8893dccaec7a6`. GitHub ancestry proves Node 24 merge commit `b8a938c6e61bb8782a0effd43b40ffdc113d65d0` is an ancestor of that deployment.

The Vercel build log explicitly records:

- cache invalidation because Node changed from `20.x` to `24.x`;
- `package.json` `engines.node: 24.x` overriding the Vercel project setting;
- Node.js `24.x` being used for the deployment;
- a successful production build and deployment with no Node 20 deprecation/build-cutoff warning.

Authenticated `/api/health` on that deployment returns HTTP 200 with release SHA `2ba2fec2435c2cfcdb7353a14dd8893dccaec7a6`, `environment: production`, and the expected configuration-presence checks.

This evidence certifies the runtime migration itself. It does **not** close #224 because `main` subsequently advanced to `dd7b3dcf586c42b9d4a622afde8950b5cbcc71aa`, no newer deployment was visible at this review, and `/api/readiness` payload collection on the protected deployment still redirects through Vercel SSO.

## Runtime and provider configuration

Node.js 24 is the governed repository runtime through `.nvmrc`, `package.json` and `scripts/check-runtime-contract.js`, and the runtime-contract guard is included in `npm run platform:validate`.

The NoCodeBackend environment contract remains:

- `NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth`
- `NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/`
- `NOCODEBACKEND_SECRET_KEY` supplied outside the repository;
- `NOCODEBACKEND_INSTANCE` supplied outside the repository.

Missing required instance/secret configuration fails closed before privileged provider access.

## Backend/provider state

Backend/provider implementation remains **owner-deferred**. Preserve without advancing or closing until the product owner explicitly resumes it with the required information:

- #225 — NoCodeBackend production data authorization;
- #165 — rating idempotency/schema migration and connected verification;
- #144 — canonical backend/import/recovery certification;
- backend-dependent parts of #154 — catalogue remediation/provider reconciliation and connected certification.

The merged runtime/configuration work does not authorize provider mutations or certify production data.

## Governance state

Issue #143 remains open as non-blocking repository-governance hardening. It is not a blanket blocker on otherwise mergeable work. Keep it open until its own practical hardening/evidence outcome is complete.

## Deployment state

The stale-production condition that previously prevented any Node 24 production evidence is resolved: a production deployment containing the merged migration now exists and is runtime-certified.

Issue #224 still requires stronger release provenance. At this review:

- deployed production SHA: `2ba2fec2435c2cfcdb7353a14dd8893dccaec7a6`;
- current GitHub `main`: `dd7b3dcf586c42b9d4a622afde8950b5cbcc71aa`;
- `/api/health` on the deployed candidate: HTTP 200 with matching deployed SHA and `environment: production`;
- `/api/readiness` payload on the protected deployment: not collected because the connected Vercel fetch receives an SSO redirect;
- no deployment newer than the production `2ba2fec...` candidate was visible after current `main` advanced.

Do not mark #224 complete until its current-main, readiness and subsequent-deployment/promotion-path acceptance evidence is satisfied.

## Known constraints

- Production/backend readiness must not be inferred from source validation, merge state or runtime migration certification alone.
- Provider-dependent migration/certification work is deliberately paused.
- #143 is governance hardening, not a blanket merge blocker.
- Vercel protected-deployment SSO can prevent connected payload collection even when the deployment itself is READY.

## Next dependency-correct work

1. Recheck Vercel for a production deployment of the then-current `main`; verify exact release SHA through `/api/health` and collect truthful `/api/readiness` evidence before closing #224.
2. Preserve the explicit backend/provider deferral until the product owner resumes #225 → #165 → #144 and dependent #154 work.
3. Continue only independent launch-scope source work that does not duplicate the merged recovery/accessibility corrections or depend on unresolved provider state.
4. Keep #143 open as non-blocking governance hardening until its own acceptance evidence exists.

## Completion rule

Do not mark Phase 3 or Pourfolio complete from the integrated source queue or Node 24 certification alone. Completion still requires applicable connected provider/data evidence, current release provenance, migration evidence and remaining launch acceptance evidence after deferred backend work resumes.
