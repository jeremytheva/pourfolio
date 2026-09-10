---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Make connected launch certification match the deployed profile capability and require explicit cleanup-guarded authorisation for rating/cellar mutation checks."
  issue: 225
  pr: 353
  branch: "fix/connected-release-certification-boundary"
next_actions:
  - "Complete exact-head validation and merge PR #353 when safe."
  - "Run non-destructive authenticated exact-deployment certification for sign-in, catalogue, product detail, rating form and session-backed profile read when release-account credentials are executable."
  - "Run rating create/history/delete and cellar CRUD only with the explicit cleanup-guarded confirmation and exact-record cleanup evidence."
  - "Confirm the historical provider Bearer credential exposure has been rotated or otherwise invalidated without recording its value."
  - "After #225 is complete, activate #165 provider migration/idempotency work; keep DEFERRED_TARGET fields unavailable until migration and connected certification."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification still needs an executable protected release-account path. Provider configuration itself is healthy in Vercel and is not a GitHub-secret blocker."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Fresh production-equivalent schema/constraint inventory and destructive capability probes remain deferred until explicitly authorised connected evidence is available."
requires_owner_decision: false
owner_decision:
  question: "No owner decision is required for the current certification-boundary correction."
  options: []
  recommendation: "Continue non-destructive certification independently and require explicit cleanup-guarded authorisation for connected writes."
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "427671ed360af09f26d82584d0c0da084a0669b4"
last_updated: "2026-09-10T12:08:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend-backend launch contract alignment  
**Execution state:** Validating PR **#353**  
**Release state:** Source contracts are materially aligned; authenticated connected launch certification and historical credential hygiene remain incomplete.

## Autonomous continuation support

Continue dependency-correct launch certification from repository and live deployment evidence. Non-destructive authenticated checks should proceed independently when release-account credentials are executable. Rating/cellar mutation checks require the exact cleanup-guarded confirmation and exact-record cleanup evidence. Keep #165 deferred target fields unavailable until real provider migration and connected verification.

## Current state

PR **#353** corrects the connected release-certification boundary so it matches the deployed profile capability and does not perform cleanup-dependent writes without explicit authorisation.

## Authoritative production boundary

Exact `main` is **a9f4309411d375d7c03a1326796946e52d76266c** from merged PR **#352**. Vercel production deployment **dpl_7z3f9MCc2xHSdmyNpFQCumeMm3ri** is READY for that exact SHA with matching `main` GitHub provenance and Node runtime metadata.

Vercel remains the authoritative runtime owner of `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE`. Missing duplicate copies in GitHub are not a launch blocker. The deployed `/api/readiness` boundary remains the canonical non-destructive proof that the configured application runtime can execute a bounded NoCodeBackend products read.

## Launch schema/application contract

The current launch classification remains authoritative:

- `products`, `producers`, `categories`, `rating_attributes`, `ratings`, `rating_scores` and `cellar` are deployed launch collections;
- `bonus_attributes` and `bonus_attribute_rating_mapping` are deployed optional rating collections;
- rating bonus writes use `bonus_attribute_rating_mapping.bonus_attributes_id`;
- cellar browser/server writes use the canonical allowlist and `series_version_id`; `series_edition_id` is not a launch alias;
- persistent `profiles` storage is **UNAVAILABLE** on current evidence: profile GET is session-backed and profile PUT must fail explicitly with `profile_persistence_unavailable`;
- durable rating idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET` and must not be required before provider migration plus connected verification.

Fresh live schema/constraint inventory beyond the non-destructive application boundary is still evidence-required. Do not invent provider schema state from repository target files.

## Certification correction in PR #353

The existing connected release suite contained two material contract defects:

1. it expected profile PUT to succeed despite the deployed session-backed/read-only profile capability;
2. it could execute rating/cellar mutations without an explicit destructive confirmation, and rating cleanup could target an arbitrary first history row.

PR **#353** corrects those boundaries:

- non-destructive sign-in, catalogue/search, product detail, rating-form validation and session-backed profile read can be certified independently;
- profile PUT is expected to return the deployed `503 profile_persistence_unavailable` contract;
- rating/cellar mutation checks run only when the exact confirmation `RUN CLEANUP-GUARDED RELEASE WRITES` is supplied;
- rating cleanup identifies the exact newly created rating by before/after history identity and deletes that record in `finally`;
- cellar cleanup retains the exact created row identity and deletes it in `finally`;
- cross-account cellar negative-authorisation checks remain inside the guarded mutation test.

## Validation evidence

Exact PR head **427671ed360af09f26d82584d0c0da084a0669b4** passed the canonical Pull Request Validation Release gate, including `npm run platform:validate`, before the STATUS-only follow-up. Exact-head validation is rerunning after this documentation correction. Browser/accessibility and CodeQL remain supporting diagnostics; any real defect they reveal is actionable.

## Remaining #225 work

#225 no longer represents a live provider-authorization failure. Remaining acceptance work is:

- authenticated catalogue read through the same-origin application boundary;
- authenticated session-backed profile read remaining non-403;
- broader production-equivalent connected launch journey evidence as applicable;
- confirmation that the historically exposed provider Bearer credential was rotated or otherwise invalidated, without recording its value.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. A failure to prove cleanup is a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Finish validation/deployment evidence for PR #353 and merge when safe.
2. Execute non-destructive authenticated release certification when the protected release-account path is available.
3. Execute guarded rating/cellar connected writes only with explicit authorisation and cleanup proof.
4. Complete credential-rotation/invalidation evidence and close #225 when its remaining acceptance criteria are satisfied.
5. Then activate #165 provider migration/idempotency work, followed by #144 and backend-dependent #154 certification.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys have matching repository contracts, connected provider/runtime evidence, owner/security enforcement, canonical validation and exact-main production certification. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
