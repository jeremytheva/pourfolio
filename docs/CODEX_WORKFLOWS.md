# AI implementation workflows

These workflows supplement `AGENTS.md`, `STATUS.md` and `PR_LIFECYCLE_STANDARD.md`. They are not a second source of project state. Current repository/GitHub evidence and the active issue/PR remain authoritative.

## Resume or continue the project

```text
Inspect this repository's authoritative state and continue the highest-priority dependency-correct actionable implementation work.

Before editing:
1. Read AGENTS.md, PROJECT.md and STATUS.md.
2. Review relevant roadmap, architecture, data, security, testing and accepted decision records.
3. Inspect current repository state, open PRs (including intentional drafts) and their latest-head evidence.
4. Inspect relevant issues/tasks and partially implemented work.
5. Reuse or repair existing work rather than creating a competing branch/PR.

After each task:
- validate it;
- update durable project state;
- determine the next dependency-correct task;
- continue while it can be completed safely.

Stop only for a defined AGENTS.md escalation condition.
```

## Implement an issue

```text
Implement the linked issue as written.

Before editing:
1. Read AGENTS.md, PROJECT.md and STATUS.md plus all relevant linked documentation.
2. Inspect the existing implementation, callers, tests and current repository state.
3. Inspect open PRs, intentional drafts and visible existing work for overlap before creating anything new.
4. Verify the issue meets the repository Definition of Ready or can be safely refined from repository evidence.
5. Identify conflicts between the issue and the existing architecture, data model, security boundary or accepted decisions.

Implementation requirements:
- Keep changes limited to the issue/outcome.
- Address root causes and whole-system integration effects.
- Add or update tests.
- Handle relevant failure states and edge cases.
- Run the canonical validation command and any task-specific connected validation.
- Update durable documentation/state where behaviour or execution state changes.
- Link the pull request with `Closes #[issue-number]` when the issue should close on merge.
- Create a normal non-draft PR by default once there is an initial coherent change to publish.
- Use GitHub Draft only when the change genuinely must not be reviewed/merged yet or substantial intended implementation is deliberately incomplete.
- Do not create a duplicate PR when an appropriate existing workstream can be continued.

After implementation:
- progress Implementing → Validating → Ready from current-head project evidence recorded in repository/PR metadata;
- treat GitHub Actions as supporting diagnostic evidence and fix any real defect they expose without making hosted CI itself a duplicate acceptance gate;
- cross Ready → Mergeable when canonical `npm run platform:validate`, applicable browser/runtime/deployment evidence, mergeability and material review-thread state are satisfactory for the change;
- merge and clean up the source branch when the Mergeable condition is satisfied and no separate documented approval condition applies;
- continue downstream Release/Completion work after merge rather than treating Merged as Complete.
```

## Fix failed checks

```text
Inspect all failing GitHub checks on the current pull-request head.

Identify and fix underlying product, repository-contract, security, data-integrity or release defects rather than weakening the project-owned gate.

Do not:
- disable checks to hide a defect;
- weaken or delete valid tests;
- add unsafe assertions or broad escapes merely to pass;
- swallow errors;
- change unrelated behaviour;
- reuse passing evidence from an older PR head;
- treat hosted CI failure alone as an automatic merge veto when the underlying repository evidence is otherwise sufficient.

Run the complete applicable project-owned validation suite after the repair, update durable state where material, and continue the same PR lifecycle.
```

## Address review feedback

```text
Review all unresolved pull-request comments and requested changes.

For each actionable comment:
1. Confirm the concern against current code and repository rules.
2. Implement the smallest complete correction.
3. Add or update regression coverage where needed.
4. Re-run all relevant validation on the new head.
5. Resolve/reply with the change and evidence where the connected GitHub workflow permits it.

Do not alter accepted behaviour outside the pull-request scope. If feedback reveals genuinely separate scope, capture it as linked follow-up work and continue the current PR where safe.
```

## Final completion audit

```text
Perform a final completion audit against the linked issue, AGENTS.md, relevant repository documentation and current PR head.

Verify:
- every acceptance criterion;
- relevant edge/failure states;
- automated test coverage;
- data and migration correctness;
- authentication and authorisation;
- error handling and observability;
- accessibility where applicable;
- documentation/state accuracy;
- canonical project-owned validation;
- material diagnostic-CI findings;
- scope compliance;
- required deployment/provider/runtime evidence for the current gate.

Fix all actionable in-scope gaps, rerun the required validation suite, and update PR/state evidence. Do not claim Mergeable or Complete without the evidence required for those states.
```

## Milestone completion audit

```text
Audit the completed milestone against its objective, linked issues, merged pull requests and current system evidence.

Identify:
- incomplete acceptance criteria;
- integration gaps or regressions;
- duplicated implementations;
- architectural inconsistencies;
- missing tests;
- documentation drift;
- security/data/accessibility risks;
- technical debt introduced during delivery;
- deployment/provider evidence gaps.

Create or update follow-up issues for valid separate work, update STATUS.md/ROADMAP.md, and continue the next dependency-correct milestone work unless a defined escalation condition blocks it.
```

## Current Pourfolio merge boundary

Issue #143 tracks additional GitHub governance/ruleset hardening, but it is not a blanket blocker on ordinary mergeable work. For the current project policy, Mergeable requires implementation complete, canonical project-owned validation sufficient for the exact intended head, applicable browser/runtime/deployment evidence satisfactory, no merge conflicts, material review findings resolved and no material blocker. GitHub-hosted checks remain valuable diagnostic evidence; any real defect they expose must be fixed.
