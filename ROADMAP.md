# ROADMAP.md

**Last materially reviewed:** 30 August 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The current milestone is to move the implemented launch scope through the remaining governance, deployment, connected-provider and data evidence gates without expanding feature breadth.

## Immediate delivery-system correction

Before further broad implementation becomes the default path:

1. complete repository autonomous-continuation and PR-lifecycle controls in PR #247;
2. make GitHub the independent enforcement layer for `main` under #143;
3. preserve one authoritative active workstream per outcome and retire superseded governance PR #246;
4. complete the already-open NoCodeBackend configuration correction in PR #248 rather than creating duplicate source work;
5. restore exact-SHA production deployment evidence under #224;
6. keep unrelated major dependency migrations, including Tailwind 4, outside the launch-hardening path unless separately approved.

Repository/source corrections may proceed while connected backend/provider evidence is unavailable, but they must not be used to claim provider, release or completion gates are satisfied.

## Phase 0 — Governed delivery

**Outcome:** repository and release governance are sufficient for evidence-based autonomous delivery.

Current observed blocker: existing CI provides validation evidence, but #143 still lacks independently evidenced default-branch/ruleset enforcement and required review/security controls.

Repository-side lifecycle and autonomous-continuation alignment is being implemented in Draft PR #247. Its current-head validation must pass before it can become Ready, and it must not become Mergeable while #143 remains unproved.

Remaining:

- complete administrator-controlled GitHub ruleset/security/environment evidence under #143;
- create/assign the Phase 0 milestone if still absent;
- require pull requests, strict exact-SHA status checks, stale-approval handling, controlled bypass, force-push/deletion protection and independent review as applicable;
- obtain independent governance/release approval evidence;
- prove the exact required status contexts and release controls on one governed candidate SHA.

**Exit condition:** #143 acceptance criteria are satisfied with current remote repository evidence.

## Phase 1 — Canonical backend contract

**Outcome:** NoCodeBackend integration, imported data and migration/recovery behaviour are certified against immutable evidence.

Repository configuration work may proceed independently; connected provider certification still requires external runtime/provider evidence.

Active/relevant work:

- PR #248 — externalise `NOCODEBACKEND_INSTANCE` and keep instance/secret values outside repository source;
- #225 — restore and verify generated data API authorisation;
- #165 — execute and verify the real rating idempotency migration;
- #144 — capture same-state provider/import/recovery evidence and approvals.

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

Source-side launch-flow and accessibility hardening is substantially advanced. Additional broad source polish is not automatically higher priority than known active governance/configuration work.

Remaining:

- complete and independently review the governed catalogue remediation decisions under #154;
- generate and re-audit the accepted catalogue candidate;
- reconcile the accepted candidate with NoCodeBackend;
- obtain a current-main production deployment under #224;
- verify the deployment's exact source SHA/runtime before using it as release evidence;
- capture connected browse/search/direct-route and accessibility evidence.

**Exit condition:** #154 acceptance criteria are satisfied against a deployment whose exact SHA is recorded.

## Launch release gate

After Phases 0, 1 and 3 have their required evidence:

1. identify the exact release candidate SHA;
2. run `npm run platform:validate` and required hosted checks;
3. verify GitHub's configured required checks/reviews/ruleset apply to that exact SHA;
4. verify production environment configuration without exposing secrets;
5. verify exact deployed SHA and runtime through deployment/health/readiness evidence;
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
PR #247 autonomous continuation + PR lifecycle
        ↓
#143 enforceable GitHub delivery path ────────────────────────────────┐
        ↓                                                            │
Governed merge/integration path                                      │
        ↓                                                            │
#224 current-main exact-SHA deployment evidence                      │
        ↓                                                            │
#154 connected catalogue certification                              │
                                                                     │
PR #248 source configuration                                         │
        ↓                                                            │
#225 data authorisation → #165 rating migration → #144 certification │
                                                                     ↓
                                                       Launch verification
```

Repository-only maintenance and source work may proceed independently when it is dependency-correct and reduces risk, but it must not be used to advance connected or release states without the required evidence.
