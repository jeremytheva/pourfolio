---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Complete #225 authenticated launch certification after the protected GitHub staging-release runtime is configured."
  issue: 225
  pr: null
  branch: null
next_actions:
  - "Configure protected GitHub staging-release NOCODEBACKEND_SECRET_KEY and NOCODEBACKEND_INSTANCE without exposing their values."
  - "Confirm the historical provider Bearer credential exposure has been rotated or otherwise invalidated without recording its value."
  - "Re-run the repository-owned /ncb-certify command and retain only sanitized connected capability evidence."
  - "Run the authenticated staging release journey for catalogue/profile and launch CRUD certification when protected release-account credentials are available."
  - "Only after #225 is complete, reassess #165 provider migration/idempotency work; keep its undeployed target fields deferred until migration and certification."
blockers:
  - scope: connected_provider_certification
    issue: 225
    detail: "The repository-owned /ncb-certify trigger works, but protected workflow run 34372382775 stopped before provider access because the GitHub staging-release environment lacks NOCODEBACKEND_SECRET_KEY and NOCODEBACKEND_INSTANCE."
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated catalogue/profile and launch-journey certification requires the protected staging-release runtime and release-account credentials; this execution path cannot create or reveal those secrets."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Production-equivalent schema/constraint migration and destructive contract probes remain deferred until #225 is certified and explicitly authorised isolated-provider evidence is available."
requires_owner_decision: true
owner_decision:
  question: "Provision the missing protected GitHub staging-release runtime configuration and confirm historical NoCodeBackend credential rotation/invalidation."
  options:
    - "Configure NOCODEBACKEND_SECRET_KEY as a protected staging-release secret and NOCODEBACKEND_INSTANCE as the intended protected environment variable, then re-run certification."
    - "Use an equivalent approved protected credential-management path that makes the existing staging workflows executable without exposing values."
  recommendation: "Configure the existing staging-release environment because the repository workflows already enforce isolated staging, sanitized evidence and cleanup controls."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "fe8d85e29017852385d5ecca83e634356dcb74bc"
last_updated: "2026-09-10T01:52:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend-backend contract alignment  
**Execution state:** Blocked on protected connected-certification configuration  
**Release state:** Source contract alignment is materially reconciled; connected launch certification is not complete.

## Autonomous continuation support

The repository is the authoritative handoff. Continue dependency-correct launch-schema alignment and production certification without requiring undeployed target fields. Reuse active work, use normal non-draft PRs, maintain lifecycle metadata, run `npm run platform:validate`, treat CI as supporting diagnostics, and keep destructive connected probes restricted to explicitly authorised isolated staging with cleanup verification.

## Overall status

**The launch-facing rating, cellar and profile contracts are aligned with current provider evidence. Production provider reachability is healthy. The remaining alignment chain is blocked on protected GitHub staging-release configuration and credential-hygiene evidence required by #225.**

## Current production boundary

PR **#348** is squash-merged as exact `main` **fe8d85e29017852385d5ecca83e634356dcb74bc**. Vercel production deployment **dpl_5UfQAoM9ucrCJJN5StDUsYw4rbRj** is READY for that exact SHA with matching `main` GitHub provenance and Node lambda runtime metadata.

Exact-main `GET /api/readiness` returned HTTP 200 with release SHA `fe8d85e29017852385d5ecca83e634356dcb74bc`, environment `production`, and `dataProvider: "ok"`. This confirms the deployed server can still perform its real generated-provider products read. It does not substitute for authenticated-user journey certification.

## Completed schema-alignment slices

Issue **#340** / PR **#341** corrected the active rating bonus write contract to `bonus_attribute_rating_mapping.bonus_attributes_id`, pinned the boundary with regression coverage and confirmed `cellar.series_version_id` as the active optional edition/version relationship field.

Issue **#342** / PR **#343** added `docs/nocodebackend/launch-schema-contract.md`, classifying launch provider collections/fields as `DEPLOYED_REQUIRED`, `DEPLOYED_OPTIONAL`, `DEFERRED_TARGET` or `UNAVAILABLE`. It records `product_category_id` as the provider catalogue relationship and persistent profiles storage as unavailable on current evidence.

PR **#344** reconciled exact-main provider readiness evidence and narrowed #225 from a provider-authorization failure to authenticated certification plus credential hygiene.

Issue **#346** / PR **#347** normalized the complete cellar write surface. Browser create/update bodies are projected through canonical `CELLAR_EDITABLE_FIELDS`; caller-supplied `user_id`, `series_edition_id` and arbitrary fields do not cross the browser write boundary. Server-side allowlisting, validation and ownership remain authoritative.

Issue **#345** / PR **#348** reconciled `docs/nocodebackend/schema-mapping.md` with the canonical profile capability. Persistent `profiles` storage is not an active deployed launch collection; current profile GET is session-backed and profile PUT fails explicitly with `profile_persistence_unavailable`. Future profile persistence remains a deferred provider-migration target rather than an invented launch dependency.

A follow-on route audit briefly identified the obsolete `series_edition_id` projection in `api/current-data-proxy.js`, but `api/data-router.js` routes every live `cellar` request to the dedicated `cellar-data-proxy.js` first. Issue **#349** was therefore closed `not_planned` without speculative code changes; the live cellar projection already uses `series_version_id` and has boundary coverage.

## Deployed versus deferred contract

Current launch rating headers rely on `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalized collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts, deterministic child uniqueness keys and connected conditional-update/concurrency requirements. Those remain `DEFERRED_TARGET`, not production launch prerequisites, until provider migration and certification are recorded.

Persistent profile storage remains `UNAVAILABLE` on current provider evidence. It must not become a launch prerequisite or receive browser writes until a reviewed provider migration and connected permission/ownership certification exist.

## Connected certification evidence

The repository-owned `/ncb-certify` issue command is operational through the connected GitHub integration. On 10 September 2026 it triggered NoCodeBackend certification workflow run **34372382775** on exact main `fe8d85e29017852385d5ecca83e634356dcb74bc` under the protected `staging-release` environment.

The workflow stopped before any NoCodeBackend request because protected runtime configuration is missing: `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE`. Its sanitized result was `SETUP_REQUIRED`; data-plane execution and cleanup were both `NOT_RUN`, and schema-plane mutation remained intentionally `UNAVAILABLE_NOT_CONFIGURED`. No destructive provider operation ran and no credential value was exposed.

This supersedes the earlier assumption that ChatGPT could not trigger the secret-bearing certification path. The trigger is usable; the blocker is specifically missing protected GitHub environment configuration.

The separate connected staging release workflow remains the intended route for sign-in, catalogue, product detail, rating create/history/delete, cellar CRUD, session-backed profile read and cross-account ownership evidence. It must not be run with invented credentials or against destructive production fixtures.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

PR #347 exact-head Release gate and browser/accessibility checks passed before merge and its exact-main deployment is production READY.

PR #348 exact head `3deb351130b9c4e856650ddbe14d1ab919ca5d82` passed the repository Pull request validation workflow, including the project-owned Release gate and browser/accessibility checks; Dependency Review passed; exact-head Vercel preview was READY. It was merged without waiting for the still-running CodeQL diagnostic because the documentation-only change had sufficient project-owned acceptance evidence and no substantive review finding.

## Required owner intervention

The next alignment step requires protected configuration that this execution path cannot safely manufacture or retrieve:

1. Add the valid NoCodeBackend Bearer credential as `NOCODEBACKEND_SECRET_KEY` in GitHub's protected `staging-release` environment.
2. Add the intended `54026_rating` instance identifier as protected `NOCODEBACKEND_INSTANCE` environment configuration.
3. Confirm that the historical provider credential exposed in the supplied Swagger archive has been rotated or otherwise invalidated. Do not record the value.
4. Ensure the protected release-account credentials needed by `connected-release-check.yml` are present if full authenticated launch-journey certification is to run.

After those items are present, autonomous execution can re-trigger `/ncb-certify`, inspect sanitized evidence, run the safe authenticated staging release check, update #225 and continue the #165 → #144 → #154 dependency chain.

## Next dependency-correct work

1. Complete the protected configuration/credential-hygiene items above.
2. Re-run `/ncb-certify`; require sanitized connected data-plane evidence and verified cleanup before advancing provider capability claims.
3. Run authenticated catalogue/profile and complete launch-journey certification through the protected staging release path.
4. Close #225 only when its remaining acceptance evidence is complete.
5. Then reassess #165 provider migration/idempotency work against production-equivalent schema and concurrency capabilities; do not enable deferred fields before migration/certification.
6. Continue #144/#154 connected certification only after their dependency evidence is satisfied.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.
