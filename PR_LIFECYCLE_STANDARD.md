# Pourfolio Pull Request Lifecycle Binding

> Repository-specific binding to the active master pull-request and GitHub governance standards

**Status:** Project binding  
**Reviewed:** 5 October 2026  
**Inherits:** `PR_LIFECYCLE_STANDARD.md` v1.1, `GITHUB_REFERENCE_GUIDE.md` v1.2, `TESTING_VALIDATION_RELEASE_STANDARD.md` v1.2  
**Project continuity:** `STATUS.md`

## 1. Purpose

This file records only Pourfolio-specific pull-request bindings and terminology. It does not replace or duplicate the active master standards indexed by Project Master's `MASTER_SOURCE_MANIFEST.md`.

GitHub owns live PR, review, conflict and protection state. Pourfolio owns project-specific acceptance evidence. Hosted GitHub Actions are supporting diagnostics unless an active repository protection or an explicit Pourfolio rule makes a check mandatory.

## 2. Lifecycle terminology

Pourfolio uses the owner-selected repository terminology:

```text
IMPLEMENTING
  ↓
VALIDATING
  ↓
READY
  ↓
MERGEABLE
  ↓
MERGED
```

`BLOCKED` is an overlay. `CLOSED WITHOUT MERGE` is reserved for deliberately abandoned, duplicate, superseded, cancelled or rejected work.

The local `MERGEABLE` label/state is semantically equivalent to the active master lifecycle's merge-ready state. This terminology difference is intentional and does not weaken the master merge gate.

GitHub Draft is exceptional. Use it only when work is deliberately incomplete/non-reviewable or genuinely must not be reviewed or merged yet. Pending validation alone is not a Draft reason.

## 3. PR creation and reuse

- Use normal, non-draft PRs for autonomous work.
- Reuse an existing branch/PR when it represents the same coherent objective.
- Do not create competing PRs merely because work resumed in another AI session.
- Keep blocked required work open unless it is intentionally excluded or superseded.
- Default WIP limits are **3 ordinary implementation PRs** and dependent stack depth **2**.
- A preserved branch without an open PR is partial repository work, not completed integration evidence.

## 4. Canonical validation

The canonical source-validation command is:

```bash
npm run platform:validate
```

Validation evidence must apply to the latest intended PR head. The repository may supplement it with browser/accessibility, CodeQL, Dependency Review, connected provider checks, deployment evidence and other change-appropriate evidence.

An empty or zero-step hosted wrapper is unavailable evidence, not an application failure. Real defects surfaced by any diagnostic check must still be corrected.

If the canonical executor is unavailable, use the documented hierarchy:

```text
canonical repository executor
→ trusted alternate executor
→ exact-commit deployment/build with equivalent required commands
→ VALIDATION WAITING
```

Never record an unexecuted check as PASS.

## 5. Pourfolio merge condition

A normal Pourfolio PR may progress to `MERGEABLE` when the latest intended commit has:

- coherent, complete in-scope implementation;
- sufficient `npm run platform:validate` evidence;
- applicable browser/runtime/provider evidence for the claim being made;
- applicable deployment evidence;
- no merge conflict;
- no unresolved material review finding;
- no material blocker;
- current project documentation where the change affects durable state.

GitHub Actions success is not independently required unless active repository protections enforce it. Do not bypass or weaken actual repository protections.

Merge does not mean deployed, runtime verified, provider verified or complete.

## 6. Optional lifecycle automation

`.github/workflows/pr-lifecycle.yml` is advisory automation.

It must:

- use `pull_request`, not `pull_request_target`, for ordinary lifecycle events;
- default to `permissions: {}`;
- grant lifecycle-label work only the metadata permissions it needs;
- treat label mutation as best-effort;
- add replacement lifecycle metadata before removing the previous state;
- preserve existing metadata if mutation is refused;
- respect fork and Dependabot read-only restrictions;
- grant merged-branch cleanup only `contents: write`;
- delete only safely merged, same-repository, non-default branches;
- warn and preserve branches when cleanup is unavailable.

A label/write refusal is a workflow-token or GitHub-policy problem unless independent evidence shows repository connector/account access is unavailable. Optional metadata must not block implementation or merging.

## 7. Merge and post-merge behaviour

When the project-owned merge gate is satisfied and no owner decision is required:

1. merge using the repository-approved strategy;
2. delete the source branch where safe;
3. update `STATUS.md`;
4. verify the deployment/provider/runtime state appropriate to the change;
5. distinguish `MERGED`, `DEPLOYED`, `PROVIDER VERIFIED`, `RUNTIME VERIFIED` and `COMPLETE`;
6. continue the next dependency-correct work.

## 8. Owner escalation boundary

Do not transfer routine PR administration to the product owner.

Escalate only when a material decision, inaccessible external prerequisite, destructive/irreversible provider operation, privacy/security choice, cost/provider commitment or other master-defined owner boundary genuinely requires it.
