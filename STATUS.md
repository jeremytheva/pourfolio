---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend source hardening continues while backend/provider work is deferred"
gate: Change
execution_state: IMPLEMENTING
current_work:
  objective: "Restore keyboard focus to the first relevant authentication field after switching between sign-in and create-account modes."
  issue: 321
  pr: null
  branch: fix/auth-mode-focus-handoff
next_actions:
  - "Publish the authentication mode-focus slice as a normal non-draft PR linked to #321."
  - "Run exact-head canonical source validation and applicable browser/accessibility evidence."
  - "Verify applicable Vercel preview/runtime evidence and repair any substantive finding in the same PR."
  - "Advance lifecycle state and merge when the project-owned merge condition is satisfied."
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
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: NOT_RUN
  runtime: VERIFIED
last_verified_commit: "508a0b00bd8da1188d9de67e1a6c599ec4add2e1"
last_updated: "2026-09-03T22:06:00+10:00"
---

# STATUS.md

Last materially reviewed: 3 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Overall status

**Active implementation; not production-ready.** Independent launch-scope frontend and governance work can continue. Backend/provider implementation remains explicitly deferred.

## AI execution gate

**Current gate:** Change / frontend accessibility  
**Execution state:** Implementing  
**Release state:** Not certified.

## Autonomous continuation support

The repository is the authoritative handoff. Continue the highest-priority dependency-correct work independent of deferred provider/schema capability. Use normal non-draft PRs, explicit lifecycle metadata, canonical project-owned validation and applicable browser/deployment evidence. Treat GitHub Actions as diagnostic evidence while repairing real defects they expose.

## Current implementation focus

PR **#320** is squash-merged as exact current `main` **910b1e72c0198e470d647710c20569b13bfe3d66**. Its OTP correction moves focus directly to **One-time passcode** after a successful OTP request while preserving focused authentication-error behaviour.

Vercel has not yet emitted an exact-main production deployment for `910b1e72...`. The last fully verified READY exact-main production/runtime evidence is **508a0b00bd8da1188d9de67e1a6c599ec4add2e1** via deployment **dpl_4NX5geVPEeWFmzzNaaYNMPqN4VFQ**, with matching GitHub provenance and Node runtime metadata. Issues **#224** and **#249** remain complete and outside the active blocker chain.

Issue **#321** / branch **`fix/auth-mode-focus-handoff`** is the active independent accessibility slice. `AuthForm.jsx` previously left focus on the mode-toggle control after switching forms even though the newly relevant first field appears above that control. The implementation records a user-initiated mode switch and, after the new mode renders, focuses **Name** for create-account mode or **Email** for sign-in mode without adding mount-time autofocus. Focused Playwright coverage exercises both directions. Existing OTP and authentication-error focus handling is unchanged.

## Deployment/runtime state

Exact current `main` **910b1e72c0198e470d647710c20569b13bfe3d66** does not yet have verified exact-main production evidence in the current Vercel deployment inventory. Do not substitute the READY #320 preview (`18feca4556384e7245cf421829721719ce1f933a`) for exact-main production evidence. The previous exact-main READY/runtime evidence for `508a0b00...` remains the verified baseline until a newer exact-main deployment is observed.

## Deferred backend/provider work

Preserved and intentionally paused:

- **#225** — NoCodeBackend generated-data authorisation;
- **#165** — rating idempotency/schema migration and connected verification;
- **#144** — canonical backend/import/recovery certification;
- backend-dependent portions of **#154** — connected catalogue/provider certification.

These do not block independent frontend/governance work.

## Validation posture

`npm run platform:validate` remains the canonical source-validation entry point. Browser-facing changes require applicable Playwright/accessibility evidence. GitHub Actions, CodeQL and Dependency Review are supporting diagnostic evidence rather than independent merge gates; real defects they expose remain actionable.

The #321 implementation requires fresh exact-head source/browser validation after publication. No provider, schema, migration or backend change is part of this slice.

## Next dependency-correct work

1. Publish the #321 authentication mode-focus implementation as a normal non-draft PR and inspect exact-head canonical/browser evidence.
2. Repair any substantive finding in the same PR and verify applicable Vercel preview/runtime evidence.
3. Advance the PR through Ready/Mergeable and squash-merge when evidence is sufficient.
4. Recheck exact-main `910b1e72...` production readiness and Node runtime evidence; keep #224/#249 complete unless contradictory evidence appears.
5. Continue independent launch-scope frontend/accessibility work only where a concrete defect is evidenced.
6. Resume provider/schema work only after explicit product-owner resumption.

## Completion rule

Do not mark Phase 3 or Pourfolio complete from frontend/source/governance validation alone. Final completion still requires relevant connected catalogue/provider evidence, data-integrity work, deployment/runtime provenance, governance controls and release verification after deferred backend work resumes.
