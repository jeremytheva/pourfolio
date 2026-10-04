---
project: Pourfolio
portfolio_state: ACTIVE
execution_slot: INTEGRATING
phase: "Phase 3 — Beer discovery dependable"
stage: "Live provider rating bonus contract correction"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Align the rating bonus relationship contract to the live NoCodeBackend API field bonus_attribute_id in PR #589."
  issue: null
  pr: 589
  branch: fix/connected-rating-bonus-verification
next_actions:
  - "Validate and integrate PR #589, then rerun the read-only connected bonus mapping audit on the exact final candidate."
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
  observed_main_commit: "1fdf29092bb988a119779cdd2e3123d5bb0bcf41"
  current_candidate_commit: null
  latest_validated_commit: "728c9ee806fd376d8a8bb83e1ef624852d8ff8e0"
  latest_deployed_commit: "49804a82cd7ef4f90689900a14e6d3956929e891"
  latest_runtime_verified_commit: "cb5b3a996d7ea1c17babe0945830b9717e488dfa"
  latest_browser_verified_commit: "728c9ee806fd376d8a8bb83e1ef624852d8ff8e0"
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: UNVERIFIED
last_verified_commit: "728c9ee806fd376d8a8bb83e1ef624852d8ff8e0"
last_updated: "2026-10-04T13:05:00+00:00"
---


# STATUS.md

Last materially reviewed: 4 October 2026

## AI execution gate

**Gate:** Integration. **State:** VALIDATING PR #589. Connected read-only verification disproved the Phase C plural-field assumption: all 1,733 live rating bonus mapping rows expose `bonus_attribute_id`, and none expose `bonus_attributes_id`. PR #589 aligns application code, contracts, documentation and #165 target artifacts to that live provider state without mutating provider schema or data.

## Autonomous continuation support

Continue dependency-correct work from current repository and live GitHub evidence. Scoped blockers #165 and #577 do not prevent independent launch work. Do not enable `/ratings/reconcile` before the governed #165 provider migration and certification.

Owner response standard: Done / Next / You. Operating rules live in `AGENTS.md` and `PR_LIFECYCLE_STANDARD.md`.

## Current integration and evidence

- PR #589 is the sole ordinary implementation PR at inspection. It corrects the live provider field drift discovered after PR #586. Phase A lifecycle-write safety remains independently merged in PR #587.
- Current observed `main`: `1fdf29092bb988a119779cdd2e3123d5bb0bcf41` after the post-Phase-C status reconciliation. PR #589 is validating the correction against the current live provider API.
- Connected read-only staging-release evidence on 4 October 2026 examined 1,733 `bonus_attribute_rating_mapping` rows, 82 bonus attributes and 620 ratings: all mapping rows used `bonus_attribute_id`, zero used `bonus_attributes_id`, and all checked relationships were valid. This is PROVIDER VERIFIED field-shape evidence, not application-write verification. The broader rating integrity audit separately encountered a provider 502 during `personal_history_projection`.
- Provider access/credential-rotation incidents #224/#225/#381/#382 are resolved on retained evidence. GitHub freshly confirms #224 and #225 closed. Do not treat them as current blockers or infer new-candidate deployment from their historical evidence.
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

1. Validate and integrate PR #589, then rerun the isolated read-only bonus mapping audit on the exact final candidate. Treat the field shape as PROVIDER VERIFIED only; application-write verification remains separate.
2. Prepare #165 migration evidence within the reversible boundary. Once deployed and verified, continue #144 backend certification, backend-dependent #154 catalogue certification and launch verification.
3. Continue #577 credential certification when its execution/session prerequisites are available.
4. Continue bounded provider-independent #449 work or evidence-grounded #429 cleanup where useful; do not invent cleanup or re-delete removed proxies.

## Deferred capability boundaries

- #449: catalogue proposals preserve canonical producer/style relationships; relationship-backed cellar fields wait for verified lookup/ownership APIs.
- Producer Stage E: verified geography, historical lifecycle and managed-business/venue attribution depend on #444/#437/#399; no fabricated relationships.
- Brew Done It: launch-excluded, policy-disabled until its own provider/cardinality/privacy/recovery certification and governed enablement. It does not block beer-first launch work.
- Persistent profile writes remain unavailable; current reads are session-backed.

## Validation limitations

Source validation does not prove application writes. The isolated connected audit does prove the current provider read contract: `bonus_attribute_id` is present on all 1,733 examined rating mapping rows and the stale plural field is absent. A separate bounded application write/read verification is still required before calling the corrected write path APPLICATION VERIFIED. The unrelated `personal_history_projection` provider 502 remains a separate connected-audit defect.
