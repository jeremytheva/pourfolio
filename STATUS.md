---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Align the active rating bonus write contract with supplied NoCodeBackend schema evidence and pin it with a boundary test."
  issue: 340
  pr: 341
  branch: fix/rating-bonus-mapping-contract
next_actions:
  - "Run exact-head canonical project validation for #341 and repair substantive findings in the same PR."
  - "Verify exact-head Vercel preview/runtime provenance for #341."
  - "Merge #341 when lifecycle evidence is sufficient, then verify exact-main production deployment."
  - "Continue live launch-schema inventory and distinguish deployed, optional and deferred target fields without enabling #165 target fields prematurely."
blockers:
  - scope: connected_schema_inventory
    issue: 165
    detail: "Direct production-equivalent schema/constraint interrogation and destructive contract probes require explicitly authorised isolated-provider evidence; repository-supplied export evidence remains usable for non-destructive alignment."
  - scope: profile_persistence
    issue: 144
    detail: "No deployed profiles persistence collection is evidenced; profile GET remains session-backed and PUT fails explicitly until persistence is deployed and certified."
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
last_verified_commit: "61f24aae9715b20be3fc8fdbbfc1ffabf23e4c85"
last_updated: "2026-09-10T00:19:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend-backend contract alignment  
**Execution state:** Validating  
**Release state:** Not fully certified.

## Autonomous continuation support

The repository is the authoritative handoff. Continue dependency-correct launch-schema alignment and production certification without requiring undeployed target fields. Reuse active work, use normal non-draft PRs, maintain lifecycle metadata, run `npm run platform:validate`, treat CI as diagnostic evidence, and keep destructive connected probes restricted to explicitly authorised isolated staging with cleanup verification.

## Overall status

**Active frontend-backend alignment; not yet fully production-certified.** The project is now working from the supplied NoCodeBackend export evidence plus connected production behaviour, while keeping unverified future migration fields disabled.

## Current production boundary

PR **#339** is squash-merged as exact `main` **61f24aae9715b20be3fc8fdbbfc1ffabf23e4c85**. Vercel production deployment **dpl_7VZPFNx9tL18wgkFgpGEmvwVWuZJ** is READY for that exact SHA with matching `main` GitHub provenance, verified commit metadata and Node runtime metadata. The product-detail gateway now treats rating-summary enrichment as non-critical and no longer sends the unsupported `fields=total_weighted` projection to the generated provider read endpoint.

## Active schema-alignment slice

Issue **#340** / PR **#341** / branch **`fix/rating-bonus-mapping-contract`** corrects a concrete launch write mismatch. The active current-schema rating submission path wrote `bonus_attribute_rating_mapping.bonus_attribute_id`, while the supplied structural SQL audit, schema target, migration tooling and account/export contracts identify the provider field as **`bonus_attributes_id`**. The PR changes the launch payload to the evidenced provider field, adds a boundary regression test and corrects stale data-model references.

The same evidence confirms the cellar edition/version field used by the active dedicated cellar gateway is **`series_version_id`**. `series_edition_id` is not a launch write alias. Both sharing-series relationships remain optional and nullable.

## Deployed versus deferred contract

The launch application must require only fields evidenced as deployed. Current rating headers use `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalised collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts and child uniqueness keys. Those fields remain a migration target, not a production launch prerequisite, until connected provider migration and concurrency/cleanup verification are recorded.

Profile reads are currently session-backed. No deployed `profiles` persistence table is evidenced by the supplied structural audit, so profile PUT continues to fail explicitly with `profile_persistence_unavailable` rather than inventing storage capability.

## Connected-evidence posture

Direct destructive production writes are not used for certification. The existing connected provider contract suite remains gated behind an explicitly isolated staging environment and destructive-test opt-in, with cleanup verification. Where live provider schema introspection is unavailable, repository-supplied export evidence may establish field names and structural facts but must not be presented as fresh live inventory.

Fresh production evidence now shows `/api/readiness` returning HTTP 200 with `dataProvider: "ok"` on exact main `61f24aae...`, superseding the old forbidden-provider state recorded in #225. The remaining #225 acceptance evidence should be reconciled before closing that issue rather than treating its historical blocker text as current.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

The first #341 Release gate exposed that this durable status rewrite had omitted the required `## AI execution gate` and `## Autonomous continuation support` sections. That documentation defect is repaired in this same PR; final exact-head validation must run against this repaired head. No later status-only commit should invalidate final evidence.

## Next dependency-correct work

1. Complete exact-head canonical validation and deployment evidence for #341; repair any substantive finding and merge when safe.
2. Reconcile the canonical schema mapping so each launch collection/field is explicitly classified as deployed-required, deployed-optional, or deferred migration target.
3. Continue non-destructive connected smoke verification for sign-in, catalogue, product detail and rating-form reads.
4. Certify owner-scoped rating create/history/delete, cellar CRUD and profile read only where safe authenticated evidence exists; do not create destructive production test data without explicit safe authorisation and cleanup.
5. Reconcile #225 against fresh readiness/provider evidence; close it only when all acceptance evidence is satisfied.
6. Advance #165 provider migration only with production-equivalent schema/constraint and concurrency evidence; do not make undeployed target fields mandatory beforehand.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.