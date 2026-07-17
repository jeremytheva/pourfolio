# Contributing

## Definition of Ready
An issue is ready when it has one primary outcome; current and required behaviour; explicit scope and non-scope; testable acceptance criteria; identified dependencies; links to relevant product/architecture documentation; stated data, security, and accessibility impacts; resolved design/architecture decisions; and a size suitable for one focused PR.

## Delivery process
1. Select or create a structured issue.
2. Confirm it meets the Definition of Ready.
3. Create a focused branch: `feature/<issue>-short-description`, `fix/<issue>-short-description`, `chore/<issue>-short-description`, or `docs/<issue>-short-description`.
4. Read applicable `AGENTS.md` and the relevant documentation, then implement only the issue scope.
5. Add or update relevant tests and documentation.
6. Run `npm run lint`, `npm test`, and `npm run build` (or `npm run validate`).
7. Open a PR using the template and link it with `Closes #<issue-number>`.
8. Resolve CI and review findings without weakening checks or widening scope.
9. Audit every acceptance criterion and record validation evidence.
10. Merge only after required checks and reviews pass.

## Definition of Done
A change is done only when every acceptance criterion is satisfied; relevant automated tests exist; required validation and the production build pass; schema changes have a documented safe rollout; documentation reflects behaviour; security and accessibility implications are addressed; no unrelated changes remain; the PR links and closes its issue; validation, limitations, and follow-up work are recorded; and review comments are resolved.

See [Testing](TESTING.md), [Security](SECURITY.md), and [Codex workflows](CODEX_WORKFLOWS.md) for implementation guidance.
