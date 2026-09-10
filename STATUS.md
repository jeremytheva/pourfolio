---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Production provider certification"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Complete the remaining authenticated production certification and historical provider credential-hygiene evidence tracked by #225 after the backend-table alignment merged in #355."
  issue: 225
  pr: null
  branch: null
next_actions:
  - "Verify an authenticated catalogue read through the same-origin application API when the protected release-account path is executable."
  - "Verify an authenticated session-backed profile read remains non-403."
  - "Confirm the historically exposed provider Bearer credential has been rotated or otherwise invalidated without recording its value."
  - "Keep unresolved producer attribution as backend catalogue remediation rather than fabricating frontend relationships."
  - "Keep #165 DEFERRED_TARGET fields unavailable until governed provider migration and connected verification."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification still needs an executable protected release-account path."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Fresh production-equivalent schema/constraint inventory and destructive capability probes remain deferred until explicitly authorised connected evidence is available."
requires_owner_decision: false
owner_decision:
  question: "No product decision is currently required."
  options: []
  recommendation: "Resume #225 when its connected evidence paths are executable; otherwise continue only work that does not depend on those blocked provider capabilities."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: NOT_RUN
  runtime: UNVERIFIED
last_verified_commit: "38b004e0180e99e6d3112907d38f78468f621468"
last_updated: "2026-09-10T12:17:50+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / production provider certification  
**Execution state:** Blocked on the remaining connected evidence for **#225**  
**Completed integration:** issue **#354** / PR **#355** merged as `edc2d72065d0f6e62dd9ad761d546e43089b561a`.

## Autonomous continuation support

Continue dependency-correct launch certification from repository/provider evidence. The supplied `54026_rating` SQL/CSV/XLSX exports remain the structural authority for the active launch contract. Do not reintroduce fields or relationships absent from those exports, and do not fabricate missing producer attribution.

When #225 cannot progress because the protected release-account or credential-hygiene evidence path is unavailable, continue only independent work that does not weaken the provider/schema gates for #165, #144 or backend-dependent #154.

## Backend-table alignment completed

PR **#355** aligned the active frontend/server launch boundary to the supplied backend tables by:

- separating provider-evidenced launch collections from unavailable/deferred target collections;
- restricting browser/server cellar writes to the actual exported `cellar` columns;
- removing fabricated `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` and `historical_import` fields from the live cellar projection;
- using `products.producer_id -> producers.id` as the currently deployed producer relationship rather than querying a nonexistent `product_producers` junction;
- leaving zero/missing producer attribution unresolved rather than inventing collaboration data;
- adding regression coverage and reconciling the data-model/launch-contract documentation.

The supplied products export contains **7 records with `producer_id = 0` and 22 records with a blank producer ID**. Those remain backend catalogue-data remediation, not frontend relationship data.

## Launch schema/application contract

Current provider-evidenced launch collections are:

- `products`;
- `producers`;
- `categories`;
- `rating_attributes`;
- `bonus_attributes`;
- `ratings`;
- `rating_scores`;
- `bonus_attribute_rating_mapping`;
- `cellar`.

Key launch field rules are:

- product classification uses `products.product_category_id`;
- product producer enrichment uses `products.producer_id` only on the current backend;
- rating bonus writes use `bonus_attribute_rating_mapping.bonus_attributes_id`;
- cellar sharing edition/version uses nullable `series_version_id`, not `series_edition_id`;
- the browser/server cellar write surface is `product_id`, `location_id`, `quantity`, `mls`, `container`, `purchase_price`, `retail_price`, `date_received`, `sharing_series_id`, `series_version_id`, `purchase_location_id`, `purchased_by_id`, `gift`, `gift_from`, `bet_id`, `notes`;
- `product_producers` and persistent `profiles` storage are **UNAVAILABLE** on the supplied launch evidence;
- durable rating idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET`.

## #355 validation and deployment evidence

Exact PR head **38b004e0180e99e6d3112907d38f78468f621468** passed `npm run platform:validate`: project documentation, runtime and NoCodeBackend environment contracts passed; lint passed; **383 tests ran, 374 passed, 9 intentionally skipped, 0 failed**; production dependency audit found **0 vulnerabilities**; production build, bundle-size, Brew Done It containment and browser release-security checks passed.

The same exact head passed Browser and accessibility, Dependency Review and CodeQL. No unresolved PR review threads were present. Its exact-head Vercel preview was READY and `/api/readiness` returned HTTP 200 with the matching SHA and `dataProvider: ok`.

After merge, Vercel production deployment **dpl_82ZJq23c2psHEM5QyXisbdhWb71n** is READY for merge commit `edc2d72065d0f6e62dd9ad761d546e43089b561a` with matching GitHub/main provenance. A direct post-merge `/api/readiness` re-fetch from the protected production deployment URL was redirected to Vercel SSO (HTTP 302), so this status does not claim a new post-merge readiness-body observation.

## Current #225 state

Fresh earlier production evidence already established that the generated NoCodeBackend products read succeeds through `/api/readiness` and that auth provider discovery is reachable. #225 remains open only for:

- authenticated catalogue read through the same-origin application boundary;
- authenticated session-backed profile read remaining non-403;
- confirmation that the historically exposed provider Bearer credential was rotated or otherwise invalidated, without recording its value.

Do not reintroduce routing or frontend rewrites without contradictory runtime evidence.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. Failure to prove cleanup is a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Complete #225 authenticated smoke evidence when the protected release-account path is executable.
2. Complete #225 historical provider credential rotation/invalidation evidence.
3. Then activate #165 provider migration/idempotency work.
4. Follow with #144 provider/backend certification and backend-dependent #154 completion evidence.
5. Keep the 7 zero-producer and 22 blank-producer catalogue records as explicit backend remediation work; do not encode a fake frontend relationship.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys have matching repository contracts, connected provider/runtime evidence, owner/security enforcement, canonical validation and exact-main production certification. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
