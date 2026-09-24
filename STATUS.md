---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Rating idempotency provider migration"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Progress #165 only to the irreversible provider boundary while continuing dependency-independent launch work."
  issue: 165
  pr: null
  branch: null
next_actions:
  - "Obtain provider-supported migration, uniqueness, backup/restore and safe-backfill evidence for #165 before any provider mutation."
  - "Keep /ratings/reconcile unavailable until the #165 migration is deployed and verified."
  - "After #165, complete #144 backend/provider certification and backend-dependent #154 catalogue certification."
  - "Continue provider-independent #449 work and targeted #429 cleanup; do not delete current-data-proxy.js until its router/test dependencies are migrated."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "Durable idempotency requires irreversible provider schema/constraint and existing-data migration work. Provider-supported migration/backfill plus backup/restore evidence and explicit approval are required before mutation."
  - scope: current_data_proxy_cleanup
    issue: 429
    detail: "api/data-router.js and tests still import current-data-proxy.js; deletion-only cleanup fails canonical validation and must not be retried without migrating those dependencies."
requires_owner_decision: true
owner_decision:
  question: "Approve the #165 provider migration only after a concrete provider-supported migration, backup/restore and cleanup-safe backfill plan is evidenced."
  recommendation: "Keep #165 blocked at the irreversible provider boundary until the evidence and explicit migration approval requirements are satisfied."
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "80d6ca825a5940f49fda13d3f5bd2d00ca516e8f"
last_updated: "2026-09-24T19:59:07+10:00"
---

# STATUS.md

Last materially reviewed: 24 September 2026

## AI execution gate

**Current gate:** Integration / rating idempotency provider migration.  
**Execution state:** **BLOCKED only for the #165 provider-mutation path**. Pourfolio is not globally blocked; independent launch work continues.

The dependency-correct launch sequence remains:

`#165 rating durability → #144 canonical backend certification → backend-dependent #154 catalogue certification → launch verification`

## Autonomous continuation support

Continue the highest-priority dependency-correct work that can safely be completed autonomously. The repository is authoritative for current work and blockers; chat history is supporting context only.

When #165 cannot progress because provider-supported migration/backfill/backup/restore evidence or explicit migration approval is unavailable, continue independent launch-scoped work such as #449 and targeted #429 cleanup where it does not mutate provider schema/data, fabricate catalogue relationships or weaken certification gates.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. Do not enable `/ratings/reconcile` before the #165 migration is deployed and verified.

## Recently integrated

The producer/search programme through the provider-safe portion of Stage E is merged. Recent launch/governance work includes:

- **#498, #510–#517, #520–#521** — authoritative producer attribution, unified search, scalable brewery discovery, privacy-safe producer statistics, brewery-local discovery and provider-safe Stage E boundaries;
- **PR #519** — first unreachable prototype-page cleanup slice;
- **PR #527, #529, #531** — architecture, roadmap and provider-boundary reconciliation;
- **PR #533, #534, #536, #538, #541, #542** — fail-closed tasting-sharing and Drinking Buddy authorization/revocation hardening;
- **PR #537, #543, #545, #547, #553, #556** — autonomous continuation/status reconciliation slices;
- **PR #544, #546, #548** — #449 duplicate-proposal regression evidence, canonical producer scoping and fail-closed malformed-input handling;
- **PR #551, #552 and #554** — Brew Done It provider/cardinality and deployed-contract hardening, including removal of obsolete v3 `question_count` writes;
- **PR #555** — isolated, manual, SHA-pinned Brew Done It connected-provider probe workflow;
- **PR #557–#562** — Brew Done It retry, role/presentation, deduction and release-certification hardening, including fail-closed release readiness tests. These changes remain launch-excluded and do not authorize provider mutation or production enablement.

Brew Done It remains launch-excluded and does not alter the Pourfolio launch dependency order.

PRs **#532** and **#535** were not merged. Exact-head validation proved `api/current-data-proxy.js` is still imported by `api/data-router.js` and tests, so deletion-only cleanup is invalid. Any future #429 cleanup of this path must migrate those dependencies first and pass canonical validation.

Producer Stage E remains intentionally incomplete where canonical data is unavailable: verified geography, historical lifecycle/rename/acquisition semantics, managed-business profiles and venue attribution remain dependency-gated by **#444**, **#437** and **#399** rather than inferred from free text or fabricated relationships.

## Current P1 — #165 rating idempotency migration

The application-side durability contract exists, but the provider-evidenced deployed schema does not yet prove all required submission identity/fingerprint/state fields, expected-child guarantees and uniqueness constraints.

Until migration evidence is sufficient:

- rating submission must use only deployed fields;
- `/ratings/reconcile` must remain unavailable/fail closed;
- proposed schema must remain distinguished from deployed schema;
- no schema mutation, uniqueness change or existing-row backfill may occur without provider-supported migration mechanics, backup/restore evidence, safe cleanup/backfill procedure and explicit approval.

Provider evidence reviewed to date establishes that tables can be modified, required columns on populated tables need defaults, unique fields are supported, and snapshots/cloning are advertised. It does not establish the exact restore/recovery, composite-uniqueness and safe-backfill procedure needed to authorize the live migration. This is the irreversible boundary for #165.

## Next dependency-correct work

1. Progress #165 only through reversible evidence gathering; do not mutate the provider without governed evidence and approval.
2. After #165 is deployed and verified, complete #144 canonical backend/provider certification and backend-dependent #154 catalogue certification.
3. While #165 is blocked, continue provider-independent #449 work and targeted #429 cleanup.
4. For #429, do not retry deletion-only removal of `current-data-proxy.js`; migrate remaining router/test dependencies first or choose another evidence-backed cleanup slice.

### #144 — canonical backend certification

Proceed after #165 prerequisites are deployed and verified. Re-certify the exact candidate against connected authentication, authorization, ownership, provider failure, rating retry/reconciliation, cellar and recovery behaviour. Existing #225/#381/#382 provider-access evidence is baseline evidence, not a substitute for post-migration certification.

### #154 — dependable catalogue certification

The browser/server catalogue boundary and discovery UX are substantially implemented. Completion still requires production-equivalent catalogue reconciliation and exact-candidate connected evidence. Do not claim completion from mocked/browser-only tests.

### #449 — user beer add/edit and cellar alignment

Continue provider-independent contract/UI hardening where safe. The primitive cellar `gift` / conditional `gift_from` slice is integrated. Duplicate proposal evidence preserves canonical producer scope, distinguishes edition conflicts, handles malformed inputs fail closed, and requires canonical producer identity on both proposal and candidate. Relationship-backed cellar fields remain withheld until verified lookup/ownership APIs exist. Catalogue changes must preserve canonical producer/style relationships and use governed proposal/moderation semantics rather than arbitrary direct mutation.

### #429 — targeted cleanup

Continue evidence-based removal of unreachable prototype code after the merged #519 slice. Do not use broad deletion where reachability or future governed capability is uncertain. `current-data-proxy.js` is not currently removable in isolation because live router/test dependencies remain.

## Production/provider baseline

Production generated-data authorization and credential rotation under **#225/#381/#382** are complete. Canonical server-owned integration remains:

`Browser → Pourfolio same-origin server/API → NoCodeBackend`

Provider secrets remain server-only. Do not reopen auth/data base-URL routing without new contradictory runtime evidence.

## Brew Done It

Brew Done It remains a separate, launch-excluded capability. Its source foundations, deduction work, provider/cardinality hardening, deployed-contract cleanup, manual connected-provider probe infrastructure and fail-closed release-certification tests are merged through PR #562. Provider migration/certification and production enablement remain separately governed. It must not become a dependency of the beer-first launch.

## Continuation rule

Use dependency-scoped blocking. When #165 cannot progress safely, record the missing evidence and continue the highest-priority unaffected launch work. Normal PRs are the default. Merge only after canonical validation, applicable browser/runtime evidence, review-thread resolution and deployment evidence are satisfactory; GitHub Actions remain supporting diagnostics rather than a duplicate acceptance process.
