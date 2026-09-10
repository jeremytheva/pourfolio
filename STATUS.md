---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Release
execution_state: VALIDATING
current_work:
  objective: "Certify the production launch journeys against the now-aligned deployed frontend/backend contract without bypassing authenticated or cleanup-guarded evidence boundaries."
  issue: 225
  pr: null
  branch: null
next_actions:
  - "Execute non-destructive authenticated exact-production certification for sign-in, catalogue, product detail, rating form and session-backed profile read when the protected release-account path is executable."
  - "Confirm the historically exposed provider Bearer credential has been rotated or otherwise invalidated without recording its value."
  - "Run rating create/history/delete and cellar CRUD only with explicit cleanup-guarded authorisation and exact-record cleanup evidence."
  - "After #225 is satisfied, activate #165 provider migration/idempotency work; keep DEFERRED_TARGET fields unavailable until governed migration and connected verification."
  - "Then continue #144 and backend-dependent #154 in dependency order."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification requires an executable protected release-account path. Provider configuration itself is healthy in Vercel and duplicate GitHub provider secrets are not required."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value."
  - scope: destructive_connected_writes
    issue: 225
    detail: "Rating create/delete and cellar CRUD certification require explicit cleanup-guarded authorisation and exact-record cleanup proof before connected writes can be executed."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Fresh production-equivalent schema/constraint inventory and destructive capability probes remain evidence-gated; repository target files must not be treated as live provider proof."
requires_owner_decision: false
owner_decision:
  question: "No product decision is currently required. Remaining gates require executable protected test-account/provider evidence or explicit cleanup-guarded write authorisation."
  options: []
  recommendation: "Continue non-destructive evidence collection where executable and preserve the provider/data-integrity gates for authenticated and destructive checks."
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "edc2d72065d0f6e62dd9ad761d546e43089b561a"
last_updated: "2026-09-10T12:18:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Release / connected launch certification  
**Execution state:** Validating production evidence for issue **#225**  
**Release state:** The active frontend/backend launch contract is aligned to the supplied backend exports and deployed to production. Authenticated connected journey evidence and historical credential hygiene remain incomplete.

## Autonomous continuation support

Continue from exact production and repository evidence rather than prior chat state. Non-destructive provider/readiness checks may proceed without copying Vercel provider credentials into GitHub. Authenticated journey checks require the protected release-account path. Do not execute cleanup-dependent rating/cellar writes unless the exact guarded confirmation is present and exact-record cleanup can be proven. Keep #165 target fields unavailable until governed migration and live provider verification.

## Completed alignment milestone — #354 / #355

Issue **#354** was implemented and merged through PR **#355**. Exact production `main` is **edc2d72065d0f6e62dd9ad761d546e43089b561a**.

Production deployment **dpl_82ZJq23c2psHEM5QyXisbdhWb71n** is READY for that exact SHA with `main` GitHub provenance. The exact PR head passed canonical `npm run platform:validate`; the corresponding Vercel preview returned HTTP 200 from `/api/readiness` with matching release SHA and `dataProvider: ok`. No unresolved PR review threads remained at merge.

The alignment correction established these active boundaries:

- launch-facing code imports provider-evidenced deployed collections separately from unavailable/deferred target collections;
- catalogue producer enrichment uses `products.producer_id -> producers.id` and no longer calls an undeployed `product_producers` junction;
- zero/blank producer attribution remains unresolved rather than fabricated;
- cellar browser/server writes are limited to exported backend fields;
- cellar projections no longer fabricate `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` or `historical_import`;
- provider/server-owned `id`, `secret_key` and `user_id` remain outside browser-authoritative writes.

## Canonical launch data contract

Provider-evidenced launch collections are:

- `products`;
- `producers`;
- `categories`;
- `rating_attributes`;
- `bonus_attributes`;
- `ratings`;
- `rating_scores`;
- `bonus_attribute_rating_mapping`;
- `cellar`.

Launch field/relationship rules include:

- product category relationship: `products.product_category_id`;
- deployed producer relationship: `products.producer_id`;
- rating bonus relationship: `bonus_attribute_rating_mapping.bonus_attributes_id`;
- cellar sharing version relationship: nullable `series_version_id`, not `series_edition_id`;
- cellar browser/server writable surface: `product_id`, `location_id`, `quantity`, `mls`, `container`, `purchase_price`, `retail_price`, `date_received`, `sharing_series_id`, `series_version_id`, `purchase_location_id`, `purchased_by_id`, `gift`, `gift_from`, `bet_id`, `notes`;
- persistent `profiles` storage is **UNAVAILABLE** on current evidence: profile GET is session-backed and profile PUT fails explicitly with `profile_persistence_unavailable`;
- `product_producers` is **UNAVAILABLE** on the supplied launch structural evidence;
- durable rating idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET` and must not be required before governed provider migration plus connected verification.

The supplied products export contained 7 records with `producer_id = 0` and 22 records with a blank producer ID. Those are backend catalogue-data remediation concerns, not values to fabricate in application code.

Fresh live schema/constraint evidence beyond the non-destructive application readiness boundary remains evidence-required. Do not infer live provider migration from repository target files.

## Production/runtime boundary

Vercel is authoritative for runtime NoCodeBackend configuration. `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE` remain server-only and do not need duplicate GitHub copies for release certification.

The application `/api/readiness` boundary provides non-destructive proof that the configured runtime can execute a bounded NoCodeBackend products read. It does not prove authenticated user journeys, provider write permissions, schema constraints or destructive cleanup behaviour.

## Remaining #225 certification work

The remaining launch-certification evidence is:

1. authenticated sign-in through the application-owned same-origin auth boundary;
2. authenticated catalogue/search and product-detail reads;
3. rating form data/validator boundary against the connected backend;
4. session-backed profile read remaining non-403 and profile persistence remaining explicitly unavailable;
5. rating create/history/delete and cellar CRUD only when cleanup-guarded connected writes are explicitly authorised and exact cleanup is proven;
6. confirmation that the historically exposed provider Bearer credential was rotated or otherwise invalidated, without recording its value.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. The release suite requires the exact confirmation `RUN CLEANUP-GUARDED RELEASE WRITES`. Rating and cellar checks must retain the exact created record identity and prove deletion in cleanup. Failure to prove cleanup is a material blocker and must not be converted into a pass.

## Dependency path after #225

After #225 is complete:

1. activate **#165** for governed provider migration/idempotency and fresh schema/constraint evidence;
2. continue **#144** in dependency order;
3. continue backend-dependent **#154** certification.

Unavailable/deferred target fields and collections must remain unavailable until their provider migration/capability evidence exists.

## Next dependency-correct work

1. Run non-destructive authenticated exact-production checks when the protected release-account credentials are executable without exposing them.
2. Obtain provider/secret-management evidence that the historically exposed Bearer credential is invalidated or rotated.
3. Only when explicitly authorised, run cleanup-guarded rating and cellar connected-write certification and prove exact cleanup.
4. Close #225 when its remaining evidence is satisfied, then activate #165.
5. Continue #144 and #154 only after their upstream provider/data dependencies are satisfied.

## Validation posture

Canonical source validation remains `npm run platform:validate` on Node.js 24. Browser/accessibility checks apply to browser-facing changes. GitHub Actions and CodeQL are supporting diagnostics under project policy; any material defect they reveal remains actionable even though hosted CI is not itself the acceptance authority.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys have matching repository contracts, connected provider/runtime evidence, owner/security enforcement, canonical validation and exact-main production certification. Do not turn missing authenticated, credential-hygiene, provider-schema or cleanup evidence into inferred passes.
