# Testing

## Tools and commands
The repository uses Node.js built-in `node:test` and `node:assert` for unit tests. Run:

```bash
npm run lint
npm test
npm run build
npm run validate
```

`validate` runs lint, unit tests, and the production build in sequence. There is no TypeScript configuration, integration-test command, end-to-end suite, formatting checker, or executable database migration command. Do not report those checks as passed; use targeted manual testing and non-production NoCodeBackend validation where relevant.

## Test placement and approach
Place pure-logic tests alongside utilities in `src/**/__tests__/*.test.js`, following the existing `ratingCalculator.test.js` pattern and importing from `node:test` and `node:assert/strict`. Mock external boundaries rather than making unit tests call NoCodeBackend. Add tests for changed calculations, response normalisation, validation, and service error paths where practical. Component/UI changes need accessible manual validation of keyboard paths, labels, focus, error states, and relevant protected-route behaviour.

## Change expectations
- Pure logic and bug fixes: add regression/unit tests.
- Data/service changes: test normalisation/error behaviour and verify the documented collection contract in a non-production environment.
- Authentication, permissions, or proxy changes: exercise unauthenticated, authorised, and unauthorised paths without using production credentials.
- Schema changes: update the schema mapping, document rollout/backfill, and validate collection fields/permissions outside production; no local migration runner exists.

## CI sequence and gaps
Pull requests install the lockfile with `npm ci`, then run lint, unit tests, and production build. CI intentionally does not call external services. Coverage reporting, integration tests, end-to-end tests, a formatter, and automated NoCodeBackend schema/migration validation are current gaps; record any manual evidence and follow-up work in the PR.
