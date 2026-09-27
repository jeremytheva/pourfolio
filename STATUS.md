---
project: Pourfolio
portfolio_state: ACTIVE
execution_slot: NONE
phase: "Phase 3 — Beer discovery dependable"
stage: "Dependency-scoped launch integration"
gate: Integration
execution_state: READY
current_work:
  objective: "Resume the highest-priority unblocked launch work while #165 remains at the irreversible provider-migration boundary."
  issue: 429
  pr: null
  branch: null
next_actions:
  - "Continue #429 by migrating the remaining direct test/import dependencies from current-data-proxy.js, then remove it only when canonical validation proves it unreachable."
  - "Keep #165 at the irreversible provider boundary until its migration approval package is complete; do not enable /ratings/reconcile."
  - "After #165 is deployed and verified, complete #144 backend/provider certification and backend-dependent #154 catalogue certification."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "Durable idempotency requires irreversible provider schema/constraint and existing-data migration work. Provider-supported migration/backfill plus backup/restore evidence and the governed approval package are required before mutation."
requires_owner_decision: false
owner_decision:
  question: null
  recommendation: "Do not request #165 migration approval until the evidence package is complete enough to present the exact irreversible operation and recovery path."
wip:
  open_implementation_prs: 0
  dependent_stack_depth: 0
  max_open_implementation_prs: 3
  max_dependent_stack_depth: 2
evidence:
  observed_main_commit: "f419f7024f23ab00125b2ad7f2c1bfa2bf63478f"
  current_candidate_commit: null
  latest_validated_commit: "3f792e1c10c347d77cbcbbada8480b757f54d4f9"
  latest_deployed_commit: "f419f7024f23ab00125b2ad7f2c1bfa2bf63478f"
  latest_runtime_verified_commit: "cb5b3a996d7ea1c17babe0945830b9717e488dfa"
  latest_browser_verified_commit: "3f792e1c10c347d77cbcbbada8480b757f54d4f9"
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "3f792e1c10c347d77cbcbbada8480b757f54d4f9"
last_updated: "2026-09-28T08:58:00+10:00"
---


# STATUS.md

Last materially reviewed: 28 September 2026

## AI execution gate

**Current gate:** Integration.  
**Execution state:** **READY** for dependency-safe launch work. The #165 provider-mutation path remains blocked as a scoped dependency, not a project-wide execution state. No implementation PR is currently open, so the execution slot is **NONE** until the next bounded work item starts.

The dependency-correct launch sequence remains:

`#165 rating durability → #144 canonical backend certification → backend-dependent #154 catalogue certification → launch verification`

## Autonomous continuation support

Continue the highest-priority dependency-correct work that can safely be completed autonomously. The repository is authoritative for current work and blockers; chat history is supporting context only.

When #165 cannot progress because provider-supported migration/backfill/backup/restore evidence or explicit migration approval is unavailable, continue independent launch-scoped work such as #449 and targeted #429 cleanup where it does not mutate provider schema/data, fabricate catalogue relationships or weaken certification gates.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. Do not enable `/ratings/reconcile` before the #165 migration is deployed and verified.

### Portfolio, WIP and evidence state

- Open ordinary implementation PRs: **0 / 3**.
- Dependent PR stack depth: **0 / 2**.
- No open PR requires integration before new bounded work begins.
- GitHub retains a large historical branch inventory from prior autonomous work. Those branches are not active WIP because they have no open PRs; clean them incrementally where safe rather than treating them as active implementation.
- The latest source/browser validation evidence is tied to PR #570 head `3f792e1c10c347d77cbcbbada8480b757f54d4f9`.
- Current observed `main` is `f419f7024f23ab00125b2ad7f2c1bfa2bf63478f`, with a successful Vercel deployment status. This deployment evidence does not imply runtime/browser verification for that exact commit.
- Latest retained runtime verification remains `cb5b3a996d7ea1c17babe0945830b9717e488dfa`.

Evidence stages remain distinct: validation PASS is not deployment, deployment is not runtime verification, provider configuration is not provider certification, and mocked/source tests are not persisted-provider evidence.

### Latest master-standard adoption

The repository now applies the portfolio/WIP controls, productive-work threshold, validation fallback hierarchy, template-pattern reuse rule, NoCodeBackend schema-authority mapping, provider certification states and migration approval-package requirement defined in the current repository guidance. The existing NoCodeBackend contract/evidence system is retained rather than duplicated under a new `database/` authority.

### Owner-facing response standard adopted

Routine ChatGPT/Codex implementation, continuation, review, merge, deployment and status responses now use the concise `Done / Next / You` structure defined in `AGENTS.md`. Detailed implementation state, validation evidence, blockers, deferred work and technical history remain in repository/GitHub sources. `Blocked`, `Problem` and `Decision needed` are added only when materially necessary.

## Recently integrated

The producer/search programme through the provider-safe portion of Stage E is merged. Recent launch/governance work includes:

- **#498, #510–#517, #520–#521** — authoritative producer attribution, unified search, scalable brewery discovery, privacy-safe producer statistics, brewery-local discovery and provider-safe Stage E boundaries;
- **PR #519** — first unreachable prototype-page cleanup slice;
- **PR #527, #529, #531** — architecture, roadmap and provider-boundary reconciliation;
- **PR #533, #534, #536, #538, #541, #542** — fail-closed tasting-sharing and Drinking Buddy authorization/revocation hardening;
- **PR #537, #543, #545, #547, #553, #556, #563** — autonomous continuation/status reconciliation slices;
- **PR #544, #546, #548** — #449 duplicate-proposal regression evidence, canonical producer scoping and fail-closed malformed-input handling;
- **PR #551, #552 and #554** — Brew Done It provider/cardinality and deployed-contract hardening, including removal of obsolete v3 `question_count` writes;
- **PR #555** — isolated, manual, SHA-pinned Brew Done It connected-provider probe workflow;
- **PR #557–#562 and #564** — Brew Done It retry, role/presentation, deduction and release-certification hardening, including fail-closed release readiness tests and exact full-commit candidate revision enforcement. These changes remain launch-excluded and do not authorize provider mutation or production enablement;
- **PR #566–#570** — live-router legacy-proxy detachment, status/concise-reporting reconciliation and validated dependency maintenance through the current main baseline.

Brew Done It remains launch-excluded and does not alter the Pourfolio launch dependency order.

PRs **#532** and **#535** were not merged because deletion-only cleanup failed canonical validation while `api/data-router.js` and tests still imported `current-data-proxy.js`. **PR #566** subsequently removed the live router import/fallback after exact-head validation proved the canonical handlers cover those resources. The legacy module remains because direct test/import dependencies still need migration before deletion.

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

1. Continue #429 by migrating the remaining direct test/import dependencies from `current-data-proxy.js`; delete the legacy module only after canonical validation proves it unreachable.
2. Keep #165 limited to reversible migration-package evidence gathering; do not mutate the provider or enable reconciliation before governed evidence and explicit approval are ready.
3. After #165 is deployed and verified, complete #144 canonical backend/provider certification and backend-dependent #154 catalogue certification.
4. Continue #449 only where the slice is provider-independent, bounded and does not create overlapping WIP.

### #144 — canonical backend certification

Proceed after #165 prerequisites are deployed and verified. Re-certify the exact candidate against connected authentication, authorization, ownership, provider failure, rating retry/reconciliation, cellar and recovery behaviour. Existing #225/#381/#382 provider-access evidence is baseline evidence, not a substitute for post-migration certification.

### #154 — dependable catalogue certification

The browser/server catalogue boundary and discovery UX are substantially implemented. Completion still requires production-equivalent catalogue reconciliation and exact-candidate connected evidence. Do not claim completion from mocked/browser-only tests.

### #449 — user beer add/edit and cellar alignment

Continue provider-independent contract/UI hardening where safe. The primitive cellar `gift` / conditional `gift_from` slice is integrated. Duplicate proposal evidence preserves canonical producer scope, distinguishes edition conflicts, handles malformed inputs fail closed, and requires canonical producer identity on both proposal and candidate. Relationship-backed cellar fields remain withheld until verified lookup/ownership APIs exist. Catalogue changes must preserve canonical producer/style relationships and use governed proposal/moderation semantics rather than arbitrary direct mutation.

### #429 — targeted cleanup

Continue evidence-based removal of unreachable prototype code after the merged #519 slice. Do not use broad deletion where reachability or future governed capability is uncertain. `current-data-proxy.js` is no longer a live router dependency after PR #566, but it is not yet removable because direct test/import dependencies remain.

## Production/provider baseline

Production generated-data authorization and credential rotation under **#225/#381/#382** are complete. Canonical server-owned integration remains:

`Browser → Pourfolio same-origin server/API → NoCodeBackend`

Provider secrets remain server-only. Do not reopen auth/data base-URL routing without new contradictory runtime evidence.

## Brew Done It

Brew Done It remains a separate, launch-excluded capability. Its source foundations, deduction work, provider/cardinality hardening, deployed-contract cleanup, manual connected-provider probe infrastructure and fail-closed release-certification tests are merged through PR #564. Provider migration/certification and production enablement remain separately governed. It must not become a dependency of the beer-first launch.

## Continuation rule

Use dependency-scoped blocking. When #165 cannot progress safely, record the missing evidence and continue the highest-priority unaffected launch work. Normal PRs are the default. Merge only after canonical validation, applicable browser/runtime evidence, review-thread resolution and deployment evidence are satisfactory; GitHub Actions remain supporting diagnostics rather than a duplicate acceptance process.
