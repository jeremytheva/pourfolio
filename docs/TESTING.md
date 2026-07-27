# Testing

## Local release gate

Use Node.js 20 and run:

```bash
npm ci
npm run validate
npx playwright install --with-deps chromium
npm run test:e2e
```

`validate` runs:

1. ESLint;
2. Node unit/policy tests;
3. a high-severity production dependency audit;
4. the production Vite build;
5. gzip JavaScript bundle budgets.

Production source maps are disabled.

## Current automated coverage

Tests cover:

- canonical relational collection names;
- optional nullable sharing series/edition relationships;
- response field projection;
- score 1 validity and complete 1–7 rating validation;
- weighted/unweighted totals and submission IDs;
- profile/cellar input allowlists and ownership predicates;
- immutable session identity extraction;
- same-origin, request-size and rate-limit helpers;
- authentication action/method, redirect policy, and proxied cookie domain/path normalisation;
- the existing rating calculation utility.

The Playwright suite uses a deterministic same-origin API fixture and covers the
launch catalogue, product, rating, cellar and profile journeys. It also runs
automated accessibility checks on the reachable launch pages. This suite verifies
browser behaviour without requiring production credentials; it does not replace
the connected staging tests below.

## CI

Pull requests, pushes to `main`/`master`, and manual runs execute the release gate
and Playwright browser/accessibility suite on Node 20. Pull requests also attempt
dependency review. That step is warning-only until a repository administrator
enables Dependency Graph; the production dependency audit remains blocking.
CodeQL runs on pull requests, protected branches, weekly schedule and manual
dispatch.

## Required pre-launch environment tests

Source-only tests cannot replace these staging checks:

- sign-up, sign-in, OTP where enabled, Google where enabled, logout and expired session;
- catalogue search, pagination and direct product routes;
- rating score `1`, score `7`, incomplete forms, duplicate retry and forced partial-write rollback;
- owner cellar create/update/delete and other-user rejection;
- owner profile update with attempted role/email/user-ID injection;
- historical import dry run and count reconciliation;
- WCAG 2.2 AA automated checks plus keyboard/screen-reader manual checks;
- direct SPA routes and unknown-route fallback on the production host;
- `/api/health`, correlation IDs, alert delivery, backup restore and rollback.

Do not use production credentials or personal data in fixtures. Redact evidence before attaching it to a PR.
