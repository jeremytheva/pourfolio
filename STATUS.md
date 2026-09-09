---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Reconcile the detailed profile schema mapping with the canonical current launch capability while #225 authenticated certification awaits a safe authorised session."
  issue: 345
  pr: 348
  branch: docs/profile-persistence-contract
next_actions:
  - "Validate PR #348 with the canonical project-owned validation path and repair substantive findings."
  - "Verify exact-head deployment evidence and merge #348 when safe."
  - "Resume #225 authenticated catalogue/profile smoke when a safe authorised session path is available; do not fabricate credentials or destructive evidence."
  - "Confirm historical provider credential rotation/invalidation without recording its value."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated catalogue/profile certification requires a safe authorised production-equivalent session. The repository has a protected staging-release workflow, but this connected execution path cannot supply or expose its protected credentials."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Production-equivalent schema/constraint mutation or destructive contract probes require explicitly authorised isolated-provider evidence; #165 target fields remain deferred."
requires_owner_decision: false
owner_decision:
  question: null
  options: []
  recommendation: null
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "7d941bf626e76675d455d39e7e769103fbee7b88"
last_updated: "2026-09-10T01:39:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend-backend contract alignment  
**Execution state:** Implementing  
**Release state:** Not fully certified.

## Autonomous continuation support

The repository is the authoritative handoff. Continue dependency-correct launch-schema alignment and production certification without requiring undeployed target fields. Reuse active work, use normal non-draft PRs, maintain lifecycle metadata, run `npm run platform:validate`, treat CI as supporting diagnostics, and keep destructive connected probes restricted to explicitly authorised isolated staging with cleanup verification.

## Overall status

**Canonical launch-schema classification, cellar write normalization and provider reachability are healthy; active work is removing the remaining profile-contract documentation contradiction while authenticated certification remains access-gated.**

## Current production boundary

PR **#347** is squash-merged as exact `main` **7d941bf626e76675d455d39e7e769103fbee7b88**. Vercel production deployment **dpl_CvKAxmtyDvyLafsHkkJeN3CXQypR** is READY for that exact SHA with matching `main` GitHub provenance and Node lambda runtime metadata.

The preceding exact-main `/api/readiness` evidence returned HTTP 200 with `dataProvider: "ok"`, and auth-provider discovery returned HTTP 200 with `email: true` and `google: false`; #225 therefore does not represent a current provider-authorisation failure. These runtime results are not substituted for the remaining authenticated-user smoke evidence.

## Completed schema-alignment slices

Issue **#340** / PR **#341** corrected the active rating bonus write contract to `bonus_attribute_rating_mapping.bonus_attributes_id`, pinned the boundary with regression coverage and confirmed `cellar.series_version_id` as the active optional edition/version relationship field.

Issue **#342** / PR **#343** added `docs/nocodebackend/launch-schema-contract.md`, classifying launch provider collections/fields as `DEPLOYED_REQUIRED`, `DEPLOYED_OPTIONAL`, `DEFERRED_TARGET` or `UNAVAILABLE`. It records `product_category_id` as the provider catalogue relationship and persistent profiles storage as unavailable on current evidence.

PR **#344** durably reconciled exact-main provider certification evidence and narrowed #225 to authenticated smoke plus credential-hygiene evidence.

Issue **#346** / PR **#347** normalized the complete cellar write surface. The browser service now projects create/update bodies through the same canonical `CELLAR_EDITABLE_FIELDS` classification used by the owner-enforcing gateway, strips caller-supplied `user_id`, `series_edition_id` and arbitrary fields, requires `product_id` on create and rejects unsupported-only updates. Server-side allowlisting, validation and ownership remain the security boundary.

## Active profile contract slice

Issue **#345** / PR **#348** reconciles `docs/nocodebackend/schema-mapping.md` with the canonical profile capability. Persistent `profiles` storage is removed from the active deployed collection summary; current profile GET is documented as session-backed and profile PUT remains explicitly `profile_persistence_unavailable`. Future profile fields, uniqueness and write permissions remain documented only as a deferred provider-migration target.

This slice also removes the stale assertion that absence of a `profiles` collection is itself a current launch schema-preflight failure and aligns the remote permission matrix with session-backed profile reads. It does not mutate provider schema or claim live evidence that does not exist.

## Deployed versus deferred contract

Current launch rating headers rely on `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalised collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts, deterministic child uniqueness keys and connected conditional-update/concurrency requirements. Those remain `DEFERRED_TARGET`, not production launch prerequisites, until provider migration and certification are recorded.

Persistent profile storage remains `UNAVAILABLE` on current provider evidence. It must not become a launch prerequisite or receive browser writes until a reviewed provider migration and connected permission/ownership certification exist.

## Connected-evidence posture

Direct destructive production writes are not used for certification. The connected provider contract suite remains gated behind explicitly isolated staging and destructive-test opt-in where applicable. Repository-supplied export evidence may establish structural field names but must not be described as fresh live schema introspection.

The repository contains a protected staging-release path that can exercise sign-in, catalogue, product detail, rating create/history/delete, cellar CRUD, profile reads/allowlists and cross-account ownership. This execution path does not have authority to invent or reveal protected release credentials. #225 remains open for authenticated evidence plus confirmation that the historical provider credential exposure has been rotated or invalidated.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

PR #347 exact-head Release gate and browser/accessibility checks passed, CodeQL was clean, and its exact-head Vercel preview was READY using Node 24.x before merge. The exact-main deployment above is independently READY.

PR #348 is now the active validation target; no PASS is claimed until its exact current head has completed the applicable project-owned validation.

## Next dependency-correct work

1. Complete canonical validation and exact-head deployment evidence for #348; repair any substantive finding and merge when safe.
2. Complete #225 authenticated catalogue and session-backed profile smoke through an authorised connected path when available.
3. Confirm historical NoCodeBackend credential rotation/invalidation without recording the credential value; rerun readiness after any rotation.
4. Close #225 only when all remaining acceptance evidence is complete.
5. Then reassess #165 provider migration/idempotency work against production-equivalent schema and concurrency capabilities; do not enable deferred fields before migration/certification.
6. Continue #144/#154 connected certification only after their dependency evidence is satisfied.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.
