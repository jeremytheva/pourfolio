# STATUS.md

Last materially reviewed: 30 August 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Current objective

Continue launch-scope frontend quality, interaction and accessibility hardening while provider/runtime certification remains dependent on external evidence.

## Overall status

**Active implementation; not production-ready.**

Repository-side launch architecture and validation are strong. Frontend source hardening can continue independently. Provider/data migration and connected certification remain unresolved and must not be inferred from source validation.

## AI execution gate

**Current gate:** INTEGRATION / frontend source quality  
**Gate state:** MERGEABLE BY PROJECT POLICY; GITHUB DRAFT TRANSITION BLOCKED  
**Active frontend PR:** #257 / `frontend/product-zero-ibu`  
**Validated implementation head:** `36c9c00244786932dd3831e14870620a7dbf9b0a`.  
**Outcome:** preserve valid `IBU = 0` on product details with focused Playwright regression coverage.

The live governance policy was revised on 30 August 2026: #143 is governance hardening rather than a blanket merge blocker, and CI status is diagnostic evidence rather than an automatic merge gate. Real defects exposed by validation remain blockers.

## Completed recently

Frontend launch-flow hardening merged on `main` includes:

- catalogue search/results accessibility and loading/error semantics — PR #232;
- structured rating guidance, busy state and focused failure recovery — PR #234;
- cellar/profile owner-scoped mutation feedback and keyboard semantics — PR #236;
- product details → Add to cellar disclosure, save state and error recovery — PR #238;
- authentication UI selected-method, busy-state and focused-error semantics — PR #240.

Validated open frontend work currently includes PRs #251–#257. They remain separate from `main` and must be reconciled before integration rather than treated as merged evidence.

PR #247 contains the current PR-lifecycle/autonomous-continuation governance update. Its project-owned merge conditions are satisfied, but GitHub still reports it Draft because the connected Draft → Ready mutation fails on unsupported GraphQL field `Repository.fullDatabaseId`.

## In progress

- PR #257 corrects product-detail `IBU = 0` rendering from a truthy fallback to a nullish fallback.
- Focused browser coverage proves the zero value remains visible.
- Pull request validation run `33308191224` passed on implementation head `36c9c00244786932dd3831e14870620a7dbf9b0a`.
- CodeQL run `33308191223` passed on the same implementation head.
- Vercel preview is READY for the PR branch.
- Draft → Ready was retried after validation and failed solely because the GitHub connector queries unsupported `Repository.fullDatabaseId`.
- A direct merge attempt was not permitted by GitHub while the PR remains Draft; no lifecycle or governance bypass was used.

This STATUS-only commit requires normal exact-head validation before #257 is treated as current-head validated.

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

1. Validate the current PR #257 STATUS-only head through the normal hosted checks.
2. Preserve #257 as project-mergeable but GitHub-Draft-blocked if those checks expose no underlying defect.
3. Do not create overlapping frontend implementation work merely to work around the lifecycle connector defect.
4. When Draft → Ready becomes operable, advance and integrate governance PR #247 first, then reconcile stacked/dependent open PRs against the new `main` before merge.
5. Resume provider/runtime certification only when the required connected evidence is available.

## Completion rule

Do not mark Phase 3 or the project complete because frontend source hardening passes. Completion still requires the applicable catalogue, provider/runtime, migration, security/governance and release evidence at the relevant completion gate.
