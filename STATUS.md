# STATUS.md

Last materially reviewed: 28 August 2026

## Current phase

**Phase 3 — Beer discovery dependable, with Phase 0 delivery-governance correction in progress**

## Current objective

Stabilise the delivery system before further broad implementation: align repository governance with the current master standards, establish enforceable GitHub merge gates, restore exact-SHA production deployment evidence and remove runtime/documentation drift. Backend/provider work remains explicitly deferred pending additional product-owner information.

## Overall status

**Source implementation healthy; release path blocked. Not production-ready.**

Repository-side launch architecture, frontend hardening and source validation are strong. The immediate risk is no longer missing frontend implementation; it is that GitHub currently does not enforce the evidence required by the inherited PR lifecycle, while Vercel production is behind `main` and uses a different configured Node major from the repository contract.

## AI execution gate

**Current gate:** INTEGRATION / delivery-governance alignment  
**Gate state:** IN PROGRESS  
**Release gate:** BLOCKED by governance, deployment and deferred connected evidence.

Do not advance a PR to Mergeable merely because GitHub exposes a merge action. Until Phase 0 enforcement is verified, the absence of branch protection/rulesets is a blocker rather than permission to bypass the lifecycle.

## Current verified delivery facts

Observed 28 August 2026:

- GitHub `main` is `3575ec54c4383226f1c31dfc45bb0e46a1285890` after PR #245.
- GitHub reports `main` as unprotected with branch protection disabled and no required status checks.
- Repository rulesets are empty.
- Pull-request validation, browser/accessibility, Dependency Review and CodeQL workflows exist and provide useful evidence, but they are not yet independently enforced by a `main` protection rule/ruleset.
- Vercel's latest production deployment is from GitHub SHA `2fca3584875221e216464d187cf5c9c26962ff8f`, so production is behind current `main`.
- The Vercel project is configured for Node.js `22.x`; the repository's governed runtime remains Node.js 20 via `.nvmrc` and `AGENTS.md`.
- Recent Vercel deployment churn reached the Hobby-plan build-rate limit, so implementation-stage commits must not be treated as requiring a fresh production deployment.

These facts must be reverified after the relevant controls/configuration change; they are not permanent assumptions.

## Completed recently

Frontend launch-flow hardening merged on `main` includes:

- catalogue search/results accessibility and loading/error semantics — PR #232;
- structured rating guidance, busy state and focused failure recovery — PR #234;
- cellar/profile owner-scoped mutation feedback and keyboard semantics — PR #236;
- product details → Add to cellar disclosure, save state and error recovery — PR #238;
- authentication UI selected-method, busy-state and focused-error semantics — PR #240;
- app-shell/public navigation accessibility hardening — PRs #243 and #245.

The canonical source-validation entry point remains:

```bash
npm run platform:validate
```

Pull requests additionally run browser/accessibility, Dependency Review and CodeQL validation.

## In progress

- Align repository project controls with AI-First Platform Development Framework v3.1, AI Platform Development Standard v1.2, PR Lifecycle Standard v1.0, Testing/Validation/Release Standard v1.2 and Project Documentation Standard v1.2.
- Make the project-managed PR lifecycle explicit in repository instructions.
- Correct stale delivery-system and GitHub-configuration documentation.
- Strengthen project-documentation validation so known version/stack/lifecycle drift fails source validation.
- Complete administrator-controlled GitHub enforcement under #143.
- Align Vercel's configured Node runtime with the governed Node 20 contract.
- Restore current-main exact-SHA production evidence under #224 when deployment capacity permits.

## Blocked / deferred

### Immediate delivery-system blockers

- #143 — GitHub administrator ruleset/protection/security evidence remains incomplete; `main` is currently unprotected and repository rulesets are empty.
- #224 — production deployment is stale relative to current `main`; exact-SHA `/api/health` and `/api/readiness` evidence is therefore not current.
- Vercel runtime setting is Node 22.x while the repository contract is Node 20.
- independent release approval and production-equivalent runtime evidence remain outstanding.

### Owner-deferred backend/provider work

The product owner has explicitly paused backend/provider implementation until more information is available. Preserve these items without advancing or closing them:

- #225 — NoCodeBackend production data authorisation;
- #165 — real rating idempotency/schema migration and connected verification;
- #144 — canonical backend/import/recovery certification;
- backend-dependent parts of #154 — catalogue remediation/provider reconciliation and connected certification.

## Known defects / constraints

- Production/backend readiness must not be inferred from source tests.
- CI presence is not equivalent to merge enforcement; required checks must be configured and verified on the exact candidate SHA.
- Vercel production cannot represent current `main` until a deployment reports the same exact SHA.
- Implementation-stage Vercel deployment churn should be reduced; Draft/Implementing/Validating work should rely primarily on GitHub source validation, with connected deployment evidence collected at the appropriate Ready/Release boundary.
- The Tailwind 3 → 4 Dependabot PR #95 is a major migration outside the launch-hardening path and should remain deferred/closed rather than merged opportunistically.

## Partial / planned preserved work

- Phase 2 executable account lifecycle remains partial; source foundations exist but provider orchestration, recent-authentication, durable jobs, identity deletion and retention approval are not complete.
- Brew Done It remains contained and deferred; ADR 0001 remains authoritative for its accepted future model.
- Non-launch social/producer/admin/analytics capabilities remain deferred as documented in ROADMAP.md.

## Provider / deployment status

Backend/provider state is **deferred for implementation**, not resolved. Historical blockers remain governed by their GitHub issues and must be reverified when backend work resumes.

Deployment state is **blocked for release evidence**, not assumed broken at source level. Production freshness, Node runtime alignment and readiness must be proven again after configuration/deployment correction.

## Next dependency-correct work

1. finish the repository-side governance/documentation alignment and validate it in a Draft PR;
2. configure and verify `main` protection/ruleset enforcement under #143 using exact observed check contexts;
3. align Vercel project Node runtime to Node 20;
4. reduce unnecessary implementation-stage Vercel deployment churn without weakening release evidence;
5. close/defer the Tailwind 4 major-upgrade PR from the launch path;
6. when deployment capacity permits, deploy current `main` and verify GitHub SHA = Vercel deployment SHA = `/api/health` SHA = `/api/readiness` SHA;
7. resume #225 → #165/#144 → #154 connected work only when the required provider/data information is available;
8. run the integrated launch-candidate audit only after the connected gates are complete.

Additional frontend polish should proceed only when it addresses a concrete launch-scope defect or is otherwise dependency-correct; it is no longer the default next action.

## Completion rule

Do not mark Phase 3 or the project complete because source hardening passes. Completion requires the applicable catalogue decisions, connected provider/runtime evidence, deployment provenance, migration evidence, enforceable governance controls and release verification on an exact candidate SHA.
