---
project: Pourfolio
portfolio_state: READY
execution_slot: NONE
phase: "Phase 3 — Beer discovery dependable"
stage: "Dependency-correct launch continuation"
gate: Project Entry
execution_state: READY
current_work:
  objective: "Reconcile the dependency-correct plan after the merged owner-history fix, then complete the remaining bounded integration evidence before #165."
  issue: null
  pr: null
  branch: null
next_actions:
  - "Complete authenticated connected verification for #600 against the deployed owner-history fix; keep the issue open until the provider 502 is disproved in production."
  - "Complete bounded application write/read verification of the corrected bonus_attribute_id relationship path; do not infer write correctness from the read-only 1,733-row audit."
  - "Begin #165 with fresh live-schema re-certification and prepare the migration/evidence package from current provider evidence; never repeat or assume a migration from stale issue text."
  - "Then progress #503 durable rating workflow, conditional #577 auth/authorization certification, #144 backend certification, #154 catalogue certification, #449 alignment, and exact-candidate beer-first release verification."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "Durable idempotency requires irreversible provider schema/constraint and existing-data migration work. Provider-supported migration/backfill plus backup/restore evidence and the governed approval package are required before mutation."
  - scope: user_admin_connected_session_certification
    issue: 577
    detail: "The read-only Secret-Key preflight is implemented and deployed, but current Secret Keys are database API credentials rather than login passwords. Protected POST execution plus supported password/OTP/JWT account credentials are still required for session and owner-isolation evidence."
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
  observed_main_commit: "55c94659eeea31e470303b8eba8f5ff930141900"
  current_candidate_commit: null
  latest_validated_commit: "53fa080e54c7388c17340fa3d5ea95e7bfcb9187"
  latest_deployed_commit: "f254176e6e19082e4528402a6db2e712d82b1188"
  latest_runtime_verified_commit: "5ecd49191d074f04cc4f5379748b8c1615fafdbb"
  latest_browser_verified_commit: "53fa080e54c7388c17340fa3d5ea95e7bfcb9187"
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "53fa080e54c7388c17340fa3d5ea95e7bfcb9187"
last_updated: "2026-10-07T20:10:43+11:00"
---


# STATUS.md

Last materially reviewed: 7 October 2026

## AI execution gate

**Gate:** Project Entry. **State:** READY. Owner-history provider fix PR #601 is merged and deployed. There is no active implementation PR. Issue #600 remains open only for authenticated connected verification of the production provider read; continue the highest-priority dependency-correct launch work without reopening completed UI alignment unless new evidence shows drift.

## Autonomous continuation support

Continue dependency-correct work from current repository and live GitHub evidence. Scoped blockers #165 and #577 do not prevent independent launch work. Do not enable `/ratings/reconcile` before the governed #165 provider migration and certification.

Owner response standard: Done / Next / You. Operating rules live in `AGENTS.md` and `PR_LIFECYCLE_STANDARD.md`.

## Current integration and evidence

- PR #601 merged the owner-history provider query correction as `f254176e6e19082e4528402a6db2e712d82b1188`; exact head `53fa080e54c7388c17340fa3d5ea95e7bfcb9187` passed canonical validation, Browser/accessibility, Dependency Review, CodeQL and PR lifecycle checks. Production deployment `dpl_Hpe5UAr7nTZXxYA4eoJQLrLjW52x` is READY on the merged SHA. #600 remains open for authenticated connected verification only; no provider schema/data mutation occurred.
- UI/roadmap alignment issue #594 is closed via merged PR #596.
- Final PR head `9a46b4386454c680bf421d298d4543bbbcf348ec` passed canonical `npm run platform:validate`, Browser and accessibility, Dependency review, CodeQL and PR lifecycle checks.
- Production deployment `dpl_DTX2SMCLg5NKrexeqe7xvFEgu4D8` is READY on merged main `5ecd49191d074f04cc4f5379748b8c1615fafdbb`. Production `/api/health` reports that exact SHA and healthy configured authentication, data, canonical endpoints, credentials, instance and shared rate limiter.
- The production UI now uses the documented launch-primary navigation, an Explore row for implemented supporting experiences, and `/features` for current/planned capability status. Planned cards are informational and non-actionable until their dependencies are certified.
- Brew Done It remains absent from production-facing navigation and product CTAs. Its protected direct route remains available for controlled testing while its server policy/provider/privacy/recovery boundary stays fail-closed.
- No provider schema, authentication authority or blocked capability was enabled by #596.

Detailed implementation history belongs in commits, PRs and `docs/RELEASE_TRACKING.md`.

## Scoped blockers

| Issue | Remaining boundary | Safe continuation |
|---|---|---|
| #165 | Provider-supported migration/backfill, uniqueness, backup/restore and exact approval package | Reversible evidence preparation; no schema mutation or reconciliation enablement |
| #577 | Protected preview POST probe plus supported password/OTP/JWT session credentials | Read-only credential preflight; no secrets in evidence |

Both issues were freshly confirmed open. No owner decision is requested before the exact irreversible migration package is ready.

## Next dependency-correct work

1. Complete authenticated connected verification for #600 against production. The source fix is merged/deployed; do not close #600 until live owner history proves the provider 502 is resolved.
2. Complete the bounded application write/read verification for the corrected `bonus_attribute_id` relationship path. The read-only audit proves the current provider rows, not that a new application write persists and reads back correctly.
3. Start #165 with **fresh live-schema re-certification**. Historical issue evidence conflicts: #503 records a live ratings-field migration/reconciliation, while #165 still describes the earlier legacy schema. Do not repeat a migration or assume current provider state. Re-certify first, then prepare the exact migration/evidence package only for gaps that still exist.
4. Continue beer-first reliability in order: #503 durable rating workflow; #577 connected auth/authorization certification when prerequisites permit; #144 backend certification; #154 catalogue certification; #449 add/edit/cellar alignment; exact-candidate release verification.
5. After beer-first reliability, continue rating model/history (#468, Quick Rate, repeat tasting semantics, #444), then personal intelligence, places/availability, social, business ecosystem and account lifecycle according to `ROADMAP.md`.

#143 governance and #429 cleanup remain maintenance work selected when evidence warrants them, not sequential blockers. Brew Done It remains a separate contained workstream and must not be enabled to advance the main plan.

## Deferred capability boundaries

- #449: catalogue proposals preserve canonical producer/style relationships; relationship-backed cellar fields wait for verified lookup/ownership APIs.
- Producer Stage E: verified geography, historical lifecycle and managed-business/venue attribution depend on #444/#437/#399; no fabricated relationships.
- Brew Done It: launch-excluded, policy-disabled until its own provider/cardinality/privacy/recovery certification and governed enablement. It does not block beer-first launch work.
- Persistent profile writes remain unavailable; current reads are session-backed.


## Project source-control limitation

Project Master's `MASTER_SOURCE_MANIFEST.md` is the active master authority index. The current Pourfolio ChatGPT Project attachment surface still exposes five superseded/historical policy inputs: `GitHub-Codex_Software_Delivery_Operating_Standard.md`, three `Update PR lifecycle standard.txt` attachments, and `Pourfolio Backend Values.txt`. They are explicitly non-authoritative.

The available agent file controls cannot attach/detach Project sources. The exact remaining Project UI housekeeping is: remove those five files from active Pourfolio Project Sources and add/retain the canonical master standards indexed by `MASTER_SOURCE_MANIFEST.md`. Keep the beer/backend CSV/XLSX/SQL sources as evidence/data sources. This is not a repository release blocker.

## Validation limitations

Source validation does not prove application writes. The isolated connected audit proves the current provider read contract: `bonus_attribute_id` is present on all 1,733 examined rating mapping rows and the stale plural field is absent. A separate bounded application write/read verification is still required before calling the corrected write path APPLICATION VERIFIED. The `personal_history_projection` source fix is merged and deployed; #600 now requires authenticated connected production verification only.
