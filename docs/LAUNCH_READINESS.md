# Launch readiness

Last reconciled: **26 October 2026 UTC**. Last verified application deployment:
[`89c6e4618aefde0f5e33365f4b8578a73421fd4c`](https://github.com/jeremytheva/pourfolio/commit/89c6e4618aefde0f5e33365f4b8578a73421fd4c). PR #689 retains matching production health/readiness and source/browser evidence. Earlier anonymous and connected results remain scoped to their recorded candidates;
READY metadata alone remains insufficient.
Bounded evidence is recorded below and in `STATUS.md`; final public launch
qualification remains open.

Protected run 40235529806 now verifies both distinct accounts against production
`f13e07a8` after the owner's secure credential correction. Both passed normal
sign-in/session/sign-out with zero data writes. This supersedes the former
second-account HTTP 401 observation for AUTH_ONLY; remaining connected
cellar/profile isolation, full session lifecycle and release gates stay open.

Issue #671 makes the existing bonus-value fallback explicit in both pickers and
preserves two-decimal stored-value presentation. It changes no scoring policy
or provider data. Accepted source `ec4e2610` passed canonical Node 22 validation
(1,007 tests, 15 gated skips) and 156 deterministic browser/accessibility cases.
Final-head desktop/mobile regression validation and deployment evidence remain
required in PR #672; no preceding-head result is promoted to final-head PASS.
The retained inventory had 81 missing global values. The owner has since supplied
39 allocations; 42 remain unresolved. Backfill and custom-creation/isolation
acceptance remain separate open gates. This presentation correction
does not close PF-LAUNCH-BONUS, PF-LAUNCH-ACCESS or PF-LAUNCH-RELEASE.

The launch-impact guard maps those three requirements. The optional bonus rows
in `e2e/mockApi.js` are deliberately classified under BONUS/ACCESS rather than
changing runtime/provider authority. Exact preview `dpl_9ybf6sEzBqBg5RHKU5HKn2YdTbiH`
returned matching HTTP 200 readiness for `ec4e2610` at 23 October 06:09:28 UTC;
production `cb311c0b` returned exact health/readiness at 06:06 UTC. This handoff
records the accepted source before integration; verify the resulting deployment
separately. Connected isolation, recovery and final launch acceptance remain open.

The impact check maps the shared bonus-auth helper and provider evidence;
`scripts/run-cellar-write-certification.js` is deliberately classified under
PF-LAUNCH-AUTH, PF-LAUNCH-CELLAR and PF-LAUNCH-RELEASE for its account-specific
preflight report. No application policy, stored bonus value or provider schema
changes in this diagnostic correction.

## Current launch decision

### Automatic local rating saving — 26 October 2026

[PR #689](https://github.com/jeremytheva/pourfolio/pull/689) is merged and deployed
at `89c6e4618aefde0f5e33365f4b8578a73421fd4c`; production health/readiness and
static PWA resources returned HTTP 200. Exact main source/browser checks pass
(1,069 source tests, 15 provider-gated skips, 176 browser/accessibility cases).
The identical accepted source also passes mobile Chromium and Linux WebKit
emulation. [STATUS.md](../STATUS.md#automatic-local-rating-saving-deployed--26-october-2026)
holds integration/runtime evidence; [offline boundaries](offline-ratings.md)
define the account/product draft and static-cache contract.

This closes the source/local-draft delivery only. Physical iOS/home-screen and
Android acceptance is NOT_RUN, explicit server submission is still required,
and #165 provider integrity/recovery remains open. No automatic upload or live
rating/provider mutation occurred. The existing QA recovery authorization,
42 unresolved bonus allocations, connected privacy/operations and other launch
gates are unchanged; public launch remains **NO-GO**.

### Cellar HTTP recovery boundary — 25 October 2026 UTC

The separate existing cleanup-guarded cellar HTTP test was selected alone against
production `fec60da4`, with retries disabled and no rating mutation selected.
[Run 40241436043](https://github.com/jeremytheva/pourfolio/actions/runs/40241436043),
job `121313879468`, failed at 22:43:02 UTC in the cleanup helper call.
Its redacted report cannot identify whether create acknowledgement, owner
readback, verification or cleanup failed. No HTTP test PASS is claimed, no
unchanged mutation retry ran, and the earlier direct-gateway PASS is retained
only within its separate scope.

Read-only owner inspection
[40241841492](https://github.com/jeremytheva/pourfolio/actions/runs/40241841492),
job `121315114617`, found one owned row, carrying one canonical QA marker.
It made zero cellar mutation requests, verified the owner session/release
before and after, signed out successfully and retained encrypted inspection
artifact `12617127055`.

Read-only recovery comparison
[40242334490](https://github.com/jeremytheva/pourfolio/actions/runs/40242334490),
job `121316602591`, bound that encrypted receipt to the same current owner
HTTP row and a fresh exact provider read. The stored row matches the initial
create shape (quantity 1, container `release-check`, exact product/marker,
received date 25 October); the update shape differs on quantity. This
establishes persisted create-shaped data, not the original response or failed
stage. Original-attempt correlation remains **UNCONFIRMED**. The complete raw
target and owner baseline are backed up in encrypted artifact `12617575916`,
SHA-256 `1bc38bc4e15e9f0de67c958b884b9ca18485d1986d8032a7cfe74e8423649cbf`.
The exact raw target fingerprint is
`1c8e0ec1278a28e426f6cb041d1790c26dcc4fe650d4b3b413efddd5fd0ee1ed`.

The existing [cellar cleanup helper](../release-check/cellarCleanup.js) states:
“Never discover a cleanup target by comparing histories after a failed create.”
The original create nonce/acknowledgement was not retained as a durable intent
receipt. The later snapshot cannot replace that original evidence. The
[prepared single-record recovery workflow](https://github.com/jeremytheva/pourfolio/blob/23917bf8ad71d5724f2f0641061587f54c4eccfa/.github/workflows/launch-connected-evidence.yml)
therefore remains untriggered pending explicit owner authorization for this
current QA record. It verifies the encrypted source plan, exact raw fingerprint
and owner, writes an encrypted before receipt, permits one HTTP DELETE with no
retry and verifies fresh provider/owner absence plus other owned-row preservation.
Source/read-only validation does not claim that recovery executed. No unrelated
record, ownerless history or rating is an authorised cleanup target.

Before another HTTP mutation certification, retain durable encrypted create
intent/acknowledgement and safe stage/status evidence; review any provider or
application failure established by that evidence. Do not infer a container enum,
Origin failure, missing Playwright base URL or a fixed product defect from the
outer helper frame. Runtime-log/metric queries supplied no request sequence.
Public launch remains **NO-GO**.

### Integrated allocation and connected release evidence — 25 October 2026 UTC

[PR #686](https://github.com/jeremytheva/pourfolio/pull/686) merged as
`fec60da415c2f6cb75cd8f19bdc01a6731c5553a`. Exact main source validation and
all 158 browser/accessibility cases passed in
[run 40240571422](https://github.com/jeremytheva/pourfolio/actions/runs/40240571422),
jobs `121311271384` and `121311271130`: 1,055 source tests passed, 15
provider-gated skips, zero failures and zero production vulnerabilities.
Production `dpl_9KDT7ZW55CbtJZu8UiLRUS62C6P7` is READY at that exact SHA.
Anonymous attempt 2, job `121312137847`, passed all eight fixed URLs at
22:34:58 UTC with matching health/readiness source `fec60da4`. The first
attempt observed preceding `f13e07a8` during deployment; it did not qualify
the new candidate.

The live read-only
[bonus preflight 40240571404](https://github.com/jeremytheva/pourfolio/actions/runs/40240571404),
job `121311271248`, completed at 22:31:51 UTC. It returned expected
**BLOCKED / PLAN_POINT_VALUE_INVALID**: 82 global and one private attribute,
81 missing global values, 39 proposed fills, 42 unresolved allocations, one
already matched preserved value and zero missing preserved values. The workflow
exits 2 for the incomplete plan; its canonical validation passed.
Plan SHA-256 is `e1cdd3421bd072a81868ffe97cb32f03916514e54d148d1705d4d9b5ac0e6723`;
snapshot SHA-256 is `c6f1ea1167ae07f4b424db4fa0c1c543487513e053caac16387c8e869343c227`.
Only fresh paginated reads occurred. This is not an atomic backup, a backfill
or post-write/private/history preservation certification. All 82 descriptors
remain available; obtain the 42 `null` allocations in the committed plan.

The existing connected browser baseline ran against that exact production
release on a reviewed evidence-only branch, with no explicit rating/cellar
writes enabled. Normal profile reads may initialise a default-private profile.
[Diagnostic run 40240996316](https://github.com/jeremytheva/pourfolio/actions/runs/40240996316),
job `121312525327`, passed 12 checks, failed zero and skipped four at
22:39:06 UTC. This covers host/security, public document rendering, configured
authentication discovery/sign-in/sign-out, catalogue search/pagination/details,
rating form boundaries, owner/public profile projections, proposal/cellar form
reachability, inaccessible reconciliation, bonus category rendering, brewery
navigation, cleared-cookie protected-route redirects and scoped desktop axe.
The aggregate authentication test does not prove omitted optional sign-up/OTP
branches, provider expiry/revocation, rate-limit enforcement or real OAuth
completion. Profile projection does not qualify privacy transitions/uniqueness.

The four skips are rating mutation, cellar HTTP mutation and the two existing
history-fixture/link cases; no skip becomes PASS. Earlier
[run 40240743642](https://github.com/jeremytheva/pourfolio/actions/runs/40240743642)
had five passes, one failure in the composite catalogue/rating-form/profile test
and ten skips. Diagnostic capture added only static source locations; the
unchanged application/search configuration then passed. The first failure is
**NOT_REPRODUCED / CAUSE_UNDETERMINED**; no defect or fix is established. Retain
both observations and assess repeatability at final candidate qualification.

Trace, screenshot and video capture were disabled; raw diagnostics/session
files were kept private and removed. Only aggregate results/fixed titles were
published in artifact `12616933404`, SHA-256
`016f8c2a4e8fcb3828bc478c3a408f4382f2d1049fb91226eae3b854477dcfbc`.
Provenance before/after and private-workspace cleanup passed. These evidence-only
workflows are not proposed for merge. No source, HTTP-entry or baseline result
approves public-document content, manual WCAG acceptance, #165 provider
integrity/recovery, complete bonus values/backfill or public launch.

### Owner allocations and corrected account access — 25 October 2026 UTC

The owner supplied 39 calculation values and explicitly confirmed that “All that
and more” maps to existing ID 3, “All this and more!”. The reviewed
[data/bonus_attribute_point_plan.json](../data/bonus_attribute_point_plan.json)
records exact IDs and two-decimal amounts with provenance. All 82 global
descriptors remain available as requested. Existing global ID 51 retains its
stored 0.50; the other 42 entries are explicitly unresolved (`null`).
“Other” is a UI section heading, not a point-bearing row. No default or similar
descriptor is used to infer an allocation.

The protected read-only preflight uses fresh bounded provider pagination and the
existing point-plan auditor. It fingerprints the plan/snapshot, reports aggregate
counts/static blockers and never writes provider data. Missing or conflicting
preserved values block it. Its protected workflow is main-only, manually
dispatchable or selected by `[bonus-point-preflight]` in a reviewed merge.
A partial plan must remain BLOCKED. No actual backfill, historical-total
preservation, private-row preservation across a write or provider atomicity is
claimed by this source preparation.

The owner confirmed secure second-account credential updates. Existing protected
[run 40235529806](https://github.com/jeremytheva/pourfolio/actions/runs/40235529806),
job `121296164720`, passed both account sign-in/session/sign-out and distinct
identities at 21:27:10 UTC against production
`f13e07a845714ea02d744394dbe1684e614c8bfb`, with zero data writes.
This supersedes the former HTTP 401 blocker for that observation and qualifies
AUTH_ONLY. The separate bounded
[cellar run 40239183671](https://github.com/jeremytheva/pourfolio/actions/runs/40239183671),
job `121307112955`, passed at 22:14:30 UTC from reviewed evidence-only source
`8b0be28fc81a9a8327e2c500ac89c032cd1c554f` using those live account identities
and auth release `f13e07a8`. Owner create/reload/update, nullable relationships,
gift round trip, other-account list/PUT/DELETE denial and exact cleanup passed.
There was one create, one update, one delete, one removed fixture and no gateway
failure. The encrypted receipt and redacted summary are artifact `12616105836`.
No historical ownerless row or rating was mutated. This invokes the candidate
gateway directly; HTTP/session middleware and browser submission are NOT_RUN.
The evidence-only workflow is not proposed for merge. Full
session/rate-limit acceptance and profile privacy remain separate gates.


Source head `83ac5d8e1ccba6f2c9ab943a4f63cc1de778ae3b` passed canonical
Node 22 validation in [run 40239690588](https://github.com/jeremytheva/pourfolio/actions/runs/40239690588),
Release gate job `121308631243`: 1,055 passed, 15 provider-gated skips, zero
failures and zero production vulnerabilities. Browser/accessibility job
`121308631244` passed all 158 cases; CodeQL, Dependency Review and independent
code/mapping review passed. Exact preview `dpl_2L6CNRU5jEXMkRsN5QGF3B1uLjSx`
was READY. [PR #686](https://github.com/jeremytheva/pourfolio/pull/686) retains
final documentation-head, integration, live read-only preflight and deployment
evidence; no preceding-head result qualifies a later head. This is the intended
main integration handoff. No source/deployment result certifies a backfill or
public release.

The review of #679/#681/#683 found no material regression. Verified production
metadata identifies READY deployment `dpl_BoLGF2ADjpZx17JmURmHazMB4sF6` at
`f13e07a845714ea02d744394dbe1684e614c8bfb`. PR #683 retains the exact-version
anonymous eight-route HTTP result. Final-candidate evidence is still required.
#165 integrity/recovery, complete allocations/backfill, connected privacy and
publication/operations remain open. Public launch remains **NO-GO**.

### Superseded scoring source retirement — 25 October 2026 UTC

Issue #682 is a bounded #429 cleanup of the unreferenced v1.0.0 scoring helper
and its sole-consumer eight-case test file. Current v2 recovery/v3 deduction
scoring and their tests remain intact. The old v1 schema proposal is explicitly
historical and links to the current decision/schema/readiness authority; its
historical tables and ADRs are retained. All 13 current v2/v3 scoring cases pass;
canonical Node 22.23.4 passes 1,046 tests, 15 gated skips, zero failures and zero
production vulnerabilities. The eight removed cases exercised only the retired
helper. All 40 client-build files remain byte-identical. [PR #683](https://github.com/jeremytheva/pourfolio/pull/683)
source head `8619af59705379fb3d337d83621a94a7f583bb6a` passed exact-checkout canonical
validation and hosted run [40165358247](https://github.com/jeremytheva/pourfolio/actions/runs/40165358247),
Release gate job `121085174119`; browser/accessibility job `121085174160` passed
158 cases. Final-candidate and integration evidence remain in the PR.

This changes no current score, provider row, migration, permission or deployment
flag. Brew Done It remains launch-excluded. #429 and all connected bonus,
privacy, account-isolation, provider recovery and public **NO-GO** gates remain.

### Bonus backfill preservation checks — 25 October 2026 UTC

Issue #680 completes the next source preparation for the verified-bonus gate.
The existing point-plan auditor now requires `--before-snapshot` for verify,
checks the same reviewed plan against both snapshots and permits only missing
global point fills. Row additions/deletions, private changes, existing-value
changes, other supplied-field drift, incomplete fields and environment/capture
mismatches block verification; captures require explicit UTC timestamps. Original
plan/before/after bytes are fingerprinted;
output contains only aggregate counts and static blockers. Eight initial
regression groups failed before the change; 22 focused Node 22 cases pass.
Canonical Node 22.23.4 validation passes 1,054 tests with 15 provider-gated
skips, zero failures and zero production vulnerabilities. [PR #681](https://github.com/jeremytheva/pourfolio/pull/681)
source head `abf1f11564d3d8e4cb82d95361c19209233fc678` passed exact-checkout local
validation and hosted run [40162291112](https://github.com/jeremytheva/pourfolio/actions/runs/40162291112),
Release gate job `121076181186`. The PR retains final documentation-head and
integration evidence. No connected skip becomes passing evidence.

This is `SOURCE_ONLY` consistency checking of supplied bonus-attribute evidence.
Completeness/source/reviewer metadata remain assertions; historical rating
totals/children, actual provider state, backups, restore, concurrency and
connected permissions retain their existing gates. Authoritative allocations
and actual backfill remain uncompleted; public launch remains **NO-GO**.

### Canonical provider-evidence checks — 25 October 2026 UTC

Issue #678 corrects a source-only certification defect under #144. The baseline
and import-rehearsal auditors previously used historical `bonus_attributes_id`
instead of the current canonical `bonus_attribute_id`. The correction requires
the canonical header in every snapshot, including empty pre-import mappings,
rejects legacy-only and mixed headers, and computes bonus orphan/duplicate-pair
checks from the canonical CSV data. Ten focused Node 22 cases pass. Canonical
Node 22.23.4 validation passes 1,043 tests with 15 provider-gated skips, zero
failures and zero production vulnerabilities. [PR #679](https://github.com/jeremytheva/pourfolio/pull/679)
head `4e90b8fc1e9b0c71ec49e280b636b5018b72729d` has the same independently verified
hosted result in run [40159035452](https://github.com/jeremytheva/pourfolio/actions/runs/40159035452),
Release gate job `121066492047`; browser/accessibility job `121066492211` passed
all 158 cases. CodeQL and Dependency Review passed. The PR retains final
documentation-head and integration evidence; no skipped connected row becomes PASS.

This improves the tooling for PF-LAUNCH-PROVIDER/BONUS/RELEASE. It does not
provide same-state provider evidence, reviewed point allocations, a backfill,
restore proof or connected permissions. Historical source files are retained
unchanged. Existing #165/#144/#154/#422 acceptance and public **NO-GO** remain.

### Adopted public MVP execution — 24 October 2026 UTC

The owner selected a readiness-gated public MVP on the existing Vercel production
URL, with verified bonus point-value backfill required before launch. Keep the
login-first product and existing host. This decision does not approve invented
point values, irreversible provider migration or public release before the gates.

The initial 24 October inspection confirmed main `c679192a`. Its post-merge run
[39951489367](https://github.com/jeremytheva/pourfolio/actions/runs/39951489367)
contains substantive passing Release gate job `120406768104` and Browser and
accessibility job `120406768386`; connected rating, bonus and cellar jobs skipped.
Authenticated Vercel metadata confirms production deployment
`dpl_4DjMJaywW2bMkyWGNrrqGEEewXGz` READY at that exact SHA, with the intended
alias `brew-buds-mobile-app-design-3577.vercel.app`. PR #674 records matching
production health/readiness at 23 October 12:13 UTC. This review did not repeat
those HTTP probes or connected writes. A clean anonymous probe was unavailable
before receiving an HTTP response, so public access was then UNVERIFIED; the later hosted anonymous check below
supersedes that initial NOT_RUN. Project protection metadata is not proof of
visitor access.

The source review also reproduced stale rating completion overwriting a
concurrent deletion in an in-memory interleaving. Current transitions use
unconditional updates. A separate observed-terminal retry can recreate children
before rejecting the deleted parent. Source containment must not be represented
as provider-certified distributed concurrency. #165 must prove conditional parent
transitions and prevent late child writes through a certified atomic/fenced graph
workflow. More reads, an unverified `expected_version` query or an expiring
process/distributed lock do not establish those guarantees.

Live issues #503, #449 and #577 are closed implementation work; their broader
connected acceptance remains tracked by #165/#144/#154/#422 and this checklist.
The newer guarded run still reports all four account fields present and second
sign-in HTTP 401. Correct the supported second-account password securely rather
than reopening adapter implementation or retrying unchanged credentials.


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
The resulting production deployment `dpl_945KiC6zYa98V3wKzsbVD8JqHhcv` is READY at that
exact SHA by authenticated metadata; no HTTP or owner-write PASS is inferred.
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

### Retained bounded source/runtime evidence — 23 October 2026 UTC

[PR #674](https://github.com/jeremytheva/pourfolio/pull/674) rejects raw boolean,
array and object rating values before numeric conversion, excludes malformed
stored totals from completion, and marks unsupported historical components
incomplete. Accepted source `a85de85d` passed canonical Node 22.23.3 validation
(1,014 passed, 15 gated skips, zero failures/vulnerabilities), all 158 browser/
accessibility cases, Dependency Review and CodeQL. Exact preview
`dpl_3itSFcGixzaE7tjBn7yQFuYRvBz5` returned matching HTTP 200 health/readiness
and provider OK at 23 October 12:05 UTC. This is bounded source/runtime evidence
for RATING, PROVIDER and ACCESS; it does not certify connected rating writes,
privacy or recovery. The final documentation head and resulting production
deployment require their own verification in the same PR. The then-current production
`593b6010` returned matching public health/readiness at 23 October 12:05 UTC. No provider
data was changed; the second-account HTTP 401 and all retained launch gates
remain open.

The bounded #429 cleanup retires only the unreferenced browser-local privacy
prototype. The active profile's server-backed sharing opt-in is unchanged.
A deterministic regression checks that old local-storage public flags cannot
override a server-private profile, opt it in on save or replace the persisted
value after reload. Accepted source `733f0d4a` passed canonical Node 22.23.3
validation (1,007 passed, 15 gated skips), all 158 browser/accessibility cases,
CodeQL and Dependency Review. Exact preview `dpl_EgrmFDUxrWAwBJ511oQWhoau47Qs`
returned matching HTTP 200 readiness/provider OK at 23 October 09:23:17 UTC.
PR #673 owns final-head validation and resulting deployment verification;
this checkpoint does not infer those from preceding-head results. The impact
guard maps PRIVACY, DEFERRED, ACCESS and RELEASE with no unmapped source paths.
This does not qualify connected #422 privacy,
second-account sessions, provider recovery or final public launch.

**NO-GO for public launch.** The beer-first application is implemented, but
required provider, rating-integrity, privacy and release evidence remains open.
Continue dependency-safe fixes and reversible evidence preparation. An existing
production deployment does not establish launch readiness.

[PROJECT.md](../PROJECT.md) owns launch scope, [ROADMAP.md](../ROADMAP.md) owns
sequencing, and [STATUS.md](../STATUS.md) owns current continuity and live work
handoff. The checklist below maps those requirements to their evidence paths.
The dated July–August records later in this document are retained history;
their results must not be presented as certification of this source baseline or
a future release candidate.

## Continuous launch-readiness traceability (Project Master pilot)

The scoped traceability index at [`.project-master/launch-readiness.json`](../.project-master/launch-readiness.json) maps existing product goals, acceptance criteria and issue links to implementation/test paths and the evidence locations already owned by this document. It does **not** replace this launch checklist or duplicate its PASS/FAIL/NO-GO state.

`npm run check:launch-readiness` verifies the index **and stable one-per-requirement checklist anchors**. Issue/PR event associations are derived from registered issue links or explicit `Launch requirement IDs:` lines. The advisory **Launch Readiness Impact** workflow classifies pull-request changed files and issue/defect events and publishes a GitHub step summary. The project integration authority must review affected and unmapped items, reconcile this document and linked tests/issues, and retain failed/superseded evidence before considering a requirement closed. The workflow cannot certify a connected provider, approve an irreversible migration, override retained integrity findings or authorise launch. The existing dependency-scoped blockers and NO-GO decision remain unchanged.

## Current launch checklist

`PARTIAL` means some source or historical runtime evidence exists, with required
connected rows still open. `NOT_RUN` and skipped checks supply no passing
evidence. Each completed row must identify the exact candidate, environment,
UTC interval, operator, reviewer, safe evidence reference and cleanup result.

| Work / issue | Delivery owner | Retained evidence and remaining completion gate | Current result |
| --- | --- | --- | --- |
| <!-- launch-requirement:PF-LAUNCH-AUTH --> Authentication and rate limits | Launch hardening; ratings owns remaining #144 session certification (#577 adapter closed) | Same-origin authentication, session and limiter controls are implemented. Certify sign-up/sign-in, refresh, expiry, sign-out and revoked/invalid sessions, plus enforced local/shared authentication limits against the intended hosting proxy boundary. | **PARTIAL: configured sign-in/session/sign-out and cleared-cookie redirects PASS; full lifecycle/rate-limit evidence pending** |
| <!-- launch-requirement:PF-LAUNCH-PROVIDER --> Rating provider foundation — [#165](https://github.com/jeremytheva/pourfolio/issues/165) | Ratings | Application durability contracts exist. Prove provider migration/backfill, uniqueness, conditional updates, immutable rating dates, backup and isolated restore; complete the [migration evidence package](nocodebackend/rating-schema-migration-runbook.md) and obtain explicit approval before irreversible mutation. G04, G10–G12, G14–G16 and G28 remain open. | **BLOCKED at provider/approval boundary** |
| <!-- launch-requirement:PF-LAUNCH-RATING --> Rating lifecycle and deletion — [#503](https://github.com/jeremytheva/pourfolio/issues/503), remaining integrity [#165](https://github.com/jeremytheva/pourfolio/issues/165) | Ratings | #503 is closed. A bounded production `36ce8ffe` browser tasting saved, reloaded and was deleted once; independent `31e41c3b` inspection proved its valid deleted tombstone, zero score/bonus children and preserved baseline. A separate, read-only normal-HTTPS rating-breakdown request from a verified distinct release account returned 404 without writes. These close only their scoped rows. The historical completed/deleted parent with one surviving score child remains a confirmed #165 recovery finding. Full retry/partial-write/concurrency and permission-negative certification remains open in the existing rating guide. | **PARTIAL: bounded lifecycle/read denial PASS; historical recovery and broader integrity evidence open** |
| <!-- launch-requirement:PF-LAUNCH-BONUS --> Bonus attribute point integrity — [PR #651](https://github.com/jeremytheva/pourfolio/pull/651) | Ratings; catalogue release integration | Merged/deployed `4019c90e`: 896 canonical source tests, 15 gated skips, 155 browser/accessibility cases. Current-instance server persistence/reload and exact fixture cleanup passed: two creates, two deletes, no mutation retry, no fixture from that run remains. Production form rendered stored global 0.5/private 0.7, their 1.20 sum, six selections at 2.00 and the expected 3.07/5 preview; draft discarded. Inventory still has 81 absent values among 83 attributes; fallback 0.2 does not establish them. A later production `36ce8ffe` browser test saved/reloaded one tasting using 0.5 + 0.7 = 1.20 points (Bonus 1/2; 2.82/5), then deleted that exact tasting once and restored counts 4/2 with old links intact. Independent `31e41c3b` inspection confirmed a valid deleted tombstone, zero score/bonus children, and the preserved baseline. Owner decision on 24 October requires authoritative stored values for every launch-selectable descriptor. The owner has supplied 39 exact-ID allocations and confirmed ID 3; all 82 remain available, ID 51 preserves its existing 0.50 and 42 values remain unresolved in the committed point plan. Complete remaining allocations, fresh preflight, governed bounded write/readback and historical-total preservation. A labelled 0.2 fallback is insufficient. New custom-attribute browser creation, A/B denial and concurrency remain open; see the [certification guide](nocodebackend/rating-workflow-certification.md). | **PARTIAL: bounded persistence/cleanup and presentation PASS; verified backfill and connected acceptance required** |
| Backend certification — [#144](https://github.com/jeremytheva/pourfolio/issues/144) | Ratings, coordinated by catalogue | Read-only production checks exist. Complete the same-state provider baseline and [connected policy matrix](nocodebackend/connected-policy-certification.md), including negative ownership/session cases, response contracts, failure recovery and cleanup. Read-only passes do not close write/permission rows. | **PARTIAL** |
| <!-- launch-requirement:PF-LAUNCH-CATALOGUE --> Catalogue certification — [#154](https://github.com/jeremytheva/pourfolio/issues/154) | Catalogue; producers owns producer fixes | Browse/search/details and relationship controls are integrated. Authenticated production `4019c90e` search, product statistics/history, producer profile and the previously failing unrated-beer filter passed without writes. Producer fix #664 and attribute averages #660 are integrated. Complete connected catalogue reconciliation, provider-failure recovery and applicable import/provenance decisions. | **PARTIAL** |
| <!-- launch-requirement:PF-LAUNCH-CELLAR --> Private cellar CRUD — [#449](https://github.com/jeremytheva/pourfolio/issues/449) | Catalogue | #449 source work and PR #657 are merged. Retained 21 October production `50a10454` was READY with matching health/readiness, 994 canonical tests (15 gated skips) and 155 browser/accessibility passes. At 21 October 22:28–22:30 UTC, the normal signed-in owner browser added one tagged item, fully reloaded, edited quantity/volume/container/gift/notes, fully reloaded and verified prices/date, searched by marker and deleted only that item once. The full post-delete reload restored the unchanged original one-item baseline. One add/edit/delete, no retry. This closes the bounded deployed owner HTTP/browser row; a separate provider-inventory audit was not run. Distinct-account authentication passes in run 40235529806; candidate gateway A/B list/update/delete denial and cleanup pass in run 40239183671. The broader session and deployed HTTP/browser isolation matrix remains open. See the [policy record](nocodebackend/connected-policy-certification.md). Historical ownerless rows and gated catalogue/relationship capabilities are untouched. | **PARTIAL: owner browser lifecycle and candidate gateway isolation/cleanup PASS; full HTTP/session policy acceptance pending** |
| <!-- launch-requirement:PF-LAUNCH-PRIVACY --> Persistent profiles and public history — [#422](https://github.com/jeremytheva/pourfolio/issues/422) | Ratings | Persistent profiles, stable `public_id` and opt-in public history are implemented. Certify provider uniqueness/default-private creation, persisted privacy changes and revocation, copied-link behaviour, cross-owner denial and recovery. Unsupported connected rows stay pending. | **PARTIAL** |
| User/admin session certification — [#577](https://github.com/jeremytheva/pourfolio/issues/577) | Ratings | The adapter/protected runner is merged. One distinct-account rating read denial does not establish the full user/admin, expired/revoked or cellar/profile matrix. #577 adapter implementation is closed; remaining certification is under #144/#422. All four account fields are present. Correct `RELEASE_OTHER_PASSWORD` securely in protected `staging-release` to match the approved `RELEASE_OTHER_EMAIL` account; do not retry unchanged HTTP 401 credentials. Cellar/bonus manual workflows now require `auth_release_sha`. Session-based certification verifies exact auth provenance before login/write; the configured-contract-user bonus path remains provider-only evidence without session proof. Eight release-target tests and both workflows' five SHA pins passed source checks, with no connected rerun. Database Secret Keys are not login passwords. | **PARTIAL; remaining rows blocked at session-evidence boundary** |
| Current review corrections | Launch hardening (bounded shared-file claim); integration by catalogue | PR #642's header-trust, profile-readback and body-deadline corrections are integrated. PR #657's persisted gift, shared 10-second deadline, uncertain-outcome guidance and cleanup guards merged with passing canonical/browser/security checks. PR #647 accepted source `0ef8f4e4a190090343c2dc99925af457466e4ada` passed the same gates after resolving upgraded-axe catalogue/history names and card structure. PR #645 subsequently updated matched React/React DOM to 19.3.1; integrated source `63da5fae` passed 994 canonical tests (15 gated skips), all 155 browser cases and security checks. This is maintenance, not a demonstrated RSC vulnerability fix. Production identity/readiness is verified below; connected privacy/write acceptance remains open. | **Source corrections integrated and validated; connected acceptance open** |
| <!-- launch-requirement:PF-LAUNCH-ACCESS --> Launch accessibility acceptance | Launch hardening; catalogue integrates | Accepted React-patch source `63da5fae73406b8310320d44a70436abbfdf9813` passed the upgraded Playwright/axe suite after catalogue/history accessible-name and card-structure corrections. Complete production-equivalent mobile/desktop and supported screen-reader manual acceptance for the final launch candidate. Source/browser passes do not establish those manual connected results. | **PARTIAL: source/browser PASS; final connected/manual acceptance pending** |
| <!-- launch-requirement:PF-LAUNCH-RELEASE --> Exact-candidate release qualification | Catalogue integration authority | Source preparations #676/#677 are merged at `70c3a189`; production `dpl_945KiC6zYa98V3wKzsbVD8JqHhcv` reports READY at that SHA. Their exact accepted heads passed canonical/browser/security checks. The original `c679192a` source/browser and 23 October HTTP evidence remains retained. Fresh read-only inventory still requires rating recovery, verified bonus values and ownerless-row exclusion. Anonymous HTTP entry and 12 connected baseline rows pass at `fec60da4`, with four skips and an initial unreproduced failure retained. Complete distinct-account privacy, write/recovery, manual accessibility and operations acceptance for the final candidate. | **PARTIAL; final public release remains NO-GO** |
| Publication and operations | Catalogue coordinates; `@jeremytheva` accountable for assigning named operators/reviewers | Reconcile current evidence against [publication](PUBLICATION_AND_RELEASE_EVIDENCE.md), [configuration](launch-configuration-evidence.md) and [operations](OPERATIONS_READINESS.md) procedures: reviewed public documents, support/alert ownership, safe logs, monitoring, credential handling, backup/restore and deployment rollback. No new remote verification is claimed here. | **PENDING current release evidence** |

The earlier connected runs in `STATUS.md` passed 12 baseline cases and skipped
four required history/write cases. Later bounded rating and owner-cellar checks
above supersede only the rows they exercised; broader session, isolation,
retry and deployed acceptance remains open. Source tests and historical skips
cannot certify those rows. Use two distinct supported accounts for isolation checks. The owner authorised
the current instance for bounded reversible testing; a separate database is not
a prerequisite for those fixtures. Retain deterministic preflight, exact new
identities, before/after evidence and verified cleanup. Historical repair,
irreversible schema changes and backup/restore approval remain separate gates.

## Delivery and evidence ownership

`@jeremytheva` remains accountable for missing external evidence and named
specialist assignments. Delivery ownership follows [AGENTS.md](../AGENTS.md):
catalogue is the sole integration, merge, release and `STATUS.md` authority;
ratings owns #165/#503/#422/#577; producers owns producer implementation; Brew
Done It has its own contained workstream. Independent work requires bounded,
verified coordination claims. Retain the limits of three ordinary implementation
PRs and dependent stack depth two; reconcile existing work before opening
overlapping implementation.

The critical provider path is **#165 → #144 → #154 → exact-candidate release**.
Reversible fixes and evidence preparation can proceed in parallel where their
dependencies permit. `/ratings/reconcile` stays unavailable until its governed
provider prerequisites are satisfied. No schema mutation, historical import or
production write gate is authorised by this document update.

## Launch sign-off

Public launch requires a dated decision against one exact candidate with:

1. required launch workflows and permission-negative cases passing against the
   connected production-equivalent backend, including reliable rating deletion,
   retry integrity, private cellar ownership and persisted profile privacy;
2. Node 22 canonical validation and applicable browser/accessibility/runtime
   evidence, with no unresolved material defects or review findings;
3. verified provider/schema controls and reconciled data actually included in
   the launch catalogue; any historical import has its own approved evidence;
4. verified deployment SHA, production configuration and operational readiness,
   exercised restore/rollback and named technical, privacy, support and alert owners;
5. applicable publication/privacy obligations evidenced and explicit disposition
   of historical requirements against current scope; and
6. production smoke results and the observation/rollback decision recorded by
   the release authority.

Hosted CodeQL, Dependency Review and other CI results are diagnostic evidence
unless an active protection or explicit project rule requires them. Resolve
material findings and respect actual repository protections; an unavailable
hosted wrapper is not an application failure or passing evidence.

Account export/deletion foundations remain future-phase work under the current
roadmap. Historical G23/G26 requirements below are preserved for traceability;
they do not silently expand the current launch scope. Required privacy/legal
obligations still need an explicit, evidenced disposition. Bulk historical
imports, broader social/business features and Brew Done It remain separately
governed capabilities.

## Brew Done It launch exclusion

<!-- launch-requirement:PF-LAUNCH-DEFERRED -->

- [x] Source includes an authenticated, guarded `/brew-done-it` direct route for
  controlled testing, while production-facing primary navigation stays hidden.
- [x] The game gateway requires explicit server-side
  `BREW_DONE_IT_POLICY_ENABLED=true` and otherwise fails closed before provider access.
- [ ] Verify the normal deployment policy remains unset and retain exclusion
  until capability-specific provider/privacy/recovery certification and a
  separately reviewed enablement change are complete.

At production `e1501f3b`, one read-only request to the known valid games-list
API returned HTTP 404 with the application route-not-found body at 06:19 UTC
on 21 October. This is a bounded denial consistent with the policy gate; it
does not expose the literal flag value or qualify gameplay. The checkbox above
remains open. Security/testing guidance now describes the controlled route
and actual containment checks accurately.

[ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md) and
[ADR 0006](DECISIONS/0006-adopt-brew-done-it-deduction-board.md) approve the
persistent two-account/two-device deduction model. ADR 0001's same-device model
is superseded. Source approval is distinct from provider mutation or production
enablement; [Brew Done It readiness](BREW_DONE_IT_READINESS.md) retains the
capability-specific evidence requirements.

`scripts/check-brew-done-it-containment.js` guards the protected direct route,
hidden navigation, bundled test surface and explicit backend policy contract.
Repeat canonical validation and applicable browser/accessibility checks on the
exact candidate; static containment evidence alone does not certify gameplay
or deployed policy.

## Launch execution plan — 24 October 2026 UTC

This supersedes the 18 October next-action list. #503 deletion repair, #449
strict cellar validation and #577 adapter implementation are already integrated;
do not recreate them or rerun completed fixtures solely for documentation.

### Dependency-ordered delivery

| Stage | Required work | Exit criterion |
| --- | --- | --- |
| A — Baseline | Reconcile exact main, deployed SHA, existing claims/PRs and live issue states. Preserve the existing requirement anchors and evidence authorities. | One current queue with implementation separated from provider/runtime acceptance. |
| B — Integrity | Under #165, reconcile the actual provider schema/write contract, correct terminal retries, prove atomic/versioned parent and child workflow guarantees, and prepare the existing migration/recovery package. | Restorable consistent baseline, isolated restore and approved irreversible work; connected duplicate/lost-response retry, partial-child recovery, concurrency, deletion and cleanup pass. |
| C — Journeys/data | Correct the second account's supported credentials; complete #144/#422 session, rate-limit, cellar/profile/bonus isolation and #154 catalogue certification. Require authoritative bonus backfill; preserve ownerless cellar exclusion. | Every required connected row passes; no missing launch-selectable point value, inferred owner, unverified required relationship or leftover fixture. |
| D — Publication/operations | Finish reviewed public documents, monitored support, named operators/backups, safe logs/alerts, configuration, anonymous production access, restore and deployment rollback. | Reviewed effective content and exercised support/alert/recovery routes; production entry is public while application routes remain authenticated. |
| E — Qualification | Freeze one candidate after fixes, public content and data work. Run Node 22 canonical, browser, connected and manual acceptance; verify exact deployment/configuration/provider state. | No material unresolved defect or required skip; dated reviewed evidence identifies the same candidate and cleanup outcome. |
| F — Pilot/public | Observe 10–20 adult participants over 7–14 days after B–E pass. Prepare accurate onboarding, limitations and release notes; announce broadly only after GO. | All critical journeys exercised without unresolved P0/P1 defects, integrity/privacy failures or missing operational acceptance. |

B diagnosis/source containment, C safe preparation and D can proceed in parallel
under verified bounded claims. Full C/E qualification waits for applicable
provider guarantees. The pilot never waives integrity, privacy or recovery gates.
Any repair creates a new candidate and returns to E before pilot/public acceptance.
No fixed public launch date is promised.

### Verified bonus backfill

Refresh the retained 83-attribute/81-missing inventory against the current
instance. Obtain a source-backed exact-ID/descriptor/value allocation and
independent review; neither the old spreadsheet reference nor the 0.2 fallback
establishes absent values. Use a read-only complete plan preflight, immutable
snapshot/source fingerprints, exact permitted fill counts and a recovery path.
Preserve existing explicit values, private attributes and historical rating
totals. Apply only when the actual provider write mechanism and bounded
concurrency/recovery controls are evidenced. Verify exact readback and zero
missing values in the launch-selectable set. Source-tool or mapping-audit PASS
alone cannot close PF-LAUNCH-BONUS. Without authoritative values, remain NO-GO.

### External inputs and release constraints

The repository operator must securely correct the second account's password in
protected `staging-release`; passwords and database secrets do not belong in
issues/chat. Use current exact `auth_release_sha` for session-backed runs.
Provider-supported migration and isolated recovery evidence remain prerequisites
for irreversible work. Named privacy/legal, technical, support and backup owners
must accept their roles and exercise private escalation routes before GO.

Use the existing Vercel production URL for launch. Verify public login and policy
pages with a clean browser without authenticated share links or bypass headers.
Keep previews protected and application routes login-required. BonoHost,
guest catalogue browsing, broader social expansion and Brew Done It enablement
are not launch dependencies. Self-service account export/deletion remains
future-phase; required privacy obligations need an evidenced support process.

After qualified promotion, run direct-route, auth, catalogue, rating/history,
cellar/profile and health/readiness smoke checks against the deployed SHA.
Observe all six operations indicators for at least 60 minutes after the final
successful smoke check. Roll back immediately on ownership/privacy failure,
inconsistent rating data, failed critical journey, incompatible schema/API or
unrouteable critical alert. Record retain/rollback and reviewer concurrence.

### Required journey coverage

Use the existing release harness and record exact candidate, environment,
UTC interval, operator, result, safe evidence reference and cleanup for each row.

- Supported registration/sign-in, session refresh/expiry/revocation/sign-out,
  enabled email/OTP delivery and local/shared auth limits at the actual proxy boundary.
- Catalogue browse/search/no results, deterministic full pagination, stable direct
  product links, collaboration/category integrity and provider failure recovery.
- Current scoring contract: personalised/default weights, zero-weight omissions,
  derived Bonus, optional Design/Burp, stored historical totals, PPP price/volume
  boundaries and Overall/Style Scaled Score ties/multi-page populations.
- Reliable new/historical owner history across reload and a new session/device;
  exact own/other-author links and actual recorded component/descriptor breakdowns.
  Never reconstruct past ratings from today's weighting settings.
- Default-private profile/history, opt-in and immediate revocation, copied-link
  behaviour, second-account privacy and update denial, no stale private content.
- Owner cellar CRUD, optional relationships without a series, valid primitives,
  Gift/Gift-from clearing, invalid-input rejection and verified fixture cleanup.
- Missing-beer/correction initiation truthfully respects persistence/image/lookup
  capability gates. Do not imply an unavailable proposal was saved.
- Connected Safari/iPhone and Android/Chromium smoke, keyboard, screen reader,
  200% zoom, narrow screens, slow-network and accessible error/retry behaviour.

### Source-data and documentation findings

Fresh read-only repository audits against the supplied historical files produced:

- **Catalogue BLOCKED:** 350 products, 159 producers and 331 categories with 209
  finding records. These include missing references, category ancestry/cycles,
  duplicate sort-key rows and encoding. Counts overlap.
- **Historical SQL BLOCKED:** 34 structural findings against the current target.
  The old export does not prove those fields are absent from the live provider.
- **Cross-reference BLOCKED:** 53 findings using the supplied workbook's
  `Ready_Ratings` (593 rows) and `Cellar_Staging` (399 rows), paired with the
  product/producer CSVs: 29 product-to-producer, 14 rating-to-product and 10
  cellar-to-product occurrences. Keep this exact-input result separate from
  the older retained 46-occurrence/41-task remediation record.
- The workbook retains 604 source ratings (593 marked ready, 11 excluded),
  4,177 uploadable scores (15 excluded), 69 unmatched bonus selections across
  10 variants, and 399 prepared cellar entries without verified owners or
  confirmed destination IDs. Readiness labels do not establish completed import.

These inputs are not evidenced as a same-state current-provider export. Certify
a fresh launch catalogue/history snapshot. Recommend keeping unimported,
unreconciled candidates separate from the first release dataset; this does not
authorise deleting or hiding existing live history. Any bulk import still needs
reviewed mappings, identity evidence, dry run, idempotent rerun and restore proof.

Update existing specialist documents rather than adding competing authorities:

- `docs/RATING_FORMULA_V1.md` describes historical v1 weights including
  Design/Burp, while `src/lib/ratingFormulaV1.js` declares v2 and current core
  weights (Appearance 10%, Aroma 10%, Mouthfeel 20%, Flavour 25%, Follow 25%,
  Bonus 10%). Reconcile accepted personalisation/Bonus, scale, rounding and
  historical semantics without rewriting historical totals.
- `docs/OPERATIONS_READINESS.md` still describes provider readiness as deferred.
  Reconcile it with the implemented endpoint and retain actual safety/evidence limits.
- `src/data/publicDocuments.js` still contains RC draft/not-effective content,
  unapproved operator details and no approved public support contact. Complete
  the existing required independent publication review and workable support,
  access/correction/deletion process. Future self-service account lifecycle
  remains distinct from current privacy obligations and is not silently added.

### Queue, ownership and release boundaries

Catalogue remains sole integration/release/shared-status authority. Ratings,
producers and Brew retain their scopes. Use verified bounded claims, ordinary
PRs, at most three implementation PRs and stack depth two.

At review, #637 and #639 were the two open implementation PRs; #635/#636 were
dependency PRs. #639 has unresolved recovery and candidate-provenance reviews.
#637's body is stale: exact-head runs `38828882651`/`38828876697` report
successful validation. Inspect executed jobs/reviews and reconcile the body
before integration. Brew remains outside the launch critical path. Do not add
routine major dependency upgrades solely because a PR exists.

The repository describes four scheduler workstreams, but the private task lookup
exposed none in this review session. Verify authoritative task visibility,
execution capability and recent outcomes before relying on unattended work.
This is a visibility limitation, not proof that no tasks exist; avoid duplicates.

Keep Brew Done It excluded/policy-disabled, and preserve existing deferred
social/venue/business/geography/photo/non-beer gates. No new feature phase or
hosting move is needed. Vercel is the currently verified target; BonoHost would
need its own target-specific evidence if selected.

Jeremy need not manage routine engineering. Escalate only concrete unavailable
credentials/provider capabilities, irreversible-change approval, ambiguous
historical identity decisions, necessary named external assignments and the
public release decision after reversible preparation. Do not request blanket
permission to begin.

## Retained source-hardening record — July–August 2026

The following implementation and G01–G32 records retain their original dated
evidence references and unresolved results. They describe the earlier baseline,
not a fresh audit of current provider state. Existing gate anchors remain stable
for linked issues, migration procedures and private evidence packages. Before
closing a current requirement, reconcile its historical row with the current
checklist, governing scope and exact-candidate evidence.

- Privileged self-registration, admin credential hint, test-user switching and browser role overrides removed.
- Server-authoritative session identity and editable profile-field allowlist.
- Hardened allowlisted auth proxy.
- Authenticated application data gateway with owner enforcement and explicit response projections.
- Canonical `products`/`product_id`, `ratings`, normalised `rating_scores`, `cellar` contract.
- Stable product routes and live catalogue/search/detail states.
- A browser catalogue response boundary that allowlists render-safe public
  fields, verifies coherent pagination/stable IDs/optional relationships and
  aggregate-only details, and routes malformed successful responses to the
  existing alert/retry UI.
- Request-bound catalogue reads: provider page metadata/items and direct record
  IDs must match the request, product detail identity is rechecked at the
  gateway and browser, and non-canonical direct-route IDs fail before network
  access.
- Complete applicable 1–7 rating form; score `1` remains valid.
- Server-calculated totals, durable retry ID, optional bonus selections and compensating rollback.
- Owner-scoped rating history and delete.
- Owner-scoped cellar CRUD with optional nullable sharing series/edition links.
- Local-only privacy/admin/social/events/venues/analytics/photo/non-beer launch surfaces removed from routing.
- Vercel SPA rewrites, security headers, health endpoint and disabled production source maps.
- Expanded unit/policy tests, mocked browser journeys, automated accessibility
  checks, production audit, bundle budgets, CodeQL, dependency review and
  Dependabot.
- Read-only import and rating-schema preflights that fail closed on incomplete
  catalogue references, missing profile/rating controls, duplicate-permitting
  schema and mutable rating timestamps.

In this historical record, the response boundary was the first source-only slice of
[`PF-P3-01`](https://github.com/jeremytheva/pourfolio/issues/154). It does not
repair or approve the supplied catalogue sources and does not establish
connected route, provider-failure or accessibility evidence. The historical
import blockers and every earlier external gate below remain unchanged.

## Historical import evidence

The retained July 2026 workbook review reported:

| Item | Current evidence | Gate |
| --- | ---: | --- |
| Source ratings | 604 | Reconcile exactly after dry run. |
| Ready ratings | 593 | Import idempotently; 11 remain intentionally excluded. |
| Uploadable score rows | 4,177 | 605 PUT + 3,572 POST; reconcile exactly. |
| Excluded score rows | 15 | Must never be uploaded. |
| Bonus selections | 1,785 | 1,716 exact matches; resolve 69 unmatched selections across 10 pending variants. |
| Historical cellar records | 399 | All currently lack `user_id` and confirmed cellar ID. |
| Rating-to-cellar links | 593 | 592 await cellar import; one intentionally has no cellar metadata. |

The previously missing products, cellar, bonus-attribute and SQL exports are now present in the supplied source set. Their presence does not complete import reconciliation. The [historical import preflight](nocodebackend/import-preflight.md) currently blocks the source set because catalogue and producer references do not reconcile. The repository can now generate and validate a private, identity-field-free decision ledger for the 41 distinct remediation tasks represented by the 46 failures; no completed or reviewed ledger has been supplied.

The [rating schema preflight](nocodebackend/schema-preflight.md) also blocks the
supplied `54026_rating_export(2).sql` source snapshot. The 29 July
2026 audit against the contract then in use retained 25 findings: one missing
table, seven missing required workflow/idempotency columns, ten nullable
required columns, six missing unique constraints and one mutable timestamp
default. That is historical evidence only. The expanded 15 August structural
audit retained in `exports/legacy-schema-audit-report.json` records 34 findings
for the same source snapshot; the linked preflight and migration runbook own
the current requirements. Neither audit proves the live provider state.

### Historical import execution record

**Status (29 July 2026):** Blocked; the repository does not contain the
reconciled historical CSV inputs, an identity-verification record, staging
credentials or provider backup/restore evidence. Consequently, no preflight
`PASS`, staging write, count reconciliation or idempotency result is claimed.

The private release record must identify the environment, source snapshot,
operator, independent reviewer and release commit. It must retain dated,
redacted evidence at a recorded location for each step below; do not place
personal data, credentials or raw staging exports in this repository.

| Step | Required evidence | Current result |
| --- | --- | --- |
| Same-state catalogue export | Complete products and producers exports with provider snapshot/export identifiers and timestamps. | Not supplied; blocked. |
| Catalogue reconciliation | Every rating and cellar product resolves; every product has a positive producer ID resolving in the paired producers export. No name-only substitutions. | Known missing product references and producer ID `0`; blocked. Deterministic generation and validation of the 41-task private decision ledger is implemented, but no decisions or corrected candidate files are supplied. |
| Bonus decisions | A decision ledger containing every unmatched source variant, source count, mapped canonical bonus ID or explicit rejection reason, reviewer and totals. Variant counts must sum to 69 and final accepted/rejected totals must be stated. | Ten variant names and decisions are not supplied; blocked. |
| Cellar identity | A 399-row ledger containing the source record key, verified account owner ID, verification method/evidence reference and confirmed destination cellar ID. Email alone is not identity evidence. | Owners and confirmed IDs are not supplied; blocked. |
| Read-only preflight | Exact command, input checksums and retained JSON report from `npm run audit:import -- --ratings <ratings.csv> --products <products.csv> --producers <producers.csv> --cellar <cellar.csv>` showing `PASS`. | Cannot run against absent reconciled inputs; blocked. |
| Backup and restore | Backup identifiers and checksums for every target collection, followed by a successful isolated restore rehearsal and post-restore count/hash comparison before import writes. | No provider evidence; blocked. |
| Dry run and import | Dry-run diff, approval, actual non-production import log, rejected-record ledger and post-import orphan queries. Reconcile 604 source ratings, 593 accepted ratings, 4,177 uploaded scores, 15 excluded scores, 1,785 bonus selections, 399 cellar records and 593 rating-to-cellar relationships. | Not run. |
| Idempotency rerun | Unchanged input checksums, second-run log, zero creates, zero mutations, zero duplicates and stable per-collection counts/content hashes. | Not run. |
| Rollback | Provider-specific, reviewer-approved procedure naming backup, restore order, validation queries, abort thresholds and responsible operator; rehearse it before production scheduling. | Not supplied; blocked. |

The rejected-record ledger must account for all 11 ratings excluded from the
604 source ratings and all 15 excluded score rows, plus any explicitly rejected
bonus variants. A rejected bonus selection must not silently reject its parent
rating unless that behaviour is reviewed and included in the expected counts.
Final evidence must record per-collection before, first-run and second-run
counts as well as stable identifiers or content hashes; counts alone do not
prove that the rerun avoided mutation.

## External P0 gates

### Backend certification

- **Accountable owner:** `@jeremytheva`
- **Independent reviewer:** Release manager (must not be the accountable owner)

**Status (5 August 2026):** Blocked; connected policy certification was expanded in `docs/nocodebackend/connected-policy-certification.md`, but this delivery environment still has no staging credentials, immutable deployment identity, policy export, seeded accounts or private evidence destination. No connected permission probe is claimed as complete.

The accountable owner coordinates the staging work and records the identity of
the operator and independent reviewer in the private release record. Secrets,
session cookies, unredacted response bodies and production or staging data must
not be committed or attached as public evidence. Configure
`NOCODEBACKEND_SECRET_KEY`, `NOCODEBACKEND_DATA_BASE_URL`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and
`RATE_LIMIT_KEY_SECRET` only as server-side variables in the isolated staging
environment; never expose these variables to Vite or use a `VITE_` prefix.

The backend-certification gate is complete only when the independent reviewer
has checked dated, redacted evidence for every item below against the exact
release candidate. The presence-only configuration ledger, operational probes,
browser artefact/source-map inspection, redacted-log failure evidence, rotation
ownership and rollback record must follow the [launch configuration evidence
procedure](launch-configuration-evidence.md):

### Phase 1 same-state baseline record

Use the [NoCodeBackend baseline export evidence
template](nocodebackend/baseline-export-evidence-template.md) to capture the
schema and all launch collections from one quiesced or provider-consistent
snapshot. Retain the completed, appropriately redacted package in the approved
private evidence store.

**Completed baseline reference (5 August 2026):** Not supplied; blocked. The
repository contains a public schema-only export (`exports/schema.sql`, 4,658
bytes, SHA-256
`1da03ff080e882c61e550b8202be0df2403b165868aad378eb50f66642e89f11`)
and `npm run audit:schema -- --schema exports/schema.sql` returns `PASS` with
zero structural blockers. That does not complete the NoCodeBackend baseline: no
approved private production-equivalent snapshot package supplies environment
identity, export interval, same-state page coverage, collection row counts,
collection SHA-256 checksums, relationship reconciliation for products,
producers, categories, ratings, rating children, profiles and cellar, or
independent approval. G02, G03, G04, G07 and Phase 1 remain open until the
retained baseline package and schema audit together show zero blockers. Once an
independent reviewer approves a completed package with zero blockers, replace
this status only with the safe evidence-store reference, immutable package and
snapshot identifiers, UTC interval, candidate commit/deployment identifier and
approved aggregate manifest described by the template.

- [x] [G01](#evidence-g01) — The five server-only variables are present in isolated staging and absent
  from browser bundles, repository files, command transcripts and evidence.
- [ ] [G02](#evidence-g02) — The canonical collections in
  [the schema mapping](nocodebackend/schema-mapping.md) are provisioned, and an
  inventory proves that no legacy `*_pf2025` alias is used.
- [ ] [G03](#evidence-g03) — A production-equivalent, same-state schema export has been audited with
  `npm run audit:schema -- --schema <export-path>` and the retained JSON report
  says `PASS`.
- [ ] [G04](#evidence-g04) — The schema evidence proves required non-null fields and uniqueness
  constraints, immutable ownership fields, rating idempotency fields and
  workflow-state permissions; an owner-scoped, controlled non-date update also
  proves that `ratings.date_rated` is unchanged.
- [ ] [G05](#evidence-g05) — Redacted provider transcripts exercise the precise paths, filters and
  response envelopes consumed by `api/_lib/dataProvider.js`: list, filtered
  list, get, create, update, delete, not-found fallback, unique conflict,
  malformed response, timeout and upstream failure.
- [ ] [G06](#evidence-g06) — For every launch collection exposed by
  `api/data-proxy.js`, the permission matrix covers
  unauthenticated, owner, other-user and privileged negative cases. The
  privileged cases must demonstrate least privilege, not merely possession of
  a provider secret.
- [ ] [G07](#evidence-g07) — Evidence is dated, redacted, tied to the environment and release commit,
  stored with the private release record, and approved by the independent
  reviewer before any corresponding P0 checkbox below is closed.

Partial completion does not permit this gate or a related P0 entry to be
closed. A rerun is required after any schema, permission, provider-contract or
release-candidate change.

- [x] [G08](#evidence-g08) — Configure all five server-only backend and distributed rate-limit variables in staging and production, plus any deliberately configured `NOCODEBACKEND_AUTH_BASE_URL` and `ALLOWED_ORIGINS`.
- [ ] [G09](#evidence-g09) — Verify the configured data base URL accepts the gateway’s collection paths, query filters and create/update/delete response shapes.
- [ ] [G10](#evidence-g10) — Provision the canonical schema without `*_pf2025` aliases and make the rating schema preflight return `PASS`.
- [ ] [G11](#evidence-g11) — Apply non-null and unique rating controls through an approved provider migration, with cleanup, compatibility and rollback evidence.
- [ ] [G12](#evidence-g12) — Prove `date_rated` remains unchanged during controlled non-date updates.
- [ ] [G13](#evidence-g13) — Prove unauthenticated, owner, other-user and privileged negative permission cases for every collection.
- [ ] [G14](#evidence-g14) — Prove sequential and concurrent duplicate-rating retries return one persisted rating.
- [ ] [G15](#evidence-g15) — Repeat the atomic-workflow capability probe with configured staging credentials and retain redacted evidence.
- [ ] [G16](#evidence-g16) — Apply and prove the documented idempotency fields, constraints, state permissions and owner-safe reconciliation workflow, including forced partial writes and failed state updates.
- [ ] [G17](#evidence-g17) — Obtain complete, same-state products/producers exports and make the historical import preflight return `PASS`; the current source set references absent products and producer ID `0`.
- [ ] [G18](#evidence-g18) — Resolve the 69 unmatched historical bonus selections.
- [ ] [G19](#evidence-g19) — Assign valid owners and confirmed IDs to all 399 historical cellar records.
- [ ] [G20](#evidence-g20) — Run the historical import in non-production, rerun it to prove idempotency, and reconcile imported/rejected counts.
- [ ] [G21](#evidence-g21) — Rotate any credential that may have matched the former published admin hint.

## External P1 gates

**Re-review (4 August 2026):** Repository-side public document pages and an
evidence procedure are now present, but no connected staging/production host,
legal reviewer, named operational owners, private escalation evidence, GitHub
administrator access or independent approval was supplied. The audit was
performed from frozen commit
`2b7fb6b7ccd33c7c2b605bd68f201daeb7e50701`; no remote configuration or
connected execution can be attributed to it. Accordingly G22 and G24–G32
remain open. G23 also remains open because its provider contract, durable job
store, rollout and production-equivalent evidence are absent. Source-only
portable-export manifest and in-memory artifact builders are tracked by issues
#146 and #148, and the source-only account-deletion discovery plan is tracked by
#150. Source-only count reconciliation for a caller-supplied later snapshot is
tracked by #152. They have no recent-authentication check, consistent provider
reader, route, destructive workflow or browser workflow. Exact source-only
confirmation validation is tracked by #153 and likewise provides no endpoint or
authorisation. These modules are not gate evidence. The
exact requirements and honest current values are in
[the publication and release evidence procedure](PUBLICATION_AND_RELEASE_EVIDENCE.md).

- [ ] [G22](#evidence-g22) — Run browser end-to-end and WCAG 2.2 AA checks against the connected staging backend.
- [ ] [G23](#evidence-g23) — Implement and evidence the recovery, verification, export and deletion
  [acceptance contract](account-lifecycle-readiness.md); its current review is a
  design gate, not implementation evidence.
- [ ] [G24](#evidence-g24) — Publish reviewed privacy policy, terms, moderation/escalation procedure,
  support contact and retention schedule at stable, accessible URLs, recording
  version and effective date in the private release record.
- [ ] [G25](#evidence-g25) — Complete appropriate Australian privacy/legal review and record the named
  reviewer, date, scope, findings, resolutions, approval and re-review trigger;
  the current approval fields are explicitly incomplete.
- [ ] [G26](#evidence-g26) — Complete the documented production-equivalent export/deletion exercise and
  reconcile its behaviour to the exact published policy version.
- [ ] [G27](#evidence-g27) — Configure central monitoring, redacted correlation-ID logging, alert ownership and service-level thresholds.
- [ ] [G28](#evidence-g28) — Complete backup, restore and deployment rollback rehearsals with evidence.
- [ ] [G29](#evidence-g29) — Enable GitHub branch protection, required checks, secret scanning and push protection.
- [ ] [G30](#evidence-g30) — Enable GitHub Dependency Graph and make the dependency-review check blocking.
- [ ] [G31](#evidence-g31) — Enable GitHub Issues or nominate another tracker for the remaining gates.
- [ ] [G32](#evidence-g32) — Test direct routes and `/api/health` on the production host.

The `/api/health` configuration flags show only that required environment
variables are present. They must not be described as proof that either upstream
provider is available or ready.

The thresholds, safe central-logging contract, health semantics, alert-owner
register, backup/restore procedure, rollback rehearsal and release ownership
register are defined in the [production operations readiness runbook](OPERATIONS_READINESS.md).
Its blocked evidence fields are release gates, not evidence of completed remote
configuration or rehearsals.

## Historical sign-off requirements — 29 July 2026

The earlier review required the following. Current launch sign-off is defined
above; retain these requirements and their evidence links when reconciling
scope rather than treating this older list as a new release decision:

1. every P0/P1 box closed with dated evidence;
2. the release-gate and CodeQL checks green on the exact deployed commit;
3. exact import reconciliation;
4. permission-negative tests passing;
5. restore and rollback exercised;
6. named technical, privacy, moderation and support owners.

## Release evidence register

This historical register links the earlier launch checkboxes to an accountable
person and private evidence references. The initial review date was
**29 July 2026**, with individually dated August updates retained below. No row
was re-certified by the 15 October reconciliation. `PRR` references are identifiers in the
access-controlled private release record, not public links: the underlying
artefacts may contain operational metadata and must remain redacted and access
controlled. A reference marked `not supplied` is evidence of an unresolved
blocker, **not** evidence that the gate passed.

The repository can name `@jeremytheva` as the person accountable for obtaining
or assigning every missing artefact. It cannot invent the independent technical,
privacy/legal, moderation, support, or backup owners. Where specialist approval
is required, the missing named approver remains an explicit blocker even though
the action has an accountable owner.

| Gate | Accountable owner | Dated, redacted evidence | Historical result on referenced candidate |
| --- | --- | --- | --- |
| <a id="evidence-g01"></a>G01: Presence-only evidence confirms that `NOCODEBACKEND_SECRET_KEY`, `NOCODEBACKEND_DATA_BASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_KEY_SECRET` and any deliberately configured `NOCODEBACKEND_AUTH_BASE_URL`/`ALLOWED_ORIGINS` are present as server-only variables in isolated staging and production scopes and absent from browser bundles, source maps, repository files, command transcripts and evidence; no value may appear in the evidence, and presence alone is not operational provider or Redis evidence. | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-LAUNCH-CONFIG`: the completed, independently approved private package ties presence-only staging and production inventories to commit `af13281edaffc2aaa508c19c7e8a85b35c46f989`; it confirms required variables are server-only, records optional-variable dispositions, and retains browser/source-map negatives, endpoint identities, redacted request IDs, least-privilege probe results, redacted-log checks, named rotation and rollback owners, rollback rehearsal and named independent approval | **PASS** |
| <a id="evidence-g02"></a>G02: The canonical collections in | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-G02`: baseline-template review confirms the repository has no completed production-equivalent package; same-state schema, `products`, `producers`, `categories`, `ratings`, rating-child, `profiles` and `cellar` exports, page ledger, row counts, collection checksums and legacy-alias report are not supplied, so this row cannot close | **BLOCKED** |
| <a id="evidence-g03"></a>G03: A production-equivalent, same-state schema export has been audite… | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-G03`: `npm run audit:schema -- --schema exports/schema.sql` returns `PASS` for the public schema-only export, but no completed private package binds a production-equivalent schema export, retained JSON audit report and all collection exports to one immutable provider snapshot or quiesced interval | **BLOCKED** |
| <a id="evidence-g04"></a>G04: The schema evidence proves required non-null fields and uniqueness | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-G04`: public structural schema audit has zero blockers, but no retained private same-snapshot baseline, connected permission evidence, owner-scoped controlled non-date update evidence or reviewer-approved reconciliation report is available to prove the complete non-null, uniqueness, immutable ownership, idempotency and workflow controls | **BLOCKED** |
| <a id="evidence-g05"></a>G05: Redacted provider transcripts exercise the precise paths, filters… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G05`: not supplied | **BLOCKED** |
| <a id="evidence-g06"></a>G06: For every launch collection exposed by | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-G06`: connected policy certification now specifies required missing, forged, expired, revoked and cross-account session evidence for `profiles`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar`, but no connected staging run, redacted request IDs, provider policy export or cleanup proof is supplied | **BLOCKED** |
| <a id="evidence-g07"></a>G07: Evidence is dated, redacted, tied to the environment and release … | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-G07`: public schema-only audit evidence is available, but the completed package is not retained in the private evidence store; environment identity, export interval, page coverage, row counts, SHA-256 checksums, reconciliation reports and independent-review approval are not supplied, so related Phase 1 rows remain open | **BLOCKED** |
| <a id="evidence-g08"></a>G08: Configure `NOCODEBACKEND_SECRET_KEY`, `NOCODEBACKEND_DATA_BASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `RATE_LIMIT_KEY_SECRET` and any deliberately configured `NOCODEBACKEND_AUTH_BASE_URL`/`ALLOWED_ORIGINS` as server-only variables in staging and production, without recording their values in evidence; retain dated, redacted least-privilege probes, endpoint/environment identity confirmation, browser bundle/source-map inspection, redacted-log failure proof, rotation ownership, rollback ownership, deployment SHA, request IDs and approver identity. | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-LAUNCH-CONFIG`: the approved private package proves the required server-runtime configuration in staging and production for commit `af13281edaffc2aaa508c19c7e8a85b35c46f989` and retains configured/not-configured optional-variable dispositions, endpoint/environment identities, redacted request IDs, least-privilege and safe-failure probe results, deployed bundle/source-map checks, redacted-log proof, named rotation and rollback owners, rollback rehearsal and named independent approval | **PASS** |
| <a id="evidence-g09"></a>G09: Verify the configured data base URL accepts the gateway’s collect… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G09`: not supplied | **BLOCKED** |
| <a id="evidence-g10"></a>G10: Provision the canonical schema without `*_pf2025` aliases and mak… | `@jeremytheva` | 15 August 2026 — `PRR-2026-08-15-G10-RECERTIFY`: the retained 5 August schema result is historical evidence for the earlier target, but it predates the five-state recoverable-deletion contract and nullable `ratings.deleted_at`. No fresh provider export tied to the current candidate proves the expanded canonical schema or supplies a current zero-blocker audit, so the earlier result cannot close this gate | **BLOCKED** |
| <a id="evidence-g11"></a>G11: Apply non-null and unique rating controls through an approved pro… | `@jeremytheva` | 15 August 2026 — `PRR-2026-08-15-G11-RECERTIFY`: the retained 5 August managed-change, cleanup, backup and rollback evidence remains historical, but it does not cover the later `deleting`/`deleted` state expansion or nullable deletion tombstone. A fresh provider change record, compatibility/backfill proof, post-change export, restore/rollback rehearsal and independent approval are required for the current target | **BLOCKED** |
| <a id="evidence-g12"></a>G12: Prove `date_rated` remains unchanged during controlled non-date u… | `@jeremytheva` | 15 August 2026 — `PRR-2026-08-15-G12-RECERTIFY`: the 5 August controlled update remains useful historical evidence, but it is not bound to the current five-state provider migration or release candidate. Repeat the byte-for-byte `date_rated` comparison on a disposable rating after applying the current target and retain the redacted transcript, cleanup proof and independent approval | **BLOCKED** |
| <a id="evidence-g13"></a>G13: Prove unauthenticated, owner, other-user and privileged negative permission cases for `profiles`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar`, including missing, forged, expired, revoked and cross-account sessions, positive owner flows, negative no-mutation checks, redacted request IDs, environment/deployment identity and cleanup proof. | `@jeremytheva` | 5 August 2026 — `PRR-2026-08-05-G13`: public certification checklist updated in `docs/nocodebackend/connected-policy-certification.md`; connected staging credentials, request IDs, policy bundle, before/after digests, cleanup proof and independent approval are not supplied, so this row remains open | **BLOCKED** |
| <a id="evidence-g14"></a>G14: Prove sequential and concurrent duplicate-rating retries return o… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G14`: not supplied | **BLOCKED** |
| <a id="evidence-g15"></a>G15: Repeat the atomic-workflow capability probe with configured stagi… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G15`: not supplied | **BLOCKED** |
| <a id="evidence-g16"></a>G16: Apply and prove the documented idempotency fields, constraints, s… | `@jeremytheva` | 15 August 2026 — `PRR-2026-08-15-G16-RECERTIFY`: the 5 August evidence predates the recoverable-deletion expansion committed on 14 August. The current canonical target now requires `deleting` and `deleted` workflow states plus nullable `deleted_at`; the local structural target passes, but no fresh provider migration/export, state-permission transcript, deletion recovery/concurrency run, cleanup proof or independent approval is supplied for the expanded contract | **BLOCKED** |
| <a id="evidence-g17"></a>G17: Obtain complete, same-state products/producers exports and make t… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G17`: not supplied | **BLOCKED** |
| <a id="evidence-g18"></a>G18: Resolve the 69 unmatched historical bonus selections. | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G18`: not supplied | **BLOCKED** |
| <a id="evidence-g19"></a>G19: Assign valid owners and confirmed IDs to all 399 historical cella… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G19`: not supplied | **BLOCKED** |
| <a id="evidence-g20"></a>G20: Run the historical import in non-production, rerun it to prove id… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G20`: not supplied | **BLOCKED** |
| <a id="evidence-g21"></a>G21: Rotate any credential that may have matched the former published … | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G21`: not supplied | **BLOCKED** |
| <a id="evidence-g22"></a>G22: Run browser end-to-end and WCAG 2.2 AA checks against the connect… | `@jeremytheva` | 4 August 2026 — `PRR-2026-08-04-G22`: blocked execution recorded in `docs/TESTING.md`; no immutable staging URL, deployed SHA, hosted workflow URL, credentials, test totals or final result were available | **BLOCKED** |
| <a id="evidence-g23"></a>G23: Implement and evidence the recovery, verification, export and del… | `@jeremytheva` | 15 August 2026 — source-only export projection/reconciliation, deterministic in-memory artifact, account-deletion discovery, count reconciliation and exact-confirmation cores tracked by #146, #148, #150, #152 and #153; no recovery, verification, recent-authenticated route, provider-backed final absence, destructive deletion workflow, connected exercise, approved policy or independent review supplied | **BLOCKED** |
| <a id="evidence-g24"></a>G24: Publish reviewed privacy policy, terms, moderation/escalation pro… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G24`: not supplied | **BLOCKED** |
| <a id="evidence-g25"></a>G25: Complete appropriate Australian privacy/legal review and record t… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G25`: not supplied | **BLOCKED** |
| <a id="evidence-g26"></a>G26: Complete the documented production-equivalent export/deletion exe… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G26`: not supplied | **BLOCKED** |
| <a id="evidence-g27"></a>G27: Configure central monitoring, redacted correlation-ID logging, al… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G27`: not supplied | **BLOCKED** |
| <a id="evidence-g28"></a>G28: Complete backup, restore and deployment rollback rehearsals with … | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G28`: not supplied | **BLOCKED** |
| <a id="evidence-g29"></a>G29: Enable GitHub branch protection, required checks, secret scanning… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G29`: not supplied | **BLOCKED** |
| <a id="evidence-g30"></a>G30: Enable GitHub Dependency Graph and make the dependency-review che… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G30`: not supplied | **BLOCKED** |
| <a id="evidence-g31"></a>G31: Enable GitHub Issues or nominate another tracker for the remainin… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G31`: not supplied | **BLOCKED** |
| <a id="evidence-g32"></a>G32: Test direct routes and `/api/health` on the production host. | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G32`: not supplied | **BLOCKED** |

### Frozen-candidate decision record — 29 July 2026

The earlier review required its candidate SHA in `PRR-2026-07-29-RC` after
commit creation and the same SHA in the connected staging workflow. It did not
authorise staging or production deployment: the evidence and remote access
available to that review were insufficient. The subsequently dated G01/G08
passes apply only to their referenced August candidate.

**Historical decision: NO-GO.** The review required public, non-sensitive
release-blocker issues and private evidence for unresolved items. Reuse the
existing tracked issues in the current checklist; this historical instruction
does not require duplicate issues or qualify a current candidate.

### Approval record

| Review | Required named approver | Evidence/date | Decision |
| --- | --- | --- | --- |
| Technical | Independent technical reviewer (not yet named) | Not supplied | **BLOCKED** |
| Privacy/legal | Qualified Australian privacy/legal reviewer (not yet named) | Not supplied | **BLOCKED** |
| Moderation | Moderation and safety owner (not yet named) | Not supplied | **BLOCKED** |
| Support | User support owner (not yet named) | Not supplied | **BLOCKED** |

Explicit approval means an individually named reviewer records approval,
date, scope, frozen SHA, findings and resolutions in the private record.
Silence, a role label, a workflow result, or this repository review is not
approval.

### Retained post-deployment evidence procedure

After a current review meets the launch sign-off requirements and authorises
promotion, retain one
redacted smoke report tied to the deployed SHA covering direct SPA routes,
authentication, catalogue list/search/details, rating create/retry/recovery and
history, cellar CRUD, profile editing, `/api/health`, correlation-safe logging,
and every alert route. Record UTC start/end times, operator, reviewer, result
per check, production deployment identifier, monitoring links, observed data
reconciliation, and the explicit rollback decision.

The rollback decision window starts at promotion and remains open for at
least **60 minutes** after the last successful smoke check. During that window
the operator and incident owner must watch all six production indicators in
[the operations runbook](OPERATIONS_READINESS.md). Roll back immediately for an
owner-boundary failure, inconsistent rating data, incompatible API/schema,
failed critical journey, health/configuration regression, missing safe logs, or
an unrouteable P0/P1 alert. The authorised release manager may close the window
only after recording a `retain` decision and reviewer concurrence.




