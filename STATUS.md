# STATUS.md

Last materially reviewed: 28 August 2026

## Current phase

**Phase 3 — Beer discovery dependable, with Phase 0 delivery-governance correction in progress**

## Current objective

Stabilise the delivery system before further broad implementation: align repository governance with the current master standards, establish enforceable GitHub merge gates, enforce the governed Node.js 20 deployment runtime, reduce deployment churn, and restore exact-SHA production evidence. Backend/provider work remains explicitly deferred pending additional product-owner information.

## Overall status

**Source implementation healthy; release path blocked. Not production-ready.**

Repository-side launch architecture, frontend hardening and source validation are strong. The immediate risk is no longer missing frontend implementation; it is that GitHub currently does not enforce the evidence required by the inherited PR lifecycle and production is behind `main`. The runtime mismatch has a source-side correction in the active governance PR but is not proven in production until a new deployment reports the expected runtime/candidate state.

## AI execution gate

**Current gate:** VALIDATING / delivery-governance alignment  
**Gate state:** IN PROGRESS  
**Release gate:** BLOCKED by governance, deployment and deferred connected evidence.

Do not advance a PR to Mergeable merely because GitHub exposes a merge action. Until Phase 0 enforcement is verified, the absence of branch protection/rulesets is a blocker rather than permission to bypass the lifecycle.

## Current verified delivery facts

Observed 28 August 2026:

- GitHub `main` is `3575ec54c4383226f1c31dfc45bb0e46a1285890` after PR #245.
- GitHub reports `main` as unprotected with branch protection disabled and no required status checks.
- Repository rulesets are empty.
- Pull-request validation, browser/accessibility, Dependency Review and CodeQL workflows exist and provide useful evidence, but they are not yet independently enforced by a `main` protection rule/ruleset.
- Exact successful check names observed on prior PR #245 candidate `45654e62ad1a0d7f814eff0f0a86d33ae374b87c` are `Release gate`, `Browser and accessibility`, `Dependency review`, and CodeQL job `Analyse JavaScript`; these names are discovery evidence, not Phase 0 completion evidence.
- Vercel's latest production deployment is from GitHub SHA `2fca3584875221e216464d187cf5c9c26962ff8f`, so production is behind current `main`.
- The Vercel project setting reports Node.js `22.x`; the repository's governed runtime is Node.js 20. The active governance PR pins `package.json` `engines.node` to `20.x`, which must be proven by a subsequent deployment before the runtime blocker can close.
- Recent Vercel deployment churn reached the Hobby-plan build-rate limit. The active governance PR disables automatic Vercel Git deployments for normal implementation branch families while leaving deliberate `preview/**` and `main` deployment paths eligible.

These facts must be reverified after the relevant controls/configuration change; they are not permanent assumptions.

## Completed recently

Frontend launch-flow hardening merged on `main` includes:

- catalogue search/results accessibility and loading/error semantics — PR #232;
- structured rating guidance, busy state and focused failure recovery — PR #234;
- cellar/profile owner-scoped mutation feedback and keyboard semantics — PR #236;
- product details → Add to cellar disclosure, save state and error recovery — PR #238;
- authentication UI selected-method, busy-state and focused-error semantics — PR #240;
- app-shell/public navigation accessibility hardening — PRs #243 and #245.

Current delivery-system implementation in Draft PR #246 includes:

- master-standard inheritance updated to Framework v3.1 / Platform Standard v1.2 / PR Lifecycle v1.0 / Testing v1.2 / Documentation v1.2;
- explicit project-managed PR lifecycle with GitHub as the independent Mergeable enforcement layer;
- stale delivery/governance documentation replacement;
- drift validation for master standards, runtime and lifecycle guidance;
- Vercel implementation-branch deployment suppression with deliberate exact-SHA `preview/<pr-number>` branches reserved for connected evidence;
- Vercel runtime override via `package.json` `engines.node: 20.x`.

The canonical source-validation entry point remains:

```bash
npm run platform:validate
```

Pull requests additionally run browser/accessibility, Dependency Review and CodeQL validation.

## In progress

- Validate PR #246 on its latest exact head SHA.
- Complete administrator-controlled GitHub enforcement under #143.
- Restore current-main exact-SHA production evidence under #224 when deployment capacity permits.
- Verify a new Vercel deployment actually uses the governed Node.js 20 runtime and the intended deployment policy.

## Blocked / deferred

### Immediate delivery-system blockers

- #143 — GitHub administrator ruleset/protection/security evidence remains incomplete; `main` is currently unprotected and repository rulesets are empty.
- #224 — production deployment is stale relative to current `main`; exact-SHA `/api/health` and `/api/readiness` evidence is therefore not current.
- live runtime evidence still reflects the pre-correction deployment/project setting and must be reverified after the Node 20 source override is deployed.
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
- Normal implementation branches are intentionally CI-first. When connected preview evidence is required, create a short-lived `preview/<pr-number>` branch pointing to the already-validated candidate SHA rather than adding a deployment-trigger commit.
- The Tailwind 3 → 4 Dependabot PR #95 has been closed/deferred from the launch path as a separately scoped post-launch migration.

## Partial / planned preserved work

- Phase 2 executable account lifecycle remains partial; source foundations exist but provider orchestration, recent-authentication, durable jobs, identity deletion and retention approval are not complete.
- Brew Done It remains contained and deferred; ADR 0001 remains authoritative for its accepted future model.
- Non-launch social/producer/admin/analytics capabilities remain deferred as documented in ROADMAP.md.

## Provider / deployment status

Backend/provider state is **deferred for implementation**, not resolved. Historical blockers remain governed by their GitHub issues and must be reverified when backend work resumes.

Deployment state is **blocked for release evidence**, not assumed broken at source level. Production freshness and Node runtime must be proven again after the source delivery corrections are merged and deployed.

## Next dependency-correct work

1. finish validation of Draft PR #246 on its exact current head SHA;
2. create/assign the Phase 0 milestone if still absent and configure `main` protection/ruleset enforcement under #143 using exact observed check contexts;
3. once #143 enforcement exists, move PR #246 through Ready → Mergeable only if its latest SHA satisfies the enforced checks/review boundary;
4. merge without bypass, then allow `main` to produce the governed production deployment;
5. verify GitHub SHA = Vercel deployment SHA = `/api/health` SHA = `/api/readiness` SHA, and verify Node.js 20 is actually used;
6. resume #225 → #165/#144 → #154 connected work only when the required provider/data information is available;
7. run the integrated launch-candidate audit only after the connected gates are complete.

Additional frontend polish should proceed only when it addresses a concrete launch-scope defect or is otherwise dependency-correct; it is no longer the default next action.

## Completion rule

Do not mark Phase 3 or the project complete because source hardening passes. Completion requires the applicable catalogue decisions, connected provider/runtime evidence, deployment provenance, migration evidence, enforceable governance controls and release verification on an exact candidate SHA.
