---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Classify the active launch NoCodeBackend contract into deployed-required, deployed-optional, deferred-target and unavailable capabilities without enabling undeployed fields."
  issue: 342
  pr: null
  branch: docs/launch-schema-classification
next_actions:
  - "Validate the #342 exact branch head with the canonical project-owned validation path and repair substantive findings."
  - "Open a normal non-draft PR for #342, maintain lifecycle metadata and verify exact-head deployment evidence."
  - "Merge when evidence is sufficient, then verify exact-main production deployment/readiness."
  - "Continue non-destructive connected smoke certification and reconcile #225 against current provider readiness evidence."
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
last_verified_commit: "c81e12a29cdd80af5c4c6e492a9bc6e4a92e014c"
last_updated: "2026-09-10T00:38:00+10:00"
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

The repository is the authoritative handoff. Continue dependency-correct launch-schema alignment and production certification without requiring undeployed target fields. Reuse active work, use normal non-draft PRs, maintain lifecycle metadata, run `npm run platform:validate`, treat CI as diagnostic evidence, and keep destructive connected probes restricted to explicitly authorised isolated staging with cleanup verification.

## Overall status

**Active frontend-backend alignment; not yet fully production-certified.** The project is working from repository-supplied NoCodeBackend export evidence plus connected production behaviour while keeping unverified future migration fields disabled.

## Current production boundary

PR **#341** is merged as exact `main` **c81e12a29cdd80af5c4c6e492a9bc6e4a92e014c**. Vercel production deployment **dpl_EZVL64DyMF2T7qNW3WEyaDyC4efw** is READY for that exact SHA with matching `main` GitHub provenance and verified commit metadata.

Its build logs explicitly state that repository `package.json` `engines.node: 24.x` overrides the Vercel project setting `22.x` and **Node 24.x is used**. The project-level `22.x` setting therefore remains a Vercel default that is superseded by the governed repository runtime rather than evidence of a Node 22 deployment. #249 remains complete on current evidence.

The exact-main `/api/readiness` payload could not be re-collected in this run because Vercel deployment protection redirected the connected fetch to SSO. Do not replace the last successful readiness evidence with an inference; exact-main readiness remains to be refreshed after the current documentation slice.

## Completed schema-alignment slice

Issue **#340** / PR **#341** corrected the active rating bonus write mismatch. The current launch path now writes `bonus_attribute_rating_mapping.bonus_attributes_id`, with a boundary regression test and corrected data-model references. The same evidence confirms `cellar.series_version_id` as the launch relationship field; `series_edition_id` is not a launch write alias.

## Active schema-classification slice

Issue **#342** / branch **`docs/launch-schema-classification`** introduces `docs/nocodebackend/launch-schema-contract.md` as the concise application classification layer for launch provider data:

- `DEPLOYED_REQUIRED` — evidenced and allowed to be required by active launch services;
- `DEPLOYED_OPTIONAL` — evidenced but nullable/enrichment-only where absence is valid;
- `DEFERRED_TARGET` — designed future provider state that must not become a launch prerequisite before migration/certification;
- `UNAVAILABLE` — capability not evidenced as deployed and therefore required to fail explicitly or use an already-approved non-persistent behaviour.

The project-level `DATA_MODEL.md` now links that classification and corrects the catalogue provider relationship name to `product_category_id`.

## Deployed versus deferred contract

Current launch rating headers rely on `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalised collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts, deterministic child uniqueness keys and connected conditional-update/concurrency requirements. Those remain `DEFERRED_TARGET`, not production launch prerequisites, until provider migration and certification are recorded.

Profile reads remain session-backed. No deployed `profiles` persistence collection is evidenced by the supplied structural audit, so profile PUT continues to fail explicitly with `profile_persistence_unavailable` rather than inventing storage capability.

## Connected-evidence posture

Direct destructive production writes are not used for certification. The connected provider contract suite remains gated behind an explicitly isolated staging environment and destructive-test opt-in with cleanup verification. Repository-supplied export evidence may establish structural field names but must not be described as fresh live schema introspection.

Historical #225 forbidden-provider text is superseded by more recent successful provider readiness evidence, but #225 should only be closed after its full acceptance evidence is reconciled. The current exact-main readiness payload still needs a fresh protected-deployment fetch or equivalent authorised evidence.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

The current #342 branch has material documentation changes but has not yet completed exact-head canonical validation. Do not add a later status-only commit after final validation unless a material state change requires it.

## Next dependency-correct work

1. Complete exact-head canonical validation for #342 and repair substantive findings in the same branch.
2. Open a normal non-draft PR, maintain lifecycle labels/metadata, verify exact-head Vercel evidence and merge when safe.
3. Re-verify exact-main production deployment and `/api/readiness` after merge.
4. Continue non-destructive connected smoke verification for sign-in, catalogue, product detail and rating-form reads.
5. Certify owner-scoped rating create/history/delete, cellar CRUD and profile read only where safe authenticated evidence exists; do not create destructive production test data without explicit safe authorisation and cleanup.
6. Reconcile #225 against current readiness/provider evidence; close it only when all acceptance evidence is satisfied.
7. Advance #165 provider migration only with production-equivalent schema/constraint and concurrency evidence; do not make undeployed target fields mandatory beforehand.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.
