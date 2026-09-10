---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Align active launch catalogue and cellar contracts with the supplied 54026_rating backend tables, then validate PR #355 against the exact implementation head."
  issue: 354
  pr: 355
  branch: "fix/backend-table-frontend-alignment"
next_actions:
  - "Complete exact-head project validation and review for PR #355."
  - "Confirm Vercel preview/runtime evidence is sufficient for the changed catalogue/cellar boundary."
  - "Merge PR #355 when source validation, review and applicable deployment evidence are satisfactory."
  - "Resume #225 authenticated launch certification after the source contract correction is merged."
  - "Keep #165 DEFERRED_TARGET fields unavailable until governed provider migration and connected verification."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification still needs an executable protected release-account path; this does not block the #354 source-contract correction."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value; this does not block #354."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Fresh production-equivalent schema/constraint inventory and destructive capability probes remain deferred until explicitly authorised connected evidence is available."
requires_owner_decision: false
owner_decision:
  question: "No owner decision is required for the exported-schema alignment."
  options: []
  recommendation: "Treat the supplied backend exports as the structural contract for #354 and leave unresolved producer attribution/provider migrations as separate backend work."
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "91ecfc816f11086e8a6bfa7a86c09f28aa76067b"
last_updated: "2026-09-10T12:12:30+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend-backend launch contract alignment  
**Execution state:** Validating PR **#355**  
**Release state:** The supplied backend export exposed two active source-contract mismatches that are corrected in #355; authenticated connected launch certification and historical credential hygiene remain incomplete.

## Autonomous continuation support

Continue dependency-correct launch alignment and certification from repository/provider evidence. For #354, the supplied `54026_rating` SQL/CSV/XLSX exports are the structural authority: active launch code must not require fields or relationships absent from those exports. Use normal non-draft PRs, canonical project validation, applicable deployment evidence and material review findings to determine merge readiness.

## Current state — issue #354 / PR #355

The backend-table review found two material active launch mismatches:

1. the exported `cellar` table does not contain `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` or `historical_import`, but the application cellar contract previously accepted/projected those fields;
2. the exported schema contains no `product_producers` junction, but catalogue hydration attempted that collection before falling back to `products.producer_id`.

PR **#355** corrects these boundaries by:

- separating provider-evidenced launch collections from unavailable/deferred target collections in `src/data/contract.js`;
- limiting browser/server cellar writes to the exported `cellar` columns, excluding provider/server-owned `id`, `secret_key` and `user_id`;
- removing fabricated exported-absent lifecycle fields from the live cellar API projection;
- using `products.producer_id -> producers.id` as the deployed catalogue producer relationship;
- retaining the response-compatible `producers` array with at most the single producer evidenced by `producer_id`;
- leaving zero/missing producer attribution unresolved rather than inventing collaboration data;
- adding focused regression tests and reconciling the launch/data-model documentation.

The supplied products export contains **7 records with `producer_id = 0` and 22 records with a blank producer ID**. Those records are a backend catalogue-data remediation concern and are intentionally not rewritten by #354.

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

Current launch field rules include:

- product classification uses `products.product_category_id`;
- product producer enrichment uses `products.producer_id` only on the current backend;
- rating bonus writes use `bonus_attribute_rating_mapping.bonus_attributes_id`;
- cellar sharing edition/version uses nullable `series_version_id`, not `series_edition_id`;
- the browser/server cellar write surface is `product_id`, `location_id`, `quantity`, `mls`, `container`, `purchase_price`, `retail_price`, `date_received`, `sharing_series_id`, `series_version_id`, `purchase_location_id`, `purchased_by_id`, `gift`, `gift_from`, `bet_id`, `notes`;
- `product_producers` and persistent `profiles` storage are **UNAVAILABLE** on the supplied launch evidence;
- durable rating idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET`.

Fresh live schema/constraint inventory beyond the non-destructive application boundary remains evidence-required. Do not infer provider migration from repository target files.

## Production / connected certification context

PR **#353** has merged and hardened the connected release-certification boundary: non-destructive authenticated checks can run independently, profile PUT is expected to reflect the current persistence-unavailable contract, and rating/cellar mutation checks require the exact cleanup-guarded authorisation and exact-record cleanup proof.

Vercel remains the authoritative runtime owner of `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE`. Missing duplicate copies in GitHub are not a launch blocker. The deployed `/api/readiness` boundary remains the canonical non-destructive proof that the configured application runtime can execute a bounded NoCodeBackend products read.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. PR #355 changes the browser/server data boundary, so focused tests and applicable Vercel/runtime evidence are required in addition to source review. GitHub Actions, CodeQL and Dependency Review remain supporting diagnostics; any material defect they expose is actionable.

The implementation head `91ecfc816f11086e8a6bfa7a86c09f28aa76067b` passed the canonical Release gate, and the STATUS-only follow-up exposed only invalid front-matter status values before code validation could proceed. That metadata defect is corrected here; exact-head validation is rerunning. Browser/accessibility passed on the STATUS-only head, and Vercel preview `dpl_3dpuSLbvwBY8AAHTEhfGewT7FqzG` was READY for that head with matching PR/SHA provenance.

## Remaining #225 work

After #355 is merged, #225 still requires:

- authenticated catalogue read through the same-origin application boundary;
- authenticated session-backed profile read remaining non-403;
- broader production-equivalent connected launch journey evidence as applicable;
- confirmation that the historically exposed provider Bearer credential was rotated or otherwise invalidated, without recording its value.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. Failure to prove cleanup is a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Complete exact-head validation/review/deployment evidence for PR #355 and merge when safe.
2. Resume non-destructive authenticated release certification for #225 when the protected release-account path is executable.
3. Run guarded rating/cellar connected writes only with explicit authorisation and cleanup proof.
4. Complete credential-rotation/invalidation evidence and close #225 when its remaining acceptance criteria are satisfied.
5. Then activate #165 provider migration/idempotency work, followed by #144 and backend-dependent #154 certification.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys have matching repository contracts, connected provider/runtime evidence, owner/security enforcement, canonical validation and exact-main production certification. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
