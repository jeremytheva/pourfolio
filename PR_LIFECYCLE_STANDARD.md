# Pull Request Lifecycle Standard

> Canonical master standard for project-managed pull-request progression, validation, merge governance and exceptional closure

**Version 1.0 • August 2026**  
**Status: Master source**  
**Parent framework:** `AI_FIRST_PLATFORM_DEVELOPMENT_FRAMEWORK.md`  
**Operating companion:** `AI_PLATFORM_DEVELOPMENT_STANDARD.md`  
**Validation companion:** `TESTING_VALIDATION_RELEASE_STANDARD.md`  
**Documentation companion:** `PROJECT_DOCUMENTATION_STANDARD.md`  
**Provider implementation:** `PROVIDERS/GITHUB_REFERENCE_GUIDE.md`

---

## 1. Purpose

This standard defines the default pull-request lifecycle for AI-led software and platform projects.

Its purpose is to remove routine GitHub administration from the product owner while preserving independent evidence, repository enforcement, traceability and safe escalation.

The project manages ordinary PR progression. GitHub acts as the enforcement layer. AI may implement, remediate and progress work, but AI assertion alone must never be treated as proof that its own change is correct.

## 2. Core principle

> **The project manages the PR lifecycle; GitHub independently enforces the evidence required to merge.**

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
| VALIDATING | Implementation is substantially coherent and required evidence is being evaluated | Run and remediate validation |
| READY FOR REVIEW | Implementation gate passed; integration/review evidence may proceed | Resolve review and policy requirements |
| MERGEABLE | All mandatory merge conditions are true for the latest intended commit | Merge or allow auto-merge |
| MERGED | GitHub accepted the change into the target branch | Delete source branch and continue downstream verification/status work |
| BLOCKED | A genuine dependency or material decision prevents safe progression | Keep PR open; record blocker; continue safe independent work |
| CLOSED WITHOUT MERGE | Work is intentionally excluded | Preserve useful knowledge and close with explicit reason |

## 4. Draft PR default

Create or reuse a draft PR early enough to provide a durable integration container for implementation commits, CI evidence, AI/self review, automated/human review where required, remediation, migration/deployment notes and implementation continuity across sessions.

Keep the PR in draft while intended implementation is materially incomplete, scope is changing substantially, known in-scope material defects remain, implementation is not coherent enough for review, or required local validation is failing/not run where applicable.

A draft PR is the normal work-in-progress state, not a failure state.

## 5. Implementation and validation behaviour

While the PR remains open, the project should automatically manage ordinary engineering work, including continued commits, lint, type checking, tests, build, `platform:validate` or equivalent, security/static analysis where configured, migration/schema validation where applicable, conflict detection, unresolved required review-conversation detection and revalidation whenever the PR changes.

Do not weaken required checks to obtain mergeability.

## 6. Ready-for-review gate

The project should mark a PR Ready for Review automatically when:

```text
READY_FOR_REVIEW =
  intended_implementation_complete
  AND coherent_pr_scope
  AND diff_reviewed
  AND required_local_validation_complete
  AND project_docs_current_where_affected
  AND no_known_in_scope_material_defect
```

The ready state is not merge permission.

## 7. Review-conversation governance

For each material review finding, AI should understand the concern, verify it against architecture, implement a complete correction where required, add/update regression evidence, rerun affected validation, and resolve the conversation only when genuinely addressed or explicitly dispositioned.

## 8. Canonical merge condition

```text
MERGE_ALLOWED =
  implementation_complete
  AND platform_validate_passed
  AND tests_passed
  AND typecheck_passed
  AND lint_passed
  AND build_passed
  AND required_security_checks_passed
  AND no_merge_conflicts
  AND required_review_threads_resolved
  AND latest_commit_validated
  AND no_material_blocker
```

Projects may add stricter requirements. A stale green run against an earlier commit is insufficient.

## 9. Merge behaviour

When `MERGE_ALLOWED` is true and no material product-owner decision is required, the project should merge using the repository-approved strategy, delete the source branch where safe, update project state, allow linked issues to close according to conventions, and continue downstream deployment/migration/provider/runtime verification where required.

Where GitHub auto-merge is available and appropriate, enable it so GitHub performs the merge only after enforced requirements become true.

## 10. PR outcome model

| Outcome | Project action |
|---|---|
| Implementation successful | Merge automatically when all gates pass |
| Implementation blocked/failing | Keep PR open and remediate |
| Work abandoned/superseded/duplicate | Close without merge with explicit reason |

Use `CLOSED WITHOUT MERGE` only for intentional exclusion. Do not close a required but failing PR merely to clear the queue.

## 11. Blocker handling

Keep blocked required work open. Identify the exact blocker, classify it, continue safe independent work where possible, record material blocker state and escalate only when it crosses the product-owner boundary.

## 12. Product-owner escalation boundary

Do not normally ask whether a draft PR should stay open, CI should rerun, addressed review threads can resolve, a validated PR should become Ready, a fully compliant PR should merge, or a merged feature branch should be deleted.

Escalate genuine decisions involving product scope/behaviour, domain rules, destructive/irreversible change, privacy/security posture, cost/provider commitment, material provider compromise, release timing with business consequence, material architecture uncertainty, conflicting requirements or unclear abandonment/supersession intent.

## 13. Repository enforcement baseline

Protect the default branch where capabilities permit with PR requirements, current required status checks, review-conversation resolution where appropriate, merge-conflict prevention, risk-appropriate security checks, controlled merge strategies, restricted bypass, no ordinary direct pushes and safe branch deletion after merge.

## 14. Canonical repository baseline

```text
PR_LIFECYCLE_STANDARD.md
.github/workflows/pr-validation.yml
.github/workflows/pr-lifecycle.yml
GitHub ruleset / protected default branch
Auto-merge configuration
STATUS.md PR/gate integration
```

## 15. `pr-validation.yml` responsibilities

Execute declared merge evidence such as lockfile install, lint, typecheck, tests, E2E where required, build, canonical validation, migration/schema checks and security/static/dependency analysis where configured.

## 16. `pr-lifecycle.yml` responsibilities

Lifecycle automation may manage state labels, draft/readiness transitions, validation-pending state, blocker labels, auto-merge enablement, branch cleanup and status summaries. It must not override branch protection or fabricate evidence.

## 17. Status integration

Recommended `STATUS.md` fields:

```text
Current phase:
Overall status:
Current gate:
Active branch/PR:
PR lifecycle state:
PR blocker:
Latest validated commit:
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
FAILURE DETECTED
↓
IDENTIFY FAILED GATE
↓
LOCATE ROOT CAUSE
↓
IMPLEMENT REMEDIATION
↓
ADD/UPDATE REGRESSION EVIDENCE
↓
RERUN AFFECTED + FULL REQUIRED VALIDATION
↓
RE-EVALUATE MERGE_ALLOWED
```

Do not close the PR because it is failing, weaken checks, blindly resolve review threads, or use AI confidence as merge evidence.

## 21. Merge is not release completion

`MERGED` is repository integration, not proof of deployment, migration, provider verification, runtime verification or completion.

## 22. Adoption for existing repositories

Inspect current PR/CI/protection behaviour, identify conflicting manual rules, establish canonical validation, add/repair workflows, configure required checks/ruleset, add lifecycle automation, enable auto-merge where safe, update status integration, supersede conflicting instructions and validate the lifecycle on a low-risk PR.

## 23. Governance

Update this standard when multiple projects reveal a reusable improvement to PR progression, validation, review, merge enforcement, failure remediation or exceptional closure.

## 24. Master rule

> **AI may manage routine PR progression, but only independently enforced evidence may authorize merge. Successful work merges; failing required work stays open and is remediated; intentional non-adoption closes without merge.**
