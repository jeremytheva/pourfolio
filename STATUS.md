---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Complete the remaining non-destructive #225 connected-provider certification on the exact-main launch contract before advancing deferred #165 schema migration work."
  issue: 225
  pr: null
  branch: docs/provider-certification-status
next_actions:
  - "Verify an authenticated catalogue read through the same-origin production API using an authorised session."
  - "Verify an authenticated profile read remains non-403 while profile persistence is unavailable."
  - "Confirm the historically exposed provider credential has been rotated or otherwise invalidated without recording its value."
  - "Close #225 only when the remaining authenticated and credential-hygiene evidence is complete, then reassess #165."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated catalogue/profile certification requires a safe authorised production-equivalent session; no destructive write is required."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Production-equivalent schema/constraint mutation or destructive contract probes require explicitly authorised isolated-provider evidence; #165 target fields remain deferred."
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
last_verified_commit: "067ad5cdaf652486b64fa42c9e29d176295a0bcf"
last_updated: "2026-09-10T01:06:00+10:00"
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

**Canonical launch-schema classification is merged and exact-main production is healthy; remaining work is connected certification.** The project now distinguishes deployed-required, deployed-optional, deferred-target and unavailable provider capabilities without making #165 migration fields launch prerequisites.

## Current production boundary

PR **#343** is squash-merged as exact `main` **067ad5cdaf652486b64fa42c9e29d176295a0bcf**. Vercel production deployment **dpl_ARxttEnEdhYWYvWof1xWjkvAG5nn** is READY for that exact SHA with matching `main` GitHub provenance, verified commit metadata and Node lambda runtime metadata.

Fresh exact-main `/api/readiness` evidence returns HTTP 200 with `status: "ready"`, release SHA `067ad5cd...`, environment `production` and `dataProvider: "ok"`. This confirms the configured NoCodeBackend data credential/instance can execute the application readiness products read on the deployed main boundary.

Fresh exact-main `GET /api/nocodebackend/auth/providers` also returns HTTP 200 through the application-owned authentication proxy with `email: true` and `google: false`. This satisfies the auth-provider-discovery acceptance item in #225 without exposing provider credentials.

## Completed schema-alignment slices

Issue **#340** / PR **#341** corrected the active rating bonus write contract to `bonus_attribute_rating_mapping.bonus_attributes_id`, pinned the boundary with regression coverage and confirmed `cellar.series_version_id` as the active optional edition/version relationship field.

Issue **#342** / PR **#343** added `docs/nocodebackend/launch-schema-contract.md`, classifying launch provider collections/fields as `DEPLOYED_REQUIRED`, `DEPLOYED_OPTIONAL`, `DEFERRED_TARGET` or `UNAVAILABLE`. It also records `product_category_id` as the provider catalogue relationship and keeps persistent profiles storage unavailable on current evidence.

## Deployed versus deferred contract

Current launch rating headers rely on `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalised collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts, deterministic child uniqueness keys and connected conditional-update/concurrency requirements. Those remain `DEFERRED_TARGET`, not production launch prerequisites, until provider migration and certification are recorded.

Profile reads remain session-backed. No deployed `profiles` persistence collection is evidenced, so profile PUT continues to fail explicitly with `profile_persistence_unavailable` rather than inventing storage capability.

## Connected-evidence posture

Direct destructive production writes are not used for certification. The connected provider contract suite remains gated behind an explicitly isolated staging environment and destructive-test opt-in with cleanup verification. Repository-supplied export evidence may establish structural field names but must not be described as fresh live schema introspection.

Issue **#225** is no longer a provider-authorisation restoration problem. Exact-main readiness and auth-provider discovery are both healthy. Remaining acceptance requires only authenticated catalogue/profile smoke evidence plus confirmation that the provider credential present in historical supplied Swagger material has been rotated or otherwise invalidated. No secret value may be recorded in repository content, logs, issue comments or browser output.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

PR #343 exact-head hosted release diagnostics completed the repository `Validate platform` step, browser/accessibility, dependency review and CodeQL successfully before merge. The exact-main runtime/deployment evidence above is independently verified through Vercel.

## Next dependency-correct work

1. Complete #225 authenticated catalogue read evidence through the same-origin application gateway using a safe authorised session.
2. Complete #225 authenticated session-backed profile read evidence and confirm it is non-403.
3. Confirm the historically exposed NoCodeBackend Bearer credential has been rotated or invalidated; rotate it if necessary through the provider/secret-management boundary and rerun readiness without exposing the value.
4. Close #225 only when all acceptance items are evidenced.
5. Then reassess #165 provider migration/idempotency work against production-equivalent schema and concurrency capabilities; do not enable its deferred fields before migration/certification.
6. Continue #144/#154 connected certification only after their dependency evidence is satisfied.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.
