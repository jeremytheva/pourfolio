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
6. Brew Done It route, navigation, production-bundle and normal-environment
   containment;
7. browser release-security checks.

Production source maps are disabled.

`npm run check:brew-containment` runs after the production build and fails if
`src/App.jsx` or primary navigation references Brew Done It, if the generated
browser bundle contains its route or product name, or if tracked normal
environment configuration sets `BREW_DONE_IT_POLICY_ENABLED`. The gateway's
unset-flag behaviour remains covered separately by the Node policy tests; the
Playwright containment and accessibility specifications remain required and
cannot be replaced by this static check.

## Current automated coverage

Tests cover:

- canonical relational collection names;
- optional nullable sharing series/edition relationships;
- historical import CSV parsing, required headers, positive unique IDs, and product/producer referential integrity;
- deterministic historical-reference task grouping, identity-field exclusion,
  spreadsheet-formula neutralisation, canonical mapping validation and
  independently reviewed map/quarantine decisions;
- SQL schema parsing, exact-input fingerprints, required profile/rating
  non-null and uniqueness controls, the nullable deletion tombstone, the full
  five-state workflow and immutable rating timestamps;
- response field projection;
- the source-only account-export manifest contract: exact owner filtering,
  explicit portable projections, stable ordering, explicit nulls, exact counts,
  empty/complete accounts, other-user sentinels, malformed snapshots, duplicate
  IDs, orphan relationships, missing referenced context, invalid lifecycle
  values/scores/dates and zero/multiple-profile cases;
- the source-only account-export artifact contract: exact pretty-printed JSON
  bytes and final line feed, Unicode byte length, fixed SHA-256, constant frozen
  filename/headers, empty data, malicious filename/content inputs, fail-closed
  manifest composition, retry determinism and route/provider isolation;
- the source-only account-deletion discovery contract: exact owner matching,
  fixed child-first order, numeric/string ID normalisation, exact counts, empty
  data, body/identity/other-user exclusion, malformed and duplicate records,
  multiple profiles, orphan children, cross-owner/cross-product cellar links,
  deep immutability, retry determinism and route/provider isolation;
- the source-only account-deletion reconciliation contract: strict persisted-plan
  shape/version/time/order/ID/count validation, complete/partial/empty states,
  later unplanned owner records, exact count-only output, invalid later
  relationships, deep immutability, retry determinism and route/provider
  isolation;
- zero, one and multiple-rating catalogue aggregates, including rejection of non-finite totals and absence of individual rating or cellar identifiers;
- score 1 validity and complete 1–7 rating validation;
- weighted/unweighted totals and submission IDs;
- profile/cellar input allowlists and ownership predicates;
- immutable session identity extraction;
- same-origin, request-size and rate-limit helpers;
- authentication action/method, redirect policy, and proxied cookie domain/path normalisation;
- the existing rating calculation utility.

The Playwright suite uses a deterministic same-origin API fixture and covers the
launch catalogue, product, rating, cellar and profile journeys. Brew Done It
coverage asserts that primary navigation omits the feature, a direct route is
redirected to the authenticated home screen, no playable control is exposed and
no game API request occurs. It also runs
automated accessibility checks on the reachable launch pages. This suite verifies
browser behaviour without requiring production credentials; it does not replace
the connected staging tests below.

The account-export tests exercise `api/_lib/accountExport.js` and
`api/_lib/accountExportArtifact.js` directly. They prove the exact in-memory
body and metadata, but do not exercise an HTTP response, recent authentication,
provider reads, a consistent remote snapshot, artefact retention or a
Profile-page download, because none of those surfaces is implemented. The
endpoint entry criteria in `docs/account-export-contract.md` require separate
policy, integration, browser, accessibility and connected staging coverage
before a user-facing export can be claimed.

The account-deletion discovery tests exercise
`api/_lib/accountDeletionPlan.js` directly. They do not perform provider reads,
authenticate or confirm a request, persist a job, fence writes, delete records,
revoke sessions, remove an authentication identity or prove final absence. The
executable-workflow entry criteria in
`docs/account-deletion-plan-contract.md` require separate policy, provider,
integration, failure-injection and connected staging evidence.

The account-deletion reconciliation tests exercise
`api/_lib/accountDeletionReconciliation.js` directly. They prove that planned,
removed, remaining and unplanned counts reconcile and that new owner data keeps
the result incomplete without exposing IDs. They still operate on a
caller-supplied in-memory snapshot: no provider query, write fence, deletion,
job state, session/identity check or final provider absence is exercised. The
entry criteria in `docs/account-deletion-reconciliation-contract.md` require
separate orchestration, provider and connected evidence.

`e2e/accessibility.spec.js` runs the WCAG 2.2-targeted axe rules against every
reachable launch page. The unreachable remote game is not represented as an
accessibility-tested production journey. Its focused Node policy tests are
retained so containment does not discard coverage of authorisation, privacy,
idempotency and state transitions. Those tests exercise the unapproved retained
two-account, invitation, shared-history, stored-scoring, retention and statistics
proposal; passing them neither makes that proposal authoritative nor approves
it for enablement.

A separately reviewed delivery of ADR 0001 must add browser and accessibility
coverage for the accepted same-device contract, including pass-the-device
privacy, catalogue-backed secrets and guesses, controlled questions, in-memory
scoring and statistics, completion, abandonment and rematches. Tests must prove
that refresh and sign-out clear game state and that no game API, `localStorage`
or other persistent write occurs.

## CI

Pull requests, pushes to `main`/`master`, and manual runs execute the release gate
and Playwright browser/accessibility suite on Node 20. Pull requests also attempt
the `Dependency review` job. The job has no `continue-on-error` setting and is
configured to fail when it finds a vulnerability of high severity or above.
Dependency Graph must be enabled in the repository settings for the dependency
review action to operate successfully. A failed job fails the workflow, but the
job only blocks merging independently when an administrator also configures
`Dependency review` as a required branch-protection check. Before treating the
Dependency Graph and Dependency Review configuration as complete, retain the
workflow URL, commit SHA and successful `Dependency review` result from a pull
request run. Repository files and local validation do not prove that either
remote setting is enabled. The production dependency audit remains blocking.
CodeQL runs on pull requests, protected branches, weekly schedule and manual
dispatch.

### Release validation evidence (4 August 2026)

The required commands were run from the repository root against commit
`7f32f981abfe03574d2dde5fdeba9601e64f3697` with Node.js `v20.20.2`. No
credentials or personal data were used. These results replace, but do not turn
into passes, the earlier HTTP 403 validation attempts.

| Command or workflow | Exact commit SHA | Test totals | Final result and retained evidence |
| --- | --- | --- | --- |
| `npm run validate` | `7f32f981abfe03574d2dde5fdeba9601e64f3697` | ESLint passed; 152 Node tests passed (152 passed, 0 failed); later stages did not run | **Environment-blocked / failed.** The npm advisory bulk endpoint returned HTTP 403 during `npm audit --omit=dev --audit-level=high`; the production build, bundle-budget check and browser release-security check consequently did not run within `validate`. This is not a successful validation. |
| `npx playwright install --with-deps chromium` | `7f32f981abfe03574d2dde5fdeba9601e64f3697` | No browser installed | **Environment-blocked / failed.** The configured proxy returned HTTP 403 for the Ubuntu, mise and LLVM package repositories, and Playwright exited with code 100. |
| `npm run test:e2e` | `7f32f981abfe03574d2dde5fdeba9601e64f3697` | First required invocation: 0 tests started because the preview server timed out without a build from the interrupted validation; diagnostic rerun after `npm run build`: 24 failed, 0 passed | **Environment-blocked / failed.** All 24 tests in the diagnostic rerun failed at browser launch because the Chromium executable was unavailable. Neither invocation is a pass. |
| Hosted `Browser and accessibility` | Not available | Not available | **Blocked; no run URL or result retained.** This checkout has no Git remote and `gh auth status` reports no authenticated GitHub host, so no hosted workflow could be dispatched or inspected. No hosted pass is claimed. |
| `Connected staging release check` (G22) | Not available | Not available | **Blocked; not run.** No immutable staging URL, deployed SHA, protected-environment credentials, Git remote or authenticated GitHub session was available. Consequently there is no workflow URL, test total or final result to retain, and G22 remains blocked. |

The hosted `Browser and accessibility` and connected staging results remain
required. A reviewer must not treat any local HTTP 403, missing-browser or
missing-remote result above as a test pass or release evidence. The connected
workflow must still be run with an immutable HTTPS deployment and its full
deployed SHA, after which its URL, totals and final result must replace the
blocked entry above.

The final-schema, additive-schema-delta and import audit CLIs are exercised
through their Node regression tests. Environment-specific exports are
intentionally supplied at release time rather than committed to the repository.
Checkpoint S1 uses `npm run audit:schema:additive -- --baseline <before.sql>
--candidate <after.sql>` to reject changed legacy definitions, unapproved
tables or fields, premature constraints and incompatible compatibility-column
types before backfill begins.

The opt-in provider-contract suite uses the canonical rating and score fields,
verifies that a controlled non-date update preserves `date_rated`, exercises
duplicate and compare-and-set conflicts and retains a redacted transcript when
configured. It refuses destructive execution unless the operator supplies the
exact `isolated-staging` environment marker, an explicit destructive opt-in and
disposable user/product/attribute fixture identifiers. The default unit run
continues to skip this connected suite.

The manual `Connected provider contract` workflow is the protected connected
execution path. It is full-SHA pinned, gated by the `staging-release`
environment and an exact destructive confirmation, and retains a redacted
transcript whose cleanup section is verified before upload. The default test
run also statically checks that those controls cannot be removed unnoticed.

`npm run audit:baseline -- --manifest <manifest>` verifies a private same-state
baseline package. `npm run audit:import:rehearsal -- --manifest <manifest>`
verifies the three private before/first/rerun export sets, exact historical
reconciliation, rejected-record coverage, orphan/duplicate zeroes and rerun
idempotency. Both commands fail closed, emit aggregate JSON only and are
covered by synthetic regression fixtures; neither command makes a connected
provider claim without the private evidence files and independent review.

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
