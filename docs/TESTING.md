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
- historical import CSV parsing, required headers, positive unique IDs, and product/producer referential integrity;
- SQL schema parsing and required profile/rating non-null, uniqueness and immutable timestamp controls;
- response field projection;
- zero, one and multiple-rating catalogue aggregates, including rejection of non-finite totals and absence of individual rating or cellar identifiers;
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

The schema and import audit CLIs are exercised through their Node regression
tests. Environment-specific exports are intentionally supplied at release time
rather than committed to the repository.

## Required pre-launch environment tests

Source-only tests cannot replace these staging checks:

- sign-up, sign-in, OTP where enabled, Google where enabled, logout and expired session;
- catalogue search, pagination and direct product routes;
- rating score `1`, score `7`, incomplete forms, sequential and concurrent duplicate retries, and forced partial-write rollback;
- rating schema preflight `PASS` and preservation of `date_rated` during a controlled non-date update;
- owner cellar create/update/delete and other-user rejection;
- owner profile update with attempted role/email/user-ID injection;
- historical import preflight `PASS`, dry run, repeat-run idempotency and count reconciliation;
- WCAG 2.2 AA automated checks plus keyboard/screen-reader manual checks;
- direct SPA routes and unknown-route fallback on the production host;
- `/api/health`, correlation IDs, alert delivery, backup restore and rollback.

Do not use production credentials or personal data in fixtures. Redact evidence before attaching it to a PR.

## Connected staging release check

`npm run test:release` is a separately controlled Playwright suite for an
immutable, production-equivalent staging deployment. It uses
`playwright.release.config.js`, only discovers tests in `release-check/`, does
not start a local web server, and never imports or installs `e2e/mockApi.js`.
The HTTPS deployment is therefore the source of all client, authentication and
application-data responses.

Run the **Connected staging release check** workflow manually after deploying
the exact candidate commit with the certified staging backend configuration.
Supply the immutable deployment URL and full deployed commit SHA. The workflow
checks out that SHA before running and uses the protected `staging-release`
GitHub Environment. Configure required reviewers and prevent administrators
from bypassing its protection rules.

The following Environment secrets must contain dedicated, non-personal test
accounts. Never put them in repository variables, workflow inputs, command-line
arguments, traces or committed `.env` files:

| Secret | Purpose |
| --- | --- |
| `RELEASE_OWNER_EMAIL`, `RELEASE_OWNER_PASSWORD` | Primary owner journey and mutations |
| `RELEASE_OTHER_EMAIL`, `RELEASE_OTHER_PASSWORD` | Other-user authorisation boundary |
| `RELEASE_SIGNUP_EMAIL`, `RELEASE_SIGNUP_PASSWORD` | Optional fresh sign-up address; rotate after use |
| `RELEASE_OTP_EMAIL`, `RELEASE_OTP_CODE` | Required when OTP is enabled; inject a short-lived code immediately before the controlled run |

`RELEASE_SEARCH_TERM` may be an Environment variable containing a stable,
non-sensitive catalogue term. The suite fails early unless the deployment URL
is HTTPS and the four owner/other-user credentials exist. It conditionally
executes sign-up only when fresh sign-up credentials are supplied, and requires
OTP credentials when provider discovery reports OTP as enabled. Google
provider discovery, initiation, HTTPS redirection and rejection of an
attacker-controlled return origin are automated. A reviewer must finish the
Google identity-provider interaction manually because credentials, MFA and
anti-bot challenges must not be scripted or recorded.

The connected suite covers:

- health configuration, required security headers, direct SPA routes, unknown
  route fallback and rejected cross-origin Google return targets;
- password sign-in, optional fresh sign-up, enabled OTP, Google initiation,
  logout and cookie-cleared expired sessions;
- search, pagination when the certified catalogue has multiple pages, direct
  product details and stable product URLs;
- incomplete rating rejection, score `1`, score `7`, rating history and rating
  deletion;
- cellar create, read/list, update and delete, including other-user list/read/
  update/delete rejection;
- profile editing with attempted `email`, `role`, `user_id` and `id` injection,
  followed by a fresh read that proves immutable values did not change; and
- axe WCAG tags on login and every authenticated launch route.

### Evidence and cleanup

The workflow retains failure-only screenshots, video and traces plus the HTML
report for 30 days in an artifact named with the deployed SHA. Playwright
artifacts can contain private page content even when passwords are not printed:
download them only to the approved review location, inspect and redact them
before wider sharing, and delete the artifact early when it is no longer
needed. Record the workflow URL, immutable deployment URL, full SHA, start/end
time, backend certification reference and artifact digest in the release
record. Do not paste cookies, bearer tokens, OTPs, email addresses, raw request
bodies or unredacted screenshots into a pull request.

The suite deletes the rating and cellar record it creates. The release operator
must remove or rotate a sign-up account, restore the dedicated owner's display
name/description if required, and verify that no `release-check` cellar notes
remain after an interrupted run.

### Manual WCAG 2.2 AA release record

Automated axe results are necessary but not sufficient. On login, home, search,
product details, rating, cellar and profile at desktop and mobile widths,
record a pass/fail and redacted evidence for each item below:

1. Complete every journey using only keyboard controls; confirm logical order,
   no keyboard trap, operable menus/dialogs, and a visible focus indicator.
2. Confirm focus moves predictably after navigation, submit, delete, validation
   failure and session expiry, without being lost behind changing content.
3. With a supported screen reader, confirm landmarks, heading hierarchy,
   control names, state, rating values and dynamic status/error announcements.
4. Confirm every input has a persistent programmatic label, instructions are
   understandable, required/invalid state is conveyed without colour alone,
   and errors are associated with the affected input or announced immediately.
5. Test browser zoom at 200% and text-only zoom where supported; verify content
   reflows without loss, overlap or two-dimensional scrolling except where
   intrinsically necessary.
6. Measure text, control and focus-indicator contrast against WCAG 2.2 AA,
   including hover, focus, disabled, success and error states.
7. Check responsive layouts at 320 CSS pixels wide, landscape mobile, tablet
   and desktop; verify target spacing, readable content, and no clipped actions.
8. Exercise sign-in errors, incomplete ratings, failed API states and destructive
   confirmations; verify notices are perceivable, specific and recoverable.
9. Manually complete enabled Google sign-in and logout with the dedicated
   staging identity, including cancellation and a rejected/invalid callback.

Any failure blocks promotion. Link a defect without sensitive evidence, repeat
the full check against a new immutable deployment of the corrected commit, and
retain the superseded result as a failed release attempt rather than overwriting
it.
