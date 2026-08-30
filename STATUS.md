# STATUS.md

Last materially reviewed: 31 August 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Current objective

Continue launch-scope frontend quality, interaction and accessibility hardening while provider/runtime certification remains dependent on external evidence.

## Overall status

**Active implementation; not production-ready.**

Repository-side launch architecture and validation are strong. Frontend source hardening can continue independently. Provider/data migration and connected certification remain unresolved and must not be inferred from source validation.

## AI execution gate

**Current gate:** VALIDATION / frontend source quality  
**Gate state:** PR #258 VALIDATING  
**Active frontend PR:** #258 / `frontend/catalogue-pagination-focus`  
**Substantive implementation head:** `105d2702c7070d5e0c40cf73dbb7d3832a0fe9a7`  
**Outcome:** preserve keyboard focus after catalogue pagination by focusing the refreshed Product results region without stealing focus during initial load or search debounce.

The live governance policy was revised on 30 August 2026: #143 is governance hardening rather than a blanket merge blocker, and CI status is diagnostic evidence rather than an automatic merge gate. Real defects exposed by validation remain blockers.

## Completed recently

Frontend launch-flow hardening merged on `main` includes:

- catalogue search/results accessibility and loading/error semantics — PR #232;
- structured rating guidance, busy state and focused failure recovery — PR #234;
- cellar/profile owner-scoped mutation feedback and keyboard semantics — PR #236;
- product details → Add to cellar disclosure, save state and error recovery — PR #238;
- authentication UI selected-method, busy-state and focused-error semantics — PR #240.

Validated open frontend work currently includes PRs #251–#257. They remain separate from `main` and must be reconciled before integration rather than treated as merged evidence.

PR #257's validated head `62f2778e911ac0b3d440d2ec2b789a200e2124c4` passed Pull request validation run `33316181829` and CodeQL run `33316181841`; Vercel preview `dpl_7NauSVBp5sJDCKzmsPNF43oRy9PD` is READY on that exact SHA. Its Draft → Ready transition was retried on 31 August 2026 and remains blocked solely by the connected GitHub mutation querying unsupported `Repository.fullDatabaseId`.

PR #247 contains the current PR-lifecycle/autonomous-continuation governance update. Its project-owned merge conditions are satisfied, but GitHub still reports it Draft for the same connector defect.

## In progress

- PR #258 corrects catalogue pagination focus loss on current `main`.
- Activating Previous/Next records that the load was pagination-initiated; after the requested page renders, focus moves to the persistent `Product results` heading.
- Initial catalogue load and search debounce do not trigger the pagination focus behaviour.
- Focused Playwright coverage verifies Next page → page-two products → Product results heading focused.
- Hosted exact-head validation, Browser/accessibility and CodeQL evidence for PR #258 is pending/currently authoritative in GitHub.

This STATUS update records the material handoff state. Its own hosted check state should be read directly from GitHub and is not recursively copied back into STATUS after every evidence-only commit.

## Blocked / deferred

### Provider/runtime work

Preserve existing authoritative work without speculative advancement when connected evidence is unavailable:

- #225 — NoCodeBackend production data authorisation;
- #165 — real rating idempotency/schema migration and connected verification;
- #144 — canonical backend/import/recovery certification;
- backend-dependent parts of #154 — catalogue remediation/provider reconciliation and connected certification.

### Repository lifecycle tooling

The connected GitHub Draft → Ready mutation currently fails because it queries unsupported `Repository.fullDatabaseId`. GitHub also rejects merge while a PR remains Draft. Do not fabricate Ready state or bypass the Draft boundary.

Issue #143 remains open P1 governance hardening but is not a blanket blocker for otherwise mergeable implementation PRs under its current issue policy.

## Known constraints

- Production/backend readiness must not be inferred from source tests or Vercel READY metadata alone.
- Open validated PRs must be reconciled against current `main` before merge when their branches overlap.
- CI is diagnostic evidence; underlying defects discovered by CI remain real blockers.
- The Draft → Ready connector defect currently blocks the normal GitHub integration transition for otherwise project-mergeable PRs.

## Provider / deployment status

Provider and deployment evidence must be reverified when used for a release claim. Existing exact-main Vercel deployment evidence does not by itself certify protected runtime payloads, provider authorisation or migrations.

## Next dependency-correct work

1. Complete exact-head hosted validation for PR #258 and repair any substantive defect it exposes.
2. Preserve #258 as project-mergeable but GitHub-Draft-blocked if validation exposes no underlying defect.
3. Continue only independent, non-overlapping launch-scope frontend hardening from current `main`; do not stack on open frontend PRs merely to work around the lifecycle connector defect.
4. When Draft → Ready becomes operable, advance and integrate governance PR #247 first, then reconcile dependent open PRs against the new `main` before merge.
5. Resume provider/runtime certification only when the required connected evidence is available.

## Completion rule

Do not mark Phase 3 or the project complete because frontend source hardening passes. Completion still requires the applicable catalogue, provider/runtime, migration, security/governance and release evidence at the relevant completion gate.
