# Brew Done It readiness

Status: **v3 source merged with a protected testing route; connected provider qualification and public enablement remain blocked**
Decision authority: [ADR 0006](DECISIONS/0006-adopt-brew-done-it-deduction-board.md)  
Retained cross-device authority: [ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md)  
Schema target: [Brew Done It persistent schema target](nocodebackend/brew-done-it-schema-target.md)  
Provider evidence template: [Brew Done It provider evidence template](nocodebackend/brew-done-it-provider-evidence.template.json)

## Purpose

This is the capability-specific readiness gate for Brew Done It. ADR 0006 supersedes the former controlled-question/scoring model while retaining ADR 0002's persistent two-account/two-device architecture, protected secret, invitation/resume behaviour and concurrency boundary.

Approval or merge of source implementation does **not** approve provider mutation or production enablement.

## Current contained source state

The v3 source now provides:

- persistent two-player series and alternating secret-beer rounds;
- selector-first beer choice and beer-profile **Play Brew-Done-It** preselection contract;
- fail-closed secret-beer server projection;
- asynchronous invitation/share/resume behaviour with one canonical text format, paste-to-join support and no invitation credential in the page URL;
- persisted invitation-expiry display with stale sharing disabled after the recorded expiry timestamp;
- an accessible two-sided **Brewery / Beer & Style** deduction board;
- persistent `yes` / `no` / `unknown` deduction state across sessions/devices;
- append-only deduction events so a delayed retry cannot overwrite a newer answer;
- deduction events that begin `pending`, carry the observed round version, and become `committed` only after the same active guessing-round snapshot is verified; stale events become `discarded`;
- automatic board-read recovery for same-version pending deductions and game/resume cleanup for pending deductions made stale by a later round version or terminal state;
- immutable creation-time ordering so late settlement/recovery cannot make an older deduction supersede a newer one;
- explicit brewery/beer exclusions with a persistent Set Unknown/undo path;
- brewery candidate narrowing from the guesser's own previously-rated relationship where that relationship is fully attributable;
- beer candidate narrowing by remaining brewery field, style, arbitrary ABV/IBU threshold and collaboration;
- searchable brewery elimination and candidate-scoped exact-beer/rule-out search;
- correct formal brewery/style/beer outcomes applied as authoritative candidate constraints across refresh/resume;
- missing producer/category/ABV/IBU/collaboration/rating-attribution data preserved as unknown so it cannot silently eliminate a candidate;
- selector history aggregates that distinguish a governed zero result from an unresolved hidden producer/style relationship;
- history/familiarity restricted to canonical completed ratings (`submission_state = complete` with weighted total `> 0` and `<= 5`);
- state/country deduction controls deliberately unavailable until canonical brewery geography is governed and certified;
- dark/barrel-aged notes that deliberately do **not** auto-filter until structured trait data is certified;
- selector-only brewery/beer/style answer sheet with explicit unscorable relationship warnings;
- optional guesser-controlled aggregate rating-history clues for hidden brewery/style/exact beer;
- formal brewery, exact-beer and style-fallback submissions backed by canonical catalogue references;
- brewery/style formal outcomes rejected as unscorable rather than penalised when the hidden relationship itself is unresolved;
- scoring v3.0.0: brewery 4 + exact beer 6, or brewery 4 + style fallback 3, minus 1 per incorrect formal submission, clamped 0–10;
- durable v3 formal-outcome reservation/reconciliation separated from the superseded v2 question/guess reconciler;
- stable idempotent retries with rejection of request-key reuse for a different deduction/formal outcome;
- challenge creation keys bound server-side to their original selected beer via a keyed request fingerprint;
- join retries bound to the authenticated opponent and retained one-way invitation digest, with the join compare-and-set using the server-loaded current game version;
- later-round creation retries recognized before normal stale/current-round gates and bound to their original selected beer;
- recovery of ambiguous game/round create and join transitions by durable identity re-read;
- exact provider-boolean normalization at the server projection and internal scoring boundaries;
- explicit round completion and forfeit with replay safety;
- v3 longitudinal/head-to-head outcome statistics including forfeited rounds in terminal round counts; and
- a protected `/brew-done-it` route for controlled testing, hidden production navigation/product CTAs, and a backend that requires explicit `BREW_DONE_IT_POLICY_ENABLED=true`.

The machine-readable data contract classifies the four owner-provisioned v3 collections as `DEPLOYED_OPTIONAL`. This records their application integration, not certification of their current physical constraints, permissions, recovery or gameplay. The feature is not qualified for public launch. Earlier statements about an absent route or wholly deferred collections describe the historical containment baseline and must not override the current source/contract.

### Exported constraints resolved — 28 October 2026 (Australia/Sydney)

The 28 October owner-supplied `54026_rating_export_2026-10-28.sql.gz` resolves the index ambiguity. Its SHA-256 is `bf6d49719695aecc64d91a6b36443c10d382e7ba01ec68757387eb1ba1bb3f51`; the dump header names `54026_rating`. The four game-table definitions and exact index declarations are retained in [#715](https://github.com/jeremytheva/pourfolio/issues/715). All eight suspect column badges belong to combined unique indexes; zero invalid standalone unique indexes were found on those fields. The required `(game_id, round_number)` unique key already exists. Preserve the existing indexes: the earlier conditional DROP/ADD correction plan is superseded for this exported state.

The native snapshot was created and listed successfully on 28 October; restore is untested. Exported structure and absence of game INSERT statements do not prove live row counts, concurrency, privacy or isolation. Existing connected probes retain acknowledged create IDs only in memory and delete them in an after-hook, without durable create intent/acknowledgement or exact absence verification. Before running them, retain encrypted fixture recovery identity, verify ownership before each bounded delete, prove final absence/non-interference and qualify the isolated test/recovery boundary. Do not treat a successful DELETE response or an `isolated-staging` label as that proof. CAS, score text/object persistence, consent/privacy and two-device play remain NOT_RUN; public enablement remains blocked.

### Earlier owner-supplied structure review — 28 October 2026 (Australia/Sydney)

The owner supplied the four table-designer structures under
[#715](https://github.com/jeremytheva/pourfolio/issues/715), following the four
header-only CSV exports. Every v3 target field is present in the supplied
headers: games 18/18, rounds 29/29, guesses 13/13 and deductions 14/14.
The additional `user_id` columns and legacy round `question_count` are not,
by themselves, defects. The structure transcription includes types and defaults;
requesting the same column-only exports again is not the next action.

The reported `UNIQUE` badges identify eight cardinality hazards. **If these are
individual single-column unique indexes**, they prevent the following valid
operations:

| Table | Columns that must allow repeated values independently | Valid operation otherwise blocked |
| --- | --- | --- |
| `brew_done_it_games` | `creator_participant_id`, `opponent_participant_id` | A participant creates or joins another series |
| `brew_done_it_rounds` | `game_id`, `round_number` | A series starts round 2; another series starts round 1 |
| `brew_done_it_guesses` | `round_id`, `turn_sequence` | A second formal outcome in a round; turn 1 in another round |
| `brew_done_it_deductions` | `round_id`, `recorded_by_participant_id` | A guesser records another clue or changes an answer with a new event |

Round numbering instead requires one **combined** unique constraint on
`(game_id, round_number)`. Two separate single-column unique flags are not that
constraint. Preserve a correct existing combined index if the UI badges already
refer to its members; inspect actual index membership before removing anything.
Do not substitute a unique `(round_id, recorded_by_participant_id)` or clue
dimension constraint: the deduction ledger is append-only and must retain
successive events from the same participant for the same clue.

Keep primary IDs, existing invitation-digest and idempotency-key uniqueness,
private/role access, field types, nullability and defaults unchanged in this
bounded index correction. Application-created request keys already include the
authenticated participant. A correct index does not establish atomic provider
compare-and-set, permission enforcement or replay safety.

The structure was supplied by the owner, not obtained through live schema
introspection. The table-designer capture time, runtime-instance binding, index
names/membership, foreign-key targets/actions and role grants remain unverified.
The current application contract names `54026_rating`; neither the CSV filename
prefix nor the transcription independently binds it to the configured runtime.
All four reported primary IDs are `int(11)`, while game/round references are
`bigint(20) unsigned`; verify type compatibility before introducing physical
foreign keys rather than silently changing either side. The round's
`score_breakdown` is reported as `text`, while the application submits an object:
its provider write/read representation still needs a controlled round-trip.
The copied guess default has a typographic closing quote; verify the actual
stored default is exactly `pending`, without treating copied typography as a
proven provider defect. Default-private history flags and pending action states
are otherwise consistent with the target as reported.

#### Bounded correction and verification sequence

1. Bind the reported structures to the intended instance and retain current
   index definitions and access policy. Establish the provider-supported index
   operation and recovery path. Re-run the existing bounded read-only inventory
   immediately before an actual change; the earlier zero-row observations are
   not a current backup. Keep public play disabled and fence concurrent writers.
   If rows appear or isolation/recovery cannot be established, stop at assessment
   and use the existing governed migration evidence package; do not wipe tables.
2. Verify or add the combined unique `(game_id, round_number)` constraint first,
   then remove only the eight unwanted single-column unique indexes if present.
   Preserve all other indexes and policies. Do not invent SQL index names or
   schema-management endpoints. Re-read exact index membership and counts after
   each operation. With writes still fenced and unchanged rows, the retained
   definitions provide the reverse operation; after normal play begins, do not
   blindly restore the invalid single-column constraints over repeated values.
3. Once the existing isolation, fixture acknowledgement and recovery/cleanup
   prerequisites pass, reuse the existing opt-in creation/child-cardinality
   probes. Prove repeated creator/opponent participation, round 1 in two games,
   rounds 1 and 2 in one game, multiple guesses and append-only deductions, plus
   rejection of a duplicate `(game_id, round_number)` and duplicate request keys.
   Qualify atomic stale-version rejection, text/object score persistence,
   raw-response secrecy, consent/revocation, failure recovery and two-device
   resume separately; neither schema inspection nor cardinality success proves
   those behaviours.

This is a reviewable correction plan, not an executed provider migration. No
schema, row, permission, fixture or feature-flag change has occurred. Existing
provider/release manifests remain BLOCKED with unsupported checks NOT_RUN. The
next external dependency is provider index inspection/correction capability and
its bounded execution prerequisites under #715, rather than another column list.

### Live read-only inventory verified — 28 October 2026 UTC

PR #714's privacy correction and PR #712's inventory preparation are merged and
deployed at `ec6bbc580fc7d6a7d0c0fefb4c692d82fe9cdcda`. Exact production health
and readiness return HTTP 200 with that SHA; the known game API retains its
disabled HTTP 404 response. Source validation passes with 1,173 passed and 15
intentional connected skips; the exact-main browser/accessibility job passes.

Protected [inventory run 40619712618](https://github.com/jeremytheva/pourfolio/actions/runs/40619712618),
job `122590506824`, completed the actual preflight at
`2026-10-28T02:14:36.262Z`. Games, rounds, guesses and deductions each returned
zero rows on two complete observations, with eight GETs and zero writes.
The [exact redacted summary](evidence/brew-done-it-provider-inventory-2026-10-28.json)
retains source identity and the hashed provider reference, without row data.
Artifact `12786144793` has SHA-256
`9fe158da1f208681b9f642463eec04ff01044db2aa575dd0d18bdf902c925696`.
Its downloaded ZIP digest, sole summary entry and expected source SHA were verified.

Inventory PASS qualifies only these bounded reads. Schema constraints, provider
permissions/cardinality, recovery and two-account/two-device play remain NOT_RUN;
release readiness remains BLOCKED. Zero observed rows do not authorise a wipe,
make the shared instance disposable or establish a recoverable snapshot.

The subsequent owner-supplied structure review above advances
[#715](https://github.com/jeremytheva/pourfolio/issues/715) to exact index
inspection/correction and controlled-test prerequisites. The project SQL has no
definitions for these tables. Keep the existing provider/release manifests
blocked and public gameplay disabled until their separate evidence gates pass.

### Earlier launch preparation review — 28 October 2026 UTC

[Issue #711](https://github.com/jeremytheva/pourfolio/issues/711) prepares the bounded read-only inventory required before any connected fixture mutation. Main `078843e564c22f91317c2832c1e6991ffc30472a` is deployed as Vercel production `dpl_BrXmcGgRynq2rQuMTCvmrnAnAzUP`; live `/api/health` and `/api/readiness` both returned HTTP 200 with that SHA on 28 October. These results qualify application deployment identity and readiness only; they do not exercise the game.

The inventory uses the existing provider adapter and game paginator to read only `brew_done_it_games`, `brew_done_it_rounds`, `brew_done_it_guesses` and `brew_done_it_deductions`. Each observation is limited to ten pages of 100 rows per collection. It requires complete pagination, valid unique IDs and a second unchanged observation of all four collections. Missing/malformed/repeated pages, count/content drift, provider errors or limits produce `BLOCKED` rather than a guessed count. A limit requires a separately reviewed bounded approach; do not silently raise it or infer that the unobserved remainder is empty.

The report retains only source commit, capture time, a hashed provider reference, allowlisted collection names, counts and fixed statuses. Records, participant IDs, selected beers, invitation material, comparison digests and arbitrary provider errors are never retained. Two stable observations are **not** an atomic snapshot, backup, current schema export or certification of permissions/cardinality/concurrency. Inventory PASS leaves provider/privacy/recovery/two-account certification `NOT_RUN` and release readiness `BLOCKED`.

After review and integration, run **Brew Done It read-only provider inventory** from `main` in the existing protected `staging-release` environment, or include `[brew-inventory]` in the integration commit message. The workflow pins and verifies `github.sha`, validates source before reads, uses the protected instance/data credential and retains only `summary.json`. It accepts no candidate branch or provider URL input and performs no provider mutation. Connected inventory execution is **NOT_RUN** at this source-preparation checkpoint; retain the actual run/summary in #711 before advancing.

Next, combine the observed counts with a current schema-only export of the same provider instance and independently verified isolation/recovery/cleanup evidence. The existing isolated probes can then qualify creation/child cardinality under their existing execution guards. Complete raw-response secret protection, history-consent/revocation, two-account/two-device play/resume, failure injection and accessibility before the separately reviewed public-enablement change. Use the existing provider/release evidence manifests; this inventory creates no alternative launch approval.

### Retired v1 scoring prototype — 25 October 2026 UTC

Issue #682 is a bounded cleanup under #429. The obsolete
`src/utils/brewDoneItScoring.js` v1.0.0 helper had no runtime importer; only its
dedicated eight-case test file consumed it. Both are retired. The current
`brewDoneItChallengeScoring.js` dispatcher, v2 recovery callers and v3
`brewDoneItDeductionScoring.js` implementation and tests remain intact. The old
v1 provider proposal in `schema-mapping.md` is explicitly historical; ADRs and
the proposal's tables remain available as design history.

This retirement does not change any current scoring rule, persisted historical
result, provider contract, policy flag or game enablement. Current functional
coverage and the production-client before/after comparison qualify the cleanup;
provider and connected readiness gates remain open.

## Current implementation state — 12 September 2026

The persistent cross-device baseline from PR **#410** is merged. The deduction-board redesign from PR **#461** is also merged at `d555bf493931d8700d6a41fd5ff4fd36736b4025`.

PR #461's exact accepted head `da0dbc1ab627e6cbea219923466c99a52ce28326` passed canonical `npm run platform:validate`, Browser/accessibility, Dependency Review and CodeQL, had Vercel deployment success, zero unresolved review threads and zero commits behind `main` at merge assessment. This is the accepted source-validation baseline for the v3 redesign; PR #410 evidence must not be substituted for v3-specific behaviour.

The non-destructive provider-migration evidence gate from PR **#477** is merged at `e6300768020e024ca877b4f5a25cad2d6660329a`. It adds:

- `scripts/audit-brew-done-it-provider-evidence.js`;
- `npm run audit:brew-provider-evidence -- --manifest <path>`;
- the versioned evidence contract `pourfolio.brew-done-it-provider-evidence.v1`;
- focused regression tests, including a test proving the checked-in template remains blocked; and
- `docs/nocodebackend/brew-done-it-provider-evidence.template.json` as the canonical evidence-collection starting point.

The checked-in template is deliberately **BLOCKED**: provider capability/idempotency evidence is `PENDING` and `providerMutationApproved` is `false`. A source audit PASS is necessary but not sufficient for migration and must never be fabricated from application source.

Current next boundary:

1. gather real provider capability, idempotency, recovery, permission/secret-projection and cleanup evidence in an isolated/disposable provider environment;
2. replace template placeholders only with redacted evidence references/digests;
3. run `npm run audit:brew-provider-evidence -- --manifest <completed-manifest>` and require PASS;
4. obtain explicit provider-mutation approval and independent review; and only then
5. consider a separately reviewed provider-migration change.

Until those conditions are met:

- do not expose public gameplay/navigation or enable the backend policy flag;
- do not create/change Brew Done It provider collections;
- do not represent the evidence template as approved; and
- do not treat merged source as connected-provider certification.

## Beer-profile entry-point contract

While contained, the beer profile exposes no production **Play Brew-Done-It** CTA. The protected testing route retains a private navigation-state preselection contract. Once separately enabled, the beer-profile action passes the viewed canonical product as a reviewable initial secret-beer selection. The selector may change the beer before creating the challenge, and server product validation remains authoritative.

The selected beer must never be encoded into an invitation or guesser-facing payload.

## Invitation and asynchronous-resume contract

The challenge transport may expose only the game identifier plus the challenge credential. The canonical share/paste format remains text, not a URL containing the credential. The browser may offer clipboard/native-share affordances, but invitation credentials must not enter query strings, browser history or referrer-bearing navigation.

Waiting invitations carry a persisted `expires_at`. The client may derive an expired presentation from that timestamp and disable further sharing, but the server remains authoritative for join acceptance. A provider row that still says `waiting` after the timestamp has elapsed must not become joinable merely because its status has not yet been swept.

Retry identity is part of this contract:

- creating a challenge binds one creation idempotency key to one selected product through a server-only request fingerprint;
- a creation replay with another selected product fails rather than recovering the wrong challenge;
- the raw invitation code is never stored; its one-way digest may remain after join solely to prove that an idempotent join replay carries the same invitation payload;
- a joining user is not required to know the pre-join participant-only current game version; the server validates the invitation and then uses the server-loaded current version for compare-and-set;
- later-round creation keys remain bound to the originally selected product; and
- a later-round replay is checked before ordinary current-round/stale-version gates so a lost response or partially persisted parent transition can be recovered deterministically.

## Governed clue-data boundary

Candidate narrowing must use only governed/certified facts.

Currently supported source-backed narrowing includes:

- producer relationship from canonical product data where the relationship has a positive canonical identifier;
- whether the authenticated guesser has previously rated a beer from that producer when all relevant rating-to-product-to-producer relationships are attributable;
- product category/style;
- ABV;
- IBU; and
- collaboration.

Canonical catalogue relationship identifiers are normalized to positive-ID strings before entering the candidate contract. A zero/blank relationship, missing product fact or incomplete personal-rating attribution remains unknown and cannot be used as evidence for `no`. If any remaining beer has no governed style/category, all style candidates remain possible rather than being silently narrowed away.

Current source does **not** treat producer free-text address/suburb identifiers as sufficient authority for state/country. Therefore state/country controls remain unavailable and geography fields in the selector sheet remain unknown until a canonical geography source is governed and certified.

Dark and barrel-aged are useful social clues, but remain manual notes only until trustworthy structured trait metadata exists. Missing information must never be interpreted as `no`.

## Controlled use of existing provider tables (15 October 2026)

The owner reports that no Brew Done It games have been played and permits test-data cleanup after setup/certification. This authorizes planning against the four existing `brew_done_it_games`, `brew_done_it_rounds`, `brew_done_it_guesses`, and `brew_done_it_deductions` tables, **not** an assertion that they are empty, that the shared NoCodeBackend instance is disposable, or that irreversible schema migration or public enablement is approved.

Before any connected write, read and record row counts, table constraints, provider instance/environment identity, protected-data boundaries and cleanup capability. Preserve a recoverable snapshot/rollback plan. Use dedicated test accounts and traceable fixture identifiers, exclude unrelated catalogue/ratings/cellar/authentication records, and clean up **only positively identified test-owned rows**, in dependency-safe order, with post-cleanup verification. A whole-table wipe is prohibited unless every row has been independently verified as disposable and the governed mutation and recovery gate is explicitly satisfied. Existing tables may certify isolated workflows only when shared-instance isolation, privacy and non-interference are demonstrated; otherwise a separate disposable provider instance remains necessary.

Keep `BREW_DONE_IT_POLICY_ENABLED` off and public navigation/CTA contained while tests or provider analysis proceed. Record actual connected PASS/FAIL/NOT_RUN evidence; do not treat this test disposition as provider capability, privacy or release certification.

## Provider migration gate

Before a connected provider mutation, retain evidence for:

1. the exact v3 schema and field/index plan, including `creation_request_fingerprint`, retained `invitation_digest`, and deduction `observed_round_version`, `action_state` and `committed_round_version` fields;
2. provider support for required create, read, update, delete, filtered-read, pagination and compare-and-set behaviour;
3. provider uniqueness/lookup behaviour for creation, join, round-creation, deduction and formal-outcome idempotency identities;
4. backup/restore or disposable-environment recovery plus failure-injection and rollback/abort plans;
5. permissions preventing direct enumeration and secret disclosure;
6. cleanup procedure and verification for disposable test accounts/fixtures;
7. source/release provenance; and
8. explicit owner/security/release approval plus independent review before provider mutation.

The evidence must be recorded using the versioned manifest contract and checked with:

```text
npm run audit:brew-provider-evidence -- --manifest <completed-manifest>
```

The auditor is local-only: it validates evidence references and privacy/minimisation rules and performs no provider/network write. It requires the exact v3 collection set, rejects legacy `brew_done_it_questions`, rejects incomplete capability/idempotency/recovery/permission/cleanup evidence, rejects credential-like/unredacted values, and requires `providerMutationApproved: true` with an independent reviewer distinct from migration/security/release approval actors.

Do not infer provider support from application source alone. Do not change the checked-in template merely to make the audit pass without real evidence.

## Required v3 Brew Done It collections

The migration target is:

- `brew_done_it_games`;
- `brew_done_it_rounds`;
- `brew_done_it_guesses`; and
- `brew_done_it_deductions`.

`brew_done_it_questions` belongs to the superseded v2 model and is not required for new v3 play.

Existing governed product/producer/category/rating data may support deduction options and selector aggregates. Geography is not a v3 migration prerequisite and must remain unavailable until separately governed. Full field and recovery semantics are in the schema target.

## Connected certification

Use dedicated non-personal test accounts and disposable fixtures where possible.

### Authentication, ownership and privacy

Prove:

- unauthenticated requests fail;
- only the two participants access their series/rounds;
- unrelated users cannot enumerate another game, deduction or formal guess;
- the creator cannot join their own invitation as opponent;
- browser-supplied participant/correctness/score fields are ignored/rejected;
- only the selector receives the private answer sheet;
- active guesser raw HTTP responses contain no `selected_product_id`, answer-sheet data or equivalent secret;
- browser game projections contain no `invitation_digest`, `creation_request_fingerprint`, or internal creation/join/terminal idempotency fields; and
- the secret is revealed only after terminal state.

### Invitation, creation and role-rotation recovery

Prove:

1. an identical challenge-create retry returns the same series, opening round and deterministic invitation code;
2. the same creation key with a different selected product fails with an idempotency conflict;
3. a provider create that persists before its response is lost is recovered by the creation key/fingerprint without creating a second series or changing the selected beer;
4. invitation text can be copied/shared and pasted into the join form without placing the credential in a URL;
5. the persisted `expires_at` is presented consistently after creation and later resume, and the server rejects the join once that timestamp has elapsed;
6. a valid invitation can join even when the server-loaded waiting game version is no longer zero;
7. a lost join response retries successfully only for the same authenticated opponent, join key and invitation digest;
8. the same join key with another invitation payload fails;
9. a next-round retry with the same key/product recovers a lost response;
10. a next-round retry can complete the parent `current_round_number` transition if the child round persisted first;
11. a next-round key reused with another selected product fails; and
12. selector/guesser role rotation remains correct after all recovery paths.

### Rating-history consent

With history sharing **off**, prove selector clue responses contain no hidden-answer rating aggregates for that guesser.

With sharing **on**, prove only approved aggregates are returned:

- rating count;
- distinct-beer count;
- average weighted rating; and
- last-rated date

for the hidden brewery/style/exact beer. Raw ratings, rating notes, cellar records and unrelated account data must remain absent.

A governed relationship with no matching ratings must be distinguishable from an unresolved hidden producer/style relationship. Unresolved relationships must not group unrelated unresolved catalogue records into a synthetic aggregate.

A lost-response retry of the same desired history-sharing state must be replay-safe. Provider values such as `"0"` must project as false rather than JavaScript-truthy values.

### Deduction board

Using two authenticated devices:

1. Player A selects a beer and creates a challenge.
2. Player B accepts on another device.
3. Player B records previous-brewery-history/style/ABV/IBU/collaboration deductions and explicit brewery/beer exclusions.
4. Player B can return an existing deduction/exclusion to `unknown` without creating a contradictory scored action.
5. Refresh/sign-out/device change preserves the deduction board.
6. `yes` and `no` narrow only according to certified facts; `unknown` eliminates nothing.
7. each new deduction requires the client-known round version to match the authoritative round version before its event is created; an existing idempotent replay is recognized before this stale-version check.
8. each new event is persisted as `pending` with `observed_round_version`, then becomes `committed` only if the same game/round/guesser snapshot is still active and unchanged.
9. after event commit, a verification read detects a formal/terminal mutation that completed first; such an event is changed to `discarded` and never enters candidate filtering.
10. a same-version pending event left by a lost response is reconciled by a later guesser board read.
11. series/game-detail resume reads discard pending events that are provably stale because the round version changed or the round became terminal, while leaving same-version recoverable pending events untouched.
12. only `committed` deduction events enter the projected board; `pending` and `discarded` rows are never clue facts.
13. logical clue ordering uses immutable event `created_at` plus row-ID tie-breaking, not later settlement `updated_at`, so a delayed older recovery cannot revert a newer answer.
14. duplicate physical rows caused by a provider race do not create contradictory projected state, while provider uniqueness on event idempotency identity remains required before enablement.
15. zero/blank producer/category relationships and incomplete rating attribution remain unknown.
16. brewery, style and beer candidate counts remain consistent with stored deductions.
17. geography is visibly unavailable rather than inferred while no governed source exists.
18. dark/barrel-aged can be recorded but do not auto-filter before certified trait metadata exists.
19. Player B may submit brewery, exact-beer and style-fallback outcomes without the conversation itself becoming scored actions.
20. reusing an idempotency key for a different deduction payload fails safely rather than replaying the wrong clue.

### Scoring and lifecycle

Prove scoring v3.0.0 exactly:

- brewery correct = 4;
- brewery + exact beer = 10 before penalties;
- brewery + style fallback = 7 before penalties;
- style does not stack with exact-beer points;
- each incorrect formal submission costs 1;
- ordinary questions/deductions cost 0;
- score never leaves 0–10;
- exact beer confirms brewery;
- provider boolean-like values are normalized before internal scoring/lifecycle decisions;
- explicit finish persists exactly one terminal result; and
- terminal outcomes/statistics reconcile to round rows.

### Concurrency and recovery

Inject failures:

- after deduction-event persistence but before settlement;
- after deduction-event commit but before the verification read/response;
- while another formal or terminal round mutation changes the observed round version;
- after formal-outcome reservation but before guess-child creation;
- after child persistence but before round finalisation;
- after round finalisation but before child commit marker;
- after challenge/game creation before opening-round response completion;
- after opening-round/next-round persistence before the parent game transition completes;
- after join game transition before the opening-round transition completes;
- during identical retries; and
- during stale second-device submissions.

Prove:

- a recoverable same-version pending deduction is committed on a later board read;
- a pending deduction made stale by a later round version/terminal state is discarded on settlement or resume cleanup;
- a delayed older deduction never overtakes a newer event merely because settlement happened later;
- at most one committed logical formal outcome exists;
- an empty formal reservation creates no formal turn/penalty;
- v3 `outcome:*` reservations are reconciled only by the v3 outcome reconciler;
- ordinary list/detail reads repair a matching formal child left `pending` after round finalisation;
- retries recover deterministically by idempotency key and bound payload identity;
- an idempotency key cannot be reused for a different formal reference/type, deduction payload or selected beer;
- stale versions fail safely where the caller is expected to know a version;
- join does not require the invited non-participant to guess a hidden current version;
- no score/penalty duplicates; and
- resume/game-detail/forfeit cannot accidentally execute the legacy v2 exact-beer reconciliation semantics.

### Asynchronous series flow

Prove create → share/paste → join → resume → deductions → formal outcomes → explicit finish → reveal → role swap → next round across different authenticated sessions/devices over elapsed time. Head-to-head brewery/exact-beer/style/point totals must reconcile after repeated rounds, including forfeited rounds in the durable round count.

### Accessibility and browser evidence

Before route enablement:

- qualify the connected browser matrix against verified provider prerequisites; existing deterministic protected-route coverage remains source evidence only;
- run automated WCAG 2.2 AA checks for challenge list, create/join, paste-to-join, waiting/expiry, selector answer sheet, both deduction-card sides, formal outcomes, completion and recovery states;
- verify keyboard operation and visible focus for all deduction controls, exclusions, Set Unknown, invitation paste/share and round actions;
- verify status/live-region announcements for paste recognition, save, formal result, stale conflict, completion and invite actions without creating noisy initial announcements; and
- manually inspect screen-reader labels and secret-sensitive state transitions.

## Enablement gate

Only a separate reviewed enablement change may:

- make beer-profile **Play Brew-Done-It** navigate into play;
- expose the existing protected `/brew-done-it` testing route through production navigation;
- set/require `BREW_DONE_IT_POLICY_ENABLED=true`; or
- qualify the existing `DEPLOYED_OPTIONAL` Brew Done It collections for public gameplay.

That change requires provider, privacy, cross-device, scoring, recovery, accessibility and cleanup evidence attributable to the exact candidate revision.

## Current blockers

Brew Done It v3 enablement is blocked by its own capability boundary, not by unrelated launch work:

- the canonical provider-evidence template remains BLOCKED because real isolated-provider capability/idempotency/recovery/privacy/cleanup evidence has not been supplied and provider mutation is not approved;
- owner-provisioned v3 collections are integrated as `DEPLOYED_OPTIONAL`, but their current fields/uniqueness constraints and permissions are not connected-certified;
- rating-history consent/privacy behaviour is not connected-certified;
- v3 create/join/round/deduction/formal-outcome recovery has not been failure-injection tested against NoCodeBackend;
- two-account/two-device v3 evidence does not yet exist;
- no reviewed provider-migration or enablement change exists.

Canonical brewery geography remains unavailable for geography-based narrowing; the controls stay unavailable and this is not a prerequisite for the agreed v3 game.

These blockers remain scoped to Brew Done It and must not block unrelated Pourfolio launch work.
