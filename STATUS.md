---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend-backend launch contract alignment and production certification"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Normalize the active cellar write contract across canonical schema classification, browser services and the owner-enforcing gateway while #225 authenticated certification awaits a safe authorised session."
  issue: 346
  pr: null
  branch: fix/cellar-write-contract
next_actions:
  - "Validate #346 with the canonical project-owned validation path and repair substantive findings."
  - "Open a normal non-draft PR, verify exact-head deployment/browser evidence and merge when safe."
  - "Reconcile #345 so detailed profile schema mapping cannot imply deployed persistence."
  - "Resume #225 authenticated catalogue/profile smoke when a safe authorised session path is available; do not fabricate credentials or destructive evidence."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated catalogue/profile certification requires a safe authorised production-equivalent session. The repository has a protected staging-release workflow, but no workflow-dispatch execution has been recorded and this connected execution path cannot supply or expose its protected credentials."
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
last_verified_commit: "2b18796145db74867b31478f76b438b649463792"
last_updated: "2026-09-10T01:22:00+10:00"
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

**Canonical launch-schema classification and provider reachability are healthy; active work is closing remaining frontend/backend contract drift while authenticated certification remains access-gated.**

## Current production boundary

PR **#344** is squash-merged as exact `main` **2b18796145db74867b31478f76b438b649463792**. Vercel production deployment **dpl_3AZLi1ZxDGuDbYC9u6Mb2QDL2wDb** is READY for that exact SHA with matching `main` GitHub provenance, verified commit metadata and Node lambda runtime metadata.

Fresh exact-main `/api/readiness` returns HTTP 200 with release SHA `2b187961...`, environment `production` and `dataProvider: "ok"`. The immediately preceding exact-main auth-provider discovery also returned HTTP 200 with `email: true` and `google: false`; #225 therefore no longer represents a current provider-authorization failure.

## Completed schema-alignment slices

Issue **#340** / PR **#341** corrected the active rating bonus write contract to `bonus_attribute_rating_mapping.bonus_attributes_id`, pinned the boundary with regression coverage and confirmed `cellar.series_version_id` as the active optional edition/version relationship field.

Issue **#342** / PR **#343** added `docs/nocodebackend/launch-schema-contract.md`, classifying launch provider collections/fields as `DEPLOYED_REQUIRED`, `DEPLOYED_OPTIONAL`, `DEFERRED_TARGET` or `UNAVAILABLE`. It records `product_category_id` as the provider catalogue relationship and persistent profiles storage as unavailable on current evidence.

PR **#344** durably reconciled exact-main provider certification evidence and narrowed #225 to authenticated smoke plus credential-hygiene evidence.

## Active cellar contract slice

Issue **#346** aligns the complete cellar write surface. The active server gateway already enforces `CELLAR_EDITABLE_FIELDS`, type/range/date normalisation, nullable relationship rules and owner authority, but the browser cellar service previously forwarded arbitrary caller keys and the concise launch classification listed only a subset of the actual writable fields.

The current branch adds a pure browser write projector shared by create/update calls. It excludes noncanonical keys such as browser-supplied `user_id`, `series_edition_id` and arbitrary fields without weakening the server trust boundary. It also expands the canonical classification so `product_id` is the required create field and the remaining evidenced cellar allowlist is explicitly optional where omission is valid.

## Profile contract drift

Issue **#345** records a documentation contradiction: the concise launch contract correctly marks persistent `profiles` storage `UNAVAILABLE`, while the detailed historical schema mapping still presents a persistent profile target as though it were deployed. Until that document is reconciled, the launch classification takes precedence: profile GET is session-backed and profile PUT fails explicitly with `profile_persistence_unavailable`.

## Deployed versus deferred contract

Current launch rating headers rely on `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`; rating scores and optional bonus mappings remain separate normalised collections. Server identity and calculated totals are authoritative.

The durable idempotency target tracked by **#165** adds submission identity/fingerprint/state/version, expected child counts, deterministic child uniqueness keys and connected conditional-update/concurrency requirements. Those remain `DEFERRED_TARGET`, not production launch prerequisites, until provider migration and certification are recorded.

## Connected-evidence posture

Direct destructive production writes are not used for certification. The connected provider contract suite remains gated behind explicitly isolated staging and destructive-test opt-in where applicable. Repository-supplied export evidence may establish structural field names but must not be described as fresh live schema introspection.

The repository contains a `workflow_dispatch` staging-release check that can use protected release accounts and exercises sign-in, catalogue, product detail, rating create/history/delete, cellar CRUD, profile reads/allowlists and cross-account ownership. No workflow-dispatch run is currently recorded, and this execution path does not have authority to invent or reveal the protected release credentials. #225 remains open for that authenticated evidence plus confirmation that the historical provider credential exposure has been rotated or invalidated.

## Validation posture

`npm run platform:validate` remains the canonical project-owned source-validation entry point. Browser/runtime checks apply where the changed boundary is browser-facing. GitHub Actions, CodeQL and Dependency Review are supporting diagnostics; real defects they expose remain actionable.

PR #344 exact-head Release gate, browser/accessibility and CodeQL diagnostics passed before merge, and its exact-main runtime/readiness state is independently verified through Vercel.

## Next dependency-correct work

1. Complete and validate #346 cellar writable-field normalization; merge only after exact-head evidence is sufficient.
2. Reconcile #345 detailed profile schema mapping with the canonical `UNAVAILABLE` launch capability.
3. Complete #225 authenticated catalogue and session-backed profile smoke through an authorised connected path when available.
4. Confirm historical NoCodeBackend credential rotation/invalidation without recording the credential value; rerun readiness after any rotation.
5. Close #225 only when all remaining acceptance evidence is complete.
6. Then reassess #165 provider migration/idempotency work against production-equivalent schema and concurrency capabilities; do not enable deferred fields before migration/certification.
7. Continue #144/#154 connected certification only after their dependency evidence is satisfied.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until the launch journeys have matching repository contracts, provider evidence, owner/security enforcement, canonical validation and exact-main production/runtime certification.
