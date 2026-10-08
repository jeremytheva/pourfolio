---
project: Pourfolio
portfolio_state: READY
execution_slot: VERIFYING
phase: "Phase 3 — Beer discovery dependable"
stage: "Dependency-correct launch continuation"
gate: Release
execution_state: READY
current_work:
  objective: "Certify deployed deletion recovery, exact owner/shared-profile links and historical breakdowns with eligible fixtures; complete the separate #165/#503 provider evidence before dependent features."
  issue: 422
  pr: null
  branch: null
next_actions:
  - "Retest the repaired production flows with an eligible completed-owner fixture and an opted-in distinct public author; keep unavailable connected rows pending."
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
    detail: "Provider-level user/admin session and authorisation certification remains pending. Database Secret Keys cannot be treated as login passwords; protected application release-account sessions are a separate evidence scope."
requires_owner_decision: false
owner_decision:
  question: null
  recommendation: null
wip:
  open_implementation_prs: 0
  dependent_stack_depth: 0
  max_open_implementation_prs: 3
  max_dependent_stack_depth: 2
evidence:
  observed_main_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
  current_candidate_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
  latest_validated_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
  latest_deployed_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
  latest_runtime_verified_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
  latest_browser_verified_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "217ee25aa864aeed30d0155d8a826ed330606f24"
last_updated: "2026-10-08T09:01:00Z"
---

# STATUS.md

Last materially reviewed: 8 October 2026

## AI execution gate

**Gate:** Release. **State:** READY for controlled evidence preparation.
PR #631 is merged as `217ee25aa864aeed30d0155d8a826ed330606f24` and production
`dpl_BD7imVDZ1w5PfKgCpV5oUSoo8MMF` is READY. Public health returned HTTP 200
with that exact production SHA and configured authentication/data/rate limiter.
The repair adds bounded deletion read-back, paged parent-filtered and locally
owner-checked child cleanup, exact opted-in author links and collapsed lazy
historical breakdowns. Managed submissions with missing/invalid workflow versions
fail closed; the historical physical-CRUD compatibility path is restricted to
unmanaged completed rows. No provider migration, bulk backfill or historical
reconciliation was enabled, and automation did not delete any live user rating.

Exact pre-merge `d1e02154554e06cc6e39d8b7beede1c5b417ad0c` passed canonical
Node 22 validation (736 passed, 15 gated skips) and all 140 browser/accessibility
cases in run `37752745047`, plus Dependency Review and CodeQL. Exact preview
health matched its SHA; the new read endpoints returned 401 without an application
session. Exact-production run `37753190379` passed the same canonical source
gate (job `113231196103`, 736 passed / 15 gated skips) and 140 browser cases
(job `113231195850`). Connected run `37753349432` (job `113231746208`) passed
12 baseline checks with four explicit skips and zero failures; write confirmation
was empty and always-run session cleanup succeeded. Both private-history
owner/exact-entry/retry/reload and other-account cases skipped, as did the guarded
rating-create/delete and cellar/cross-account write cases. Those rows remain
pending, including live retest of the failed deletion and new shared breakdown.
The prior connected run `37742072557` also skipped these required rows.
A green workflow or mocked browser pass cannot close those rows or the
separate #165/#503 create/retry/delete/cross-account/race certification.

The owner's manual deletion on the older `2bfe93befc98196143714e66d5e10d37f68ef302`
deployment FAILED and remains failure evidence (correlation
`cef24bbc-91e7-4633-8214-ee174aaf5467`). Retesting must use the current public app,
not the immutable older deployment URL visible in the screenshots. Follow
`docs/nocodebackend/rating-workflow-certification.md` for live acceptance.

## Autonomous continuation support

Continue dependency-correct work from current repository and live GitHub evidence.
The source/harness implementation PRs #628/#629 and failed-test repair PR #631
are merged. Two independent Dependabot PRs remain. This handoff reconciles
completed integration while retaining the pending connected rows. Scoped blockers #165 and #577
do not prevent independent work. Do not enable durable rating reconciliation
before the governed #165 provider migration and certification.

The earlier #165/#503 gateway-integrity work is preserved separately on
`fix/165-503-rating-gateway-integrity` and has not been published or integrated.
Its latest focused mock checks passed 51 individual assertions on Node 24;
canonical latest-head validation and controlled connected create/retry/delete/
cross-account certification remain outstanding. Reconcile its preserved deletion
patch with #631 before resuming; the integrated compatibility/read-back repair does
not certify the separate concurrency/CAS changes or those live write flows.

Owner response standard: Done / Next / You. Operating rules live in `AGENTS.md` and `PR_LIFECYCLE_STANDARD.md`.

## Current integration and evidence

- PR #628 is merged as `5f111da0c62af8f7551d7e071b8ce7f9d2c4c5c8`. Production deployment `dpl_BDdwWhXQ6KaY7kEUM8HcWScJSvBX` is READY; `https://brew-buds-mobile-app-design-3577.vercel.app/api/health` returned 200, the exact production SHA and configured authentication, data and rate limiter.
- Exact-production source run `37737475423` passed canonical Node 22 validation (job `113180212139`): 708 tests passed, 15 skipped, with all composed lint, audit, build and governance/security checks passing. Browser/accessibility job `113180211792` passed all 135 tests. Exact pre-merge head `ae74b69d657c99d0f9ce95367285a42cb9a35c38` also passed run `37737126748`, Dependency Review, CodeQL and exact preview health. Local Node 24 checks were supplemental only.
- Connected production run `37737587480` on #628's merged SHA passed 12 baseline checks but failed before owner-history access due to sign-in rate limiting; the serial other-account case did not run. That superseded failed attempt is retained as failure evidence.
- PR #629 is merged as `f9ec7204d3ccab9df6eda9f1704fd085b47f57f2`. Production deployment `dpl_7yJ6cJV1ka6AVnSFShARmzuZertq` is READY and public health returned HTTP 200 with that exact SHA. Session reuse is release/origin/owner-bound, server-verified, private mode `0600`, outside artifact paths and removed by always-run cleanup. Application/auth-limit/schema/write-gate behaviour is unchanged.
- Exact #629 main run `37742009144` passed canonical Node 22 validation (job `113194640843`): 714 passed, 15 gated skips, zero failures, including six cache privacy/isolation/expiry/error tests. Browser/accessibility job `113194640536` passed 135 tests. Exact pre-merge `08c1cc860bbe20bd54e3cf3e6765b5bc6e2cdadd` passed run `37740937294`, Dependency Review, CodeQL and Preview health.
- Connected rerun [37742072557](https://github.com/jeremytheva/pourfolio/actions/runs/37742072557) at exact production `f9ec7204d3ccab9df6eda9f1704fd085b47f57f2` completed with 12 passed, four skipped, zero failed (job `113194846211`). The two new owner-history/exact-link/retry/reload and other-account-history cases did not execute to completion: no eligible existing completed-owner beer fixture was selected by the first case, and the second also explicitly skipped. Those provider rows remain pending; separate usable fixture/session evidence is required. The other two skips are the rating-create/delete and cellar CRUD/cross-account write gates. No rating/cellar writes or historical reconciliation were enabled by this read-only run.
- #509 is complete. The additive live bonus-category reconciliation was applied with the exact 95-mutation guard, zero drift was verified, and authenticated production presentation across Design, Appearance, Aroma, Mouthfeel, Flavour, Follow, Burp and Overall passed.
- #600 is complete. Authenticated `/ratings/mine` and rating-integrity evidence no longer reproduce the former `personal_history_projection` 502.
- #415 is complete. The release harness is aligned with the current beer-first UI and exact-production certification passes.
- #449's launch-safe Add Beer, Suggest Correction and Add-to-cellar initiation/review boundary is production-certified. PR #621 also removed ungoverned product-image URL creation and made the server fail closed until an approved image/provenance workflow exists. #449 remains open only for genuinely provider-gated moderation/persistence and relationship-backed capabilities.
- Persistent profile source behaviour is already implemented: owner profile create/read/update, stable server-generated `public_id`, default-private rating-history visibility and privacy-safe public projection. PR #622 is merged and reconciled the formerly stale machine contract/docs/browser fixtures.
- Brew Done It remains launch-excluded and absent from production-facing navigation/CTAs. Its protected direct route remains for controlled testing only.

- PR #631 merged the failed-delete, exact author-link and historical-breakdown repairs. Pre-merge run `37752745047` and exact-production run `37753190379` passed 736 source tests (15 gated skips) and 140 browser/accessibility cases. The first candidate `dc397df90e57062a489581309ca29700c56b5b97` passed source checks but failed one invalid public browser fixture (139 passed); that fixture was corrected without weakening the public allowlist, and a malformed-terminal-version guard was added before the successful rerun. Automated Codex review was unavailable due to its usage limit; manual source review found no unresolved material issues. Production `217ee25aa864aeed30d0155d8a826ed330606f24` deployed as `dpl_BD7imVDZ1w5PfKgCpV5oUSoo8MMF` with matching public health. Read-only connected run [37753349432](https://github.com/jeremytheva/pourfolio/actions/runs/37753349432) passed 12 baseline cases, skipped four required history/write cases and reported zero failures. Always-run session cleanup succeeded; no rating/cellar writes were enabled. The old manual deletion failure and unexecuted controlled provider rows remain separate from this source/runtime evidence.

Detailed implementation history belongs in commits, PRs and `docs/RELEASE_TRACKING.md`.

## Scoped blockers

| Issue | Remaining boundary | Safe continuation |
|---|---|---|
| #165 | Provider-supported migration/backfill, uniqueness, backup/restore and exact approval package | Reversible evidence preparation only; no irreversible schema mutation or reconciliation enablement |
| #577 | Supported two-account session credentials and protected certification execution | Read-only/preflight work only; never reinterpret database Secret Keys as login passwords |

Neither scoped blocker prevents independent launch work. No owner decision is currently required.

## Next dependency-correct work

1. Review the exact-production connected run and use the step-by-step guide with an existing verified completed-owner beer fixture and distinct second-account session; rerun the skipped owner/exact-link/retry/reload/other-account read checks. Keep unexecuted rows pending, and do not create production fixtures to bypass the write gate.
2. Resume #165/#503 gateway certification within the reversible boundary. The preserved gateway changes still require canonical latest-head and connected write evidence; do not cross the irreversible provider boundary or claim those flows complete.
3. Continue #422 with bounded connected profile evidence, keeping unsupported provider uniqueness/default-private creation or destructive rows explicitly pending.
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
