---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Certify the authenticated launch journey against the exact deployed Vercel runtime and complete #225 without duplicating provider credentials into GitHub."
  issue: 225
  pr: 352
  branch: "fix/vercel-owned-provider-certification"
next_actions:
  - "Validate and merge the Vercel-owned provider-certification workflow change."
  - "Use exact-deployment /api/readiness as the canonical non-destructive provider reachability evidence."
  - "Run the authenticated release journey for sign-in, catalogue, product detail, rating create/history/delete, cellar CRUD and profile read when the protected release-account test path is executable."
  - "Confirm the historical provider Bearer credential exposure has been rotated or otherwise invalidated without recording its value."
  - "After #225 is complete, reassess #165 provider migration/idempotency work; keep undeployed target fields deferred until migration and certification."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification still needs an executable protected release-account test path. This is separate from NoCodeBackend provider configuration, which is owned by Vercel and no longer duplicated into GitHub."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Production-equivalent schema/constraint migration and destructive contract probes remain deferred until #225 is certified and explicitly authorised isolated-provider evidence is available."
requires_owner_decision: false
owner_decision:
  question: "No owner decision is required for the provider-configuration location; Vercel remains authoritative."
  options: []
  recommendation: "Continue exact-deployment certification without duplicating provider secrets into GitHub."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "4958db9e135c7312b6e478202ab3a77e04d8af24"
last_updated: "2026-09-10T10:48:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend-backend contract alignment  
**Execution state:** Implementing blocker removal; duplicate GitHub NoCodeBackend provider configuration is no longer a launch blocker.  
**Release state:** Source contract alignment is materially reconciled; authenticated connected launch certification remains incomplete.

## Autonomous continuation support

The repository is the authoritative handoff. Continue dependency-correct launch-schema alignment and production certification without requiring undeployed target fields or duplicate provider secrets. Reuse active work, use normal non-draft PRs, maintain lifecycle metadata, run `npm run platform:validate`, treat CI as supporting diagnostics, and keep destructive connected probes restricted to explicitly authorised isolated staging with cleanup verification.

## Overall status

**The launch-facing rating, cellar and profile contracts are aligned with current provider evidence. Production provider reachability is healthy. Vercel is the authoritative runtime owner for `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE`; their absence from GitHub `staging-release` is no longer a launch blocker.**

## Current production boundary

Exact `main` is **4958db9e135c7312b6e478202ab3a77e04d8af24** from PR **#351**. Vercel production deployment **dpl_FPHmzasw9bB2Euq9rjn68euYGTdV** is READY for that exact SHA with matching `main` GitHub provenance and Node lambda runtime metadata.

The deployed application has already produced exact-main `GET /api/readiness` HTTP 200 evidence with `dataProvider: "ok"` on the aligned provider contract. `/api/readiness` performs a real bounded products read through the same server-only Bearer + `Instance` configuration used by the live application. This is the canonical non-destructive provider reachability proof for the Vercel runtime.

## Completed schema-alignment slices

Issue **#340** / PR **#341** corrected the active rating bonus write contract to `bonus_attribute_rating_mapping.bonus_attributes_id`, pinned the boundary with regression coverage and confirmed `cellar.series_version_id` as the active optional edition/version relationship field.

Issue **#342** / PR **#343** added `docs/nocodebackend/launch-schema-contract.md`, classifying launch provider collections/fields as `DEPLOYED_REQUIRED`, `DEPLOYED_OPTIONAL`, `DEFERRED_TARGET` or `UNAVAILABLE`. It records `product_category_id` as the provider catalogue relationship and persistent profiles storage as unavailable on current evidence.

PR **#344** reconciled exact-main provider readiness evidence and narrowed #225 from provider authorization to authenticated certification plus credential hygiene.

Issue **#346** / PR **#347** normalized the complete cellar write surface. Browser create/update bodies are projected through canonical `CELLAR_EDITABLE_FIELDS`; caller-supplied `user_id`, `series_edition_id` and arbitrary fields do not cross the browser write boundary. Server-side allowlisting, validation and ownership remain authoritative.

Issue **#345** / PR **#348** reconciled `docs/nocodebackend/schema-mapping.md` with the canonical profile capability. Persistent `profiles` storage is not an active deployed launch collection; current profile GET is session-backed and profile PUT fails explicitly with `profile_persistence_unavailable`.

Issue **#349** was closed `not_planned` after verifying that the obsolete `series_edition_id` projection exists only in a non-live proxy path and the live cellar route already uses `series_version_id` with boundary coverage.

PR **#351** reconciled connected certification state and production provenance on exact main.

## Deployed versus deferred contract

Current launch rating headers rely on `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalized collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts, deterministic child uniqueness keys and connected conditional-update/concurrency requirements. Those remain `DEFERRED_TARGET`, not production launch prerequisites, until provider migration and certification are recorded.

Persistent profile storage remains `UNAVAILABLE` on current provider evidence and must not become a launch prerequisite before a reviewed provider migration and connected permission/ownership certification.

## Provider certification ownership

The deployed Vercel application is the canonical runtime owner of the NoCodeBackend secret and instance. Connected release certification therefore verifies the deployed application boundary rather than requiring duplicate copies of production provider values in GitHub.

The `/ncb-certify` workflow remains available as an **optional direct-provider isolated-staging diagnostic**. A `SETUP_REQUIRED` result caused only by missing GitHub copies of `NOCODEBACKEND_SECRET_KEY` or `NOCODEBACKEND_INSTANCE` does not make a healthy exact-deployment Vercel runtime unready and must not block launch certification.

Destructive provider CRUD/capability tests remain isolated-staging only. They must not run against production application tables and must retain explicit destructive opt-in plus cleanup verification.

## Connected launch certification

The connected release path must still certify the actual user-facing launch journeys against the exact deployment:

- sign-in/authentication;
- catalogue browse/search;
- product detail;
- rating form and rating create/history/delete;
- cellar create/read/update/delete;
- session-backed profile read;
- owner/cross-account enforcement where applicable.

The release workflow no longer runs `npm run test:provider-smoke` with duplicated GitHub NoCodeBackend credentials. Provider reachability is proven through the deployed Vercel runtime; authenticated release checks exercise the application-owned same-origin boundary.

## Remaining security evidence

The historical provider credential captured in the supplied Swagger/webarchive must be confirmed rotated or otherwise invalidated. Do not record the value. This remains a security/hygiene requirement for #225 closure but is unrelated to where current production credentials are stored.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

The active branch **fix/vercel-owned-provider-certification** removes the duplicated provider-secret dependency from `.github/workflows/connected-release-check.yml` and reconciles provider-certification documentation. It must pass exact-head project validation and deployment evidence before merge.

## Next dependency-correct work

1. Validate and merge the Vercel-owned provider-certification change.
2. Run authenticated exact-deployment launch certification through the application boundary when the protected release-account path is available.
3. Complete credential-rotation/invalidation evidence and close #225 when its remaining acceptance criteria are satisfied.
4. Then activate #165 provider migration/idempotency work against production-equivalent schema and concurrency capabilities; do not enable deferred fields before migration/certification.
5. Continue #144/#154 connected certification after their dependency evidence is satisfied.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.
