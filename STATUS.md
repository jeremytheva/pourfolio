---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Frontend source hardening continues while backend/provider work is deferred"
gate: Integration
execution_state: VALIDATING
current_work:
  objective: "Restore meaningful keyboard focus context after client-side route navigation without overriding destination-specific focus."
  issue: 323
  pr: 324
  branch: fix/spa-route-focus-context
next_actions:
  - "Run exact-head canonical source validation and browser/accessibility evidence for #324."
  - "Verify a READY Vercel preview with exact #324 SHA provenance and Node runtime metadata."
  - "Repair any substantive finding in the same PR, then advance lifecycle state when evidence is sufficient."
  - "Squash-merge #324 when Mergeable, then verify the resulting exact-main production deployment/runtime evidence."
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
  ci: PENDING
  runtime: VERIFIED
last_verified_commit: "e453e523f1ad77312a00b975e63f85d908298279"
last_updated: "2026-09-04T00:04:00+10:00"
---

# STATUS.md

Last materially reviewed: 4 September 2026

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

PR **#322** is squash-merged as exact current `main` **e453e523f1ad77312a00b975e63f85d908298279**. Its authentication mode-switch correction restores focus to **Name** after choosing create-account mode and **Email** after returning to sign-in, without adding mount-time autofocus or disturbing OTP/error focus handling.

Vercel production deployment **dpl_Gu6aaDv7BoPWX9W5USCs1ZDNaKpc** is READY for exact current `main` `e453e523...`, with matching GitHub `main` provenance, verified commit metadata and Node lambda runtime metadata. Issues **#224** and **#249** remain complete and outside the active blocker chain.

Issue **#323** / PR **#324** / branch **`fix/spa-route-focus-context`** is the active independent accessibility slice. The application shell already announces SPA route labels and exposes a skip link, but client-side navigation could leave keyboard/screen-reader focus on a navigation control that becomes stale or disappears after the destination renders. The implementation makes the main landmark programmatically focusable and focuses it only after a pathname change when the destination has not already placed focus inside main content. Initial/direct loads do not receive forced focus, and Search retains its intentional search-field focus. Focused Playwright coverage exercises both behaviours while preserving route announcements and `aria-current` semantics.

## Deployment/runtime state

Exact current `main` **e453e523f1ad77312a00b975e63f85d908298279** is production READY via **dpl_Gu6aaDv7BoPWX9W5USCs1ZDNaKpc** with matching GitHub provenance and Node runtime metadata. This supersedes the previous exact-main deployment evidence. #224/#249 remain completed; no contradictory runtime or provenance evidence is known.

PR #324 requires fresh exact-head preview/runtime evidence before merge because it changes browser interaction behaviour.

## Deferred backend/provider work

Preserved and intentionally paused:

- **#225** — NoCodeBackend generated-data authorisation;
- **#165** — rating idempotency/schema migration and connected verification;
- **#144** — canonical backend/import/recovery certification;
- backend-dependent portions of **#154** — connected catalogue/provider certification.

These do not block independent frontend/governance work.

## Validation posture

`npm run platform:validate` remains the canonical source-validation entry point. Browser-facing changes require applicable Playwright/accessibility evidence. GitHub Actions, CodeQL and Dependency Review are supporting diagnostic evidence rather than independent merge gates; real defects they expose remain actionable.

The #323/#324 implementation is coherent and published, but its final exact head requires fresh canonical source/browser validation and exact-head Vercel preview evidence after this durable status update. No provider, schema, migration, backend authority, dependency or launch-route scope changes are part of this slice.

## Next dependency-correct work

1. Inspect exact-head canonical source/browser and diagnostic results for #324; repair any substantive finding in the same PR.
2. Verify a READY exact-head Vercel preview with matching PR/SHA provenance and Node runtime metadata.
3. Advance #324 through Ready/Mergeable and squash-merge when the project-owned merge condition is satisfied.
4. Verify the resulting exact-main production deployment/runtime evidence; keep #224/#249 complete unless contradictory evidence appears.
5. Continue independent launch-scope frontend/accessibility work only where a concrete defect is evidenced.
6. Resume provider/schema work only after explicit product-owner resumption.

## Completion rule

Do not mark Phase 3 or Pourfolio complete from frontend/source/governance validation alone. Final completion still requires relevant connected catalogue/provider evidence, data-integrity work, deployment/runtime provenance, governance controls and release verification after deferred backend work resumes.
