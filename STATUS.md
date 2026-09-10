---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Rating idempotency provider migration"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Progress #165 from repository-ready migration design to a verified provider-supported rating idempotency migration without enabling reconciliation prematurely."
  issue: 165
  pr: null
  branch: null
next_actions:
  - "Obtain evidence of the exact provider-supported managed schema-change, bulk-backfill, permission-policy, backup/export and restore mechanisms available to the 54026_rating tenant."
  - "Capture a fresh consistent pre-migration export/backup and prove isolated restoration before any schema change."
  - "Complete the migration authority record and obtain explicit approval for the isolated production-equivalent rehearsal."
  - "Rehearse the additive/backfill/constraint plan in an isolated production-equivalent environment and retain immutable provider job/audit evidence."
  - "Keep /ratings/reconcile unavailable until the deployed provider schema and connected retry/reconciliation contract are verified."
  - "Continue independent launch-quality work that does not bypass the #165 migration boundary or invent catalogue decisions."
blockers:
  - scope: provider_migration_mechanism
    issue: 165
    detail: "The provider-supported repeatable schema-change/backfill/permission mechanism and immutable job/audit evidence for the production-equivalent tenant have not yet been established. The public collection API and committed SQL exports are not migration interfaces."
  - scope: migration_recovery_authority
    issue: 165
    detail: "A fresh consistent backup/export, isolated restore proof, rollback/recovery evidence, permission/write-fence prerequisites and explicit migration approval are required before irreversible schema work."
requires_owner_decision: false
owner_decision:
  question: "No schema-change approval should be requested until the provider mechanism, recovery proof and exact rehearsal plan are evidenced."
  options: []
  recommendation: "Obtain provider authority and recovery evidence first; then escalate the exact isolated rehearsal for approval before any production migration."
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: SUPPORTING_PASS
  runtime: VERIFIED
  connected_release: PASS
last_verified_commit: "52ec6af81a08902571bf574deb2884b19201fe8e"
last_updated: "2026-09-10T22:20:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / rating idempotency provider migration  
**Execution state:** **BLOCKED at the irreversible provider-migration boundary in #165.**  
**Most recent production-certified integration:** PR **#382**, merged as `52ec6af81a08902571bf574deb2884b19201fe8e`, with the non-destructive connected release suite passing on that exact production release.

Issue **#225** is complete. Production provider authorization, authenticated catalogue access, session-backed profile access and historical credential hygiene are no longer blockers. Issue **#165** is now the dependency-correct P1 data-integrity work.

## Autonomous continuation support

Continue the highest-priority dependency-correct work that can safely be completed autonomously. The repository remains authoritative for current work, evidence and blockers; chat history is supporting context only.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. Do not use the public NoCodeBackend collection API, committed SQL exports or undocumented dashboard edits as substitutes for a supported database migration mechanism. Do not enable `/ratings/reconcile` until the required provider migration has been deployed and verified.

When #165 cannot cross its provider/irreversible boundary, continue independent launch-scoped reliability, security, accessibility or documentation work that does not weaken migration gates, execute destructive connected writes, or invent catalogue decisions.

## Provider authorization and connected release certification completed — #225

Issue **#225** was closed completed on 10 September 2026 after exact-production evidence established the deployed provider boundary.

Accepted evidence includes:

- canonical data base URL `https://api.nocodebackend.com/`;
- canonical auth base URL `https://app.nocodebackend.com/api/user-auth`;
- server data requests use the server-only provider credential and intended `54026_rating` instance;
- production `/api/readiness` performs a real generated-provider `products` read and returns `dataProvider: "ok"`;
- authenticated catalogue browse/search/direct-detail requests succeed through the same-origin application gateway;
- provider discovery, password sign-in and sign-out succeed;
- authenticated session-backed `GET /api/nocodebackend/profile` returns HTTP 200;
- profile persistence remains deliberately unavailable and profile PUT returns HTTP 503 `profile_persistence_unavailable`;
- expired-session protected-route behaviour is verified;
- the owner confirmed the historically exposed provider credential was rotated, without recording a credential value.

This evidence supersedes the historical provider `forbidden` state. The optional isolated direct-provider diagnostic does not override exact-production application-boundary evidence.

## Connected release rate-budget correction completed — #381 / PR #382

PR **#382** fixed release-test orchestration after the connected suite exhausted the production password sign-in rate budget before its final accessibility pass.

The accepted change:

- leaves production authentication and rate-limit behaviour unchanged;
- reuses an already proven authenticated storage state for the final launch-page axe sweep;
- prevents the final accessibility test from performing an unnecessary additional password sign-in;
- disables automatic retry for the serial connected release file so a single failure cannot replay the full authenticated sequence and amplify rate pressure;
- keeps expired-session evidence isolated;
- keeps rating/cellar destructive connected checks behind explicit cleanup-guarded authorization.

Validation and production evidence:

- PR head `69cf0044eca4b5b647614dc2ad77327038fa3315` passed canonical platform validation, hosted browser/accessibility, Dependency Review and CodeQL with no unresolved review threads;
- exact-head Vercel preview `dpl_8ehncQpdzk2scFBWUYaqPTHGe23h` was READY;
- merge commit `52ec6af81a08902571bf574deb2884b19201fe8e` deployed to production as `dpl_Dpi4VMmFmQBdJUqNP4q3zvheESEQ`;
- production `/api/readiness` returned HTTP 200 with exact merge SHA, environment `production` and `dataProvider: "ok"`;
- authorized non-destructive connected release run `34475738160` completed successfully: **7 passed, 2 cleanup-guarded destructive tests intentionally skipped, 0 failed**;
- the final axe launch-page test passed;
- retained redacted evidence artifact `10151426699` has SHA-256 `a1f9bd7d2af93c4808452feeba10658aa66723e781d607234bfdd9f0fc27d032`.

## Rating idempotency provider migration active — #165

Issue **#165** is now active because #225 has satisfied its dependency gate. It remains a real data-integrity blocker to durable rating reconciliation, but the repository-side design is substantially prepared.

The repository already contains:

- the target durable rating retry/reconciliation workflow;
- schema mapping and launch-schema contract;
- structural and additive schema audit tooling;
- `docs/nocodebackend/rating-schema-migration-runbook.md`;
- the `audit:rating:migration-evidence` evidence gate;
- regression coverage that keeps reconciliation unavailable against the current legacy schema.

The target rating contract requires, after safe backfill and provider verification:

- `ratings.submission_key`;
- `ratings.submission_fingerprint`;
- `ratings.submission_state`;
- `ratings.submission_version`;
- `ratings.expected_score_count`;
- `ratings.expected_bonus_count`;
- nullable `ratings.deleted_at`;
- `rating_scores.uniqueness_key`;
- `bonus_attribute_rating_mapping.uniqueness_key`;
- required non-null legacy owner/relationship fields after remediation;
- unique constraints for `(user_id, rating_id)`, `submission_key`, child `(rating_id, attribute_id)` / `(rating_id, bonus_attributes_id)`, and both child `uniqueness_key` values.

The exact provider migration has **not** occurred. `/ratings/reconcile` remains unavailable by design.

### #165 hard boundary

The migration runbook requires evidence of the provider-supported repeatable managed schema-change, permission-policy and bulk-data/backfill mechanisms for the named production-equivalent tenant, together with immutable change/job/audit identifiers.

Before any schema change, retain and approve:

1. the exact provider mechanism and tenant/version applicability;
2. a fresh consistent schema/data backup or export;
3. an isolated restore proving recovery;
4. rating-write fencing and permission-policy prerequisites;
5. deterministic backfill/restart semantics and count reconciliation;
6. rollback or safe-forward recovery evidence;
7. the exact versioned isolated rehearsal plan;
8. named migration/security/release approval.

An undocumented console edit, the public generated collection API or importing a committed source dump is not sufficient authority. Production migration must follow a successful isolated production-equivalent rehearsal and retained post-migration audits.

## Connected release credential hardening completed — #365 / PR #366

PR **#366**, merged as `dfc866301881ec82e1dce59b39532190056799fe`, prevents protected connected-release credentials from being supplied to arbitrary caller-provided HTTPS origins.

It restricts targets to the Pourfolio Vercel hostname family, verifies exact release SHA/readiness before credentials are introduced, rejects unsafe URL forms and hostile redirects, and keeps the provider secret out of browser/release output. This boundary remains in force.

## API capability containment completed — #361 / PR #362

PR **#362**, merged as `d2176025aebb28494894f3782f88112f886e0052`, prevents direct Vercel addressing of internal data-proxy implementation files. Canonical `/api/nocodebackend/auth/...` and `/api/nocodebackend/...` capabilities continue through the intended routers.

## Profile capability correction completed — #359 / PR #360

PR **#360**, merged as `e86e2abc898645ff89b00abb1e84616add50e38f`, removed the unavailable profile-persistence journey. Profile identity is session-backed and read-only; rating-history read/delete behaviour remains available. Do not reintroduce a persistent `profiles` dependency into launch behaviour without a separately approved provider capability and architecture change.

## Backend-table alignment completed — #354 / PR #355

PR **#355**, merged as `edc2d72065d0f6e62dd9ad761d546e43089b561a`, aligned active launch contracts to the supplied `54026_rating` backend tables. Cellar writes use exported columns only; catalogue producer enrichment uses `products.producer_id -> producers.id`; the nonexistent `product_producers` junction is not queried.

The supplied products export contains **7 rows with `producer_id = 0` and 22 rows with a blank producer ID**. Those remain governed catalogue-data remediation tasks, not values to infer in application code.

## Launch schema/application contract

Provider-evidenced launch collections remain `products`, `producers`, `categories`, `rating_attributes`, `bonus_attributes`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar`.

Current rules remain:

- products classify through `product_category_id`;
- producer relationship is `products.producer_id` only;
- bonus mappings use `bonus_attributes_id`;
- cellar sharing version uses `series_version_id`;
- persistent `profiles` and `product_producers` are unavailable in the current live contract;
- active rating submission uses only currently deployed backend fields;
- #165 durable idempotency fields are target migration fields, not yet live;
- `/ratings/reconcile` remains unavailable until #165 migration and connected verification are complete.

## Catalogue remediation boundary

The deterministic catalogue workflow has materialised **193 governed human decision tasks** covering known source blockers. Do not auto-fill producer/category mappings, category-cycle decisions, duplicate ordering, removals or edits. Corrections require explicit decisions and independent review before any provider mutation can be accepted.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. Failure to prove cleanup remains a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Progress #165 provider migration authority and recovery evidence without changing production schema.
2. Once the provider mechanism and recovery evidence are complete, obtain explicit approval for the isolated production-equivalent rehearsal.
3. Rehearse and audit the versioned #165 additive/backfill/constraint migration; only then consider production migration.
4. Enable and certify `/ratings/reconcile` only after the deployed schema matches the verified contract.
5. Follow #165 with #144 backend/provider certification and backend-dependent #154 completion evidence.
6. Continue independent nonblocked launch-quality work whenever #165 is waiting on provider or owner evidence.
7. Keep all 193 catalogue remediation decisions explicit and independently reviewed.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, #165 durable rating integrity is either safely completed or explicitly scoped out by an approved architecture decision, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes, catalogue decisions are governed, and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
