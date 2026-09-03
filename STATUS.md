---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend source hardening continues while backend/provider work is deferred"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Restore keyboard focus to the first relevant authentication field after switching between sign-in and create-account modes."
  issue: 321
  pr: 322
  branch: fix/auth-mode-focus-handoff
next_actions:
  - "Validate the refreshed exact #322 head with the canonical project-owned source/browser process."
  - "Verify a READY Vercel preview for the refreshed exact #322 head now that deployment capacity is accepting new previews again."
  - "Remove the deployment-blocked overlay, advance #322 to Mergeable and squash-merge when exact-head evidence is sufficient."
  - "Verify the resulting exact-main production deployment and Node runtime evidence, then continue the next concrete independent launch-scope defect."
blockers:
  - scope: provider_connected_work
    issue: 225
    detail: "Deferred by product-owner instruction; does not block independent frontend/governance work."
  - scope: rating_reconciliation
    issue: 165
    detail: "Deferred with backend/provider work; deployed schema evidence remains required before reconciliation can be enabled."
  - scope: backend_certification
    issue: 144
    detail: "Deferred until backend/provider work resumes and connected evidence is available."
requires_owner_decision: false
owner_decision:
  question: null
  options: []
  recommendation: null
validation:
  governance: PASS
  lint: PENDING
  typecheck: NOT_APPLICABLE
  tests: PENDING
  build: PENDING
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "508a0b00bd8da1188d9de67e1a6c599ec4add2e1"
last_updated: "2026-09-03T23:10:00+10:00"
---

# STATUS.md

Last materially reviewed: 3 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Overall status

**Active validation; not production-ready.** Independent launch-scope frontend and governance work can continue. Backend/provider implementation remains explicitly deferred.

## AI execution gate

**Current gate:** Integration / frontend accessibility  
**Execution state:** Validating  
**Release state:** Not certified.

## Autonomous continuation support

The repository is the authoritative handoff. Continue the highest-priority dependency-correct work independent of deferred provider/schema capability. Use normal non-draft PRs, explicit lifecycle metadata, canonical project-owned validation and applicable browser/deployment evidence. Treat GitHub Actions as diagnostic evidence while repairing real defects they expose.

## Current implementation focus

PR **#320** is squash-merged as exact current `main` **910b1e72c0198e470d647710c20569b13bfe3d66**. Its OTP correction moves focus directly to **One-time passcode** after a successful OTP request while preserving focused authentication-error behaviour.

Issue **#321** / PR **#322** / branch **`fix/auth-mode-focus-handoff`** is the active independent accessibility slice. `AuthForm.jsx` previously left focus on the mode-toggle control after switching forms even though the newly relevant first field appears above that control. The implementation records a user-initiated mode switch and, after the new mode renders, focuses **Name** for create-account mode or **Email** for sign-in mode without adding mount-time autofocus. Focused Playwright coverage exercises both directions. Existing OTP and authentication-error focus handling is unchanged.

The previous exact #322 head **b72e25b2453c00dad5df7fa559ce289354207308** passed canonical `npm run platform:validate`, Browser and accessibility, Dependency Review and CodeQL evidence, was conflict-free at GitHub and had no unresolved review threads. Its Vercel deployment was rejected only because the Hobby project had exceeded the daily deployment allowance. Vercel is now accepting new #322 previews again: READY previews exist for preceding implementation/test heads **1abd614...** and **766516a...**, both with Node runtime metadata. The refreshed STATUS commit intentionally creates a new exact head, so exact-head validation and deployment evidence must be re-established before Mergeable.

## Deployment/runtime state

Exact current `main` **910b1e72c0198e470d647710c20569b13bfe3d66** still does not have verified exact-main production evidence in the current Vercel deployment inventory. Do not substitute the READY #320 preview (`18feca4556384e7245cf421829721719ce1f933a`) for exact-main production evidence. The last fully verified READY exact-main production/runtime evidence remains **508a0b00bd8da1188d9de67e1a6c599ec4add2e1** via deployment **dpl_4NX5geVPEeWFmzzNaaYNMPqN4VFQ**, with matching GitHub provenance and Node runtime metadata. Issues **#224** and **#249** remain complete and outside the active blocker chain.

For #322, the prior quota blocker is no longer assumed active merely because the earlier exact-head attempt failed. The current requirement is fresh exact-head preview evidence for the refreshed PR head; retain `pr:blocked` until that evidence exists, then remove the overlay rather than treating the historical quota error as a continuing blocker.

## Deferred backend/provider work

Preserved and intentionally paused:

- **#225** — NoCodeBackend generated-data authorisation;
- **#165** — rating idempotency/schema migration and connected verification;
- **#144** — canonical backend/import/recovery certification;
- backend-dependent portions of **#154** — connected catalogue/provider certification.

These do not block independent frontend/governance work.

## Validation posture

`npm run platform:validate` remains the canonical source-validation entry point. Browser-facing changes require applicable Playwright/accessibility evidence. GitHub Actions, CodeQL and Dependency Review are supporting diagnostic evidence rather than independent merge gates; real defects they expose remain actionable.

The implementation itself passed the full applicable evidence on the preceding exact head. Because this durable status reconciliation creates a new PR head, canonical/exact-head evidence is PENDING again until the refreshed head completes validation. No provider, schema, migration or backend change is part of this slice.

## Next dependency-correct work

1. Inspect canonical source/browser and diagnostic CI results for the refreshed exact #322 head; repair any substantive finding in the same PR.
2. Confirm a READY Vercel preview for that exact head with matching PR/SHA provenance and Node runtime metadata.
3. Remove `pr:blocked`, advance #322 to `pr:mergeable` and squash-merge when evidence is sufficient.
4. Verify the resulting exact-main production deployment and Node runtime evidence; keep #224/#249 complete unless contradictory evidence appears.
5. Continue independent launch-scope frontend/accessibility work only where a concrete defect is evidenced.
6. Resume provider/schema work only after explicit product-owner resumption.

## Completion rule

Do not mark Phase 3 or Pourfolio complete from frontend/source/governance validation alone. Final completion still requires relevant connected catalogue/provider evidence, data-integrity work, deployment/runtime provenance, governance controls and release verification after deferred backend work resumes.
