# ROADMAP.md

**Last materially reviewed:** 31 August 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The current milestone is to move the implemented launch scope through the remaining governance, deployment, connected-provider and data evidence gates without expanding feature breadth.

Repository/source corrections may proceed while connected backend/provider evidence is unavailable, but they must not be used to claim provider, release or completion gates are satisfied.

## Current delivery state

The earlier source/configuration queue is integrated:

- autonomous continuation and PR lifecycle governance: merged through #261;
- launch-flow recovery/accessibility corrections: merged through #262–#269;
- NoCodeBackend runtime-instance externalisation: merged through #270;
- Node.js 24 runtime migration: merged through #271 and production-runtime certified under #249.

The immediate release work is therefore no longer to recreate or re-integrate those branches. The dependency-correct path is current-main release provenance under #224, while preserving the explicit provider/backend deferral.

## Phase 0 — Governed delivery

**Outcome:** repository and release governance are sufficient for evidence-based autonomous delivery.

Repository-side autonomous continuation and PR lifecycle controls are merged. Issue #143 remains open for practical repository hardening and evidence, but current project policy treats it as non-blocking governance work rather than a blanket merge gate.

Remaining:

- complete or intentionally disposition practical branch/ruleset protections under #143;
- document actual bypass/force-push/deletion behaviour where available;
- verify least-privilege Actions, deployment-environment and connected-app access where supported;
- keep repository documentation aligned with the actual GitHub enforcement state.

**Exit condition:** #143 acceptance criteria are satisfied or intentionally dispositioned with current remote repository evidence.

## Phase 1 — Canonical backend contract

**Outcome:** NoCodeBackend integration, imported data and migration/recovery behaviour are certified against immutable evidence.

**Current state:** explicitly owner-deferred pending provider information/access. Preserve without speculative changes.

Deferred sequence:

1. #225 — restore and verify generated data API authorisation;
2. #165 — execute and verify the real rating idempotency migration;
3. #144 — capture same-state provider/import/recovery evidence and approvals.

The source configuration contract is already merged; do not duplicate it.

**Exit condition:** connected provider, schema, import and recovery evidence is complete against an exact candidate state.

## Phase 2 — Identity lifecycle

**Outcome:** account export and deletion operate safely as complete server-owned workflows.

Current state: **PARTIAL / deferred behind launch-critical provider work**.

Preserved source foundations include export projection/artifact preparation, deletion discovery planning, reconciliation and exact confirmation validation.

Future requirements include recent-authentication proof, consistent provider snapshot semantics, durable orchestration/write fencing, provider-backed data deletion, authentication identity deletion, final absence proof, retention/legal policy decisions and connected accessible UI verification.

**Exit condition:** the complete account lifecycle is integrated, deployed and verified; source-only foundations are not sufficient.

## Phase 3 — Dependable beer discovery

**Outcome:** users can reliably browse, search and open the canonical beer catalogue against reconciled production-equivalent data.

Source-side launch-flow, failure recovery, response-boundary and accessibility hardening is substantially integrated.

Remaining:

- #224 — obtain and certify a production deployment of the then-current `main` through exact `/api/health` and truthful `/api/readiness` provenance;
- after the owner resumes provider work, complete the backend-dependent #154 catalogue remediation/reconciliation and connected certification;
- capture connected browse/search/direct-route, failure-recovery and accessibility evidence only against a recorded release SHA.

Node 24 is no longer a pending migration item: #249 is complete after production deployment evidence proved Node 24.x is used.

**Exit condition:** #154 acceptance criteria are satisfied against a deployment whose exact SHA is recorded, with prerequisite provider evidence available.

## Immediate dependency-correct path

```text
Current main
   ↓
#224 exact-SHA production deployment + health/readiness evidence
   ↓
Independent release evidence that does not require provider mutation

OWNER RESUMES BACKEND/PROVIDER WORK
   ↓
#225 data authorisation
   ↓
#165 rating migration
   ↓
#144 canonical backend certification
   ↓
backend-dependent #154 catalogue certification
   ↓
Launch verification

#143 governance hardening proceeds independently and does not blanket-block ordinary mergeable work.
```

## Launch release gate

After the required connected phases resume and their evidence is available:

1. identify the exact release candidate SHA;
2. run `npm run platform:validate` and applicable hosted diagnostics;
3. verify actual GitHub governance state against the release policy;
4. verify production environment configuration without exposing secrets;
5. verify exact deployed SHA and runtime through deployment/health/readiness evidence;
6. run critical authentication, catalogue and safe owner-scoped smoke paths;
7. inspect runtime/provider diagnostics;
8. record remaining accepted limitations, if any;
9. mark launch complete only when the relevant completion evidence is sufficient.

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

## Continuation rule

Do not recreate merged source work or reopen the provider/backend stream while it remains explicitly deferred. Continue only work that is independently safe, launch-scoped and supported by current repository/provider/deployment evidence.
