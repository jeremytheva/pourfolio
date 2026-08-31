# Pull Request Lifecycle Standard

> Canonical master standard for project-managed pull-request progression, validation, merge governance and exceptional closure

**Version 1.1 • August 2026**  
**Status: Master source**  
**Parent framework:** `AI_FIRST_PLATFORM_DEVELOPMENT_FRAMEWORK.md`  
**Operating companion:** `AI_PLATFORM_DEVELOPMENT_STANDARD.md`  
**Validation companion:** `TESTING_VALIDATION_RELEASE_STANDARD.md`  
**Documentation companion:** `PROJECT_DOCUMENTATION_STANDARD.md`  
**Provider implementation:** `PROVIDERS/GITHUB_REFERENCE_GUIDE.md`

---

## 1. Purpose

This standard defines the default pull-request lifecycle for AI-led software and platform projects.

Its purpose is to remove routine GitHub administration from the product owner while preserving traceability, project-owned validation, review discipline and safe escalation.

The project manages ordinary PR progression. GitHub provides repository state, review and automation evidence, but GitHub Actions status is not itself a mandatory merge gate.

## 2. Core principle

> **The project manages the PR lifecycle and evaluates sufficient project-owned evidence; GitHub CI is diagnostic evidence, not automatic merge authority.**

A failed, pending, unavailable, billing-blocked or runner-blocked GitHub Actions check does not by itself make a PR unmergeable. Any real code, build, security, data-integrity or release defect revealed by CI remains a material defect and must be addressed.

The product owner manages product intent and material decisions, not ordinary PR ceremony.

A successful implementation normally ends in **MERGED**. A PR should not be manually closed merely because implementation is incomplete, validation is failing, or the PR queue is untidy.

## 3. Canonical state machine

```text
DRAFT
  ↓
IMPLEMENTING
  ↓
VALIDATING
  ↓
READY FOR REVIEW
  ↓
MERGEABLE
  ↓
MERGED
```

`BLOCKED` is an overlay state that may apply to any non-terminal state.

`CLOSED WITHOUT MERGE` is a separate terminal outcome used only when the proposed work is intentionally not entering the target branch.

### 3.1 State meanings

| State | Meaning | Default project action |
|---|---|---|
| DRAFT | PR exists as the durable work container | Continue implementation |
| IMPLEMENTING | Intended scope is actively being built or remediated | Commit, test, review and integrate |
| VALIDATING | Implementation is substantially coherent and available evidence is being evaluated | Run and remediate validation |
| READY FOR REVIEW | Implementation gate passed; integration/review evidence may proceed | Resolve material review findings |
| MERGEABLE | Project-owned merge conditions are true for the latest intended commit | Merge |
| MERGED | GitHub accepted the change into the target branch | Delete source branch and continue downstream verification/status work |
| BLOCKED | A genuine dependency or material decision prevents safe progression | Keep PR open; record blocker; continue safe independent work |
| CLOSED WITHOUT MERGE | Work is intentionally excluded | Preserve useful knowledge and close with explicit reason |

## 4. Draft PR default

Create or reuse a draft PR early enough to provide a durable integration container for implementation commits, available validation evidence, AI/self review, automated/human review where useful, remediation, migration/deployment notes and implementation continuity across sessions.

Keep the PR in draft while intended implementation is materially incomplete, scope is changing substantially, known in-scope material defects remain, implementation is not coherent enough for review, or appropriate project-owned validation has not been considered.

A draft PR is the normal work-in-progress state, not a failure state.

## 5. Implementation and validation behaviour

While the PR remains open, the project should automatically manage ordinary engineering work, including continued commits, lint, type checking, tests, build, security/static analysis where configured, migration/schema validation where applicable, conflict detection, review-finding resolution and revalidation whenever the PR changes.

GitHub-hosted CI may run and should be inspected when useful, but it is non-blocking as a platform status signal.

`platform:validate` is ignored as a merge requirement while it contains no substantive validation steps. It may remain present for future implementation, but a failure caused solely by its empty/non-functional state must not block Ready or Mergeable progression.

Do not weaken meaningful project-owned validation merely to make a PR appear complete.

## 6. Ready-for-review gate

The project should mark a PR Ready for Review automatically when:

```text
READY_FOR_REVIEW =
  intended_implementation_complete
  AND coherent_pr_scope
  AND diff_reviewed
  AND project_owned_validation_sufficient
  AND project_docs_current_where_affected
  AND no_known_in_scope_material_defect
```

The ready state is not merge permission.

## 7. Review-conversation governance

For each material review finding, AI should understand the concern, verify it against architecture, implement a complete correction where required, add/update regression evidence where appropriate, rerun affected validation and resolve the conversation only when genuinely addressed or explicitly dispositioned.

## 8. Canonical merge condition

```text
MERGE_ALLOWED =
  implementation_complete
  AND project_owned_validation_sufficient
  AND no_merge_conflicts
  AND material_review_findings_resolved
  AND no_material_blocker
```

GitHub Actions success is not a term in this formula. `platform:validate` is not a term while it has no substantive steps.

A latest-head CI result can still provide useful evidence. If it reveals a real defect, that defect affects `project_owned_validation_sufficient` or `no_material_blocker`; the CI status itself does not.

## 9. Merge behaviour

When `MERGE_ALLOWED` is true and no material product-owner decision is required, the project should merge using the repository-approved strategy, delete the source branch where safe, update project state, allow linked issues to close according to conventions, and continue downstream deployment/migration/provider/runtime verification where required.

Auto-merge may be used where it does not reintroduce obsolete mandatory-status-check requirements.

## 10. PR outcome model

| Outcome | Project action |
|---|---|
| Implementation successful | Merge automatically when project-owned gates pass |
| Implementation blocked/failing | Keep PR open and remediate |
| Work abandoned/superseded/duplicate | Close without merge with explicit reason |

Use `CLOSED WITHOUT MERGE` only for intentional exclusion. Do not close a required but failing PR merely to clear the queue.

## 11. Blocker handling

Keep blocked required work open. Identify the exact blocker, classify it, continue safe independent work where possible, record material blocker state and escalate only when it crosses the product-owner boundary.

A non-functional GitHub Actions job or empty `platform:validate` target is not, by itself, a material blocker.

## 12. Product-owner escalation boundary

Do not normally ask whether a draft PR should stay open, CI should rerun, addressed review threads can resolve, a validated PR should become Ready, a mergeable PR should merge, or a merged feature branch should be deleted.

Escalate genuine decisions involving product scope/behaviour, domain rules, destructive/irreversible change, privacy/security posture, cost/provider commitment, material provider compromise, release timing with business consequence, material architecture uncertainty, conflicting requirements or unclear abandonment/supersession intent.

## 13. Repository enforcement baseline

Use repository protections that reduce accidental or unsafe changes without requiring GitHub Actions checks to pass as a condition of merge.

Where capabilities permit, prefer PR-based changes to the default branch, conflict prevention, review-conversation visibility, controlled merge strategies, restricted force-push/deletion and safe source-branch cleanup.

Do not configure required GitHub Actions status checks merely to satisfy this standard.

## 14. Canonical repository baseline

```text
PR_LIFECYCLE_STANDARD.md
.github/workflows/pr-validation.yml       # diagnostic / engineering evidence
.github/workflows/pr-lifecycle.yml
STATUS.md PR/gate integration
Optional repository ruleset / protection without mandatory CI status checks
```

## 15. `pr-validation.yml` responsibilities

Run useful engineering evidence such as lockfile install, lint, typecheck, tests, E2E where required, build, migration/schema checks and security/static/dependency analysis where configured.

Its GitHub conclusion is diagnostic. Record underlying defects, not platform status, as blockers.

Do not require `platform:validate` until it contains substantive project validation.

## 16. `pr-lifecycle.yml` responsibilities

Lifecycle automation may manage state labels, draft/readiness transitions, blocker labels, branch cleanup and status summaries. It must not make Ready or Mergeable depend solely on GitHub Actions conclusions.

## 17. Status integration

Recommended `STATUS.md` fields:

```text
Current phase:
Overall status:
Current gate:
Active branch/PR:
PR lifecycle state:
PR blocker:
Latest validation evidence:
Provider/deployment status:
Next:
```

## 18. State labels

Where useful:

```text
pr:draft
pr:implementing
pr:validating
pr:ready
pr:mergeable
pr:blocked
```

Avoid redundant ceremony.

## 19. Merge strategy

Recommended default for focused AI-led implementation is squash merge unless the project documents another strategy.

## 20. Failure protocol

```text
FAILURE OR WARNING DETECTED
↓
IDENTIFY WHETHER IT REPRESENTS A REAL DEFECT OR ONLY PLATFORM/CI STATUS
↓
IF REAL DEFECT: LOCATE ROOT CAUSE
↓
IMPLEMENT REMEDIATION
↓
ADD/UPDATE REGRESSION EVIDENCE WHERE APPROPRIATE
↓
RERUN AFFECTED PROJECT-OWNED VALIDATION
↓
RE-EVALUATE MERGE_ALLOWED
```

Do not close a required PR because CI is failing, weaken meaningful tests, blindly resolve review threads, or use AI confidence as the sole merge evidence.

## 21. Merge is not release completion

`MERGED` is repository integration, not proof of deployment, migration, provider verification, runtime verification or completion.

## 22. Adoption for existing repositories

Inspect current PR/CI/protection behaviour, identify conflicting mandatory-CI rules, establish project-owned validation, add/repair useful diagnostic workflows, add lifecycle automation, remove obsolete required GitHub status-check gates, update status integration, supersede conflicting instructions and validate the lifecycle on a low-risk PR.

## 23. Governance

Update this standard when multiple projects reveal a reusable improvement to PR progression, validation, review, merge governance, failure remediation or exceptional closure.

## 24. Master rule

> **AI may manage routine PR progression using sufficient project-owned evidence. GitHub CI is diagnostic rather than mandatory merge authority; empty Platform Validation is ignored until substantive checks exist. Successful work merges, real defects are remediated, and intentional non-adoption closes without merge.**
