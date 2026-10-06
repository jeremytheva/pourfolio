---
project: Pourfolio
portfolio_state: ACTIVE
execution_slot: INTEGRATING
phase: "Phase 3 — Beer discovery dependable"
stage: "UI and feature-roadmap alignment"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Align production navigation and feature-status UI with the implemented code and approved roadmap without enabling dependency-gated capabilities."
  issue: 594
  pr: 596
  branch: feat/ui-feature-status-alignment
next_actions:
  - "Run canonical validation and applicable browser/accessibility checks on PR #596 latest head."
  - "Inspect the Vercel preview for route/navigation rendering and truthful planned-feature states."
  - "Fix any genuine failures, then merge #596 only when latest-head evidence is sufficient."
  - "After integration, resume the preserved rating-read/provider 502 work and other dependency-correct launch tasks."
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
  open_implementation_prs: 1
  dependent_stack_depth: 1
  max_open_implementation_prs: 3
  max_dependent_stack_depth: 2
evidence:
  observed_main_commit: "20d55caf4fdf2a6e8b5327d5a176949c8f5b4230"
  current_candidate_commit: null
  latest_validated_commit: "39d33df65c2f4bd1d2e1e4e5c8811d28e1e6b2e3"
  latest_deployed_commit: "20d55caf4fdf2a6e8b5327d5a176949c8f5b4230"
  latest_runtime_verified_commit: "cb5b3a996d7ea1c17babe0945830b9717e488dfa"
  latest_browser_verified_commit: "39d33df65c2f4bd1d2e1e4e5c8811d28e1e6b2e3"
validation:
  governance: NOT_RUN
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: PENDING
  runtime: UNVERIFIED
last_verified_commit: "39d33df65c2f4bd1d2e1e4e5c8811d28e1e6b2e3"
last_updated: "2026-10-06T11:54:51+11:00"
---


# STATUS.md

Last materially reviewed: 6 October 2026

## AI execution gate

**Gate:** Integration. **State:** VALIDATING PR #596. The current change reconciles the production-facing UI with the authoritative interface plan and approved roadmap: launch-primary navigation is narrowed to the documented four destinations, implemented supporting experiences move into an Explore surface, planned capabilities receive truthful non-interactive placeholders, and Brew Done It returns behind its production-discovery certification boundary.

## Autonomous continuation support

Continue dependency-correct work from current repository and live GitHub evidence. Scoped blockers #165 and #577 do not prevent independent launch work. Do not enable `/ratings/reconcile` before the governed #165 provider migration and certification.

Owner response standard: Done / Next / You. Operating rules live in `AGENTS.md` and `PR_LIFECYCLE_STANDARD.md`.

## Current integration and evidence

- PR #596 is the sole ordinary implementation PR for issue #594 on branch `feat/ui-feature-status-alignment`. It is based on observed main `20d55caf4fdf2a6e8b5327d5a176949c8f5b4230`.
- The review found a concrete interface/code drift: `docs/INTERFACE_PLAN.md` defined four launch-primary destinations while `MainLayout.jsx` exposed secondary/post-launch surfaces as peers, including Brew Done It despite its explicit certification boundary.
- The current candidate restores the documented primary information architecture, adds secondary Explore navigation, adds `/features` as a feature-status surface, keeps implemented foundations linked, and renders planned/dependency-gated capabilities as informational placeholders rather than fake active controls.
- Brew Done It remains directly routed only for controlled authenticated testing; production-facing navigation and product CTAs no longer advertise it. The containment regression now enforces that boundary instead of requiring the stale primary-navigation exposure.
- Production remains READY on Vercel at merged main `20d55caf4fdf2a6e8b5327d5a176949c8f5b4230`. PR #596 requires its own latest-head validation, browser/accessibility and preview/deployment evidence before merge.

Detailed implementation history belongs in commits, PRs and `docs/RELEASE_TRACKING.md`.

## Scoped blockers

| Issue | Remaining boundary | Safe continuation |
|---|---|---|
| #165 | Provider-supported migration/backfill, uniqueness, backup/restore and exact approval package | Reversible evidence preparation; no schema mutation or reconciliation enablement |
| #577 | Protected preview POST probe plus supported password/OTP/JWT session credentials | Read-only credential preflight; no secrets in evidence |

Both issues were freshly confirmed open. No owner decision is requested before the exact irreversible migration package is ready.

## Next dependency-correct work

1. Complete canonical validation, browser/accessibility evidence and Vercel preview inspection for PR #596; fix genuine failures and integrate only on sufficient latest-head evidence.
2. After #596 integration, resume the preserved rating-read deferred-state/provider 502 diagnosis with read-only evidence first.
3. Prepare #165 migration evidence within the reversible boundary. Once deployed and verified, continue #144 backend certification, backend-dependent #154 catalogue certification and launch verification.
4. Continue #577 credential certification when its execution/session prerequisites are available.
5. Continue bounded provider-independent #449 work or evidence-grounded #429 cleanup where useful.

## Deferred capability boundaries

- #449: catalogue proposals preserve canonical producer/style relationships; relationship-backed cellar fields wait for verified lookup/ownership APIs.
- Producer Stage E: verified geography, historical lifecycle and managed-business/venue attribution depend on #444/#437/#399; no fabricated relationships.
- Brew Done It: launch-excluded, policy-disabled until its own provider/cardinality/privacy/recovery certification and governed enablement. It does not block beer-first launch work.
- Persistent profile writes remain unavailable; current reads are session-backed.


## Project source-control limitation

Project Master's `MASTER_SOURCE_MANIFEST.md` is the active master authority index. The current Pourfolio ChatGPT Project attachment surface still exposes five superseded/historical policy inputs: `GitHub-Codex_Software_Delivery_Operating_Standard.md`, three `Update PR lifecycle standard.txt` attachments, and `Pourfolio Backend Values.txt`. They are explicitly non-authoritative.

The available agent file controls cannot attach/detach Project sources. The exact remaining Project UI housekeeping is: remove those five files from active Pourfolio Project Sources and add/retain the canonical master standards indexed by `MASTER_SOURCE_MANIFEST.md`. Keep the beer/backend CSV/XLSX/SQL sources as evidence/data sources. This is not a repository release blocker.

## Validation limitations

Source validation does not prove application writes. The isolated connected audit proves the current provider read contract: `bonus_attribute_id` is present on all 1,733 examined rating mapping rows and the stale plural field is absent. A separate bounded application write/read verification is still required before calling the corrected write path APPLICATION VERIFIED. The current next defect is the independent `personal_history_projection` provider 502.
