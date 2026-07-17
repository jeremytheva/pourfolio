# Codex workflows

## Implement an issue
```text
Implement the linked issue as written.

Before editing:
1. Read all applicable AGENTS.md files.
2. Read the linked architecture and product documentation.
3. Inspect the relevant implementation and tests.
4. Verify the issue meets the repository Definition of Ready.
5. Identify conflicts between the issue and the existing architecture.

Implementation requirements:
- Keep changes limited to the issue.
- Address root causes.
- Add or update tests.
- Handle relevant failure states and edge cases.
- Run all validation commands.
- Update documentation where behaviour changes.
- Link the pull request with "Closes #[issue-number]".
- Do not merge the pull request.
```

## Fix failed checks
```text
Inspect all failing GitHub checks on this pull request.

Fix the underlying causes rather than reported symptoms.

Do not:
- Disable checks
- Weaken tests
- Remove type safety
- Add unsafe assertions
- Ignore errors
- Change unrelated behaviour

Rerun the complete validation suite and update the pull-request validation results.
```

## Address review feedback
```text
Review all unresolved pull-request comments and requested changes.

For each actionable comment:
1. Confirm the concern against the code.
2. Implement the smallest complete correction.
3. Add or update tests where needed.
4. Re-run all relevant validation.
5. Summarise the resolution.

Do not alter accepted behaviour outside the pull-request scope.
```

## Final completion audit
```text
Perform a final completion audit against the linked issue.

Verify:
- Every acceptance criterion
- Relevant edge cases
- Automated test coverage
- Database and migration correctness
- Authentication and authorisation
- Error handling
- Accessibility
- Documentation
- CI validation
- Scope compliance

Fix all actionable gaps, rerun the complete validation suite, and update the pull-request description with final evidence.
```

## Milestone completion audit
```text
Audit the completed milestone against all linked issues and merged pull requests.

Identify:
- Incomplete acceptance criteria
- Integration gaps
- Regressions
- Duplicated implementations
- Architectural inconsistencies
- Missing tests
- Documentation drift
- Security risks
- Accessibility issues
- Technical debt introduced during delivery

Create follow-up issues for valid gaps. Do not reopen completed work without evidence.
```
