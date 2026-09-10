---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "API capability containment"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Contain internal data implementation function URLs behind the canonical application dispatcher so legacy/duplicate handlers cannot be selected directly."
  issue: 361
  pr: 362
  branch: "fix/contain-internal-api-handlers"
next_actions:
  - "Run exact-head npm run platform:validate for PR #362."
  - "Verify the exact-head Vercel preview returns 404 for direct internal implementation URLs while canonical application routes still resolve normally."
  - "Merge PR #362 when source validation, runtime containment evidence and review are satisfactory."
  - "Resume #225 authenticated production certification when its protected evidence path is executable."
  - "Keep #165 DEFERRED_TARGET fields unavailable until governed provider migration and connected verification."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification still needs an executable protected release-account path; this does not block #361."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value; this does not block #361."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Fresh production-equivalent schema/constraint inventory and destructive capability probes remain deferred until explicitly authorised connected evidence is available."
requires_owner_decision: false
owner_decision:
  question: "No product decision is required for internal route containment."
  options: []
  recommendation: "Keep only the capability-aware canonical dispatcher reachable for launch data operations and fail closed on implementation-function URLs."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: PENDING
  runtime: UNVERIFIED
last_verified_commit: "cbe549e5f6bb47d5fa409387516ad220b42b2638"
last_updated: "2026-09-10T12:58:30+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / API capability containment  
**Execution state:** Implementing and validating issue **#361** / PR **#362**  
**Recently completed:** issue **#359** / PR **#360** removed the unavailable profile-persistence journey and merged at `e86e2abc898645ff89b00abb1e84616add50e38f`.

## Autonomous continuation support

Continue the highest-priority dependency-correct launch work that can be completed without weakening backend/provider gates. The supplied `54026_rating` SQL/CSV/XLSX exports remain the structural authority for active launch data capabilities.

When #225 cannot progress because protected release-account or credential-hygiene evidence is unavailable, continue independent launch-scoped reliability/security work. Do not enable deferred provider capabilities or invent catalogue remediation decisions.

## Current work — issue #361 / PR #362

A production-equivalent preview proved that implementation files under `api/` are addressable as Vercel functions independently of the intended `/api/nocodebackend/...` dispatcher: a direct request to `/api/current-data-proxy?path=bad` reached the application handler and returned its authenticated `401` response rather than a route-level 404.

That alternate surface is material because:

- `api/data-router.js` deliberately routes launch catalogue/rating-form/cellar/profile operations to capability-aware handlers and only delegates `brew-done-it` to legacy code;
- the directly addressable legacy `api/data-proxy.js` still contains target/legacy routes such as profile PUT that launch routing intentionally does not expose;
- `api/current-data-proxy.js` retains duplicate catalogue/cellar implementations that can drift from their specialised canonical handlers.

PR **#362** contains the implementation URLs at the Vercel routing boundary by rewriting direct requests for `catalog-data-proxy`, `cellar-data-proxy`, `current-data-proxy`, `profile-data-proxy` and legacy `data-proxy` to a single inert `404` handler. Canonical `/api/nocodebackend/...` rewrites, internal module imports, authentication, origin controls, rate limits, owner enforcement and provider access logic are unchanged.

## Profile capability correction completed

PR **#360** made the launch profile journey match the deployed backend capability:

- profile identity is session-backed and read-only;
- successful sign-up no longer attempts a guaranteed-failing profile PUT;
- the Profile page no longer presents editable persistence fields or a Save action;
- browser tests/mocks now model profile GET as available and PUT as explicit `503 profile_persistence_unavailable`;
- the exact PR head passed canonical validation, browser/accessibility, Dependency Review, CodeQL and a READY Vercel preview before merge.

Production deployment for merge commit `e86e2abc898645ff89b00abb1e84616add50e38f` reached READY. A direct post-merge readiness re-fetch was protected by Vercel SSO, so no fresh production readiness-body claim is made from that request.

## Backend-table alignment completed

PR **#355** aligned the active launch boundary to the supplied backend tables by:

- restricting browser/server cellar writes to actual exported `cellar` columns;
- removing fabricated `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` and `historical_import` cellar fields;
- using `products.producer_id -> producers.id` rather than querying a nonexistent `product_producers` junction;
- leaving zero/missing producer attribution unresolved rather than inventing collaboration data;
- reconciling launch/data-model contracts and regression coverage.

The supplied products export contains **7 records with `producer_id = 0` and 22 records with a blank producer ID**. Those remain governed backend catalogue remediation; the existing 193-task remediation ledger requires explicit decisions and must not be auto-filled.

## Launch schema/application contract

Current provider-evidenced launch collections are `products`, `producers`, `categories`, `rating_attributes`, `bonus_attributes`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar`.

Key launch rules remain:

- product classification uses `products.product_category_id`;
- product producer enrichment uses `products.producer_id` only on the current backend;
- rating bonus writes use `bonus_attribute_rating_mapping.bonus_attributes_id`;
- cellar sharing edition/version uses nullable `series_version_id`, not `series_edition_id`;
- `product_producers` and persistent `profiles` storage are **UNAVAILABLE**;
- active rating submission uses the current backend fields through `current-data-proxy.js`;
- durable rating idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET`, and `/ratings/reconcile` remains unavailable until provider migration is verified.

## Current #225 state

Earlier exact-main production evidence established that the generated NoCodeBackend products read succeeds through `/api/readiness` and auth provider discovery is reachable. #225 remains open for:

- authenticated catalogue read through the same-origin application boundary;
- authenticated session-backed profile read remaining non-403;
- confirmation that the historically exposed provider Bearer credential was rotated or otherwise invalidated, without recording its value.

Do not reintroduce direct-provider frontend routing or treat missing protected evidence as a source-code defect.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. Failure to prove cleanup is a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Complete exact-head validation and Vercel containment evidence for #361 / PR #362 and merge when safe.
2. Resume #225 authenticated smoke evidence when the protected release-account path is executable.
3. Complete #225 historical provider credential rotation/invalidation evidence.
4. Then activate #165 provider migration/idempotency work.
5. Follow with #144 provider/backend certification and backend-dependent #154 completion evidence.
6. Keep catalogue remediation decisions explicit and independently reviewed; do not fabricate the 193 pending decisions.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, alternate implementation routes are contained, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
