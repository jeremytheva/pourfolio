# Pull Request Lifecycle Standard

> Canonical project standard for project-managed pull-request progression, validation, merge governance and exceptional closure

**Version 1.2 • September 2026**  
**Status: Project source**  
**Parent framework:** `AI_FIRST_PLATFORM_DEVELOPMENT_FRAMEWORK.md`  
**Operating companion:** `AI_PLATFORM_DEVELOPMENT_STANDARD.md`  
**Validation companion:** `TESTING_VALIDATION_RELEASE_STANDARD.md`  
**Documentation companion:** `PROJECT_DOCUMENTATION_STANDARD.md`  
**Provider implementation:** `PROVIDERS/GITHUB_REFERENCE_GUIDE.md`

---

## 1. Purpose

This standard defines the default pull-request lifecycle for AI-led work in Pourfolio.

Its purpose is to remove routine GitHub administration from the product owner while preserving traceability, project-owned validation, review discipline and safe escalation.

The project manages ordinary PR progression. GitHub provides repository state, review and automation evidence, but GitHub Actions status is not itself a mandatory merge gate.

## 2. Core principle

> **The project manages the PR lifecycle and evaluates sufficient project-owned evidence; GitHub CI is diagnostic evidence, not automatic merge authority.**

A failed, pending, unavailable, billing-blocked or runner-blocked GitHub Actions check does not by itself make a PR unmergeable. Any real code, build, security, data-integrity or release defect revealed by CI remains a material defect and must be addressed.

The product owner manages product intent and material decisions, not ordinary PR ceremony.

A successful implementation normally ends in **MERGED**. A PR should not be manually closed merely because implementation is incomplete, validation is failing, or the PR queue is untidy.

## 3. Canonical state machine

The project lifecycle is represented by repository/PR metadata and evidence, not by GitHub's draft flag:

```text
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

`DRAFT` is an exceptional GitHub presentation state, not the default first lifecycle state.

`BLOCKED` is an overlay state that may apply to any non-terminal state.

`CLOSED WITHOUT MERGE` is a separate terminal outcome used only when the proposed work is intentionally not entering the target branch.

### 3.1 State meanings

| State | Meaning | Default project action |
|---|---|---|
| IMPLEMENTING | Intended scope is actively being built or remediated | Commit, test, review and integrate |
| VALIDATING | Implementation is substantially coherent and available evidence is being evaluated | Run and remediate validation |
| READY FOR REVIEW | Implementation gate passed; integration/review evidence may proceed | Resolve material review findings |
| MERGEABLE | Project-owned merge conditions are true for the latest intended commit | Merge |
| MERGED | GitHub accepted the change into the target branch | Delete source branch and continue downstream verification/status work |
| BLOCKED | A genuine dependency or material decision prevents safe progression | Keep PR open; record blocker; continue safe independent work |
| CLOSED WITHOUT MERGE | Work is intentionally excluded | Preserve useful knowledge and close with explicit reason |

## 4. Normal PR default; Draft is exceptional

Create or reuse a normal, non-draft PR as the durable integration container for autonomous project work once an implementation branch has an initial coherent change to publish. Record lifecycle state using repository/PR metadata, labels, status documentation and evidence rather than using GitHub Draft as the lifecycle mechanism.

Use a GitHub Draft PR only when one of these conditions is true:

- the change genuinely should not be reviewed or merged under any circumstances yet; or
- substantial intended implementation is deliberately incomplete and publishing it as reviewable would misrepresent its state.

Do not use Draft merely because validation is pending, because implementation is in the normal `IMPLEMENTING` state, or as routine ceremony for autonomous work.

When Draft is genuinely required, move out of Draft as soon as the exceptional condition no longer applies. Draft/Ready transition tooling must not become a routine lifecycle dependency.

## 5. Implementation and validation behaviour

While the PR remains open, the project should automatically manage ordinary engineering work, including continued commits, lint, type checking where applicable, tests, build, security/static analysis where configured, migration/schema validation where applicable, conflict detection, review-finding resolution and revalidation whenever the PR changes.

GitHub-hosted CI may run and should be inspected when useful, but it is non-blocking as a platform status signal.

`npm run platform:validate` is the canonical source-validation entry point for this repository. Its substantive findings are project-owned evidence. Do not confuse the GitHub Actions wrapper/conclusion with the underlying validation result.

Do not weaken meaningful project-owned validation merely to make a PR appear complete.

## 6. Ready-for-review gate

A PR may be considered Ready for Review in lifecycle metadata when:

```text
READY_FOR_REVIEW =
  intended_implementation_complete
  AND coherent_pr_scope
  AND diff_reviewed
  AND project_owned_validation_sufficient
  AND project_docs_current_where_affected
  AND no_known_in_scope_material_defect
```

For normal non-draft PRs, this lifecycle transition does not require changing GitHub's draft flag. The ready state is an evidence/state transition, not merge permission.

## 7. Review-conversation governance

For each material review finding, AI should understand the concern, verify it against architecture, implement a complete correction where required, add/update regression evidence where appropriate, rerun affected validation and resolve the conversation only when genuinely addressed or explicitly dispositioned.

## 8. Canonical merge condition

```text
MERGE_ALLOWED =
  implementation_complete
  AND project_owned_validation_sufficient
  AND applicable_runtime_or_browser_evidence_sufficient
  AND deployment_evidence_sufficient_for_the_change
  AND no_merge_conflicts
  AND material_review_findings_resolved
  AND no_material_blocker
```

GitHub Actions success is not a term in this formula. A latest-head CI result can still provide useful evidence. If it reveals a real defect, that defect affects `project_owned_validation_sufficient` or `no_material_blocker`; the CI status itself does not.

Deployment evidence is required only to the extent applicable to the change and lifecycle claim. A source-only change does not fabricate runtime proof; a deployment-sensitive change must not be represented as verified without appropriate deployment/runtime evidence.

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

A non-functional GitHub Actions job is not, by itself, a material blocker. A connector failure that affects an avoidable ceremony step must be designed around where repository policy can safely remove that dependency.

## 12. Product-owner escalation boundary

Do not normally ask whether a normal implementation PR should stay open, CI should rerun, addressed review threads can resolve, lifecycle metadata can advance to Ready, a mergeable PR should merge, or a merged feature branch should be deleted.

Do not use Draft as a mechanism that creates an owner-only transition for ordinary autonomous work.

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

Run useful engineering evidence such as lockfile install, lint, typecheck where applicable, tests, E2E where required, build, migration/schema checks and security/static/dependency analysis where configured.

Its GitHub conclusion is diagnostic. Record underlying defects, not platform status, as blockers.

## 16. `pr-lifecycle.yml` responsibilities

Lifecycle automation may manage lifecycle labels, blocker labels, branch cleanup and status summaries. It must not make Ready or Mergeable depend solely on GitHub Actions conclusions.

Automation must not require GitHub Draft → Ready transitions for ordinary autonomous work. Draft/readiness transitions should only be automated when a PR was intentionally created as Draft under the exceptional rule in section 4.

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
pr:implementing
pr:validating
pr:ready
pr:mergeable
pr:blocked
```

`pr:draft` may be used only for an intentionally exceptional Draft PR. Avoid redundant ceremony.

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

Inspect current PR/CI/protection behaviour, identify conflicting mandatory-CI or Draft-default rules, establish project-owned validation, add/repair useful diagnostic workflows, add lifecycle metadata/automation, remove obsolete mandatory GitHub status-check or routine Draft-transition dependencies, update status integration, supersede conflicting instructions and validate the lifecycle on a low-risk PR.

## 23. Governance

Update this standard when repeated project evidence reveals a reusable improvement to PR progression, validation, review, merge governance, failure remediation or exceptional closure.

## 24. Master rule

> **Autonomous project work uses normal non-draft PRs by default and records lifecycle state in repository/PR metadata. GitHub Draft is exceptional. AI may manage routine PR progression using sufficient project-owned evidence. GitHub CI is diagnostic rather than mandatory merge authority; successful work merges, real defects are remediated, and intentional non-adoption closes without merge.**
