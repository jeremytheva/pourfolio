---
project: Pourfolio
portfolio_state: READY
execution_slot: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Dependency-correct launch continuation"
gate: Project Entry
execution_state: VALIDATING
current_work:
  objective: "Reconcile repository authority with the deployed persistent profile capability without claiming connected provider certification."
  issue: 422
  pr: 622
  branch: "fix/422-profile-contract-reconciliation"
next_actions:
  - "Validate and merge #622 if canonical, browser, security, review and deployment evidence remain satisfactory."
  - "Run bounded connected #422 profile certification where existing credentials and cleanup safeguards support it; leave unsupported rows explicitly pending."
  - "Prepare #165 migration evidence within the reversible boundary; do not cross the irreversible provider boundary without the governed approval package."
  - "Continue #577 credential certification when supported user/admin account-session credentials are available."
  - "Continue provider-gated #449 work only when backing lookup/moderation contracts become verifiable; otherwise use #429 cleanup or other independent launch work."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "Durable idempotency requires irreversible provider schema/constraint and existing-data migration work. Provider-supported migration/backfill, backup/restore proof and the governed approval package are required before mutation."
  - scope: user_admin_connected_session_certification
    issue: 577
    detail: "Current configured Secret Keys are database API credentials, not supported user/admin login credentials. Full two-account session/authorization certification waits for password/OTP/JWT account credentials or another provider-supported session mechanism."
requires_owner_decision: false
owner_decision:
  question: null
  recommendation: null
wip:
  open_implementation_prs: 1
  dependent_stack_depth: 0
  max_open_implementation_prs: 3
  max_dependent_stack_depth: 2
evidence:
  observed_main_commit: "df3bac288e0cf71042cc59e09eff56fa8f9cb816"
  current_candidate_commit: "c5f294ccb997f0a62cd411355ac83f6a3d536e69"
  latest_validated_commit: "df3bac288e0cf71042cc59e09eff56fa8f9cb816"
  latest_deployed_commit: "df3bac288e0cf71042cc59e09eff56fa8f9cb816"
  latest_runtime_verified_commit: "df3bac288e0cf71042cc59e09eff56fa8f9cb816"
  latest_browser_verified_commit: "df3bac288e0cf71042cc59e09eff56fa8f9cb816"
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "df3bac288e0cf71042cc59e09eff56fa8f9cb816"
last_updated: "2026-10-07T22:28:00+11:00"
---

# STATUS.md

Last materially reviewed: 7 October 2026

## AI execution gate

**Gate:** Project Entry. **State:** VALIDATING. PR #622 is the active bounded work item. It reconciles repository contract/document/test authority with the persistent `profiles` capability already deployed under #422. It performs no provider mutation and does not claim connected provider certification.

## Current integration and evidence

- Production is READY on `df3bac288e0cf71042cc59e09eff56fa8f9cb816` via deployment `dpl_2FH7FDxKocVkg1rrfpqAx6YHumwW`.
- Exact-production connected release run `37613255858` passed on that SHA: 12 connected browser checks passed and the two cleanup-guarded destructive-write checks remained intentionally skipped.
- #509 is complete. The additive live bonus-category reconciliation was applied with the exact 95-mutation guard, zero drift was verified, and authenticated production presentation across Design, Appearance, Aroma, Mouthfeel, Flavour, Follow, Burp and Overall passed.
- #600 is complete. Authenticated `/ratings/mine` and rating-integrity evidence no longer reproduce the former `personal_history_projection` 502.
- #415 is complete. The release harness is aligned with the current beer-first UI and exact-production certification passes.
- #449's launch-safe Add Beer, Suggest Correction and Add-to-cellar initiation/review boundary is production-certified. PR #621 also removed ungoverned product-image URL creation and made the server fail closed until an approved image/provenance workflow exists. #449 remains open only for genuinely provider-gated moderation/persistence and relationship-backed capabilities.
- Persistent profile source behaviour is already implemented: owner profile create/read/update, stable server-generated `public_id`, default-private rating-history visibility and privacy-safe public projection. PR #622 is reconciling stale machine contract/docs/browser fixtures that still described this capability as unavailable.
- Brew Done It remains launch-excluded and absent from production-facing navigation/CTAs. Its protected direct route remains for controlled testing only.

Detailed implementation history belongs in commits, PRs and `docs/RELEASE_TRACKING.md`.

## Scoped blockers

| Issue | Remaining boundary | Safe continuation |
|---|---|---|
| #165 | Provider-supported migration/backfill, uniqueness, backup/restore and exact approval package | Reversible evidence preparation only; no irreversible schema mutation or reconciliation enablement |
| #577 | Supported two-account session credentials and protected certification execution | Read-only/preflight work only; never reinterpret database Secret Keys as login passwords |

Neither scoped blocker prevents independent launch work. No owner decision is currently required.

## Next dependency-correct work

1. Finish #622 validation and merge if its exact-head evidence is satisfactory.
2. Continue #422 with bounded connected profile evidence that can be proven using current production credentials and cleanup safeguards. Keep any unsupported cross-account or destructive row explicitly pending rather than inferred.
3. Continue reversible #165 migration preparation without crossing its irreversible provider boundary.
4. Continue #577 when supported user/admin session credentials exist.
5. Use #429 or another independent launch slice if #422/#165/#577 reach external boundaries.

## Deferred capability boundaries

- #449: persisted/moderated correction proposals and relationship-backed cellar selectors remain capability-gated until their backing provider/ownership contracts are certified.
- Producer Stage E: verified geography, historical lifecycle and managed-business/venue attribution depend on #444/#437/#399; no fabricated relationships.
- Brew Done It: launch-excluded until its own provider/cardinality/privacy/recovery certification and governed enablement.
- #422: persistent profile structure/application behaviour is deployed; connected provider uniqueness/default-private, cross-owner, public/private and recovery certification remains open.

## Project source-control limitation

Project Master's `MASTER_SOURCE_MANIFEST.md` is the active master authority index. The current Pourfolio ChatGPT Project attachment surface still exposes five superseded/historical policy inputs: `GitHub-Codex_Software_Delivery_Operating_Standard.md`, three `Update PR lifecycle standard.txt` attachments, and `Pourfolio Backend Values.txt`. They are explicitly non-authoritative.

The available repository tools cannot attach/detach ChatGPT Project sources. The remaining Project UI housekeeping is to remove those five superseded files from active Pourfolio Project Sources and retain the canonical master standards indexed by `MASTER_SOURCE_MANIFEST.md`. Keep the beer/backend CSV/XLSX/SQL sources as evidence/data sources. This is not a repository release blocker.

## Validation limitations

Source and production read evidence do not by themselves prove every provider write/permission boundary. #422 must retain unsupported connected rows as pending until they are exercised against the provider with safe cleanup. #165 remains separately blocked at an irreversible schema migration boundary, and #577 remains limited by the available account-session credential contract.
