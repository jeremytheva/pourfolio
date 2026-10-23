# Launch readiness

Last reconciled: **22 October 2026 UTC**. Observed application and production
baseline: [`0c048ca8e5082479d39bdd67f4060af2c336f73c`](https://github.com/jeremytheva/pourfolio/commit/0c048ca8e5082479d39bdd67f4060af2c336f73c).
Bounded evidence is recorded below and in `STATUS.md`; final public launch
qualification remains open.

The second-account email secret is now present. The guarded diagnostic confirmed
primary-owner sign-in/session/sign-out, then received HTTP 401 at the second
account's sign-in with zero data writes. The account-specific correction passed
canonical validation (1,005 passed, 15 gated skips), all 155 browser/accessibility
cases and security checks. Correct the second account's supported credentials
securely before the remaining guarded isolation check. This closes no complete
connected auth, cellar-isolation, privacy or release acceptance criterion. See the existing
[policy record](nocodebackend/connected-policy-certification.md).

Issue #671 makes the existing bonus-value fallback explicit in both pickers and
preserves two-decimal stored-value presentation. It changes no scoring policy
or provider data. Accepted source `ec4e2610` passed canonical Node 22 validation
(1,007 tests, 15 gated skips) and 156 deterministic browser/accessibility cases.
Final-head desktop/mobile regression validation and deployment evidence remain
required in PR #672; no preceding-head result is promoted to final-head PASS.
81 missing global values, custom-creation/isolation acceptance and the current
second-account HTTP 401 remain separate open gates. This presentation correction
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

The bounded #429 cleanup retires only the unreferenced browser-local privacy
prototype. The active profile's server-backed sharing opt-in is unchanged.
A deterministic regression checks that old local-storage public flags cannot
override a server-private profile, opt it in on save or replace the persisted
value after reload. Canonical validation and browser checks for this slice are
required before integration. This does not qualify connected #422 privacy,
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
| <!-- launch-requirement:PF-LAUNCH-AUTH --> Authentication and rate limits | Launch hardening; ratings owns #577 session certification | Same-origin authentication, session and limiter controls are implemented. Certify sign-up/sign-in, refresh, expiry, sign-out and revoked/invalid sessions, plus enforced local/shared authentication limits against the intended hosting proxy boundary. | **PARTIAL; current connected lifecycle/rate-limit evidence pending** |
| <!-- launch-requirement:PF-LAUNCH-PROVIDER --> Rating provider foundation — [#165](https://github.com/jeremytheva/pourfolio/issues/165) | Ratings | Application durability contracts exist. Prove provider migration/backfill, uniqueness, conditional updates, immutable rating dates, backup and isolated restore; complete the [migration evidence package](nocodebackend/rating-schema-migration-runbook.md) and obtain explicit approval before irreversible mutation. G04, G10–G12, G14–G16 and G28 remain open. | **BLOCKED at provider/approval boundary** |
| <!-- launch-requirement:PF-LAUNCH-RATING --> Rating lifecycle and deletion — [#503](https://github.com/jeremytheva/pourfolio/issues/503), remaining integrity [#165](https://github.com/jeremytheva/pourfolio/issues/165) | Ratings | #503 is closed. A bounded production `36ce8ffe` browser tasting saved, reloaded and was deleted once; independent `31e41c3b` inspection proved its valid deleted tombstone, zero score/bonus children and preserved baseline. A separate, read-only normal-HTTPS rating-breakdown request from a verified distinct release account returned 404 without writes. These close only their scoped rows. The historical completed/deleted parent with one surviving score child remains a confirmed #165 recovery finding. Full retry/partial-write/concurrency and permission-negative certification remains open in the existing rating guide. | **PARTIAL: bounded lifecycle/read denial PASS; historical recovery and broader integrity evidence open** |
| <!-- launch-requirement:PF-LAUNCH-BONUS --> Bonus attribute point integrity — [PR #651](https://github.com/jeremytheva/pourfolio/pull/651) | Ratings; catalogue release integration | Merged/deployed `4019c90e`: 896 canonical source tests, 15 gated skips, 155 browser/accessibility cases. Current-instance server persistence/reload and exact fixture cleanup passed: two creates, two deletes, no mutation retry, no fixture from that run remains. Production form rendered stored global 0.5/private 0.7, their 1.20 sum, six selections at 2.00 and the expected 3.07/5 preview; draft discarded. Inventory still has 81 absent values among 83 attributes; fallback 0.2 does not establish them. A later production `36ce8ffe` browser test saved/reloaded one tasting using 0.5 + 0.7 = 1.20 points (Bonus 1/2; 2.82/5), then deleted that exact tasting once and restored counts 4/2 with old links intact. Independent `31e41c3b` inspection confirmed a valid deleted tombstone, zero score/bonus children, and the preserved baseline. New custom-attribute browser creation, A/B denial and concurrency remain open; see the [certification guide](nocodebackend/rating-workflow-certification.md). | **PARTIAL: bounded persistence/cleanup and presentation PASS; missing data and connected acceptance remain** |
| Backend certification — [#144](https://github.com/jeremytheva/pourfolio/issues/144) | Ratings, coordinated by catalogue | Read-only production checks exist. Complete the same-state provider baseline and [connected policy matrix](nocodebackend/connected-policy-certification.md), including negative ownership/session cases, response contracts, failure recovery and cleanup. Read-only passes do not close write/permission rows. | **PARTIAL** |
| <!-- launch-requirement:PF-LAUNCH-CATALOGUE --> Catalogue certification — [#154](https://github.com/jeremytheva/pourfolio/issues/154) | Catalogue; producers owns producer fixes | Browse/search/details and relationship controls are integrated. Authenticated production `4019c90e` search, product statistics/history, producer profile and the previously failing unrated-beer filter passed without writes. Producer fix #664 and attribute averages #660 are integrated. Complete connected catalogue reconciliation, provider-failure recovery and applicable import/provenance decisions. | **PARTIAL** |
| <!-- launch-requirement:PF-LAUNCH-CELLAR --> Private cellar CRUD — [#449](https://github.com/jeremytheva/pourfolio/issues/449) | Catalogue | #449 source work and PR #657 are merged. Current production `50a10454` is READY with matching health/readiness, 994 canonical tests (15 gated skips) and 155 browser/accessibility passes. At 21 October 22:28–22:30 UTC, the normal signed-in owner browser added one tagged item, fully reloaded, edited quantity/volume/container/gift/notes, fully reloaded and verified prices/date, searched by marker and deleted only that item once. The full post-delete reload restored the unchanged original one-item baseline. One add/edit/delete, no retry. This closes the bounded deployed owner HTTP/browser row; a separate provider-inventory audit was not run. Cellar A/B denial and the broader session matrix remain open; current second-account setup is unconfirmed. See the [policy record](nocodebackend/connected-policy-certification.md). Historical ownerless rows and gated catalogue/relationship capabilities are untouched. | **PARTIAL: deployed owner browser lifecycle/cleanup PASS; isolation and broader policy acceptance pending** |
| <!-- launch-requirement:PF-LAUNCH-PRIVACY --> Persistent profiles and public history — [#422](https://github.com/jeremytheva/pourfolio/issues/422) | Ratings | Persistent profiles, stable `public_id` and opt-in public history are implemented. Certify provider uniqueness/default-private creation, persisted privacy changes and revocation, copied-link behaviour, cross-owner denial and recovery. Unsupported connected rows stay pending. | **PARTIAL** |
| User/admin session certification — [#577](https://github.com/jeremytheva/pourfolio/issues/577) | Ratings | The adapter/protected runner is merged. One distinct-account rating read denial does not establish the full user/admin, expired/revoked or cellar/profile matrix. Configure `RELEASE_OTHER_EMAIL` securely in protected `staging-release`, matching the existing supported account password. Cellar/bonus manual workflows now require `auth_release_sha`. Session-based certification verifies exact auth provenance before login/write; the configured-contract-user bonus path remains provider-only evidence without session proof. Eight release-target tests and both workflows' five SHA pins passed source checks, with no connected rerun. Database Secret Keys are not login passwords. | **PARTIAL; remaining rows blocked at session-evidence boundary** |
| Current review corrections | Launch hardening (bounded shared-file claim); integration by catalogue | PR #642's header-trust, profile-readback and body-deadline corrections are integrated. PR #657's persisted gift, shared 10-second deadline, uncertain-outcome guidance and cleanup guards merged with passing canonical/browser/security checks. PR #647 accepted source `0ef8f4e4a190090343c2dc99925af457466e4ada` passed the same gates after resolving upgraded-axe catalogue/history names and card structure. PR #645 subsequently updated matched React/React DOM to 19.3.1; integrated source `63da5fae` passed 994 canonical tests (15 gated skips), all 155 browser cases and security checks. This is maintenance, not a demonstrated RSC vulnerability fix. Production identity/readiness is verified below; connected privacy/write acceptance remains open. | **Source corrections integrated and validated; connected acceptance open** |
| <!-- launch-requirement:PF-LAUNCH-ACCESS --> Launch accessibility acceptance | Launch hardening; catalogue integrates | Accepted React-patch source `63da5fae73406b8310320d44a70436abbfdf9813` passed the upgraded Playwright/axe suite after catalogue/history accessible-name and card-structure corrections. Complete production-equivalent mobile/desktop and supported screen-reader manual acceptance for the final launch candidate. Source/browser passes do not establish those manual connected results. | **PARTIAL: source/browser PASS; final connected/manual acceptance pending** |
| <!-- launch-requirement:PF-LAUNCH-RELEASE --> Exact-candidate release qualification | Catalogue integration authority | Production `50a104541b73e3eae9b9ac912c781b7e1d4cd274` is READY at `dpl_3kT9Ecf7LmN4MGrsNcpU4Jk3u5oT`; public health/readiness returned HTTP 200 with that exact SHA at 21 October 22:25 UTC. Existing canonical Node 22.23.3 run 39555891885 passed 994 tests, 15 gated skips and 155 browser/accessibility cases. The bounded deployed owner cellar browser lifecycle and exact cleanup passed at 22:28–22:30 UTC. Earlier catalogue/rating results retain their recorded candidates; historical parent/score recovery remains under #165. This evidence-only handoff changes no application source; verify its resulting deployment separately. Final distinct-account/session and operations qualification remain open. | **PARTIAL release evidence; final launch qualification NOT_RUN** |
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

## Launch execution plan — 18 October 2026

### Reviewed position

The recommended path is to finish the existing beer-first release, qualify one
candidate and run a controlled pilot before public launch. Public launch remains
**NO-GO**. New feature growth and a hosting/framework migration are not prerequisites.

Live review baseline:
`acd8633494066c66e2d882d7317009669397de39`. Production deployment
`dpl_8t1QfZgSXtPCZ6bTdCdF2ypVypeQ` reports READY at that SHA. Public health
and readiness returned HTTP 200 at approximately 10:33 UTC on 18 October with
matching provenance, configured authentication/data/shared rate limiting and
`dataProvider: ok`. This verifies configuration and a bounded read, not owner writes.

Exact-main run [38752087946](https://github.com/jeremytheva/pourfolio/actions/runs/38752087946)
executed canonical acceptance (job `116480799187`: 783 passed, 15 skipped,
zero failed, plus composed contract/lint/audit/build/security checks) and 140
browser/accessibility cases (job `116480799367`). Connected rating-integrity
and bonus-mapping jobs skipped. Required connected rows remain open.

### Dependency-ordered delivery

| Stage | Required work | Exit criterion |
| --- | --- | --- |
| A — Baseline | Confirm release/data scope, current claims and existing PR evidence. Reuse #503/#165/#144/#154/#449/#422/#577 and existing release documents. | One bounded queue and dated evidence baseline; no duplicate launch backlog. |
| B — Rating/provider integrity | Correlate the #503 deletion failure, fix the verified operation, complete #165 provider authority/restore/approval prerequisites and certify the approved write path under #144. | Connected create, identical/lost-response retry, changed-payload rejection, partial-child recovery, concurrency, historical/current deletion and cleanup pass. |
| C — Core journeys/data | Repair cellar validation under #449; certify sessions/rate limits, catalogue, score calculations, history/breakdowns, profile privacy/revocation and owner isolation using two distinct accounts. Reconcile data actually included at launch. | Every required connected journey passes with evidence and cleanup; no required skip or unresolved integrity/privacy defect. |
| D — Publication/operations | Complete the existing publication/configuration/operations procedures, support contacts, named operators/backups, monitoring/redaction, provider restore and deployment rollback. Reconcile dated scope/prose. | Effective reviewed public documents, exercised support/alert routes and demonstrated compatible recovery. |
| E — Candidate qualification | Freeze one SHA after fixes/public content integrate; execute canonical/browser/connected acceptance and verify actual production SHA, configuration, schema state and failure paths. | Dated release decision with complete exact-candidate evidence and no material unresolved reviews. |
| F — Pilot/public release | After B–E pass, invite a small representative group and observe repeat use. Every pilot repair freezes a new candidate and returns to E for canonical, browser, connected and deployment requalification before resuming the pilot or recording GO. | Pilot acceptance and public release approval refer to the same final qualified candidate. |

A can start immediately. B diagnosis, C reversible fixes/read-only preparation
and D can progress independently where dependencies and verified claims permit.
E waits for B–D. A pilot never waives integrity, privacy or recovery requirements.
Recommended pilot observation is 10–20 invited adults over 7–14 days; this is not
a promised launch date or a newly scheduled automation. Every pilot repair returns
to E: freeze the new SHA, rerun canonical source, browser/accessibility and required
connected acceptance, and verify the new deployment/configuration before resuming
pilot acceptance or recording GO. Evidence for the pre-repair SHA cannot qualify
the repaired candidate.

### First implementation slices

1. **#503 — deletion diagnosis:** use an isolated disposable fixture reproducing
   the affected historical/managed shape, or a separately authorised controlled
   retest. Capture release SHA, safe request ID, failing provider stage/status
   and before/after counts. Add a focused regression and fix the verified cause.
   PR #638's diagnostic logging is not itself evidence that deletion works.
2. **#449 — strict cellar validation:** the reviewed production sanitiser
   `api/_lib/dataPolicy.js` reproducibly accepts `date_received: "2026-02-30"`
   as `2026-03-02`, numeric date `0` as `1970-01-01`,
   `quantity: true` as `1`, and `gift: "false"` as `1`.
   Reject impossible dates and unsupported JSON types before provider I/O while
   preserving accepted valid-zero, optional-null and numeric-form semantics.
   Cover both creates and partial updates.
3. **#165/#144 — provider evidence:** #503 records workflow columns as deployed.
   Establish actual fields and guarantees from a fresh consistent baseline;
   do not repeat deployed changes blindly or equate column presence with
   uniqueness/conditional-update/backfill/recovery certification. Complete the
   existing provider-supported mechanism, isolated restore and explicit
   irreversible-change approval package before the remaining provider work.
   Keep the public reconciliation boundary unavailable until its governed gate.
4. **#422/#577 — privacy/session certification:** supported login credentials
   and two distinct sessions must prove default-private creation, uniqueness,
   stable public identity, persisted edits/opt-in, copied links, revocation and
   cross-owner denial. Database Secret Keys are not login passwords.

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




