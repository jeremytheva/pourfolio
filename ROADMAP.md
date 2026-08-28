# ROADMAP.md

**Last materially reviewed:** 28 August 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The current milestone is to move the implemented launch scope through the remaining governance, deployment, connected provider and data evidence gates without expanding feature breadth.

## Immediate delivery-system correction

Before further broad feature or UI work becomes the default implementation path:

1. align repository project controls with the current master standards and PR lifecycle;
2. make GitHub the independent enforcement layer for `main` under #143;
3. enforce the governed Node.js 20 deployment runtime from source and verify it in a fresh deployment;
4. keep normal implementation branches CI-first and reserve deliberate exact-SHA preview branches for connected evidence;
5. restore exact-SHA production deployment evidence under #224;
6. keep major unrelated dependency migrations, including Tailwind 4, outside the launch-hardening path unless separately approved.

Repository-side correction may proceed while backend/provider work remains owner-deferred, but it must not be used to claim connected or release gates are complete.

## Phase 0 — Governed delivery

**Outcome:** repository and release governance are sufficient for evidence-based delivery.

Current observed blocker: `main` is unprotected, repository rulesets are empty, and existing successful CI is therefore evidence without independent merge enforcement.

Repository-side alignment is being implemented in Draft PR #246. Exact successful check names observed on prior PR #245 are available for context discovery, but final ruleset evidence must be tied to the governed candidate SHA.

Remaining:

- complete administrator-controlled GitHub ruleset/security/environment evidence under #143;
- create/assign the Phase 0 milestone if still absent;
- require pull requests, strict exact-SHA status checks, stale-approval dismissal, controlled bypass, force-push/deletion protection and required review as applicable;
- obtain required independent governance/release approval evidence;
- prove the exact required status contexts and release controls on the launch candidate.

**Exit condition:** #143 acceptance criteria are satisfied with current remote repository evidence.

## Phase 1 — Canonical backend contract

**Outcome:** NoCodeBackend integration, imported data and migration/recovery behaviour are certified against immutable evidence.

Current state: **owner-deferred pending additional provider/data information**.

Remaining:

- restore and verify generated data API authorisation under #225;
- execute and verify the real rating idempotency migration under #165;
- capture same-state provider/import/recovery evidence and approvals under #144.

**Exit condition:** connected provider, schema, import and recovery evidence is complete against an exact candidate state.

## Phase 2 — Identity lifecycle

**Outcome:** account export and deletion operate safely as complete server-owned workflows.

Current state: **PARTIAL / deferred behind launch-critical provider work**.

Preserved source foundations include export projection/artifact preparation, deletion discovery planning, reconciliation and exact confirmation validation.

Future requirements include:

- recent-authentication proof;
- consistent provider snapshot semantics;
- durable job orchestration and write fencing;
- provider-backed data deletion;
- authentication identity deletion;
- final absence proof;
- retention/legal policy decision;
- accessible connected UI verification.

**Exit condition:** the complete account lifecycle is integrated, deployed and verified; source-only foundations are not sufficient.

## Phase 3 — Dependable beer discovery

**Outcome:** users can reliably browse, search and open the canonical beer catalogue against reconciled production-equivalent data.

Source-side launch-flow and accessibility hardening is substantially advanced. Additional source polish is no longer the default next action unless it addresses a concrete launch defect.

Remaining:

- complete and independently review the governed catalogue remediation decisions under #154;
- generate and re-audit the accepted catalogue candidate;
- reconcile the accepted candidate with NoCodeBackend;
- obtain a current-main production deployment under #224;
- verify the production deployment actually uses the source-governed Node.js 20 runtime;
- capture connected browse/search/direct-route and accessibility evidence.

**Exit condition:** #154 acceptance criteria are satisfied against a deployment whose exact SHA is recorded.

## Launch release gate

After Phases 0, 1 and 3 have their required evidence:

1. identify the exact release candidate SHA;
2. run `npm run platform:validate` and required hosted checks;
3. verify GitHub's configured required checks/reviews/ruleset apply to that exact SHA;
4. verify production environment configuration without exposing secrets;
5. verify exact deployed SHA and Node.js 20 runtime through deployment/health/readiness evidence;
6. run critical authentication, catalogue and safe owner-scoped smoke paths;
7. inspect runtime/provider diagnostics;
8. record remaining accepted limitations, if any;
9. mark launch complete only when the relevant completion gate passes.

## Deferred launch-excluded capabilities

The following remain outside the current launch milestone unless separately approved:

- non-beer rating modes;
- chat and Drinking Buddies;
- events and venues;
- analytics;
- producer/platform administration;
- social cellar sharing;
- photo upload;
- Brew Done It interactive gameplay;
- major framework/styling migrations that are not required to remediate a launch blocker.

Brew Done It retains only the future same-device/session-memory model accepted in ADR 0001.

## Dependency order

```text
Repository standards/lifecycle/runtime alignment (PR #246)
        ↓
#143 enforceable GitHub delivery path ────────────────────────────────┐
        ↓                                                            │
Merge governed correction without bypass                            │
        ↓                                                            │
#224 current-main Node 20 + exact-SHA deployment evidence            │
        ↓                                                            │
#154 connected catalogue certification                              │
                                                                     │
#225 data authorisation → #165 rating migration → #144 certification │
                                                                     ↓
                                                       Launch verification
```

Repository-only maintenance may proceed independently when it reduces risk, but it must not be used to advance connected or release states without the required evidence.
