# Testing

## Local release gate

Use the governed Node.js 22 runtime and run:

```bash
npm ci
npm run platform:validate
npx playwright install --with-deps chromium
npm run test:e2e
```

`platform:validate` is the canonical source-validation entry point and delegates
to `validate`.

### Validation execution hierarchy

Use the strongest available execution path in this order:

A. canonical repository executor  
B. trusted alternate execution environment  
C. exact-commit deployment/build that executes equivalent required commands  
D. **VALIDATION WAITING**

Never represent an unexecuted check as PASS. An empty or zero-step Platform Validation job is unavailable/no evidence, not an application failure. A substantive failure from any executed required check remains actionable.

When validation is waiting, retain the debt explicitly and avoid growing overlapping implementation WIP beyond the repository limits. Independent work may continue only when it does not materially increase integration risk.

The validation pipeline runs:

1. package-lock contract validation;
2. project-document/autonomous-handoff governance validation;
3. Node runtime-contract validation (`.nvmrc`, `package.json`, active guidance and CI alignment);
4. NoCodeBackend environment-contract validation;
5. ESLint;
6. Node unit/policy tests;
7. a high-severity production dependency audit;
8. the production Vite build;
9. gzip JavaScript bundle budgets;
10. Brew Done It route, navigation, production-bundle and normal-environment
    containment; and
11. browser release-security checks.

Production source maps are disabled.

`npm run check:brew-containment` runs after the production build. It requires
the Brew Done It page import and route path in `src/App.jsx`, its browser bundle
surface, hidden production navigation and the v3 server policy-gate contract.
It also rejects explicit `false` defaults in `vercel.json` and `.env.example`;
it does not prohibit all game references or flag settings. This static check
does not verify the deployed flag state or connected gameplay. Unset-flag denial
remains covered separately by Node policy tests; applicable Playwright and
accessibility coverage remains required.

## Admin catalogue review coverage

Node policy/handler tests cover exact provider role spellings, one fresh
identity-bound session read, demotion on the next request, missing/metadata-only
roles, forged caller IDs/roles, safe capability projection, method/path rejection,
anonymous denial, no-store and zero profile/data-collection access. Browser
response validation rejects another subject, added fields and mutable capabilities.

`e2e/admin-catalogue.spec.js` uses synthetic same-origin fixtures to verify the
Admin entry, ordinary/forged-browser denial, wrong-subject fail-closed/retry,
search/type/detail/back navigation, zero values, pagination, error/empty/retry,
late responses after logout, keyboard use, mobile overflow and scoped axe checks.
These tests do not prove provider role permissions or a real account's UI journey.

The protected main-only `admin-role-source-assessment` workflow observes two
independently verified normal sessions, classifies only allowlisted static role
symbols, GETs each session's own review capabilities, compares expected access,
and signs out. It retains a redacted report with exact source/target SHAs and
ALLOWED/DENIED/UNAVAILABLE verdicts, never account IDs/emails/cookies/provider
bodies. A matching Admin/ordinary capability pair is bounded read-only evidence;
`authorityCertified` remains false, and provider role-write denial/revocation
remain NOT_RUN. See [the permission contract](admin-permission-foundation.md).

## Moderation target checks

The existing data-contract check now validates the deferred moderation target.
`node --test scripts/__tests__/moderation-contract.test.js` verifies guard removal,
unsafe field widening/promotion, independent content/record versions, stale review,
producer dependencies and the preserved restricted-dependency exposure rule,
legacy/new missing state, state-specific original-owner resubmission,
restricted exposure, actor-bound replay, blocked/unknown operations and large
string IDs. The evaluator is an offline synthetic-fixture interpreter, never a
server authorizer or provider adapter. Its ELIGIBLE result is not a durable
commit. Source validation cannot qualify #701 staging, permission, concurrency,
crash recovery or snapshot/restore. See the
[target/migration package](nocodebackend/moderation-migration-plan.md).

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
- the source-only account-deletion confirmation contract: exact ASCII phrase,
  plain one-field shape, case/whitespace/control/invisible/Unicode negatives,
  identity/record/job-field smuggling, symbols/non-enumerable fields, accessors,
  non-coercion, safe errors, immutable output and route/provider isolation;
- zero, one and multiple-rating catalogue aggregates, including rejection of non-finite totals and absence of individual rating or cellar identifiers;
- the browser catalogue response boundary: exact public field shapes, coherent
  empty/full/final-page metadata, unique stable IDs, render-safe scalar/image
  values, matching optional producer/category relationships, aggregate-only
  detail summaries, private-rating rejection, safe non-echoing errors, deep
  immutability and enforcement by both service reads;
- request-bound catalogue identity: exact provider page/page-size and
  full/terminal item counts, direct/fallback provider record IDs, canonical
  browser product IDs rejected before network access, exact detail response ID
  matching, safe not-found behaviour and provider substitution failure;
- score 1 validity and complete 1–7 rating validation;
- weighted/unweighted totals and submission IDs;
- profile/cellar input allowlists and ownership predicates;
- immutable session identity extraction;
- sign-in/sign-up acknowledgement fallback to the authoritative session endpoint
  and rejection when no authenticated session can be resolved;
- fail-closed provider discovery loading, malformed, configuration and service
  failure states with no inferred password form;
- safe public shared-limiter configuration-versus-service error codes, request
  correlation and secret-redaction behaviour;
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

Private profile history regression coverage exercises page-bounded enrichment,
whole-history counts/average, canonical rating selection on older pages, repeat
tastings, invalid and other-owner selectors, mandatory owner-read failures,
optional enrichment failures, a shared enrichment deadline and request-local
relationship deduplication. Browser cases follow a beer-page score to its exact
profile entry, reload/back navigation, page controls, transient failure/retry,
stale-response rejection and deletion of the selected last item on an older
page. Existing keyboard-focus and automated accessibility checks cover the
updated list, links and recovery controls. Mocked cases prove browser/policy
behaviour; connected deployment/provider reads remain separate evidence.

`release-check/profile-history-readonly.spec.js` follows an existing completed
owner tasting from its beer page into a paginated profile, injects one bounded
503 and retries against the actual provider, then verifies three reloads. It
also checks that a separately authenticated account receives the safe 404 for
the owner's canonical rating link. These checks create or delete no ratings;
missing owner fixtures or second-account credentials are explicitly skipped
and remain pending evidence. Traces, screenshots and videos are disabled for
these cases to keep private ratings and sign-in credentials out of artefacts.

The connected suite has a finite sign-in budget (ten attempts per account/IP
over 15 minutes). Read-only owner journeys may reuse a session created by the
suite, verifying it with `auth/get-session` and the expected owner before each
reuse. The explicit password sign-in/sign-out test continues to authenticate
directly, and other-account sessions remain separate. A missing or expired
owner session requires a fresh sign-in; failed authentication-service
verification remains a failure. The optional session file is bound to release
SHA, target origin and a digest of the owner identity, contains only target
cookies, uses mode `0600`, lives in the runner's temporary directory outside
artifact paths, and is removed by an always-run cleanup step. Without that
configured temporary path, the harness uses fresh sign-ins as before.
The connected Playwright suite collects only `.spec.js` files; Node unit
fixtures under `release-check` run through canonical Node validation instead of
executing during connected test discovery.

The catalogue fixture now follows the aggregate-only detail contract. Focused
browser cases supply malformed successful browse and detail responses, a
non-canonical direct route and an exact missing route. They check that labelled
alerts and keyboard-operable retry buttons appear without the application error
boundary, that an invalid ID makes no catalogue request, and that browse failure
replaces the result count with an announced failure status. The invalid-route
state exposes a back link instead of a futile retry, while exact not-found and
remote failures retain both recovery choices. A mocked browser
pass still does not prove the
connected provider, deployment or WCAG evidence required by `PF-P3-01`; see the
[catalogue response contract](catalogue-response-contract.md).

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

The account-deletion confirmation tests exercise
`api/_lib/accountDeletionConfirmation.js` directly. They prove exact text and
request-shape behaviour without creating an endpoint. They do not exercise JSON
body limits, same-origin protection, rate limiting, recent authentication,
session-derived identity, an accessible confirmation UI, provider operations or
deletion. The entry criteria in
`docs/account-deletion-confirmation-contract.md` require separate integration,
browser, accessibility, security and connected evidence.

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

Pull requests, pushes to the configured implementation branch families, and
manual runs execute the release gate and Playwright browser/accessibility suite
using the governed Node 22 runtime from `.nvmrc`. Pull requests to the governed integration branches
also attempt the `Dependency review` job. The job has no `continue-on-error`
setting and is configured to fail when it finds a vulnerability of high severity
or above. Dependency Graph must be enabled in the repository settings for the
dependency review action to operate successfully. A failed job fails the
workflow, but the job only blocks merging independently when an administrator
also configures `Dependency review` as a required branch-protection check.
Before treating the Dependency Graph and Dependency Review configuration as
complete, retain the workflow URL, commit SHA and successful `Dependency review`
result from a pull request run. Repository files and local validation do not
prove that either remote setting is enabled. The production dependency audit
remains blocking. CodeQL runs on configured pull requests, implementation branch
families, weekly schedule and manual dispatch.

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

Follow the [step-by-step rating/profile acceptance and gateway certification guide](nocodebackend/rating-workflow-certification.md#step-by-step-acceptance-and-certification-guide) for deployment selection, repeat loading, exact-entry links, recovery, account isolation and the separate controlled-write gate.

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

### Cellar HTTP checkpoints and redacted release evidence

The connected cellar mutation case requires `RELEASE_CELLAR_RECEIPT_DIRECTORY`,
a valid `RELEASE_SHA` and a dedicated `RELEASE_FIXTURE_ENCRYPTION_KEY`
for its Node-only encrypted writer. Both normal account sessions must resolve
the configured addresses and distinct identities before fixture creation.
The server still supplies application ownership; the recorded owner ID is
private recovery evidence.

`withCellarCleanup` persists original nonce/product/baseline and create intent
before POST, response status before JSON parsing, and the full original
acknowledgement before verification. Every owner update, cross-owner denial and
cleanup step records an allowlisted phase/status. One owner create/update/delete
is counted separately from two denial requests. HTTP mutations disable retries
and redirects. A failed evidence write blocks subsequent fixture mutations;
unknown responses never authorise a replay or guessed deletion.

The existing AES-GCM receipt format is reused. `fixture-receipt.json` contains
the private original evidence; `summary.json` contains only fixed phase/status,
counter and outcome fields. Files are written as private temporary files and
renamed atomically, and retained by the always-run artifact step. They are
runner-local checkpoints, not remote provider backups or a guarantee against
loss of the whole worker.

The workflow runs from main, checks out an exact reviewed main ancestor before
dependency execution, and verifies deployed provenance before credentials.
It shares `bounded-current-instance-cellar-certification` concurrency with
the existing cellar worker. It runs the redacted reporter with retries disabled,
captures raw stdout/stderr in a private runner log, and removes that log/session/
raw report directories in an always-run cleanup step. Capture is disabled for
traces, screenshots and video. Artifact paths are explicitly limited to
`release-security-check.txt`, `release-summary.json` and the cellar's encrypted
receipt/redacted phase summary. An early runner failure can produce no summary;
that is unavailable evidence, not PASS.

Reporter case IDs are fixed source filenames and line numbers for the four
reviewed connected specs. Unknown identities, duplicate/missing outcomes, global
errors and evidence-write failures fail closed. Skipped checks remain SKIPPED.
Local/private developer reporting does not qualify retained connected evidence.

`npm run test:release` is a separately controlled Playwright suite for an
immutable, production-equivalent staging deployment. It uses
`playwright.release.config.js`, only discovers tests in `release-check/`, does
not start a local web server, and never imports or installs `e2e/mockApi.js`.
The HTTPS deployment is therefore the source of all client, authentication and
application-data responses.

Run the **Connected staging release check** workflow manually after deploying
the exact reviewed main-branch candidate with the certified staging backend
configuration. Supply the immutable deployment URL and full deployed commit SHA.
The workflow runs from main, verifies that SHA is a reviewed main ancestor,
checks it out before dependency execution and uses the protected `staging-release`
GitHub Environment. Configure required reviewers and prevent administrators
from bypassing its protection rules.

Use dedicated, non-personal accounts for the account secrets below. The fixture
encryption key is independent of provider credentials and account passwords.
Provider administration credentials remain owned by the deployed server runtime.
Never put secret values in repository variables, workflow inputs, command-line arguments, traces
or committed `.env` files:

| Secret | Purpose |
| --- | --- |
| `RELEASE_OWNER_EMAIL`, `RELEASE_OWNER_PASSWORD` | Primary owner journey and mutations |
| `RELEASE_FIXTURE_ENCRYPTION_KEY` | Dedicated 32 random bytes encoded as canonical Base64; required before cellar writes |
| `RELEASE_OTHER_EMAIL`, `RELEASE_OTHER_PASSWORD` | Other-user authorisation boundary |
| `RELEASE_SIGNUP_EMAIL`, `RELEASE_SIGNUP_PASSWORD` | Optional fresh sign-up address; rotate after use |
| `RELEASE_OTP_EMAIL`, `RELEASE_OTP_CODE` | Required when OTP is enabled; inject a short-lived code immediately before the controlled run |

Generate this encryption key locally with `openssl rand -base64 32` and save the
output directly as `RELEASE_FIXTURE_ENCRYPTION_KEY` in the protected
`staging-release` Environment. Do not send it in chat or reuse a provider key or
account password. Retain it securely while encrypted recovery artefacts exist;
rotating it without retaining the previous key makes those artefacts unreadable.
The writer rejects missing, malformed, noncanonical or incorrectly sized keys
before baseline reads or mutations. Read-only checks do not require this key.

The workflow sets local output paths in `RELEASE_CELLAR_RECEIPT_DIRECTORY` and
`RELEASE_EVIDENCE_DIRECTORY`; these paths are not credentials.

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

The workflow retains only the redacted case/phase summaries, encrypted cellar
receipt and browser-build security result for 30 days in an artifact named with
the deployed SHA. Record its workflow URL, exact deployment/SHA, start/end time,
backend certification reference and artifact digest in the release record.
Never publish the decryption credential or decrypted receipt. Credentials,
cookies, OTPs, request bodies and private browser diagnostics are excluded from
the retained report paths.

Guarded cases attempt exact-ID fixture cleanup and verify absence; interruption
or an unconfirmed response is not cleanup evidence. Inspect the original
receipt before another write and never select a deletion target from a later
history difference or QA prefix. The operator must separately remove/rotate any
optional sign-up fixture account and restore any intentional profile fixture
changes.

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


## Protected user/admin credential certification

The guarded cellar runner's account-authentication failures identify only the
static `authAccount` (`owner` or `other`), `authStage` (`sign-in`, `get-session`
or `sign-out`) and observed HTTP `authStatus`. A transport failure has no
invented HTTP status. `sessionCleanup: UNCONFIRMED` is retained independently
when sign-out fails. These fields distinguish a rejected account from a gateway
or rate-limit failure without recording emails, passwords, cookies, user IDs
or response bodies. No account or provider mutation is retried automatically.
See the [existing policy record](nocodebackend/connected-policy-certification.md)
for the latest configuration and bounded-run evidence.

Issue #577 provides a read-only Vercel Preview certification at:

`POST /api/certification/user-admin`

The endpoint exists to consume the Vercel-owned user/admin Secret Keys without copying them into GitHub or chat. It is intentionally unavailable outside `VERCEL_ENV=preview`.

Send JSON:

```json
{ "confirmation": "RUN READ-ONLY USER ADMIN CERTIFICATION" }
```

Run it only through a Vercel-authenticated/protected Preview deployment. The response contains configuration booleans and capability statuses only. A healthy Secret-Key preflight is expected to return `overall: INCONCLUSIVE` while `accountSessionAuthentication` remains `SETUP_REQUIRED`: database Secret Keys prove server-to-server provider access, not user login sessions.

Do not treat this result as #144 connected policy completion. Session identity, cross-owner authorization and revoked/expired-session evidence require supported account login credentials. The endpoint performs no mutation, no cleanup-sensitive action, no #165 schema work and no `/ratings/reconcile` call.

