---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend capability truthfulness"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Remove the guaranteed-failing profile persistence journey from the launch UI while preserving session-backed identity and owner rating history."
  issue: 359
  pr: 360
  branch: "fix/remove-unavailable-profile-persistence-ui"
next_actions:
  - "Run exact-head npm run platform:validate for PR #360."
  - "Verify applicable browser/accessibility and Vercel preview evidence for the read-only profile journey."
  - "Merge PR #360 when validation, review and deployment evidence are satisfactory."
  - "Resume #225 authenticated production certification after #360 is integrated."
  - "Keep #165 DEFERRED_TARGET fields unavailable until governed provider migration and connected verification."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated launch-journey certification still needs an executable protected release-account path; this does not block #359."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation still requires provider or secret-management evidence without exposing the credential value; this does not block #359."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Fresh production-equivalent schema/constraint inventory and destructive capability probes remain deferred until explicitly authorised connected evidence is available."
requires_owner_decision: false
owner_decision:
  question: "No product decision is required for the profile capability correction."
  options: []
  recommendation: "Keep the launch profile session-backed and read-only until persistent profile storage is deployed and verified."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: PENDING
  runtime: UNVERIFIED
last_verified_commit: "f436e37cd818cb2f9c50cee92a6eeee8f5ff74d5"
last_updated: "2026-09-10T12:41:30+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / frontend capability truthfulness  
**Execution state:** Implementing and validating issue **#359** / PR **#360**  
**Previous completed integration:** issue **#354** / PR **#355** aligned the active frontend/server data contract to the supplied backend tables.

## Autonomous continuation support

Continue the highest-priority dependency-correct launch work that can be completed without weakening backend/provider gates. The supplied `54026_rating` SQL/CSV/XLSX exports remain the structural authority for active launch data capabilities.

The currently deployed profile capability is session-backed and read-only. Persistent `profiles` storage is **UNAVAILABLE** on current evidence, so browser journeys must not present or silently attempt profile persistence until a governed provider migration and connected verification promote that capability.

When #225 cannot progress because protected release-account or credential-hygiene evidence is unavailable, continue independent launch-scoped source/frontend work such as #359.

## Current work — issue #359 / PR #360

The backend-alignment review exposed a remaining user-facing capability mismatch after #355:

- `api/profile-data-proxy.js` correctly returns session-backed profile identity for GET and explicit `503 profile_persistence_unavailable` for PUT;
- the Profile page nevertheless rendered editable display-name, description and avatar fields with a **Save profile** action;
- successful sign-up also attempted an unavailable profile PUT and swallowed the expected failure.

PR **#360** corrects that mismatch by:

- keeping `src/services/profileService.js` read-only for the launch capability;
- removing the post-sign-up profile PUT;
- removing `updateProfile` from the active auth context;
- presenting account name/email as read-only session-backed identity;
- keeping rating-history read/delete behaviour unchanged;
- adding regression coverage that prevents browser profile writes from being reintroduced before capability promotion;
- retaining the explicit server-side unavailable response for profile PUT.

No provider migration, schema mutation, secret change or persistent profile collection is introduced.

## Backend-table alignment completed

PR **#355** aligned the active launch boundary to the supplied backend tables by:

- restricting browser/server cellar writes to actual exported `cellar` columns;
- removing fabricated `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` and `historical_import` cellar fields;
- using `products.producer_id -> producers.id` rather than querying a nonexistent `product_producers` junction;
- leaving zero/missing producer attribution unresolved rather than inventing collaboration data;
- reconciling the launch/data-model contracts and regression coverage.

The supplied products export contains **7 records with `producer_id = 0` and 22 records with a blank producer ID**. Those remain backend catalogue-data remediation, not frontend relationship data.

## Launch schema/application contract

Current provider-evidenced launch collections are `products`, `producers`, `categories`, `rating_attributes`, `bonus_attributes`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar`.

Key launch rules remain:

- product classification uses `products.product_category_id`;
- product producer enrichment uses `products.producer_id` only on the current backend;
- rating bonus writes use `bonus_attribute_rating_mapping.bonus_attributes_id`;
- cellar sharing edition/version uses nullable `series_version_id`, not `series_edition_id`;
- `product_producers` and persistent `profiles` storage are **UNAVAILABLE**;
- durable rating idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET`.

## Current #225 state

Earlier exact-main production evidence established that the generated NoCodeBackend products read succeeds through `/api/readiness` and auth provider discovery is reachable. #225 remains open for:

- authenticated catalogue read through the same-origin application boundary;
- authenticated session-backed profile read remaining non-403;
- confirmation that the historically exposed provider Bearer credential was rotated or otherwise invalidated, without recording its value.

Do not reintroduce routing or direct-provider frontend rewrites without contradictory runtime evidence.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. Failure to prove cleanup is a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Complete exact-head validation/review/deployment evidence for #359 / PR #360 and merge when safe.
2. Resume #225 authenticated smoke evidence when the protected release-account path is executable.
3. Complete #225 historical provider credential rotation/invalidation evidence.
4. Then activate #165 provider migration/idempotency work.
5. Follow with #144 provider/backend certification and backend-dependent #154 completion evidence.
6. Keep the 7 zero-producer and 22 blank-producer catalogue records as explicit backend remediation work; do not encode a fake frontend relationship.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
