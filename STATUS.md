---
project: Pourfolio
portfolio_state: ACTIVE
execution_slot: INTEGRATING
phase: "Phase 3 — Beer discovery dependable"
stage: "UI and roadmap truthfulness alignment"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Align the production UI with implemented capabilities and the approved roadmap, using truthful placeholders for planned or contained features."
  issue: 593
  pr: 595
  branch: feat/ui-feature-plan-alignment
next_actions:
  - "Validate and integrate PR #595 against the latest intended head, then reconcile merged/deployed state."
  - "Resume the preserved fix/rating-read-deferred-state-compatibility branch for the connected personal_history_projection 502; do not mix it into governance work."
  - "Complete the protected #577 credential probe when authenticated POST execution and supported account-session credentials are available."
  - "Keep #165 at the irreversible provider boundary until its migration approval package is complete."
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
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: UNVERIFIED
last_verified_commit: "39d33df65c2f4bd1d2e1e4e5c8811d28e1e6b2e3"
last_updated: "2026-10-06T11:55:00+11:00"
---


# STATUS.md

Last materially reviewed: 6 October 2026

## AI execution gate

**Gate:** Integration. **State:** VALIDATING PR #595. The current change aligns production navigation and user-facing feature states with the implemented application and approved roadmap: active capabilities remain interactive, planned capabilities are labelled placeholders, and contained Brew Done It play is not exposed as a live action.

## Autonomous continuation support

Continue dependency-correct work from current repository and live GitHub evidence. Scoped blockers #165 and #577 do not prevent independent launch work. Do not enable `/ratings/reconcile` before the governed #165 provider migration and certification.

Owner response standard: Done / Next / You. Operating rules live in `AGENTS.md` and `PR_LIFECYCLE_STANDARD.md`.

## Current integration and evidence

- PR #595 is the sole ordinary implementation PR at inspection. It tracks issue #593 and keeps the partial `fix/rating-read-deferred-state-compatibility` branch preserved outside this UI slice until it receives its own coherent PR/evidence.
- Current observed `main`: `20d55caf4fdf2a6e8b5327d5a176949c8f5b4230` after #592. Production deployment `dpl_2W7G35SWgVc94zAycAPRaqBcjLrw` is READY for that main revision. PR #595 has a READY Vercel preview at head `78c8d84b4ffc8c412976354827386600a45e1dee`; canonical PR validation must still complete against the final head before merge.
- Production deployment `dpl_FkJALvLbcgZ2afkvqJykG1HB1e6x` is READY on merged main `f6388c0cb9f3354d2b5a2146b0bff097fe1da251`. Connected read-only staging-release evidence examined 1,733 `bonus_attribute_rating_mapping` rows, 82 bonus attributes and 620 ratings: all mapping rows used `bonus_attribute_id`, zero used `bonus_attributes_id`, and all checked relationships were valid. This is PROVIDER VERIFIED field-shape evidence. The broader rating integrity audit separately encountered a provider 502 during `personal_history_projection`.
- Provider access/credential-rotation incidents #224/#225/#381/#382 are resolved on retained evidence. `docs/evidence/github-issue-state.json`, captured from connected GitHub inspection on 5 October 2026, records #224 and #225 closed. Offline repository validation must not describe that retained snapshot as fresh live GitHub state.
- The nine-variable NoCodeBackend contract is in `contracts/pourfolio-data-contract.json` and `.env.example`. User/admin Secret Keys are database credentials, not login passwords.
- Repository source validation checks the project documentation structure and configuration available in the repository. Live GitHub/provider state remains external evidence and must not be inferred from offline documentation checks.

Detailed implementation history belongs in commits, PRs and `docs/RELEASE_TRACKING.md`. Legacy proxy removal is already integrated through #580/#582; it is no longer a next task.

## Scoped blockers

| Issue | Remaining boundary | Safe continuation |
|---|---|---|
| #165 | Provider-supported migration/backfill, uniqueness, backup/restore and exact approval package | Reversible evidence preparation; no schema mutation or reconciliation enablement |
| #577 | Protected preview POST probe plus supported password/OTP/JWT session credentials | Read-only credential preflight; no secrets in evidence |

Both issues were freshly confirmed open. No owner decision is requested before the exact irreversible migration package is ready.

## Next dependency-correct work

1. Validate and merge PR #595, then resume the preserved `fix/rating-read-deferred-state-compatibility` branch and diagnose the connected `personal_history_projection` provider 502 using read-only evidence first.
2. Prepare #165 migration evidence within the reversible boundary. Once deployed and verified, continue #144 backend certification, backend-dependent #154 catalogue certification and launch verification.
3. Continue #577 credential certification when its execution/session prerequisites are available.
4. Continue bounded provider-independent #449 work or evidence-grounded #429 cleanup where useful; do not invent cleanup or re-delete removed proxies.

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
