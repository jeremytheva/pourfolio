---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Rating idempotency provider migration"
gate: Integration
execution_state: PARTIALLY_BLOCKED
current_work:
  objective: "Progress #165 only to the irreversible provider boundary while continuing dependency-independent launch work."
  issue: 165
  pr: null
  branch: null
next_actions:
  - "Obtain provider-supported migration, uniqueness, backup/restore and safe-backfill evidence for #165 before any provider mutation."
  - "Keep /ratings/reconcile unavailable until the #165 migration is deployed and verified."
  - "After #165, complete #144 backend/provider certification and backend-dependent #154 catalogue certification."
  - "Continue #449 and targeted #429 work where independent of provider mutation."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "Durable idempotency requires irreversible provider schema/constraint and existing-data migration work. Provider-supported migration/backfill plus backup/restore evidence and explicit approval are required before mutation."
requires_owner_decision: true
owner_decision:
  question: "Approve the #165 provider migration only after a concrete provider-supported migration, backup/restore and cleanup-safe backfill plan is evidenced."
  recommendation: "Keep #165 blocked at the irreversible provider boundary until the evidence and explicit migration approval requirements are satisfied."
last_updated: "2026-09-22T14:56:00+10:00"
---

# STATUS.md

Last materially reviewed: 22 September 2026

## Current execution state

Pourfolio is **not globally blocked**. The connected rating-idempotency path is blocked at the irreversible provider boundary in **#165**, while independent launch hardening may continue.

The dependency-correct launch sequence is:

`#165 rating durability → #144 canonical backend certification → backend-dependent #154 catalogue certification → launch verification`

Independent work may continue on **#449** and targeted **#429** cleanup when it does not require provider mutation, fabricated catalogue decisions or weakened certification gates.

## Recently integrated

The producer/search programme through the provider-safe portion of Stage E is merged and must not be treated as active PR work:

- **#510 / PR #511** — unified global search across beers, breweries and styles;
- **#498** — authoritative multi-producer product attribution;
- **#512 / PR #513** — scalable server-authoritative brewery discovery/search;
- **#514 / PR #515** — privacy-safe brewery community and personal statistics;
- **#516 / PR #517** — brewery-local beer search, filters and deterministic sorting;
- **#520 / PR #521** — server-authoritative brewery rankings and explicit Stage E capability boundaries;
- **PR #519** — first unreachable prototype-page cleanup slice;
- **PR #527** — concise architecture reconciliation with the currently merged application.

Producer Stage E remains intentionally incomplete where canonical data is not yet available: verified geography, historical lifecycle/rename/acquisition semantics, managed-business profiles and venue attribution remain dependency-gated by **#444**, **#437** and **#399** rather than inferred from free text or fabricated relationships.

## Current P1 — #165 rating idempotency migration

The application-side durability contract exists, but the provider-evidenced deployed schema does not yet prove all required submission identity/fingerprint/state fields, expected-child guarantees and uniqueness constraints.

Until migration evidence is sufficient:

- rating submission must use only deployed fields;
- `/ratings/reconcile` must remain unavailable/fail closed;
- proposed schema must remain distinguished from deployed schema;
- no schema mutation, uniqueness change or existing-row backfill may occur without provider-supported migration mechanics, backup/restore evidence, safe cleanup/backfill procedure and explicit approval.

Provider documentation reviewed to date establishes that tables can be modified, required columns on populated tables need defaults, unique fields are supported, and snapshots/cloning are advertised. It does **not** yet establish the exact restore/recovery, composite-uniqueness and safe-backfill procedure needed to authorize the live migration. This boundary is recorded on #165.

## Subsequent launch priorities

### #144 — canonical backend certification

Proceed after #165 prerequisites are deployed and verified. Re-certify the exact candidate against connected authentication, authorization, ownership, provider failure, rating retry/reconciliation, cellar and recovery behaviour. Existing #225/#381/#382 provider-access evidence remains useful baseline evidence but does not substitute for post-migration certification.

### #154 — dependable catalogue certification

The browser/server catalogue boundary and discovery UX are substantially implemented. Completion still requires production-equivalent catalogue reconciliation and exact-candidate connected evidence. Do not claim completion from mocked/browser-only tests.

### #449 — user beer add/edit and cellar alignment

Continue provider-independent contract/UI hardening where safe. Catalogue changes must preserve canonical producer/style relationships and use governed proposal/moderation semantics rather than arbitrary direct mutation.

### #429 — targeted cleanup

Continue evidence-based removal of unreachable prototype code after the merged #519 slice. Do not use broad deletion where reachability or future governed capability is uncertain.

## Production/provider baseline

Production generated-data authorization and credential rotation under **#225/#381/#382** are complete. Canonical server-owned integration remains:

`Browser → Pourfolio same-origin server/API → NoCodeBackend`

Provider secrets remain server-only. Do not reopen auth/data base-URL routing without new contradictory runtime evidence.

## Brew Done It

Brew Done It remains a separate, launch-excluded capability. Its source foundations and v3 deduction work are merged, but provider migration/certification and production enablement remain separately governed. It must not become a dependency of the beer-first launch.

## Continuation rule

Use dependency-scoped blocking. When #165 cannot progress safely, record the missing evidence and continue the highest-priority unaffected launch work. Normal PRs are the default. Merge only after canonical validation, applicable browser/runtime evidence, review-thread resolution and deployment evidence are satisfactory; GitHub Actions remain supporting diagnostics rather than a duplicate acceptance process.
