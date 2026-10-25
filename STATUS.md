---
project: Pourfolio
portfolio_state: READY
execution_slot: WAITING
phase: "Phase 3 — Beer discovery dependable"
stage: "Obsolete v1 scoring source retired; external provider, data and operations gates open"
gate: Release
execution_state: BLOCKED
current_work:
  objective: "Obtain authoritative bonus allocations and supported second-account access; complete the existing #165 provider/recovery package before final release qualification."
  issue: 144
  pr: null
  branch: "main"
next_actions:
  - "The bounded #682 v1 scorer retirement preserves current v2/v3 functionality. Keep #429 open and require new reachability/retention proof before any further cleanup."
  - "Use #680's before/after preservation checks with the authoritative point plan and complete private evidence; actual provider backfill and history/recovery qualification remain separate gates."
  - "Use #678's corrected canonical bonus_attribute_id checks when auditing fresh same-state baseline/import-rehearsal evidence; historical or mixed-column exports are not current-contract evidence."
  - "Terminal-rating containment and the read-only point-plan auditor are integrated in #676/#677; retain the distributed concurrency boundary under #165 and use the existing evidence package."
  - "Obtain authoritative exact-ID bonus values and complete reviewed bounded backfill with post-write verification; labelled defaults do not satisfy the selected launch gate."
  - "Correct RELEASE_OTHER_PASSWORD securely, then complete distinct-account session/cellar/profile certification with the current exact auth_release_sha; no unchanged HTTP 401 retry."
  - "Complete #165 provider mechanism, consistent snapshot and isolated restore evidence before irreversible migration or historical repair; then close #144/#154 acceptance."
  - "Complete publication, monitored support, named operations owners, anonymous production access and final exact-candidate release qualification."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "Unconditional parent transitions and late child writes lack certified distributed integrity. Provider uniqueness/atomic workflow, consistent backup, isolated restore and approval for irreversible changes remain required."
  - scope: connected_backend_and_bonus_values
    issue: 144
    detail: "The second account sign-in returns HTTP 401 with all four fields present. Authoritative bonus allocations, governed backfill, remaining connected policy and recovery evidence are unavailable; #577 implementation is closed."
  - scope: persistent_profile_privacy
    issue: 422
    detail: "Provider uniqueness/default-private creation, persisted opt-in/revocation, copied links and cross-owner denial still need connected certification."
requires_owner_decision: false
owner_decision:
  question: null
  recommendation: null
wip:
  open_implementation_prs: 0
  dependent_stack_depth: 0
  max_open_implementation_prs: 3
  max_dependent_stack_depth: 2
evidence:
  observed_main_commit: "6daa4265757dfa24fadee8cea98ffe874141ca56"
  current_candidate_commit: null
  latest_validated_commit: "8619af59705379fb3d337d83621a94a7f583bb6a"
  latest_deployed_commit: "70c3a18982db276b89a5c8c7b26048d58f854e1a"
  latest_runtime_verified_commit: "70c3a18982db276b89a5c8c7b26048d58f854e1a"
  latest_browser_verified_commit: "8619af59705379fb3d337d83621a94a7f583bb6a"
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PENDING
  runtime: NOT_APPLICABLE
last_verified_commit: "8619af59705379fb3d337d83621a94a7f583bb6a"
last_updated: "2026-10-25T05:28:02Z"

---

# STATUS.md

Last materially reviewed: 25 October 2026 UTC

## AI execution gate

### Bounded obsolete scorer cleanup — 25 October 2026 UTC

Entry main is `6daa4265757dfa24fadee8cea98ffe874141ca56`; #681 is merged,
#680 is closed and there are no open implementation PRs. Its accepted head
`020bf6b0` passed 1,054 source tests, 15 gated skips and 158 browser/accessibility
cases; exact integrated-main canonical validation also passed. The allocation
branch still supplies no point plan, and no corrected second-account input or
new provider recovery evidence is available. No unchanged credential retry ran.

Issue #682 progresses the existing #429 cleanup independently. Repository-wide
search finds no consumer of `brewDoneItScoring.js` except its own eight tests,
and no import glob/dynamic module loader selects it. Its v1.0.0 rules are
superseded by ADR 0002/0006. Retire only that orphaned utility/test pair; retain
the active v2 compatibility dispatcher, v3 scorer, gateway/recovery, historical
provider records and approved contained/future source. The old detailed v1
schema proposal is labelled historical with current authority links; its tables
and ADRs remain. The stale generic data-proxy reference is corrected to the
actual dispatcher without altering routing.

All 13 retained v2/v3 scoring regressions pass. Canonical Node 22.23.4 validation
passes 1,046 tests with 15 provider-gated skips, zero failures and zero production
vulnerabilities. The passing-test count drops by exactly the eight deleted tests
whose only subject was the retired helper; no current-contract test changes.
All 40 production-client files are byte-identical before/after removal, with
manifest SHA-256 `f1d4889a3a477c35aae32840ddd6f022d9326971e97aee17d2b9663ab78ed84f`.
[PR #683](https://github.com/jeremytheva/pourfolio/pull/683) source head
`8619af59705379fb3d337d83621a94a7f583bb6a` passed canonical validation on its
exact local checkout and independently in hosted run
[40165358247](https://github.com/jeremytheva/pourfolio/actions/runs/40165358247),
Release gate job `121085174119`. Browser/accessibility job `121085174160` passed
all 158 cases. Final-candidate checks and integration evidence remain in the PR;
these source results do not qualify live provider/runtime acceptance. No new scoring, provider mutation, history recalculation or game enablement occurs.
#429 remains open beyond this bounded slice; all existing public NO-GO gates
remain open.

### Bonus backfill preservation preparation — 25 October 2026 UTC

Entry main is `a928060d06c24bd17de76baee9619753a82dd978`; #679 is merged,
#678 is closed and there are no open implementation PRs. Its exact final head
`44f325ac` passed 1,043 source tests, 15 provider-gated skips and 158 browser/
accessibility cases; integrated-main canonical validation also passed. Those
are retained source results, not qualification of this new candidate.

Issue #680 extends the existing point-plan auditor for the launch plan's
required preservation evidence. Earlier post-only verify could pass while a
private attribute changed or disappeared; its documented scope did not prove
preservation. Verify now requires complete before/after snapshots of the same
environment and an ordered UTC capture interval, and permits only reviewed missing
global point fills. It preserves existing explicit values, private rows and all
other supplied fields, verifies exact fill counts and fingerprints all three
inputs. Eight initial regression groups failed against the prior behaviour;
all 22 focused cases now pass under Node 22.23.4. Canonical validation passes
1,054 tests with 15 provider-gated skips, zero failures and zero production
vulnerabilities. [PR #681](https://github.com/jeremytheva/pourfolio/pull/681)
source head `abf1f11564d3d8e4cb82d95361c19209233fc678` passed canonical validation
on its exact local checkout and independently in hosted run
[40162291112](https://github.com/jeremytheva/pourfolio/actions/runs/40162291112),
Release gate job `121076181186`. The final documentation head and integration
require their own evidence in that PR. Browser/runtime references retain earlier
verified baselines; no source check qualifies a connected release. No provider access, data write, history recalculation
or credential retry occurs. Supplied evidence is not proof of provider completeness,
concurrency, recovery, review or live historical-total preservation.

The credential, authoritative allocation, #165 recovery, #144/#154 certification
and #422 privacy prerequisites remain open. Public launch remains **NO-GO**.

### Canonical bonus evidence-auditor repair — 25 October 2026 UTC

Live main is `6f72b17dd9d138793be57666cd211d3022e45a89`; there were no open
implementation PRs at entry. The expired bonus-allocation branch has no diff
from that main and has not supplied an allocation. Its former lease was
reconciled before acquiring the bounded catalogue/integration claim.

Issue #678 repairs a reproduced #144 source defect: the baseline-bundle and
import-rehearsal auditors still checked historical `bonus_attributes_id`,
despite the canonical contract, target schema and connected 4 October evidence
using `bonus_attribute_id`. Canonical synthetic exports failed while a
legacy-only baseline passed. Six of eight initial regression cases failed
before the fix. The corrected ten focused cases pass under Node 22.23.4,
including empty pre-import evidence, legacy/mixed headers, canonical orphans
and duplicate pairs despite declared zeroes. Canonical Node 22.23.4 validation
passes: 1,043 tests, 15 provider-gated skips, zero failures and zero production
vulnerabilities. The first local run's sole failure was an experimental managed
proxy warning in a subprocess that requires empty stderr. Rerunning with only
that runtime warning disabled passed without changing tests or proxy controls.
[PR #679](https://github.com/jeremytheva/pourfolio/pull/679) head
`4e90b8fc1e9b0c71ec49e280b636b5018b72729d` passed canonical validation both locally
and in substantive hosted Release gate job `121066492047` of run
[40159035452](https://github.com/jeremytheva/pourfolio/actions/runs/40159035452).
The same run's browser/accessibility job `121066492211` passed all 158 cases;
Dependency Review, CodeQL, preview deployment status and conflict/review checks
also passed. Final documentation-head checks and merge evidence remain in that
PR. Validated/browser commit references identify this source-only result;
deployed/runtime references retain the earlier verified baseline and its
bounded claims. No source check certifies connected provider state.

This workspace is writable and a governed Node 22 runtime is available. The
historical files remain unchanged. Reinspection of the supplied bonus CSV
confirms 82 rows, one explicit 0.50 value and 81 absent values. No reviewed exact-ID point allocation was recovered from the supplied
workbooks' selections/import mappings. No provider data, schema, credentials or account setting was
changed or retried. #165/#144/#154/#422 and public launch remain open/NO-GO.

### Adopted public MVP launch preparation — 24 October 2026 UTC

The owner approved the reviewed readiness-gated public MVP on the existing Vercel
URL and selected verified bonus point-value backfill as a prerequisite. Keep the
current login-first scope. Do not publish a fixed date, infer missing values or
assign ownerless cellar rows.

The initial 24 October baseline was `c679192abb1de594d9268a4b85751db93cf6e768`;
source preparations #676/#677 have since integrated as `70c3a189`.
Post-merge run [39951489367](https://github.com/jeremytheva/pourfolio/actions/runs/39951489367)
has substantive passing Release gate job `120406768104` and Browser and
accessibility job `120406768386`; connected rating/bonus/cellar jobs skipped.
Authenticated Vercel metadata confirms production
`dpl_4DjMJaywW2bMkyWGNrrqGEEewXGz` READY at that SHA. PR #674 retains
23 October 12:13 UTC exact production health/readiness. The frontmatter's evidence fields now identify the integrated `70c3a189`
source/runtime baseline, with exact source and bounded HTTP evidence below;
they do not infer final preparation-branch or owner-write qualification.
New source/documentation changes need their own exact-head canonical/browser
results retained in their PRs. Launch reconciliation is PR #675; its first
hosted check caught a fractional-second timestamp outside the governed status
format. The timestamp is corrected without weakening the guard; the replacement
head requires a complete fresh run. No connected write or fresh HTTP pass is inferred.

The review reproduced a stale completion overwriting concurrent deletion using
the unchanged transition function and in-memory provider snapshots. It also
reproduced observed-terminal retry child creation before an eventual error.
Implement the latter containment independently; #165 still requires certified
conditional parent transitions plus prevention of in-flight late child writes.
The existing compare-and-set method, sequential readback and expiring locks do
not establish distributed graph integrity.

Closed #503/#449/#577 implementation must not be recreated. Remaining connected
acceptance belongs to #165/#144/#154/#422. The current second-account boundary is
run 39732649601: all four fields present, owner lifecycle passed, other sign-in
HTTP 401, zero writes. Authoritative bonus allocation was not found in the
repository or targeted source search; no fallback is converted into stored truth.

The local filesystem is read-only, including /tmp, so source work uses bounded
GitHub branches and the repository's hosted Node 22 executor. An anonymous HTTP
probe was unavailable before receiving a response; public access was initially
UNVERIFIED, distinct from READY deployment metadata; the later hosted result
above now verifies HTTP entry at exact production `70c3a189`. No source change qualifies
privacy/legal, monitoring, support ownership, restore or public launch.
Public launch remains **NO-GO**.


### Anonymous production HTTP entry — 24 October 2026 23:00 UTC

The plain anonymous probe in run
[40140884697](https://github.com/jeremytheva/pourfolio/actions/runs/40140884697),
job `121012212054`, passed all eight fixed URLs: login, five public documents,
health and readiness returned same-origin HTTP 200 without credentials, cookies
or bypass headers. Both API responses identified production
`70c3a18982db276b89a5c8c7b26048d58f854e1a`; readiness reported provider OK.
Authenticated metadata independently identifies the same READY production SHA.

This closes only the HTTP_ENTRY_ONLY reachability/provenance check for that
version. It supersedes the initial local NOT_RUN result, and shows why protection
metadata alone could not determine visitor access. It does not approve draft
legal/support content, prove rendered browser accessibility, establish session/
owner writes or certify a later deployment. Final-head/source checks and any
subsequent exact deployment require their own evidence. Public launch remains
**NO-GO**.

### Integrated source preparations — 24 October 2026 UTC

PR #676 merged as `5c2bbd6b21f58222fd5546a4be226553925c7063`.
Accepted head `bd3987b6e1369e643aa23f0a5c9b11ddc3a284a6` passed canonical
Node 22, all browser/accessibility, CodeQL and Dependency Review in run
[40140190510](https://github.com/jeremytheva/pourfolio/actions/runs/40140190510).
Twelve added gateway cases cover observed-terminal replay/transition/hydration/
recovery and continued pending/failed retry. Independent review found no material
defect. Exact preview `dpl_3U2iy5gFJp29mdyyghAqzH3xTPXL` was READY;
this is deployment metadata, not a new connected or runtime HTTP PASS.

PR #677 merged as `70c3a18982db276b89a5c8c7b26048d58f854e1a`.
Resulting production deployment `dpl_945KiC6zYa98V3wKzsbVD8JqHhcv` is READY at that SHA
by authenticated metadata. Post-merge canonical job `121011699590` and browser job `121011699720`
both passed in run 40140717106. The anonymous HTTP_ENTRY_ONLY evidence above
verifies the same runtime SHA without qualifying owner writes or recovery.
Accepted head `d5fbe87a750e9340b14b6af26dc182f22ab32a1c` passed canonical
Node 22, browser/accessibility, CodeQL and Dependency Review in run
[40140477704](https://github.com/jeremytheva/pourfolio/actions/runs/40140477704).
Eleven focused cases include exact decimal-cent conflicts, existing explicit
value preservation, private-data exclusion, byte fingerprints and refusal of
write flags. Independent review identified and verified the precision correction.
Exact preview `dpl_3GT1yUSiMsiFnHx44ZxVmEApHMPJ` was READY.

The new offline `scripts/audit-bonus-point-plan.js` accepts a supplied reviewed
JSON plan and complete provider snapshot. Run `--mode preflight` before governed
backfill, then `--mode verify` with a fresh post-write snapshot. It reports
SOURCE_ONLY counts, static blockers and SHA-256 fingerprints; it does not fetch,
write or independently certify the supplied source/reviewer/completeness assertions.
It cannot prove private-row preservation across an external mutation without
the separate before/after evidence. Authoritative allocation and actual backfill,
provider atomicity/recovery, account isolation and public GO remain uncompleted.

The existing validation workflow now has an opt-in `[public-access]` push
diagnostic using plain anonymous GETs to the fixed production login, public
documents and health/readiness URLs. It has no credentials, bypass headers,
checkout or token permissions. It verifies same-origin HTML and matching
production provenance/readiness without logging bodies. HTTP_ENTRY_ONLY does
not certify legal content, browser accessibility, sessions or owner writes.

### Fresh read-only provider inventory — 24 October 2026 UTC

Run [40139643089](https://github.com/jeremytheva/pourfolio/actions/runs/40139643089)
at source `e597f10d739c1c425f62b6ce1e195cc69a2065af` executed the existing
protected read-only audits. No `--apply`, historical repair, schema change,
account login or connected fixture write was enabled.

- Rating job `121008518999` returned REVIEW_REQUIRED: 628 ratings examined,
  one completed/deleted contradiction with one surviving score child. It exited
  2 to retain that #165 finding; this is not a new source-validation failure.
- Cellar job `121008519140` returned LEGACY_OWNERLESS_PRESENT: 967 rows,
  966 ownerless and one existing owned-row readback OK. It exited 2; ownerless
  rows remain excluded and no owners were assigned.
- Bonus mapping job `121008519154` passed the singular `bonus_attribute_id`
  contract for 1,738 mappings. Point inventory remains 83 attributes: 82 global,
  one private, two explicit values and 81 missing/blank. The sole explicit
  global value remains 0.50. Mapping PASS does not satisfy verified point backfill.
- Source Release gate `121008519160` and Browser/accessibility
  `121008519161` passed for this head. New commits still need their own
  source/browser qualification; these read-only provider results do not qualify
  sessions, concurrent writes, recovery or public launch.

### Rating numeric-validation correction — 23 October 2026 (Australia/Sydney)

[PR #674](https://github.com/jeremytheva/pourfolio/pull/674) repairs a reproduced
source defect: boolean and array components could become numeric scores before
validation, and malformed stored totals could enter history/aggregate completion.
Raw value types are now checked before conversion; numeric DECIMAL strings and
zero Bonus/Burp remain valid. Historical components with unsupported types or
fractional values are omitted with the existing incomplete indicator. No
provider row, schema, missing bonus value or historical ownership was changed.

Accepted source `a85de85d07181df2a0fad51e9e5eeb775b29dadd` passed canonical
Node 22.23.3 validation: 1,014 tests passed, 15 provider-gated skips and zero
failures/vulnerabilities. All 158 browser/accessibility cases passed. PR run
39950402101 retains release job 120403171976 and browser job 120403172188;
Dependency Review, CodeQL and launch-impact checks passed. Published tree
`b6ab4c540e89572e9f27e8d0a728aa1fd23b42d2` matches the locally validated tree.
Exact preview `dpl_3itSFcGixzaE7tjBn7yQFuYRvBz5` is READY; health/readiness
returned HTTP 200 with matching source SHA and provider OK at 12:05 UTC.

Existing production `593b6010` is READY; the public alias returned matching
health/readiness HTTP 200 at 12:05 UTC. This handoff records the accepted source
before the final documentation commit/merge. PR #674 retains final-head checks
and the resulting deployment verification; earlier-head results cannot certify
that final head. Launch impact maps RATING, PROVIDER and ACCESS with no unmapped
tracked paths. Local Chromium download was truncated; the hosted browser run
supplies actual browser evidence rather than treating installation as a pass.

The next connected priority remains correcting the second release account's
supported login credentials before bounded isolation certification. No unchanged
HTTP 401 retry, connected fixture, migration or historical repair was attempted.
#165 provider/recovery, #422 privacy, missing data and manual operations gates
remain open. Public launch remains **NO-GO**.

### Bounded #429 privacy prototype retirement — 23 October 2026 (Australia/Sydney)

Fresh main `e1a855f9a939a0bb2cf276ad0014f27dd3a8d611` passed its post-merge
canonical and all 157 browser/accessibility checks (run 39910743410). Its existing
production deployment is READY with exact health/readiness and the prior normal
browser label/arithmetic evidence in PR #672. No completed rating/cellar fixture
or unchanged failed login was repeated.

The next independent #429 audit proved `src/components/PrivacySettings.jsx`
has no source, server, script, test or route consumer; repository search matched
only its own declaration/export, and no dynamic import glob loads it. Its save
handler persists only `localStorage.privacySettings`, not an application policy.
Only that obsolete 216-line component is retired. `Profile.jsx`, `profileService`,
server profile policy, rating Settings, approved contained modules, account
lifecycle foundations and Framer Motion remain unchanged. Existing local-storage
and provider data are neither migrated nor deleted; source is recoverable in Git.

A deterministic browser regression retains legacy public-sharing flags while
the server-private profile remains unchecked, saves `rating_history_public: false`
and remains private after reload. Accepted source
`733f0d4a40e659c076e0cbd97aa597da385c293a` passed canonical Node 22.23.3:
1,007 tests, 15 gated skips, no failures, zero production vulnerabilities;
all 158 browser/accessibility cases passed, including the new legacy-storage
regression. Run 39931167620, release job 120339517148 and browser job
120339517374, plus CodeQL/Dependency Review, retain that evidence. Exact preview
`dpl_EgrmFDUxrWAwBJ511oQWhoau47Qs` is READY and returned matching HTTP 200
readiness/provider OK at 09:23:17 UTC.

This handoff is prepared for integration of [PR #673](https://github.com/jeremytheva/pourfolio/pull/673)
and records the accepted source before the final documentation commit/merge.
The final head must pass its own canonical/browser checks; PR #673 retains those
results and the subsequent deployment identity/readiness. The impact guard maps
PRIVACY, DEFERRED, ACCESS and RELEASE with no unmapped changed source paths.
No connected profile setting was changed or certified. Broader #429 audit remains open.
Second-account HTTP 401, #165 recovery and connected #422 privacy certification
remain blocked at their existing boundaries. Public launch remains **NO-GO**.

### Explicit bonus default labels — 23 October 2026 (Australia/Sydney)

Issue #671 addresses the owner's confusion between a stored descriptor value
and the historical 0.2 fallback. Both bonus pickers now use one shared label:
missing/non-numeric values explicitly say `default; no stored value`, while
stored zero, 0.2 and two-decimal values retain their actual effective amount.
Selection, server-authoritative scoring, custom creation and provider data are
unchanged. Focused unit and deterministic keyboard/browser/axe regressions
cover both pickers, mixed totals and one-count multi-category selection.

[PR #672](https://github.com/jeremytheva/pourfolio/pull/672)'s accepted source
`ec4e2610b78139f1a4ab4499c9cfe31948501b5b` passed canonical Node 22.23.3
validation: 1,007 tests passed, 15 gated skips and no failures; all 156 browser/
accessibility cases passed. Run 39909653874 includes release job 120269420987
and browser job 120269421237. Production audit found zero vulnerabilities;
CodeQL and Dependency Review passed. Exact preview
`dpl_9ybf6sEzBqBg5RHKU5HKn2YdTbiH` is READY and returned matching HTTP 200
readiness/provider OK at 06:09:28 UTC. The expanded final regression additionally
checks desktop/mobile layout and overflow. That final head must pass its own
canonical/browser gates before integration; PR #672 retains those results.

The impact guard maps BONUS, ACCESS and RELEASE; unmapped `e2e/mockApi.js` is
deliberately classified under BONUS/ACCESS for its optional bonus fixture rows.
This integration handoff records accepted source before the final commit and
merge, not a new connected PASS. Observed production `cb311c0b` remains READY
and returned exact-SHA HTTP 200 health/readiness at 06:06 UTC. Verify the resulting
merged deployment separately. Wider connected browser evidence remains at its
recorded earlier candidates; do not repeat completed owner fixtures.

No connected credential retry or provider mutation was performed. The latest
guarded run remains 39732649601: owner sign-in/session/sign-out passed, other
sign-in returned HTTP 401, zero data writes. Correct the matching second-account
password securely before resuming isolation. The 81 missing global point values,
historical #165 recovery and manual operations gates remain open. Public launch
remains **NO-GO**.

### Second-account HTTP 401 isolated without data writes — 22 October 2026 UTC

The guarded diagnostic [run 39732649601](https://github.com/jeremytheva/pourfolio/actions/runs/39732649601)
at exact source `d7b0307f99dffc9ea967654952e022af07441840` verified current
production auth release `0c048ca8`, authenticated the owner and confirmed its
session/sign-out, then stopped at the other account's sign-in with HTTP 401.
At `2026-10-22T06:14:29.195Z`, the redacted report identifies
`authAccount: other`, `authStage: sign-in`, `authStatus: 401`; all four account
secrets are configured. Zero creates, updates or deletes were attempted;
cleanup NOT_RUN and no fixture was created. No unchanged credential retry follows.

[PR #670](https://github.com/jeremytheva/pourfolio/pull/670)'s reporting correction
passed canonical Node 22 validation: 1,005 passed, 15 gated skips, zero failures,
all 155 browser/accessibility cases, CodeQL and Dependency Review.
Exact preview `dpl_9pfywxutGKD82JQJxjfHYs8C7QtV` is READY. These are source/
diagnostic results; cellar A/B and the wider HTTP/session/privacy matrix remain
NOT_RUN. The supported next owner action is to correct `RELEASE_OTHER_PASSWORD`
securely for the configured second account and confirm its ordinary sign-in.
Database Secret Keys must never replace login passwords. No secret value
belongs in chat, repository evidence or artifacts.

This checkpoint records the accepted diagnostic source before integration;
verify the resulting main deployment separately. The bounded owner browser
lifecycle remains complete and public launch remains **NO-GO**.

### Second-account secret configuration and earlier failed attempt — 22 October 2026 UTC

The owner-supplied `RELEASE_OTHER_EMAIL` was saved under Environment secrets
in `staging-release`; the existing plain variable was left unchanged. Protected
[run 39725188768, attempt 2](https://github.com/jeremytheva/pourfolio/actions/runs/39725188768/attempts/2)
on exact `0c048ca8` confirmed all four account credential fields configured.
Canonical Node 22 validation passed 994 tests, 15 gated skips and zero failures.
The connected step then stopped with `BONUS_TEST_OWNER_AUTH_REJECTED` at
05:58:51 UTC: zero creates, updates or deletes; cleanup NOT_RUN. The shared
helper's old code is used for either account and did not retain the HTTP status,
so this result does not establish which account failed or why.

The existing runner now records only the static account role (`owner`/`other`),
authentication stage and HTTP status, plus unconfirmed session cleanup when
applicable. Credentials, cookies, user IDs and response bodies stay private.
Twenty-nine focused tests passed locally on Node 24, including both worker
failure paths, zero provider writes and redacted retained output. The canonical
Node 22 and guarded diagnostic results above supersede their former pending state.
Exact public health/readiness returned HTTP 200 for `0c048ca8` at 05:57 UTC;
this source-only diagnostic correction does not change deployed app policy.
The prior owner browser lifecycle remains complete. Public launch is **NO-GO**.

This checkpoint supersedes the older missing-email handoff below; no rating,
catalogue, historical ownership, missing bonus value or #165 migration changed.

### Current-instance cellar browser lifecycle verified — 21 October 2026 UTC

Production `50a104541b73e3eae9b9ac912c781b7e1d4cd274` is READY at
`dpl_3kT9Ecf7LmN4MGrsNcpU4Jk3u5oT`. Public health/readiness returned
HTTP 200 with that exact SHA at 22:25 UTC. Its existing canonical Node 22.23.3
run [39555891885](https://github.com/jeremytheva/pourfolio/actions/runs/39555891885)
passed 994 tests, 15 gated skips and all 155 browser/accessibility cases.
These existing checks were inspected, not rerun by the browser exercise.

At 22:28–22:30 UTC, the existing signed-in owner used normal production UI
for one new, uniquely tagged cellar item of product 1. Add acknowledgement
and a full cellar reload passed. The editor independently showed the stored
quantity, 330 mL, Can, prices 12.34/15.67, date and false gift flag. Before
submission, turning Gift off cleared its donor field.

One edit changed quantity to 2, volume to 500 mL, container to Bottle,
gift to true with a synthetic donor, and notes while preserving the marker.
Acknowledgement, a full reload and the reopened editor confirmed every
changed field and both unchanged prices. Marker search isolated one item.
Only that acknowledged item was deleted, once. The filtered list became
empty and focus moved to the cellar heading; a full reload restored the
original one-item baseline, including the unchanged product 374 entry.
**One add submission, one edit submission, one confirmed deletion; no
mutation retry and no remaining browser-visible test item.**

This closes the bounded deployed owner HTTP/browser lifecycle row, not the
whole policy matrix. No separate full provider-inventory audit was performed
for this browser exercise. Cellar A/B denial, expired/forged/revoked sessions,
profile privacy and broader release evidence remain open under #577/#422.
The retained release runner lacked `RELEASE_OTHER_EMAIL`; current protected
configuration could not be inspected through the connector's supported
metadata endpoint, so it remains unconfirmed, not newly proved absent.
Configure/confirm the supported account securely; do not disclose credentials
in chat or reuse database Secret Keys as passwords.

No existing cellar/rating row, catalogue record, historical ownership, missing
bonus value or #165 migration was changed. Public launch remains **NO-GO**.
The detailed scoped result is retained in the existing
[policy record](docs/nocodebackend/connected-policy-certification.md).

### React maintenance and containment documentation — 21 October 2026 UTC

PR #645 updated matched React/React DOM packages from 19.3.0 to 19.3.1 and
merged as `e1501f3be39ec4a9740db6305b07f00c2d193fb9`. Integrated source
`63da5fae` passed canonical Node 22.23.3 validation: 994 tests, 15 gated skips,
zero failures, all 155 browser/accessibility cases, CodeQL and Dependency
Review. The production dependency audit found zero vulnerabilities. This is
routine runtime maintenance, not evidence of an exposed RSC vulnerability or
a closed connected launch gate.

Production `dpl_5fo1aWPp5zuw5FhMCGDEBGsej1Yt` is READY. Public health and
readiness returned HTTP 200 with exact `e1501f3b` at 06:19 UTC. The prior
`9f57fec3` handoff was independently verified before integration; its bounded
30-minute production query returned no error/fatal log groups. This does not
qualify monitoring, alert ownership or service-level objectives.

The known valid `GET /api/nocodebackend/brew-done-it/games` returned HTTP 404
with the application route-not-found response at 06:19 UTC. This is one
read-only denial consistent with the deployed policy gate, not proof of the
literal environment value or connected gameplay. Security/testing prose now
matches the controlled protected browser route, hidden navigation and actual
source-presence/policy checks. No flag, route or game capability was changed;
Brew Done It remains launch-excluded.

Issue #449 is closed for delivered cellar source work; the wider connected
HTTP/browser/isolation rows remain partial. No owner fixture, prior rating
denial, schema change or provider write was repeated. The second-account
configuration remains unconfirmed; #165 recovery/provider authority and the
manual operations gates remain open. Public launch remains **NO-GO**.

Only maintenance PR #646 remains deferred: Framer Motion has no importer in
the current launch entry's static/lazy import graph, and its old-base tests
do not qualify a current merge. This checkpoint records the application
baseline before the documentation commit; verify that resulting deployment
separately.

### Review fixes integrated; connected qualification waiting — 20 October 2026 UTC

[PR #657](https://github.com/jeremytheva/pourfolio/pull/657) merged as
`27abe18b492d35397a2f0799b7be2d14cdf92548` after canonical Node 22 validation
(994 tests passed, 15 gated skips), all 155 browser/accessibility cases and
security checks. It fixes persisted gift verification, the shared 10-second
write deadline and nonce-bound fixture cleanup. Its production deployment
`dpl_8zU9UWCuTLDszx3fAbZ4AsCKHEb6` returned matching HTTP 200 health/readiness.

The upgraded axe checks in [PR #647](https://github.com/jeremytheva/pourfolio/pull/647)
exposed catalogue/history link-name defects. Accepted source
`0ef8f4e4a190090343c2dc99925af457466e4ada` passed canonical Node 22, browser/accessibility and
security validation after correcting natural names and the card structure.
Current production `2e9186fb82320a2253645be7b806f93141d9940c`, deployment
`dpl_9zkzbvefVVNNbmUJUg2F1eu6sRoH`, is READY with matching HTTP 200 health/readiness.
This is source/browser and deployment readiness evidence, not connected owner
CRUD or complete release certification. No ordinary implementation PR remains;
runtime maintenance PRs #645/#646 are non-blocking and deferred.

This records the verified application baseline before the handoff's workflow/
documentation commit. Verify that resulting deployment separately; do not
infer a connected launch PASS from a documentation or workflow-input merge.

The cellar/bonus manual workflows now require `auth_release_sha`; session-based
certification checks exact auth provenance before login or mutation. The bonus
configured-contract-user path remains provider-only evidence and supplies no
session proof. Eight
release-target tests and parsing of both workflows/five SHA pins passed.
No connected run or provider write was repeated for this handoff.

Retained evidence remains scoped: one distinct-account rating GET returned
404 without data writes; do not repeat it merely to refresh documentation.
Owner cellar source `9c82e8a7` passed guarded direct-gateway CRUD and cleanup,
but overall certification remains PARTIAL: HTTP/session/browser and cellar
A/B denial are NOT_RUN. Historical #165 recovery, 966 ownerless cellar rows,
81 absent bonus values and manual operations/restore gates remain open.

**Public launch remains NO-GO.** The next external action is to configure
`RELEASE_OTHER_EMAIL` securely in protected `staging-release`, using the
supported account matching the existing password. Then run the exact-release,
guarded fixture/session matrix. The existing #165 migration package still
requires provider authority and isolated restore proof before approval; a new
plan or premature migration approval request does not replace that evidence.

The following dated checkpoints are retained history. Their former pending
candidates, deployment blocks and active PRs are superseded only by the scoped
current handoff above.

### Shared cellar write deadline review correction — 20 October 2026 UTC

Independent review found that six readbacks plus their 4.75 seconds of waits
could exceed the browser's 12-second timeout after a write had committed. A
single 10-second mutation deadline now starts before session authentication
and covers preflight, mutation, fresh readback, 404 fallback, settlement waits
and optional product enrichment. Cancellation prevents later work; only reads
may repeat. Unconfirmed writes return `CELLAR_WRITE_UNVERIFIED`, and the client
instructs the owner to reload and check the cellar before another change.
Provider cancellation does not undo a committed mutation; no automatic mutation
retry or idempotency guarantee is introduced.

All 82 focused cellar, provider, authentication, timeout and client transport
tests passed locally on Node 24, including fake-clock coverage across slow auth,
mutation, readback and enrichment, stalled response bodies, shared 404 fallback,
cancelled waits and zero mutation retries. Canonical Node 22 validation and
browser coverage for this changed candidate remain pending.

Preceding gift-fix head `c41a4a01` passed canonical validation (970 tests,
15 gated skips, no failures), 155 browser/accessibility cases and security
checks. Its Git preview `dpl_BXzY4Lca4K9zfjcD3z8sCatjBHUX` is READY;
health and readiness returned HTTP 200 with exact `c41a4a01` at 23:28 UTC.
This proves that preceding preview's identity/readiness only, not the new
deadline correction or connected cellar HTTP/browser acceptance. No new
provider writes were performed. Public launch remains **NO-GO**.

The launch-readiness check passed. Its changed-path report maps cellar, auth,
provider evidence and client accessibility; unmatched shared `dataProvider`
and `httpSecurity` modules/tests are deliberately classified under
PF-LAUNCH-CELLAR, PF-LAUNCH-AUTH and PF-LAUNCH-PROVIDER for deadline propagation.
The existing launch checklist and open connected gates remain authoritative.

Broader review also reproduced a cleanup provenance gap: a stale owner-list
baseline and an older acknowledged row could satisfy ID/product-only checks.
The connected release fixture now uses a random run marker, preserved through
create/update/reload, required in the receipt and fresh owner reads, and checked
again immediately before its single DELETE. Missing/changed markers, duplicate
IDs and pre-existing markers fail closed without deletion. This source
correction does not rerun a connected fixture or qualify A/B isolation.

The existing development dependency PR #647 exposed a catalogue link accessible
name mismatch with upgraded axe. Its one-line correction removes the redundant
label so visible card text determines the link name. Exact-head canonical and
browser coverage is pending in that existing PR; no check was suppressed.

### Cellar review and verified cross-account rating read — 20 October 2026 UTC

Review of PR #657 at `c150488490493a6314da351c164f5c54c6a41d41` reproduced
one false-success edge: any unrecognised persisted gift value was coerced to
false, so an invalid provider value could acknowledge a requested false save.
Verification now accepts only supported boolean encodings before comparing the
requested gift flag. Two regressions cover malformed/missing stored flags and
supported true/false encodings; all 19 focused cellar cases passed locally on
Node 24. The changed candidate still requires canonical Node 22 and exact
preview/runtime qualification; earlier live CRUD evidence is not rerun or
upgraded by these source tests.

The reviewed preceding head `c1504884` passed canonical Node 22 validation:
968 tests passed, 15 provider-gated skips, zero failures, all 155 browser/
accessibility cases, CodeQL and Dependency Review. This is preceding-head
evidence, not a claim that the new gift correction is already deployed.

Protected read-only run
[39375645164](https://github.com/jeremytheva/pourfolio/actions/runs/39375645164)
(job `118473051991`) completed at 05:35 UTC on `c1504884`: a verified release
session distinct from the browser owner made one normal-HTTPS request to the
owner's existing rating breakdown and received **404**. The report is **PASS**,
with zero creates/updates/deletes and no response-body disclosure. This closes
that bounded rating-read denial only; cellar mutation isolation, revoked/expired
sessions, profile privacy and the broader #577 matrix remain pending. Do not
repeat that request merely to refresh documentation.

The older manual 402 quota note in the PR description was superseded by the
READY Git preview recorded below. Fresh inspection confirmed existing preview
`dpl_68LuHgZHqiGcvR6TzE2d28fTxeJ3` belongs to `31e41c3b`; it cannot certify
a changed application head. Current production remains `36ce8ffe` and fresh
public health/readiness both returned HTTP 200 with that exact SHA. No provider
write or new deployment request was performed during this review. The expired
catalogue lease was recovered only after fresh branch/main/claim reconciliation.
Public launch remains **NO-GO**.

### Bonus-backed browser rating saved/reloaded/deleted — 20 October 2026 Sydney

The unchanged deployed production `36ce8ffe` was used for one normal
authenticated browser tasting of product 1. Five required dimensions were
4/7; Design/Burp were skipped. Existing stored global **0.5** and private
**0.7** bonuses summed to **1.20**, derived Bonus **1/2** and preview
**2.82/5 (56.43/100)**. One submission saved a newly acknowledged tasting,
with both selected attribute names, recorded Bonus 1/2 and stored standard/
weighted **2.82/5**. A full reload and its exact owner-profile link passed.

Only that new tasting was deleted, once. The exact link became safely
unavailable; the profile count fell 285 to 284. Product community/personal
counts returned **5/3 → 4/2**, averages **3.96/3.94**, and old tastings
622/365 remained. **Browser lifecycle PASS, one submit/one DELETE, no retry.**
No new custom attribute was created; the earlier private 0.7 is retained.
This is saved-rating use of stored bonus values, not a new custom-creation
or second-account/concurrency certificate.

Independent [run 39374839839](https://github.com/jeremytheva/pourfolio/actions/runs/39374839839)
at `31e41c3b` passed **964** source tests (15 skips), then confirmed a valid
**DELETED_TOMBSTONE**, **zero** score children, **zero** bonus mappings,
preserved older totals and complete counts **4/2**. Full and scoped fresh
reads agree. Browser owner binding uses a fingerprint of the public-profile
link observed in the signed-in UI, one stored profile and an agreeing fresh
direct profile read. The preceding wrong-release-owner inspection is
retained, not treated as a deletion failure. Neither inspection wrote data.

The configured release account is genuinely distinct from this browser
owner. The owner can read old tasting 622's recorded breakdown (3.51/5).
A separate one-GET normal-HTTPS cross-account read probe is now pending.
It accepts only 403/404, never 401, does not log the response body, keeps
cookies in worker memory and signs out even after failure. **27 focused
checks pass**. It does not repeat the parent/child graph inspection or
test mutation denial against old data. Details remain in the
[existing rating guide](docs/nocodebackend/rating-workflow-certification.md).

### Cellar owner lifecycle verified; deployment capacity blocked — 20 October 2026 Sydney

Existing [PR #657](https://github.com/jeremytheva/pourfolio/pull/657) is the
single ordinary implementation PR. Accepted application source
`9c82e8a7018b8266f5cbef4f749982e9f3f9dd01` passed **955** canonical Node 22 tests (15
provider-gated skips), all **155** browser/accessibility cases, Dependency
Review and CodeQL. Later verification-only changes do not change that handler.

Protected [run 39372350379](https://github.com/jeremytheva/pourfolio/actions/runs/39372350379)
at 04:58:48 UTC passed **create, independent reload, edit, nullable defaults,
false/true gift values and exact cleanup**. Exactly **one create, one update,
one DELETE** were sent; independent fresh direct/full reads confirmed absence.
No fixture from this run remains. Edit/delete gateway calls took approximately
1.94/1.92 seconds. Six fresh reads with at most 4.75 seconds of waits resolved
the previously observed immediate-readback failure in this bounded test;
the provider's underlying delay mechanism remains unknown.

Overall certification is deliberately **PARTIAL**, not PASS:
`RELEASE_OTHER_EMAIL` is absent, so distinct-account isolation remains NOT_RUN.
The runner exits 2 for that non-PASS scope; that failed certification job is
retained independently of passing source/browser and owner-provider evidence. HTTP/session middleware
and deployed browser submission are also NOT_RUN, not inferred from invoking
the checked-out gateway.

The manual API request at 05:00 UTC was rejected with HTTP 402
`api-deployments-free-per-day`; no CLI/force/billing workaround followed.
The existing Git pipeline subsequently produced READY preview
`dpl_68LuHgZHqiGcvR6TzE2d28fTxeJ3` for exact `31e41c3b`.
At 05:33 UTC its health/readiness returned HTTP 200, that exact SHA,
configured auth/data/rate limiting and data-provider OK. **The earlier
preview-capacity blocker is superseded by this observed existing deployment.**
No new deployment request was made. Main/production still remain
`36ce8ffef482a9044e1e9f35da03214f46b7e1d5`; latest-head review/integration
and post-merge production qualification are next. Deployed cellar HTTP/
browser acceptance remains separate from its passing candidate provider test.

Both earlier acknowledged fixtures and the original unacknowledged attempt
were inspected; none remains and no DELETE was repeated. The collection API
rejects `_`; it is not a deployed workaround. Lookup projection and the
observed `series_edition_id` contract are corrected without enabling gated
relationships. Historical ownerless rows, catalogue writes and #165 migration
remain untouched. Detailed results are retained in the existing
[policy certification record](docs/nocodebackend/connected-policy-certification.md).
Public launch remains **NO-GO**.

### Bonus release deployed and bounded production checks verified — 20 October 2026 Sydney

[PR #651](https://github.com/jeremytheva/pourfolio/pull/651) merged as
`4019c90e5ba342b654361109b0fe8896117f18c4`. Final candidate `cf9a972c` passed
[canonical Node 22 validation 39332306413](https://github.com/jeremytheva/pourfolio/actions/runs/39332306413):
**896 source tests, 15 provider-gated skips, all 155 browser/accessibility
cases**, Dependency Review and CodeQL. The application handler is unchanged
from the connected persistence test. Production deployment
`dpl_6ZymFxn4dysG2hMeSBzPF5LRt1bj` is READY. Public health/readiness returned
HTTP 200, the exact merged SHA and configured authentication, data and rate
limiting. This bounded release does not qualify the final public launch.

Current-instance **provider persistence PASS, independent reload PASS and
reviewed cleanup PASS** are retained in the existing
[rating certification guide](docs/nocodebackend/rating-workflow-certification.md).
One private 0.7 attribute and one category mapping were created and read back.
After an initial cleanup mismatch, read-only investigation established exact
provenance and no rating use. A child DELETE initially had unconfirmed
readback; later list/direct/uncached reads proved absence. Final
[run 39331752492](https://github.com/jeremytheva/pourfolio/actions/runs/39331752492)
removed only the remaining parent and immediately proved absence.
**Two total creates, two exact deletes, no mutation retry; no fixture from this
run remains.** The delayed mapping readback mechanism remains unproven.
Encrypted atomic create intent/acknowledgement checkpoints support recovery;
a failed initial checkpoint prevents writes.

Authenticated non-writing production checks at the deployed SHA verified
search, product details/history and the producer's previously failing
unrated-beer filter. The rating form displayed stored global **0.5** and
private **0.7**, summed them to **1.20**, then summed six selections to
**2.00** and Bonus **2/2**. Five required scores of **4/7**, with Design/Burp
skipped, produced **3.07/5**. The draft was discarded without submission;
product totals remained **4 community / 2 personal ratings**, with older
ratings intact. These are read/presentation/calculation checks, not a new
saved-rating or custom-attribute HTTP/browser certificate.

[Main run 39332757207](https://github.com/jeremytheva/pourfolio/actions/runs/39332757207)
passed source and browser gates. Its read-only bonus audit passed: **83**
attributes, **82** global, **1** earlier private QA attribute, **81** absent
stored values and one explicit global 0.5; all **1,738** mappings use the
certified singular field. The separate rating audit failed on the known
historical contradictory completed/deleted parent with **one surviving score
child**. Frontmatter `ci: FAIL` records that provider finding independently
of passing source checks. No repair was attempted.

Existing PR #657 is the single ordinary implementation PR; its current state
is recorded in the execution handoff above. Dependency PRs #645–#647 are separate. The earlier manual QA bonus, absent values,
historical rating contradiction and **966 ownerless cellar rows** remain
outside the completed fixture scope. Bonus HTTP/browser creation/rating use,
distinct-account denial and concurrency remain open. Public launch is
**NO-GO**. Current-instance testing remains authorised; no new owner
permission is needed for bounded reversible verification.

The following dated checkpoints are retained history. Their former
candidate, deployment, WIP and NOT_RUN statements are superseded only by
the scoped evidence above and are not the current execution handoff.

### Producer profile integration and current-instance certification — 19 October 2026, 13:29 UTC

[PR #664](https://github.com/jeremytheva/pourfolio/pull/664)
was integrated by the catalogue workstream under an exclusive repository
integration lease as merge commit `0085cb35ab42216a5c96f7bf68113e8447bb61dc`.
The producer profile safely renders unrated beer cards under filter and
sort controls without weakening the strict API aggregate validator.
Exact-head pull-request evidence at `c28e16b8`: **828** Node 22
source tests passed, **15** provider-gated skips, **155** browser and
accessibility tests passed, CodeQL and Dependency Review passed,
no unresolved review threads, and Vercel preview
`dpl_2xAyM6sUW7uuKB2iyuuGQWaHMxos` was READY for that
same source SHA. The merge-to-main checks remain distinct from this
candidate acceptance and do not certify current provider operations.

The owner authorised **current-instance testing** for #651;
a separate database is not required solely for that test. This does
not authorise guessed deletions, irreversible migrations or use of
database keys as login credentials. In a bounded authenticated
**non-writing** current-instance check, an existing private QA
`0.7` descriptor and global `0.5` descriptor rendered and summed
correctly. No new custom attribute was created or deleted; the bonus
handler currently has **POST only**, without a verified safe owner
delete route. Consequently, #651 custom write/readback, second-account
denial and cleanup remain **NOT_RUN** at its latest candidate source.

PR #657 cellar create/edit/delete source checks have passed, but
connected write/retry, A/B owner isolation and guaranteed cleanup
remain **NOT_RUN**. The read-only inventory establishes **966/967**
historical cellar rows without `user_id`; the historical 500-row CSV
likewise contains **zero** populated `user_id` and
`purchased_by_id` values, but it is not proof of live account identity.
Do not backfill. One historical rating with contradictory
`submission_state=complete` plus `deleted_at`, and one surviving
score child, remains a separate governed recovery gate under #165.
Provider and launch state: **NO-GO**.


### Independent launch shell cleanup — 19 October 2026

The live-write boundary remains in place. Existing PR #651 at `9edb94ea`
passed 852 source tests / 15 provider-gated skips and all 151 browser cases,
Dependency Review and CodeQL in run 39241276192. It rejects known/malformed
create identities and removes unsafe compensating deletion. Existing PR #657
at `ad41c594` passed 853 source tests / 15 skips and 151 browser cases.
Both remain unmerged pending connected writes, separate-account denial, cleanup
and exact-head rollout evidence. Vercel reported deployment rate limiting; no
new preview or independent production deployment is claimed. Isolated target
configuration remains unknown, not evidence of missing credentials. The owner
has been asked for the isolated deployment URL and test-instance name only.

The bounded #429 slice repairs a broken shell asset reference: `index.html`
requests `/vite.svg`, but the current Git tree contains no such asset. It now
uses a bundled local Pourfolio monogram at `/favicon.svg`. Two browser cases
require real image MIME/body and successful image decoding on public and
authenticated deep routes, so SPA HTTP 200 fallback cannot falsely pass.
`src/App.css` is deleted because the whole current source tree has no import
or consumer; `src/main.jsx` uses `index.css`. Its legacy styles remain
recoverable in Git. No other deferred source is removed and no live records,
provider schema, auth, rating policy or user data are changed. [PR #663](https://github.com/jeremytheva/pourfolio/pull/663) source head
`c33187dbf4e562d6e6f2d8246a97ac3cd48650ee` passed canonical Node 22 validation
(828 passed / 15 provider-gated skips / zero failures), all **153** browser/
accessibility cases, Dependency Review and CodeQL in run **39246524365**.
The two new icon cases passed. Preview `dpl_Y9asR1EaWSvE1ijBs4iUq4RFn3vB`
is READY; HTTP 200 health returned that exact SHA, the icon returned
`image/svg+xml` and the public deep-route shell references it. This proves only
the shell/static-asset change, not authentication/provider lifecycle. The final
handoff changes STATUS.md only; its exact-head checks and integration evidence
belong in #663. No new production deployment is assumed.

PR #662 is already merged as `f7f27dcf004d2ed59a7a0366455a064619414487`;
its final `e8c154df` passed 828 source tests / 15 skips, all 151 browser cases,
Dependency Review and CodeQL (run 39232880890). This section supersedes older
active-queue statements below. This front matter is the post-integration handoff target: after #663 merges,
two implementation PRs remain (#651/#657). Before that merge, three are open;
validate/integrate existing work before adding another.
The isolated bonus/cellar gates, retained private QA attribute, 81 missing
bonus point values and historical deletion/ownership findings remain open.
Public launch remains **NO-GO**.

### Connected rating driver and cleanup repair — 19 October 2026

[PR #662](https://github.com/jeremytheva/pourfolio/pull/662) repairs the
release driver's obsolete Burp selector/final heading and captures only a
new, expected-product canonical ID from the HTTP 201 receipt before later
assertions. Exact deletion, repeated deletion and fresh owner-history absence
are required; unknown responses never authorize guessed deletion or retry.
Both verification and cleanup errors are preserved. The write gate is unchanged.

Source head `e52b630e57375eb71a7bed5500b688934911bff2` passed canonical
Node 22 acceptance: 828 passed, 15 provider-gated skips, zero failures,
all 151 browser/accessibility cases, Dependency Review and CodeQL in
[run 39232237030](https://github.com/jeremytheva/pourfolio/actions/runs/39232237030).
An initial lint failure was corrected without relaxing lint. The final
follow-up adds an explicit HTTP 200 pre-write baseline assertion and this
handoff; its own canonical checks must pass before merge. Browser evidence
above belongs to the pinned source head, not an uncompleted later run.

Protected staging environment secret/variable metadata could not be inspected:
the GitHub connector rejected those endpoint families with its URL allowlist
(`INVALID_ARGUMENT`). Configuration/isolation remains UNKNOWN, not missing.
No credentials were retrieved and no alternate access path was attempted.
The connected live write check remains NOT_RUN. No new live records were
created or deleted in this continuation. One earlier private QA bonus attribute
still lacks a cleanup control. #651/#657 isolated write, two-account and cleanup
gates, missing catalogue lifecycle controls, 81 absent bonus values and the
contradictory historical deletion remain open. Public launch remains **NO-GO**.

At this snapshot three implementation PRs are open (#651, #657, #662);
after #662 integrates, two remain. The current next target stays #651.
Production documentation handoff #661 is deployed as `90c86fd1`; bounded
authenticated product-read/UI evidence remains at `f48d9509`, not a new live
write certificate. Exact final-head integration/deployment evidence belongs
in #662.

### Product attribute repair integrated and live-read verified — 19 October 2026, 09:21 UTC

[PR #660](https://github.com/jeremytheva/pourfolio/pull/660) merged as
`f48d95090e0271557b43ee3035f01aecd05c243f`.
Its final head `f8c08446795c8974ad84db053a32d470cac63013` passed
canonical Node 22 acceptance in
[run 39228933739](https://github.com/jeremytheva/pourfolio/actions/runs/39228933739):
820 passed, 15 provider-gated skips, zero failures, all 149 browser/
accessibility cases, Dependency Review and CodeQL. Launch-readiness
traceability checks passed. No unresolved material review threads remained.

Production `dpl_BocUbtPDmBvHjm5Gr6xiciBTz4T7` is READY; public health
returned HTTP 200 and that exact merge SHA. A fresh authenticated beer-page
read now includes late score rows: Appearance 5.67/7 from 3 scores (previously
6/7 from 2), Aroma 6.33/7 from 3, and Mouthfeel/Flavour 5.5/7 plus Follow 6/7
from 4 scores each (previously one each). The overall 4-community/2-personal
counts and older personal tastings remain intact. This is bounded live
application-read verification, not new provider-write certification.

The disposable tasting was removed during the authorized test workflow.
Its exact link is safely unavailable; recovery to all history and page
navigation pass, with 284 total ratings, 20 unique rows on each of the first
two pages, zero cross-page overlap and a stable 4.08/5 whole-history average.
One private QA bonus attribute remains; the app has no bonus delete control.
The earlier contradictory historical parent and surviving child, 81 absent
global bonus point values, missing catalogue edit/delete capability and
#651/#657 isolated write/isolation/cleanup gates remain unresolved.

Two implementation PRs remain (#651 and #657), excluding this documentation
handoff. Do not recreate #660 or merge either write-path candidate solely
from source tests. No provider migration, historical repair, shared catalogue
fixture or missing-value backfill was performed. Public launch remains
**NO-GO**. The older dated snapshots below retain their original evidence;
this section and the latest PR records supersede their active-queue/deployment
statements.

### Controlled full rating journey QA — 19 October 2026, 09:08–09:16 UTC

A disposable live tasting saved the five required manual scores at 4/7,
Bonus 2/2 from six descriptors worth 2.00 points, and matching stored
weighted/standard totals of 3.07/5. Fresh form loads correctly showed the
explicit 0.5 global and 0.7 private values. Creating the private QA bonus
had immediately displayed a blank 0.2 option; its persisted label/value
were correct after reload. Existing PR #651 owns that response repair;
its guarded provider write/isolation/cleanup gate remains pending.

Deleting only the new test tasting through its exact owner-history row
restored fresh beer totals to 4 community ratings (3.96/5) and 2 personal
ratings (3.94/5), preserving both older personal tastings. The producer
returned to 16 community and 8 personal completions and 9 catalogue beers.
The deleted exact profile link safely reports unavailable. This bounded
browser PASS does not independently establish HTTP 204, terminal provider
state, child absence, repeated deletion or cross-account isolation, and
does not clear the separate contradictory historical deletion below.
One private QA bonus attribute remains because the app exposes no bonus
delete control. No product or producer fixtures were created.

The requested catalogue create/edit/delete matrix is retained in the
[existing certification guide](docs/nocodebackend/rating-workflow-certification.md#full-rating-journey-qa--19-october-2026):
missing-beer/new-producer forms and review work; final creation was not
run without cleanup, correction submission is disabled, and producer
edit/delete and beer delete controls/routes are absent.

[PR #660](https://github.com/jeremytheva/pourfolio/pull/660) repairs an
additional live finding: community attribute averages omitted the new
4/7 scores although the individual breakdown was correct. Its score read
was unpaged. The patch reuses the catalogue's paged reads, bounds ID batches
and scopes broad provider responses locally. Three regressions fail on
old source; four new cases and the focused ten-case suite pass. Local full
Node 24 validation is dependency-blocked; exact source head `e84fe79a`
passed canonical Node 22 `npm run platform:validate` in
[run 39228525714](https://github.com/jeremytheva/pourfolio/actions/runs/39228525714):
820 passed, 15 provider-gated skips, zero failures, including launch-impact,
lint, audit, build, containment and release-security checks. Dependency
Review and CodeQL passed. Browser/accessibility remains pending at this
snapshot. READY preview `dpl_9MQPFH8kYxCChWnxyrrfDkmFvxr7` returned HTTP 200
health with the exact source SHA. Final-head acceptance and production
read verification must be recorded in #660 rather than inferred.

Live health during this QA returned production `81a4dbd0`, not the newer
observed main `825a5b30`. The runtime evidence field is bounded to those
health/read/UI observations; `runtime: UNVERIFIED` retains the outstanding
provider lifecycle/data-integrity gates. Three implementation PRs are open
(#651, #657, #660); no further implementation is to be queued before
integration. Public launch remains **NO-GO**.

### Connected cellar inventory and candidate previews — 19 October 2026, 06:47 UTC

Read-only staging-release [run 39211690145](https://github.com/jeremytheva/pourfolio/actions/runs/39211690145)
inventoried **967 live cellar rows** and **363 product rows**. Exactly
**966 cellar rows have null/blank `user_id`**, and **one** row is
owner-scoped. Zero duplicate/invalid cellar IDs, missing product
references, bad quantities or unsupported gift flags were reported.
The single owner-scoped cellar row passed an exact-ID GET/readback
check. This is **`LEGACY_OWNERLESS_PRESENT` / exit 2**, not a fully
passing cellar release certificate; source and provider reads did not
mutate data. Missing ownership cannot be inferred or populated from
historical exports. Determine source provenance and a governed,
restorable archival or attribution decision before changes.

[PR #657](https://github.com/jeremytheva/pourfolio/pull/657) is open
and includes cellar create/update/delete persistence checks plus the
read-only inventory job. At source SHA `987f1644`, Node 22
`npm run platform:validate` passed **831** tests with **15**
provider-gated skips, **149** browser/accessibility tests passed,
CodeQL and Dependency Review passed, and Vercel preview
`dpl_5hjBGfUyj5ZS9UJspwQywnW2qv5A` is **READY** on the exact
source SHA. **Connected protected write, cross-account denial and
cleanup are NOT_RUN**, so do not merge solely from source/preview.

[PR #651](https://github.com/jeremytheva/pourfolio/pull/651)
is the other open implementation candidate. Its source acceptance
passed **837** tests, **15** provider-gated skips, browser and
security checks; the latest-head `f8b354d3` preview
`dpl_6LXxR4fhY9tPmiHQNKZm8cBe9pqx` is **READY**.
A connected *read-only* existing private bonus attribute/mapping
readback passed but the controlled custom-value write, owner isolation
and cleanup remain **NOT_RUN**. Historical bonus inventory confirms
**81 missing stored point values**; the source rating spreadsheet
and historical export do not establish per-attribute values to safely
backfill.

[PR #656](https://github.com/jeremytheva/pourfolio/pull/656)
merged to `main` at `81a4dbd0b774ecf8703fe9aae89cf3174c607c74`,
with a READY deployment
`dpl_6bD7KeXNcyKyRE9tRuaUSHiGdAtN`. Its connected
read-only rating audit still found one
`complete` plus `deleted_at` parent with one surviving
`rating_scores` child, no bonus child and no cross-owner
mismatch. No production records were modified. Recovery remains
gated by #165 provider ownership, backup, isolated restore and
approved rollback evidence. **Public launch NO-GO.** Continue
unaffected work rather than treating this as permission for
unverified provider deletion or historical user attribution.


### Concurrent launch-readiness traceability integration — 19 October 2026, 03:37 UTC

PR #653 merged as `85bf9b2a65737ebe76ff2d0e2e94b5b101c0c7b6`
after the tombstone fix. It adds a launch-readiness traceability
pilot without changing the rating/cellars provider records. The
newer `main` deployment `dpl_5VuYEejL47yGEgiDKkCQJHrxgbZH`
is READY and matches that SHA; authenticated release certification
and its independent exact-head validation remain separate evidence
requirements. The source acceptance for the tombstone scoring fix
remains at the earlier merged PR #652 head and read-only audit,
not automatically inherited by #653.

### Deployed tombstone scoring repair; outstanding provider state — 19 October 2026, 03:34 UTC

PR [#652](https://github.com/jeremytheva/pourfolio/pull/652)
merged as `d233a7e39f7c643df3a04900066d8ba3e8a83c73`.
It replaces the catalogue's duplicate, tombstone-unaware completion rule
with the shared history predicate. Production deployment
`dpl_49Z9yhWwzyMKdmhvotHuPAkEPW98` is **READY** and its GitHub
provenance matches that exact merge SHA. This is deployment metadata
evidence, **not** an independently verified authenticated HTTP/write test.

The [PR source acceptance run 39194592481](https://github.com/jeremytheva/pourfolio/actions/runs/39194592481)
passed Node 22 canonical `npm run platform:validate` (802 passed,
15 provider-gated skips, zero test failures), all 149 browser/accessibility
tests, Dependency Review and CodeQL at exact source head `fbd367eb`.
The merged main run
[39194986241](https://github.com/jeremytheva/pourfolio/actions/runs/39194986241)
passed canonical source/browser checks, but the **overall GitHub run is
FAILED for an actual connected provider data-integrity finding**.
It must not be described as a fully passing release or dismissed as an
empty diagnostic workflow.

On [read-only run 39194588209](https://github.com/jeremytheva/pourfolio/actions/runs/39194588209)
the connected audit reported 627 ratings, 574 eligible completions,
1,744 verified singular bonus relationships and owner/history/product
population agreement after the source correction. It returned
`REVIEW_REQUIRED` / exit 2 because **one** stored rating still has
`submission_state=complete` and a nonempty `deleted_at`. This
contradiction remains a separate **live provider data-integrity and
terminal-delete certification** gate. Do not mutate, remove, backfill,
or silently reclassify the row without verified owner/child state,
approved snapshot/restore/recovery authority and a cleanup protocol.
The source change merely excludes the tombstoned record from
community metrics.

PR [#651](https://github.com/jeremytheva/pourfolio/pull/651)
is the sole open implementation PR; its source acceptance and
read-only bonus mapping audit passed, but controlled isolated-staging
custom `point_value` create/readback/second-account denial/cleanup
remain **NOT_RUN**. Live bonus attributes: 83 total (82 global,
one private), 81 blank/null point values, only one explicit global
value (`0.5`), zero malformed values. Legacy display fallback
`0.2` is not proof of intended values for the missing records;
do not invent data or backfill them. Dependency PRs #645/#646/#647
remain separate.

**Launch NO-GO.** Issue #503 is closed as implemented source work;
provider migration/certification #165/#144, profile/privacy #422,
distinct release sessions #577 and connected cellar/catalogue #449
retain separate evidence gates. Later plans should pick independent
provider-safe work instead of repeatedly reopening closed #503 or
inventing custom bonus values.


### Live read-only continuation — 19 October 2026, 03:20 UTC

The default branch is `d82a991e`; PR #650 is merged and the issue
#503 is **closed**. This issue state does not independently certify all live
create, delete, retry, owner-isolation or historical-read cases. The later
connected acceptance remains blocked under #165/#144/#422/#449/#577.

PR #651 (unmerged) adds custom bonus creation persistence readback and
redacted point-value auditing. Exact head `7f5f81f0` passed canonical
Node 22 validation, browser/accessibility, Dependency Review and CodeQL.
Its read-only connected run
[39193252116](https://github.com/jeremytheva/pourfolio/actions/runs/39193252116)
**passed the bonus mapping audit**: 1,744 rating bonus mappings all use the
singular `bonus_attribute_id` field; 83 current bonus attributes
(82 global, one private), 81 blank/null `point_value`, two explicit,
zero malformed. Exactly one global explicit value is `0.5`. The second
explicit value belongs to a private record, whose value is intentionally
not exposed in audit output. The observed `0.2` fallback is explained by
absent persisted values, not a confirmed display-only regression. The
missing individual point assignments must not be invented. No provider
records were changed.

The same read-only run failed its owner-rating equality assertion. Source
investigation found that this audit counted `complete` rows with a
non-null `deleted_at`, while production visibility correctly uses
`isCompletedRating` and excludes tombstoned rows. PR #652 updates the
audit to use the canonical predicate while still counting contradictory
`complete`/tombstoned rows as a separate review concern. An initial
connected rerun on #652 moved past the owner-history comparison but failed
the **product population check**: a scoped product response reported two
completed ratings/average 4 versus the global snapshot's one/average
4.45. A later redacted diagnostic on
[run 39194094480](https://github.com/jeremytheva/pourfolio/actions/runs/39194094480)
found **one** eligible rating in both global and provider-filtered reads
but **two** in the product response. Source review identified the immediate
cause: `api/catalog-data-proxy.js` defined a local `isCompletedRating`
that omitted the `deleted_at` exclusion enforced by
`api/_lib/ratingHistoryRecords.js`. This allowed a timestamped deleted
rating with a residual `complete` lifecycle state to enter product and
producer aggregates. PR #652 removes the duplicate rule, imports the
canonical tombstone-aware helper and adds product/producer regression tests.
The exact-head connected rerun is pending; no stored rating was altered.
The underlying inconsistent `complete` + `deleted_at` row still needs
a separately governed recovery decision, not a silent repair.

Source-only/browser passing does not certify provider write semantics.
Connected destructive tests, historical repairs and provider schema
mutation are not authorised by these read-only audits. Public launch
remains **NO-GO**. `STATUS.md` prior dated sections are preserved as
investigation history and must not override these newer facts.


### Latest rating-delete investigation — 19 October 2026 UTC

The owner's fresh failed delete is now correlated with production evidence:
01:20:27 UTC / 12:20:27 Sydney, release
`2c8d88e8f8d466e8adc26c1a44d5a9814ca18033`, correlation
`46d8017c-43a3-4305-bcec-838725f0f43a`, 4xx, controlled stage
`mark_rating_deleted`. The break is the final managed-parent update after the
child-removal verification code. This is stronger evidence than the prior
unlocated delete failure, but it is not a fresh read of the affected parent or
children and does not reveal the provider's rejected field. The frontend save
succeeded according to the owner; complete connected submission certification
is not inferred from that report.

PR #650 reuses the existing UTC provider timestamp formatter for `deleted_at`.
Creation already writes `date_rated` as `YYYY-MM-DD HH:mm:ss`; deletion instead
sent an ISO string with `T`, milliseconds and `Z`. This concrete source
inconsistency is the leading explanation for the final-step rejection. It is
not presented as a provider-confirmed root cause or passing live deletion.
Two strict timestamp/retry regressions fail on the original source and pass
after correction; the focused 39-case run passed locally on Node 24 as diagnostic
evidence only. The cases also cover unrelated-owner preservation, omission of
the original tasting date from delete writes, resume after a terminal-write
failure and repeat-delete timestamp stability. A provider trigger's actual
`date_rated` behaviour remains a #165 connected gate.

Source head `78501ec93d1b9d55a1c266a81b1957dd44f58f37` passed Node 22
canonical acceptance in run
[39185342167](https://github.com/jeremytheva/pourfolio/actions/runs/39185342167):
793 passed, 15 provider-gated skips and zero failures, including composed
contracts/lint/audit/build/security checks. Dependency Review and CodeQL run
`39185342394` passed. All 149 browser/accessibility cases passed on this source
head in the same acceptance run.
READY preview `dpl_GpLih8cBpQHeLM8MiwFs8YesLLEg` returned HTTP 200 health
with the exact source SHA. Final handoff-head acceptance and actual integration/
deployment belong in #650; historical source evidence must not qualify a later
head automatically. At this dated snapshot, #650 is the sole ordinary
implementation PR; dependency PRs #645/#646/#647 remain separate. The final
launch candidate is not frozen and remains null.

PR #637 is merged as `2c8d88e8`. Its final accepted head `61002a00` and exact
main run `39184032984` passed canonical/browser acceptance. Production health/
readiness matched that merge before this reported deletion attempt. The latest
runtime evidence field identifies that bounded read/configuration observation;
`runtime: UNVERIFIED` here explicitly reflects the unresolved delete flow.
The earlier launch-fix handoff below is retained history, not the current queue.

**Live deletion remains FAIL / public launch NO-GO.** A failed final update can
leave a managed rating in `deleting`, already excluded from history. Disappearance
alone is not HTTP 204, terminal deletion or recovery evidence. Use the existing
controlled isolated-fixture protocol for a fresh create/delete/repeat/owner-
isolation retest on the repaired SHA, with before/after counts and cleanup.
Do not reconstruct removed children or change historical/provider data as a
substitute for this test. No live rating mutation or provider/schema migration
was performed by this review. #503/#165/#144/#422/#577 and #449's connected
acceptance remain open. Brew remains contained and launch-excluded.

### Earlier launch-fix handoff — 19 October 2026 UTC

PR #639 is merged as `6db82263a6c59fb9f9121af676e25b66b954acaf`.
Ranking pagination preserves global rank and results focus; a removed later
page recovers to page one, while transient failures retry the same page with
accessible error/results focus. Both material reviews are resolved. Its exact
pre-merge head `f0e2ac28f63d564c3beb1180c16d264d65eb9f53` passed run
[39183143918](https://github.com/jeremytheva/pourfolio/actions/runs/39183143918):
Node 22 canonical acceptance (791 passed, 15 provider-gated skips, zero failures),
143 browser/accessibility cases and Dependency Review. CodeQL run `39183144057`
passed. Preview health matched that exact head. Production deployment
`dpl_ETrRSQvRryoTHECzTjApovrgAFrS` is READY at the merge SHA; public health and
readiness matched it with HTTP 200 at approximately 01:01 UTC. These bounded
read/configuration observations do not certify authenticated writes. The exact
merge independently passed canonical and browser acceptance in run
[39183390627](https://github.com/jeremytheva/pourfolio/actions/runs/39183390627).

PR #649 merged scoring/readiness contract documentation as `c6bde59a`.
At this dated snapshot, #637 is the sole ordinary implementation PR; dependency
PRs #645/#646/#647 are separate. #637's existing six mocked browser regressions
and recoverable list/options/statistics reads are reconciled onto this main
baseline, including protection against older responses overwriting newer
results and validation/normalisation of accepted statistics totals. Reconciled source head
`650f1cf3e7525cccbcc21af2b38cf1bfc69dc439` passed run
[39183502542](https://github.com/jeremytheva/pourfolio/actions/runs/39183502542):
canonical Node 22 acceptance (791 passed, 15 provider-gated skips, zero failures),
149 browser/accessibility cases including all six recovery cases, and Dependency
Review. CodeQL run `39183502501` passed; READY preview
`dpl_NPrTZNAiQEHgjLyEYYGrFURaw8BJ` returned HTTP 200 health with that exact SHA.
There are no unresolved material review threads. The old NOT_RUN PR body has
been corrected. This final handoff-only follow-up requires its own final-head
acceptance and integration/deployment result in #637. Brew remains launch-excluded
and policy-gated; no provider gameplay or isolation acceptance is claimed.

The evidence fields distinguish the latest verified Brew source head from
the actual observed production merge SHA. The final launch candidate is not
frozen, so `current_candidate_commit` remains null. The validation block describes
the exact source-bearing evidence above; it does not transfer that evidence
to a later documentation-only head, which has separate acceptance in #637. Catalogue
owns only STATUS/integration; the bounded Brew claim covers its existing three
changed source/test/readiness files. No other workstream code or schedules are
changed.

Public launch remains **NO-GO**. Continue #503 with a correlated isolated
rating deletion fixture only where supported, then #165/#144 provider authority,
uniqueness/conditional-update/backfill and isolated restore/approval evidence.
#422 privacy/revocation, #577 account-session evidence and #449 connected CRUD/
ownership remain open. No live rating/cellar mutation, provider schema change,
public capability enablement or production launch approval was performed.

### Initial launch implementation completed — 19 October 2026 UTC

Public launch remains **NO-GO**. The launch-plan implementation has begun:

- PR #644 integrated the reviewed plan and exact-candidate pilot requalification
  rule as `1d16a879ca1f6cc9fe067e307d0b5cc318389d12`.
- PR #648 integrated strict cellar input validation as
  `a3080c31ac7c0dd9d905225a09df4ffe215d6f4c`. Impossible dates, unsafe
  numeric/text/identity coercions and ambiguous Gift values now fail before
  provider mutations. Valid zero/null/decimal values, real calendar dates,
  owner-derived identity and capability gates are preserved.
- Exact pre-merge head `fe176181cb15cd2e33c6868d8fd11b2bedc00620`
  passed run `39181874327`: Node 22 canonical acceptance (791 passed,
  15 provider-gated skips, zero failures), 140 browser/accessibility cases,
  Dependency Review, CodeQL and matching READY preview, with no unresolved
  review threads.
- Exact merged main `a3080c31` independently passed run
  [39182153493](https://github.com/jeremytheva/pourfolio/actions/runs/39182153493):
  canonical job `117836995508` (791 passed, 15 skipped) and browser job
  `117836995258` (140 passed). Connected rating/bonus jobs skipped.
- Production deployment `dpl_2Rq9NCWuqmRG7RgMaHiR3KjsnEvd` is READY at
  that merge SHA. On 19 October at approximately 00:46 UTC, public health and
  readiness returned HTTP 200 with matching provenance, configured auth/data/
  shared-limiter indicators and `dataProvider: ok`. An anonymous cellar GET
  returned HTTP 401. These prove bounded deployed/read/denial behaviour, not
  authenticated cellar mutation or two-account certification.

The existing scoring guide now describes the implemented v2 totals, derived
Bonus, standard/comparison field meaning, personalised/default weights and
PPP/Scaled Score semantics, with v1 retained as historical. It explicitly
distinguishes the settings UI's fixed Bonus allocation from the formula boundary
without changing either. The operations guide now describes the implemented
public health/readiness responses and their actual limits; dedicated monitor
authentication/throttling, alert delivery, restore and operator assignments are
not invented or marked complete. This is documentation reconciliation only.

In this earlier snapshot, the evidence referred to the source-bearing
`a3080c31` release observed above. The final launch candidate has not been frozen, so
`current_candidate_commit` remains null. Any later documentation head has its
own PR acceptance and must not be inferred to be runtime/provider certification
from this source-bearing snapshot.

At that earlier snapshot, ordinary implementation PRs #637/#639 were open;
dependency PRs #645/#646/#647 are separate. Keep the repository limit and
reconcile live state at the next execution. Catalogue owns integration/STATUS;
the bounded producer claim owns only the existing pagination source and tests.
Other workstream code and schedules are unchanged.

Next: continue #503 with a fresh correlated isolated deletion fixture where
supported; a seven-day Vercel query was outside Hobby retention and the corrected
30-minute rating-error query found no matching log, which does not clear the
retained failure. If session/fixture/provider boundaries prevent that execution,
continue #639's existing review corrections or reversible #165 evidence
preparation. #165 migration/uniqueness/restore/approval, #422 profile privacy/
revocation, #577 account-session evidence and #449 connected CRUD remain open.
No live rating/cellar mutation, provider schema change, public capability
enablement or production launch approval was performed.

No owner action is required for the completed source/documentation work.
Escalate only a concrete unavailable external prerequisite or the established
irreversible-change/release approval after reversible preparation.


### Retained cellar implementation checkpoint — 19 October 2026 UTC

PR #644 merged as `1d16a879ca1f6cc9fe067e307d0b5cc318389d12` after
exact head `0f23a48f3f5aa543978b1cffb9a6ac828c755a2e` passed canonical
Node 22 acceptance (783 passed, 15 gated skips), 140 browser/accessibility cases,
CodeQL, Dependency Review and matching READY preview. Both material review
threads were resolved. Fresh production health/readiness matched the merge SHA
after integration with configured auth/data/shared limiting and a bounded
`dataProvider: ok` read. No connected write/privacy gate was closed.

The catalogue execution recovered the existing unpublished
`fix/cellar-write-validation` branch, previously at `86070fc2`, instead of
creating duplicate work. Its four attempted commits were reconciled with current
main. The older attempt's rejection of all unknown fields and zero quantity
conflicted with the accepted current allowlist/zero-value contract; those
unapproved assertions are replaced by explicit preservation and immutable-input
regressions. Its valid strict date/Gift intent is retained, completed with typed
numeric/text/product checks, and reconciled through a history-preserving merge.

PR [#648](https://github.com/jeremytheva/pourfolio/pull/648) implements the #449 fix and rejects impossible date rollovers, numeric dates, ambiguous
Gift strings and unsupported Boolean/array/object field types. Real date-only
values, leap days, decimal form strings, zero values, nullable optional fields,
server-owned identity and existing relationship gates remain supported. Invalid
creates and updates reject with HTTP 400 before provider mutation. Dates are
calendar values, not implicitly timezone-shifted timestamps.

Six new regressions failed against the original source before the repair;
focused policy/gateway/service tests pass locally on Node 24.19.0. This is
bounded source evidence, not the required Node 22 canonical or browser gate.
The final published branch head is the candidate; `current_candidate_commit`
remains null until an exact observed head is recorded, rather than inventing a
self-referential commit. Full current-head acceptance is NOT_RUN pending the
trusted Node 22 executor.

#503 diagnosis inspected the available Vercel error-log path: a seven-day query
was refused because Hobby retention does not cover that window; a corrected
30-minute production rating-error query returned no matching logs. This neither
reproduces nor clears the retained deletion failure. A fresh correlated failure
still needs supported sessions and safe isolated fixtures. #165/#422/#577
provider/session/recovery gates remain open; no live rating/cellar write or
schema change occurred.


### Retained plan-review handoff — 19 October 2026 UTC

The owner instructed implementation of the launch plan. Public launch remains
**NO-GO**. Existing plan PR [#644](https://github.com/jeremytheva/pourfolio/pull/644)
is being completed before another implementation PR is opened. Its two review
findings are addressed in source: every pilot repair returns to stage E's exact-SHA
source/browser/connected/deployment qualification, and this durable handoff now
reflects the current main/deployment and queue. Current revision checks remain
pending until executed; `fa5429d` below is the previously validated PR head,
not evidence for later edits.

Fresh production checks on 19 October at approximately 00:29 UTC returned HTTP
200 for health and readiness, matching `acd8633494066c66e2d882d7317009669397de39`
and production deployment `dpl_8t1QfZgSXtPCZ6bTdCdF2ypVypeQ`. Canonical
auth/data configuration and shared limiter presence were reported; readiness
returned `dataProvider: ok`. This is bounded configuration/provider-read evidence.

PR #644 head `fa5429d2e1a87009c837bef606875e2be2311e51` passed exact-head
run [39120312656](https://github.com/jeremytheva/pourfolio/actions/runs/39120312656):
Release gate job `117654406873` and browser/accessibility job `117654406724`
completed their substantive steps successfully, with Dependency Review, CodeQL
and preview deployment success. Connected rating/bonus jobs skipped. A changed
head requires fresh acceptance; no provider/write/privacy certification is inferred.

Current ordinary implementation WIP is three: #644, #639 and #637, stack depth
zero. Dependency PRs #645/#646/#647 are separate from implementation WIP and
supersede the older dependency snapshot below. #639 still has material recovery
and candidate-provenance reviews. #637 exact-head validation runs
`38828882651`/`38828876697` report success; its old NOT_RUN body needs
reconciliation with executed jobs and reviews before integration. Brew remains
launch-excluded.

The first independent code outcome is #449 strict cellar validation. The current
sanitiser accepts impossible calendar dates and coerces unsupported JSON
types. Repair it with create/update regressions, preserving documented zero/null
semantics and ownership/capability gates. #503's latest live deletion failure
remains unresolved. Diagnosis and connected writes still need supported sessions
and safe isolated fixtures; #165 irreversible provider guarantees/restore/approval
and #422/#577 certification remain separate gates. No owner action is needed to
perform the reversible source work.

The catalogue execution acquired and read back a fresh bounded integration/file
claim after reconciling the expired ledger and existing PR/main state. Other
workstream code and task schedules are unchanged.

## Retained launch verification — 15 October 2026 UTC

Current work: continue the remaining beer-first launch gates. **Public launch
remains NO-GO**; production configuration/readiness proof is narrower than
connected rating/privacy certification.

PR [#642](https://github.com/jeremytheva/pourfolio/pull/642) is merged as
`0bd208bf10618d6a04bc46628af9ad23973e4618`. It repairs all three launch-review
findings: Vercel-only forwarding-header trust, persisted profile save readback,
and provider deadlines that include response bodies. The launch checklist now
maps current scope, owners and evidence while preserving dated historical records.

The exact final pre-merge head `830debd65814e3265fed167572f95fe95e1d366d`
passed canonical Node 22.23.3 validation: 783 tests passed, 15 provider-gated skips,
zero failures, composed lint/audit/build/contract/security checks, all 140
browser/accessibility cases, CodeQL and Dependency Review. Evidence is in run
[38750535282](https://github.com/jeremytheva/pourfolio/actions/runs/38750535282)
(release job `116475449411`, browser job `116475449686`). Independent source
review found no material outstanding issue; review-thread readback was empty.

Production `dpl_ETme4rrb1mXomtqaHCcse2wa1mAs` is READY. Public
`https://brew-buds-mobile-app-design-3577.vercel.app/api/health` returned HTTP
200 with merged SHA `0bd208bf10618d6a04bc46628af9ad23973e4618` and configured
auth/data/rate limiting; `/api/readiness` returned HTTP 200 with the same SHA
and `dataProvider: ok` on 15 October 2026 at 14:24 UTC. This verifies deployment,
configuration and a bounded provider read, not connected owner writes or privacy
revocation. The exact merged SHA's separate source/browser CI is additional
evidence, not assumed from the pre-merge head.

No provider migration or live rating/cellar write was performed. Connected
rating/bonus jobs skipped; private preview endpoint probes hit deployment
authentication and supply no application-authorisation evidence. The latest
retained live rating deletion FAILED. #165 migration/uniqueness/restore/approval,
#422 connected profile/privacy/cross-owner checks and #577 supported account-session
evidence remain open. Follow `docs/LAUNCH_READINESS.md` for the current launch gates.

The expired integration lease was recovered only after fresh main/PR/STATUS
reconciliation and CAS readback. #642's merged branch was automatically removed.
At the post-#642 snapshot, ordinary implementation PRs #637 and #639 remain open
alongside dependency PRs #635/#636, with no dependent stack. A documentation-only
follow-up reconciles this evidence; it does not add a feature or provider claim.
The separate ratings workstream owns #503 and its gateway/tests; the launch repair
did not change those files. Preserve Brew exclusion and resolve material #639
reviews before integration. No owner decision is required for the completed fixes.

## Live integration and automation reconciliation (snapshot before #641 integration, 15 October 2026 UTC)

Verified against GitHub and Vercel for this reliability change:

- `main`: [`75133ff7`](https://github.com/jeremytheva/pourfolio/commit/75133ff7f29aa69a0bdaf173b2f549afcdde179b), the already-merged paginated Overall/Style Scaled Score work. Vercel production deployment `dpl_HfPe1frkgrFoFgEy5yxZ24tBVzDS` reported **READY** at that SHA; this is deployment evidence only, not independent runtime or connected provider certification. Old runtime-verified and source/browser-validated SHAs remain separately recorded in the front matter and history.
- Existing implementation PRs: [#637](https://github.com/jeremytheva/pourfolio/pull/637) (Brew Done It initial read recovery; exact-head canonical/browser evidence **NOT_RUN** as reported in PR) and [#639](https://github.com/jeremytheva/pourfolio/pull/639) (producer ranking pagination; source/browser/CodeQL/preview PASS previously recorded for head `863995a`, needs base/review recheck). Two Dependabot PRs [#635](https://github.com/jeremytheva/pourfolio/pull/635), [#636](https://github.com/jeremytheva/pourfolio/pull/636) are not implementation WIP.
- Reliability PR [#641](https://github.com/jeremytheva/pourfolio/pull/641) was the third implementation PR at the diagnostic snapshot. Its exact-head validation subsequently passed 747 of 762 Node tests (15 provider-gated skips), 140 browser/accessibility tests, build, CodeQL and Dependency Review on `c40ba1c592141f76691ae97325648d27d735216d`; preview `dpl_CTFxv55X2dFmAoeNxJYCf1Jckz7h` was READY. A dedicated live GitHub smoke test acquired a lease, verified a 409 stale-SHA rejection, preserved the original claimant and released cleanly. The front matter is the **post-integration handoff target**; refresh `observed_main_commit` to the actual merge SHA after integration, not a guessed value.
- Four enabled ChatGPT hourly tasks (rating at :00, Brew at :15, producer/venue at :30, catalogue + integration at :45) previously had conflicting authority over rating, brewery, shared docs and merges. Existing schedules remain enabled and staggered; ownership is split by workstream and the catalogue/product-launch task is the only integration/merge/`STATUS.md` authority. The coordination ledger was established at branch `automation/coordination`, `.automation/claims.json` (initial commit `37218c68`). Claims are bounded, content-SHA-fenced and recoverable; runner execution evidence must still be gathered before declaring the entire upgrade complete.
- GitHub connector can create branches, files and PRs in the current session; previous failed scheduled writes have no accessible execution failure logs/error codes in the scheduler snapshot. Their exact cause is **UNVERIFIED**, not evidence that the current connector is unhealthy. GitHub Actions recent release gate and browser jobs on `main` completed, while provider jobs were skipped. A previous *live rating deletion* failure remains a **genuine unresolved product defect**, not an orchestrator diagnosis.
- Separate `automation/coordination` branch initially caused a READY preview deployment. After the Vercel ignored-build command was scoped to that branch, the two later claim-update deployments (`dpl_CCr4NBZRikjEYGYUf2WWKzTV9LBG` and `dpl_D4S7mmAeie8PX7hJ3VJwGeRxPCox`) were CANCELED as intended. Production `main` and regular PR builds remained available.

**Immediate sequence:** finish #641 source/canonical validation and coordination smoke exercise, then re-evaluate #639 and #637 exact-head acceptance without inventing provider tests. Resolve material findings and integrate eligible PRs through the single integration task. Continue rating deletion diagnostics under #503 separately. Keep #165 schema mutation and other provider/security release gates intact. No owner action is established solely by this audit.

## Retained earlier release handoff — 9 October 2026

**Gate:** Release. **State:** READY for independent maintenance and reversible
evidence preparation. The evidence fields pin the inspected production and
validated source-bearing cleanup baseline; PR #634 owns the exact final
documentation-head checks, merge SHA and post-merge production verification.
Do not infer live rating certification from these source/deployment fields.
The owner requested continuation on other aspects after the latest live deletion
failure. Existing PRs #591 and #572 are merged after current-head source/browser
validation. The next #429 slice removes only the unreferenced legacy settings
component and reconciles the stale profile system map. The implementation has
passed its source/browser gate; final handoff-only validation is retained in
PR #634 before merge. Neither dependency update
changes rating policy, provider schema, write gates or feature availability.

PR #591 merged as `09b411a04bd2239d4df7ed2cc617909254740a1e`. Its exact
pre-merge `3b5fd45b68b799a6b2ef24d50f009695cdc5269e` passed canonical Node 22
validation (733 passed, 15 gated skips), all 140 browser/accessibility cases,
CodeQL and Dependency Review in run `37849783879`. Preview health matched that
head. Production `dpl_HYTgwuJkPZraknv3Zn9MpMqT7gXC` is READY and public health
matched the merged SHA with authentication, data and rate limiting configured.

The owner's latest failed retest used production `0ef12b0e0b29bb9a086d21b50bf8f0e3ed2c6984`
(`dpl_Cw1DFT2sVAGwpf7rNUksKnaBsLyR`). Public health matched that exact SHA.
Its canonical Node 22 run `37765131242` passed 733 source tests (15 gated
skips) and 140 browser/accessibility cases. PR #633 removed only unreachable
legacy rating UI/helpers and their obsolete tests; the lower source-test count
does not represent removal of the current rating gateway/browser regressions.
Latest executed connected run `37762658045` on docs release `8df6994` again
passed 12 baseline checks and skipped the four required history/write cases;
temporary session cleanup passed. Later comment-triggered runs were skipped,
not additional executed certification evidence.

The owner's 9 October 08:45 Sydney screenshot (`IMG_4236.png`) shows the
current public app, loaded owner history, a collapsed breakdown control and
the still-present 4D rating beside “The request was not valid.” The live delete
retest FAILED. The screenshot establishes neither the rejected provider stage
nor successful breakdown contents or cross-account behaviour. The message
matches the generic HTTP 400 mapping, but no matching runtime log or request ID
was available; do not infer a repaired deletion or a confirmed root cause.
No further live deletion was attempted by automation.

Historical repair evidence follows; source/runtime success does not supersede
the latest manual failure.

PR #572 merged as `2263fee494a6098937629c8ef8ee74135f3f258e`. Its exact
pre-merge `cac7738350c869fdc523b158aba32c2f74c04157` passed canonical Node 22
validation (733 passed, 15 gated skips), all 140 browser/accessibility cases,
CodeQL and Dependency Review in run `37850422322`. Preview
`dpl_GseUSoMvMEsZwJ5ZuVr16tzkrXmE` was READY with exact-SHA HTTP 200 health.
Merged production `dpl_88w2BEP5dKcgoou5D7M1NzVmob26` is READY; public health
matched `2263fee494a6098937629c8ef8ee74135f3f258e` with authentication, data and
rate limiting configured. Exact-main run `37850760574` also passed canonical
source/browser validation and CodeQL. No connected write gate was enabled.

The bounded #429 audit found no source, server, test or documentation consumer
of `src/components/ProfileSettings.jsx`; current-main code search matched only
its own declaration/export. `src/pages/Settings.jsx` remains reachable, and
`settingsManager.js` remains used by Settings and RateBeer. Only the unused
216-line component is removed; BeverageTypeSelector, beverageTypes, other
shared helpers and contained event/venue/social/account-lifecycle code are
preserved. Removed source remains recoverable from Git history. SYSTEM_MAP.md
now describes the implemented persistent/opt-in profile boundary rather than
the obsolete session-only/write-unavailable model. No runtime route or policy
is changed by this slice. Exact source-bearing candidate
`97d29d2d7f3e185e6dbe986f9c40a5039bea5ef7` passed run `37850989001`:
canonical Node 22 validation (job `113563541968`, 733 passed / 15 gated skips)
and 140 browser/accessibility cases (job `113563541692`), Dependency Review and
CodeQL, with no review threads. Preview `dpl_2SP4joZ3stChfUrcQ1ajCYh4ERmA`
was READY and exact-SHA health returned HTTP 200. The final handoff changes
only STATUS.md; its own latest-head checks and subsequent production health
must be verified in PR #634, not assumed from this earlier candidate.

PR #631 is merged as `217ee25aa864aeed30d0155d8a826ed330606f24` and production
`dpl_BD7imVDZ1w5PfKgCpV5oUSoo8MMF` is READY. Public health returned HTTP 200
with that exact production SHA and configured authentication/data/rate limiter.
The repair adds bounded deletion read-back, paged parent-filtered and locally
owner-checked child cleanup, exact opted-in author links and collapsed lazy
historical breakdowns. Managed submissions with missing/invalid workflow versions
fail closed; the historical physical-CRUD compatibility path is restricted to
unmanaged completed rows. No provider migration, bulk backfill or historical
reconciliation was enabled, and automation did not delete any live user rating.

Exact pre-merge `d1e02154554e06cc6e39d8b7beede1c5b417ad0c` passed canonical
Node 22 validation (736 passed, 15 gated skips) and all 140 browser/accessibility
cases in run `37752745047`, plus Dependency Review and CodeQL. Exact preview
health matched its SHA; the new read endpoints returned 401 without an application
session. Exact-production run `37753190379` passed the same canonical source
gate (job `113231196103`, 736 passed / 15 gated skips) and 140 browser cases
(job `113231195850`). Connected run `37753349432` (job `113231746208`) passed
12 baseline checks with four explicit skips and zero failures; write confirmation
was empty and always-run session cleanup succeeded. Both private-history
owner/exact-entry/retry/reload and other-account cases skipped, as did the guarded
rating-create/delete and cellar/cross-account write cases. Those rows remain
pending, including live retest of the failed deletion and new shared breakdown.
The prior connected run `37742072557` also skipped these required rows.
A green workflow or mocked browser pass cannot close those rows or the
separate #165/#503 create/retry/delete/cross-account/race certification.

The owner's manual deletion on the older `2bfe93befc98196143714e66d5e10d37f68ef302`
deployment FAILED and remains failure evidence (correlation
`cef24bbc-91e7-4633-8214-ee174aaf5467`). Retesting must use the current public app,
not the immutable older deployment URL visible in the screenshots. Follow
`docs/nocodebackend/rating-workflow-certification.md` for live acceptance.

## Autonomous continuation support

Continue dependency-correct work from current repository and live GitHub evidence.
The source/harness implementation PRs #628/#629 and repair PR #631 are merged;
the older failed manual deletion is retained history; subsequent bounded new-rating
create/reload/delete and independent tombstone/child cleanup checks passed. The
remaining historical contradiction/recovery and distributed concurrency remain
under #165. Dependency PRs #591 and #572 are
merged; the bounded #429 legacy settings slice is source/browser-validated,
with exact final-head integration evidence retained in PR #634. This handoff reconciles
completed integration while retaining the pending connected rows. Scoped blockers #165/#144/#422
do not prevent independent work. Do not enable durable rating reconciliation
before the governed #165 provider migration and certification.

The earlier #165/#503 gateway-integrity work is preserved separately on
`fix/165-503-rating-gateway-integrity` and has not been published or integrated.
Its latest focused mock checks passed 51 individual assertions on Node 24;
canonical latest-head validation and controlled connected create/retry/delete/
cross-account certification remain outstanding. Reconcile its preserved deletion
patch with #631 before resuming; the integrated compatibility/read-back repair does
not certify the separate concurrency/CAS changes or those live write flows.

Owner response standard: Done / Next / You. Operating rules live in `AGENTS.md` and `PR_LIFECYCLE_STANDARD.md`.

## Retained integration and evidence — 15 October 2026

- PR #628 is merged as `5f111da0c62af8f7551d7e071b8ce7f9d2c4c5c8`. Production deployment `dpl_BDdwWhXQ6KaY7kEUM8HcWScJSvBX` is READY; `https://brew-buds-mobile-app-design-3577.vercel.app/api/health` returned 200, the exact production SHA and configured authentication, data and rate limiter.
- Exact-production source run `37737475423` passed canonical Node 22 validation (job `113180212139`): 708 tests passed, 15 skipped, with all composed lint, audit, build and governance/security checks passing. Browser/accessibility job `113180211792` passed all 135 tests. Exact pre-merge head `ae74b69d657c99d0f9ce95367285a42cb9a35c38` also passed run `37737126748`, Dependency Review, CodeQL and exact preview health. Local Node 24 checks were supplemental only.
- Connected production run `37737587480` on #628's merged SHA passed 12 baseline checks but failed before owner-history access due to sign-in rate limiting; the serial other-account case did not run. That superseded failed attempt is retained as failure evidence.
- PR #629 is merged as `f9ec7204d3ccab9df6eda9f1704fd085b47f57f2`. Production deployment `dpl_7yJ6cJV1ka6AVnSFShARmzuZertq` is READY and public health returned HTTP 200 with that exact SHA. Session reuse is release/origin/owner-bound, server-verified, private mode `0600`, outside artifact paths and removed by always-run cleanup. Application/auth-limit/schema/write-gate behaviour is unchanged.
- Exact #629 main run `37742009144` passed canonical Node 22 validation (job `113194640843`): 714 passed, 15 gated skips, zero failures, including six cache privacy/isolation/expiry/error tests. Browser/accessibility job `113194640536` passed 135 tests. Exact pre-merge `08c1cc860bbe20bd54e3cf3e6765b5bc6e2cdadd` passed run `37740937294`, Dependency Review, CodeQL and Preview health.
- Connected rerun [37742072557](https://github.com/jeremytheva/pourfolio/actions/runs/37742072557) at exact production `f9ec7204d3ccab9df6eda9f1704fd085b47f57f2` completed with 12 passed, four skipped, zero failed (job `113194846211`). The two new owner-history/exact-link/retry/reload and other-account-history cases did not execute to completion: no eligible existing completed-owner beer fixture was selected by the first case, and the second also explicitly skipped. Those provider rows remain pending; separate usable fixture/session evidence is required. The other two skips are the rating-create/delete and cellar CRUD/cross-account write gates. No rating/cellar writes or historical reconciliation were enabled by this read-only run.
- #509 is complete. The additive live bonus-category reconciliation was applied with the exact 95-mutation guard, zero drift was verified, and authenticated production presentation across Design, Appearance, Aroma, Mouthfeel, Flavour, Follow, Burp and Overall passed.
- #600 is complete. Authenticated `/ratings/mine` and rating-integrity evidence no longer reproduce the former `personal_history_projection` 502.
- #415 is complete. The release harness is aligned with the current beer-first UI and exact-production certification passes.
- #449's launch-safe Add Beer, Suggest Correction and Add-to-cellar initiation/review boundary is production-certified. PR #621 also removed ungoverned product-image URL creation and made the server fail closed until an approved image/provenance workflow exists. #449 remains open only for genuinely provider-gated moderation/persistence and relationship-backed capabilities.
- Persistent profile source behaviour is already implemented: owner profile create/read/update, stable server-generated `public_id`, default-private rating-history visibility and privacy-safe public projection. PR #622 is merged and reconciled the formerly stale machine contract/docs/browser fixtures.
- Brew Done It remains launch-excluded and absent from production-facing navigation/CTAs. Its protected direct route remains for controlled testing only.

- PR #631 merged the failed-delete, exact author-link and historical-breakdown repairs. Pre-merge run `37752745047` and exact-production run `37753190379` passed 736 source tests (15 gated skips) and 140 browser/accessibility cases. The first candidate `dc397df90e57062a489581309ca29700c56b5b97` passed source checks but failed one invalid public browser fixture (139 passed); that fixture was corrected without weakening the public allowlist, and a malformed-terminal-version guard was added before the successful rerun. Automated Codex review was unavailable due to its usage limit; manual source review found no unresolved material issues. Production `217ee25aa864aeed30d0155d8a826ed330606f24` deployed as `dpl_BD7imVDZ1w5PfKgCpV5oUSoo8MMF` with matching public health. Read-only connected run [37753349432](https://github.com/jeremytheva/pourfolio/actions/runs/37753349432) passed 12 baseline cases, skipped four required history/write cases and reported zero failures. Always-run session cleanup succeeded; no rating/cellar writes were enabled. The old manual deletion failure and unexecuted controlled provider rows remain separate from this source/runtime evidence.

Detailed implementation history belongs in commits, PRs and `docs/RELEASE_TRACKING.md`.

## Scoped blockers

| Issue | Remaining boundary | Safe continuation |
|---|---|---|
| #165 | Certified parent/child concurrency, uniqueness, provider migration/recovery and historical contradictory rating | Source containment and evidence preparation; no irreversible mutation or reconciliation enablement before the existing gate |
| #144 | Second-account supported login, remaining backend isolation and authoritative bonus values/backfill | Correct credentials securely; bounded read-only point-plan preparation and existing guarded certification after prerequisites |
| #422 | Persistent profile/privacy and distinct-account acceptance | Reuse merged source; certify default-private, persistence, opt-in/revocation, copied links and owner denial |

These scoped blockers do not prevent independent launch work. The product
choices are settled; external credentials, authoritative values, provider
recovery and named specialist/operations evidence remain required.

## Next dependency-correct work

1. Obtain the exact-ID/value source and reviewed complete point plan, then
   prepare bounded backfill/recovery and verify persisted values with the
   integrated read-only auditor. Preserve explicit/private values and all
   historical rating totals.
2. Correct the protected second-account password before one guarded distinct-
   account session/cellar/profile/bonus run with current auth provenance.
3. Complete the #165 provider/restore/approval package and historical rating
   recovery; certify the accepted actual write contract under #144, then #154.
4. Complete effective public documents/support, named alert/recovery owners,
   anonymous production entry, manual accessibility and exact-candidate pilot/GO
   acceptance. Keep public launch NO-GO until every required gate passes.

This is the intended main integration handoff for PR #675. The source PRs
#676/#677 are merged; PR #675 retains the final workflow/documentation head's
canonical/browser/anonymous-entry results and resulting deployment identity.

## Deferred capability boundaries

- #449: persisted/moderated correction proposals and relationship-backed cellar selectors remain capability-gated until their backing provider/ownership contracts are certified.
- Producer Stage E: verified geography, historical lifecycle and managed-business/venue attribution depend on #444/#437/#399; no fabricated relationships.
- Brew Done It: launch-excluded until its own provider/cardinality/privacy/recovery certification and governed enablement.
- #422: persistent profile structure/application behaviour is deployed; connected provider uniqueness/default-private, cross-owner, public/private and recovery certification remains open.

## Project source-control limitation

Project Master's `MASTER_SOURCE_MANIFEST.md` is the active master authority index. The current Pourfolio ChatGPT Project attachment surface still exposes five superseded/historical policy inputs: `GitHub-Codex_Software_Delivery_Operating_Standard.md`, three `Update PR lifecycle standard.txt` attachments, and `Pourfolio Backend Values.txt`. They are explicitly non-authoritative.

The available repository tools cannot attach/detach ChatGPT Project sources. The remaining Project UI housekeeping is to remove those five superseded files from active Pourfolio Project Sources and retain the canonical master standards indexed by `MASTER_SOURCE_MANIFEST.md`. Keep the beer/backend CSV/XLSX/SQL sources as evidence/data sources. This is not a repository release blocker.

## Validation limitations

Source and production read evidence do not by themselves prove every provider write/permission boundary. #422 must retain unsupported connected rows as pending until they are exercised against the provider with safe cleanup. #165 remains separately blocked at an irreversible schema migration boundary, and #577 implementation is closed; remaining session acceptance is tracked under #144 and limited by the supported second-account credentials.





