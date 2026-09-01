# ROADMAP.md

**Last materially reviewed:** 1 September 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The launch milestone remains to move the implemented beer-first scope through the remaining connected-provider, data-integrity, backend-certification and final release evidence without expanding feature breadth.

The project is **not globally blocked**. Independent source/frontend work may continue whenever it does not depend on provider authorization, schema mutation or connected certification.

## Integrated foundation

The following work is already integrated and must not be recreated or treated as pending:

- autonomous continuation and project-managed PR lifecycle;
- launch-flow recovery/accessibility hardening;
- NoCodeBackend runtime-instance externalisation;
- Node.js 24 migration and production-runtime verification;
- release/deployment provenance reconciliation;
- least-privilege lifecycle workflow hardening;
- ChatGPT-triggerable NoCodeBackend certification harness.

Completed work such as #224, #249 and #281 must not remain in the active blocker chain.

## Phase 0 — Governed delivery

**Outcome:** repository and release governance are sufficient for evidence-based autonomous delivery.

Issue #143 remains open for practical repository/ruleset hardening, but under current project policy it is **non-blocking governance work** rather than a blanket merge or implementation gate.

Remaining, to be completed before final release where practical:

- configure or intentionally disposition branch/ruleset protections;
- document bypass/force-push/deletion behaviour;
- verify least-privilege Actions, deployment-environment and connected-app access where supported;
- keep repository documentation aligned with actual remote enforcement.

**Sequencing:** proceed independently of ordinary implementation. Re-activate as a release-governance task near final launch.

## Phase 1 — Canonical backend contract

**Outcome:** NoCodeBackend integration, rating integrity, imported data and recovery behaviour are certified against connected evidence.

### Active dependency

1. **#225 — NoCodeBackend generated-data authorization**
   - current external/provider gate;
   - blocks connected provider reads and downstream provider certification;
   - does not block unrelated source/frontend work.

### Subsequent dependency-gated work

2. **#165 — rating idempotency/schema**
   - keep as a real data-integrity dependency;
   - activate after provider capability is available;
   - required before durable rating reconciliation is enabled.

3. **#144 — canonical backend certification**
   - postpone until provider/schema prerequisites are available;
   - remaining work is primarily connected same-state provider/import/recovery evidence and approvals.

**Exit condition:** connected provider, schema, import, retry/reconciliation and recovery evidence are sufficient against an exact candidate state.

## Phase 2 — Identity lifecycle

**Outcome:** account export and deletion operate as safe server-owned workflows.

Current state: **PARTIAL / future-phase work**.

Preserve the existing source foundations. Do not make this a current Phase 3 blocker unless a task directly depends on account-lifecycle completion.

Future work includes recent-authentication proof, consistent provider snapshot semantics, durable orchestration/write fencing, provider-backed deletion, authentication identity deletion, final absence proof, retention/legal policy decisions and connected accessible UI verification.

## Phase 3 — Dependable beer discovery

**Outcome:** users can reliably browse, search and open the canonical beer catalogue against reconciled production-equivalent data.

Source/frontend failure recovery, response-boundary, data-presentation and accessibility hardening is substantially integrated.

### Work that may continue now

- independent frontend/source corrections;
- truthful-data-presentation fixes;
- accessibility/interaction improvements;
- regression coverage that does not require provider mutation or connected certification.

### Completion-only dependencies

- provider authorization under #225;
- connected catalogue reconciliation/provider evidence;
- backend-dependent portions of #154;
- production-equivalent browser and accessibility evidence against a recorded release state.

**#154 remains the current Phase 3 outcome, not a blanket blocker on every Phase 3 task.**

## Immediate dependency-correct path

```text
INDEPENDENT SOURCE / FRONTEND WORK
        ↓
Continue whenever safe and launch-scoped

CONNECTED PROVIDER PATH
#225 generated-data authorization
        ↓
#165 rating idempotency/schema capability
        ↓
#144 canonical backend/provider certification
        ↓
backend-dependent #154 catalogue certification
        ↓
launch verification

INDEPENDENT GOVERNANCE PATH
#143 practical GitHub/ruleset hardening
        ↓
complete before final release where practical
```

## Explicitly removed from the active blocker chain

- #224 — deployment provenance: complete;
- #249 — Node 24 migration: complete;
- #281 — staging certification setup: closed;
- GitHub Actions/CI status as a platform status;
- empty/non-substantive Platform Validation;
- ChatGPT/GitHub Draft → Ready connector failure.

A real implementation, security, data-integrity or runtime defect remains a blocker regardless of how it was discovered.

## Launch release gate

When the connected provider path is sufficiently complete:

1. identify the exact release candidate SHA;
2. run appropriate project-owned validation and inspect relevant diagnostics;
3. verify actual repository governance state against the then-current release policy;
4. verify production environment configuration without exposing secrets;
5. verify exact deployed SHA and runtime;
6. verify provider readiness and critical authentication/catalogue/owner-scoped flows;
7. capture connected accessibility and failure-recovery evidence;
8. record accepted limitations, if any;
9. mark launch complete only when the relevant evidence is sufficient.

GitHub CI status alone and empty Platform Validation are not release authorization mechanisms.

## Deferred launch-excluded capabilities

Unless separately approved, keep these outside the current launch milestone:

- non-beer rating modes;
- chat and Drinking Buddies;
- events and venues;
- analytics;
- producer/platform administration;
- social cellar sharing;
- photo upload;
- Brew Done It interactive gameplay;
- major framework/styling migrations unrelated to a launch blocker.

## Continuation rule

Use dependency-scoped blocking. Keep blockers only where they protect work that actually depends on them. Postpone future-phase/release-only evidence until it becomes relevant, remove completed/stale blockers, and continue independent launch-scoped implementation without waiting for unrelated external administration.
