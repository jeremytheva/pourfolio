# Contributing

## Definition of Ready
An issue is ready when it has one primary outcome; current and required behaviour; explicit scope and non-scope; testable acceptance criteria; identified dependencies; links to relevant product/architecture documentation; stated data, security and accessibility impacts; resolved material design/architecture decisions; and a size suitable for one focused reviewable change.

Before meaningful implementation, confirm the current Project Entry/Change context from `PROJECT.md`, `STATUS.md`, `ROADMAP.md`, `SYSTEM_MAP.md` and the relevant detailed documents. Check overlapping issues/PRs and provider/deployment state where the outcome depends on them.

## Delivery process
1. Select or create a structured issue when detailed tracking is needed.
2. Confirm the user/system outcome and current execution gate.
3. Check existing implementation, callers, affected layers and overlapping work before changing the system.
4. Create a focused branch: `feature/<issue>-short-description`, `fix/<issue>-short-description`, `chore/<issue>-short-description`, or `docs/<issue>-short-description`.
5. Implement the smallest complete dependency-correct change and integrate all relevant layers.
6. Add or update relevant tests and project documentation.
7. Run the canonical source-validation entry point: `npm run platform:validate`.
8. For browser-facing changes, run the relevant Playwright coverage locally where practical; hosted Browser/accessibility remains required.
9. Open a PR using the template and link the governing issue where applicable.
10. Resolve CI and review findings without weakening checks or widening scope.
11. Audit acceptance criteria and record only evidence actually produced by the current code/provider/deployment state.
12. Merge only after required checks and reviews pass.
13. Do not treat merge as deployment, verification or completion when later gates remain.

## Definition of Done
A change is COMPLETE only when its acceptance outcome is satisfied, relevant automated and real-system evidence exists, required validation passes, schema/data changes have their safe rollout and verification evidence, documentation reflects current behaviour, security/accessibility implications are addressed, no unrelated changes remain, and known dependent work is explicitly classified rather than hidden.

Use the strongest state supported by evidence (`BUILDING`, `INTEGRATED`, `VALIDATING`, `DEPLOYED`, `VERIFIED`, `COMPLETE`, or `BLOCKED`) rather than ambiguous “done”.

See [Testing](TESTING.md), [Security](SECURITY.md), [Codex workflows](CODEX_WORKFLOWS.md), and the root [STATUS](../STATUS.md) for current implementation guidance and release boundaries.
