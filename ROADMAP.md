# ROADMAP.md

**Last materially reviewed:** 26 August 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The current milestone is to move the implemented launch scope through the remaining connected provider, deployment, data and governance evidence gates without expanding feature breadth.

## Phase 0 — Governed delivery

**Outcome:** repository and release governance are sufficient for evidence-based delivery.

Remaining:

- complete administrator-controlled GitHub ruleset/security/environment evidence under #143;
- obtain required independent governance/release approval evidence;
- prove the exact required status contexts and release controls on the launch candidate.

**Exit condition:** #143 acceptance criteria are satisfied with current repository evidence.

## Phase 1 — Canonical backend contract

**Outcome:** NoCodeBackend integration, imported data and migration/recovery behaviour are certified against immutable evidence.

Remaining:

- restore and verify generated data API authorization under #225;
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

Remaining:

- complete and independently review the governed catalogue remediation decisions under #154;
- generate and re-audit the accepted catalogue candidate;
- reconcile the accepted candidate with NoCodeBackend;
- obtain a current-main production deployment under #224;
- capture connected browse/search/direct-route and accessibility evidence.

**Exit condition:** #154 acceptance criteria are satisfied against a deployment whose exact SHA is recorded.

## Launch release gate

After Phases 0, 1 and 3 have their required evidence:

1. identify the exact release candidate SHA;
2. run `npm run platform:validate` and required hosted checks;
3. verify production environment configuration without exposing secrets;
4. verify exact deployed SHA through health/readiness;
5. run critical authentication, catalogue and safe owner-scoped smoke paths;
6. inspect runtime/provider diagnostics;
7. record remaining accepted limitations, if any;
8. mark launch complete only when the relevant completion gate passes.

## Deferred launch-excluded capabilities

The following remain outside the current launch milestone unless separately approved:

- non-beer rating modes;
- chat and Drinking Buddies;
- events and venues;
- analytics;
- producer/platform administration;
- social cellar sharing;
- photo upload;
- Brew Done It interactive gameplay.

Brew Done It retains only the future same-device/session-memory model accepted in ADR 0001.

## Dependency order

```text
#225 data authorization
        ↓
#224 current-main deployment evidence
        ↓
#154 connected catalogue certification

#165 real rating migration ──→ #144 backend certification

#143 governance evidence ─────────────────────────────┐
#144 backend certification ───────────────────────────┤
#154 catalogue certification ─────────────────────────┤
                                                     ↓
                                             Launch verification
```

Repository-only maintenance may proceed independently when it reduces risk, but it must not be used to advance connected or release states without the required evidence.
