# Brew Done It readiness

Status: **v3 deduction redesign implemented in contained source; validation and provider migration pending**  
Decision authority: [ADR 0006](DECISIONS/0006-adopt-brew-done-it-deduction-board.md)  
Retained cross-device authority: [ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md)  
Schema target: [Brew Done It persistent schema target](nocodebackend/brew-done-it-schema-target.md)

## Purpose

This is the capability-specific readiness gate for Brew Done It. ADR 0006 supersedes the former controlled-question/scoring model while retaining ADR 0002's persistent two-account/two-device architecture, protected secret, invitation/resume behaviour and concurrency boundary.

Approval of source implementation does **not** approve provider mutation or production enablement.

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
- explicit brewery/beer exclusions with a persistent Set Unknown/undo path;
- brewery candidate narrowing from the guesser's own previously-rated relationship where that relationship is fully attributable;
- beer candidate narrowing by remaining brewery field, style, ABV, IBU and collaboration;
- missing producer/category/ABV/IBU/collaboration/rating-attribution data preserved as unknown so it cannot silently eliminate a candidate;
- selector history aggregates that distinguish a governed zero result from an unresolved hidden producer/style relationship;
- state/country deduction controls deliberately unavailable until canonical brewery geography is governed and certified;
- dark/barrel-aged notes that deliberately do **not** auto-filter until structured trait data is certified;
- selector-only brewery/beer/style answer sheet;
- optional guesser-controlled aggregate rating-history clues for hidden brewery/style/exact beer;
- formal brewery, exact-beer and style-fallback submissions backed by canonical catalogue references;
- scoring v3.0.0: brewery 4 + exact beer 6, or brewery 4 + style fallback 3, minus 1 per incorrect formal submission, clamped 0–10;
- durable v3 formal-outcome reservation/reconciliation separated from the superseded v2 question/guess reconciler;
- stable idempotent retries with rejection of request-key reuse for a different deduction/formal outcome;
- challenge creation keys bound server-side to their original selected beer via a keyed request fingerprint;
- join retries bound to the authenticated opponent and retained one-way invitation digest, with the join compare-and-set using the server-loaded current game version;
- later-round creation retries recognized before normal stale/current-round gates and bound to their original selected beer;
- recovery of ambiguous game/round create and join transitions by durable identity re-read;
- exact provider-boolean normalization at the server projection and internal scoring boundaries;
- explicit round completion and forfeit with replay safety;
- v3 longitudinal/head-to-head outcome statistics including forfeited rounds in round counts; and
- absent production route/navigation with `BREW_DONE_IT_POLICY_ENABLED` still unset.

The connected provider schema has not been migrated/certified for v3, so the feature remains unreachable.

## Current implementation state — 12 September 2026

The merged persistent-core baseline is PR #410. The v3 redesign is PR **#461** on `codex/brew-done-it-deduction-v3`.

The branch is currently synchronized with `main`, including the accepted rating-event ADR 0005 and newer style-history work. Brew Done It's current gameplay authority is ADR **0006**. PR #461 remains **IMPLEMENTING / VALIDATION PENDING**. Gameplay, persistence fields, API routing and UI differ materially from the accepted PR #410 exact-head evidence, so PR #410 validation must not be reused as acceptance evidence for v3.

Until v3 validation is explicitly run:

- continue non-provider source/documentation work where useful;
- do not enable a playable route/navigation or policy flag;
- do not create/change provider collections; and
- do not merge PR #461 as MERGE READY.

## Beer-profile entry-point contract

While contained, **Play Brew-Done-It** on the beer profile remains informational and performs no game API request. Once separately enabled, it passes the viewed canonical product as a reviewable initial secret-beer selection. The selector may change the beer before creating the challenge, and server product validation remains authoritative.

The selected beer must never be encoded into an invitation or guesser-facing payload.

## Invitation and asynchronous-resume contract

The challenge transport may expose only the game identifier plus the challenge credential. The canonical share/paste format remains text, not a URL containing the credential. The browser may offer clipboard/native-share affordances, but invitation credentials must not enter query strings, browser history or referrer-bearing navigation.

Waiting invitations carry a persisted `expires_at`. The client may derive an expired presentation from that timestamp and disable further sharing, but the server remains authoritative for join acceptance. A provider row that still says `waiting` after the timestamp has elapsed must not become joinable merely because its status has not yet been swept.

Retry identity is part of this contract:

- creating a challenge binds one creation idempotency key to one selected product through a server-only request fingerprint;
- a creation replay with another selected product fails rather than recovering the wrong challenge;
- the raw invitation code is never stored; its one-way digest may remain after join solely to prove that an idempotent join replay carries the same invitation payload;
- a joining user is not required to know the pre-join participant-only game version; the server validates the invitation and then uses the server-loaded current version for compare-and-set;
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

## Provider migration gate

Before a connected provider mutation, retain evidence for:

1. the exact v3 schema and field/index plan, including `creation_request_fingerprint`, retained `invitation_digest`, and append-only deduction events;
2. provider support for required create/update/filter/compare-and-set behaviour;
3. provider uniqueness/lookup behaviour for creation, join, round-creation, deduction and formal-outcome idempotency identities;
4. backup/restore or disposable-environment recovery;
5. permissions preventing direct enumeration and secret disclosure;
6. cleanup procedure for disposable test accounts/fixtures;
7. rollback/abort criteria; and
8. explicit owner approval for provider mutation.

Do not infer provider support from application source alone.

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
7. each accepted deduction mutation appends a durable event rather than overwriting the previous event/idempotency identity.
8. reads collapse events to one latest logical clue using deterministic timestamp/ID ordering.
9. a delayed retry of an older event returns that original event without reverting the newer projected board answer.
10. duplicate physical rows caused by a provider race do not create contradictory projected state, while provider uniqueness on event idempotency identity remains required before enablement.
11. zero/blank producer/category relationships and incomplete rating attribution remain unknown.
12. brewery, style and beer candidate counts remain consistent with stored deductions.
13. geography is visibly unavailable rather than inferred while no governed source exists.
14. dark/barrel-aged can be recorded but do not auto-filter before certified trait metadata exists.
15. Player B may submit brewery, exact-beer and style-fallback outcomes without the conversation itself becoming scored actions.
16. reusing an idempotency key for a different deduction payload fails safely rather than replaying the wrong clue.

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

- after formal-outcome reservation but before guess-child creation;
- after child persistence but before round finalisation;
- after round finalisation but before child commit marker;
- after challenge/game creation before opening-round response completion;
- after opening-round/next-round persistence before the parent game transition completes;
- after join game transition before the opening-round transition completes;
- during identical retries; and
- during stale second-device submissions.

Prove:

- at most one committed logical formal outcome exists;
- an empty reservation creates no formal turn/penalty;
- v3 `outcome:*` reservations are reconciled only by the v3 outcome reconciler;
- ordinary list/detail reads repair a matching child left `pending` after round finalisation;
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

- add the enabled route to the browser test matrix only after provider migration exists;
- run automated WCAG 2.2 AA checks for challenge list, create/join, paste-to-join, waiting/expiry, selector answer sheet, both deduction-card sides, formal outcomes, completion and recovery states;
- verify keyboard operation and visible focus for all deduction controls, exclusions, Set Unknown, invitation paste/share and round actions;
- verify status/live-region announcements for paste recognition, save, formal result, stale conflict, completion and invite actions without creating noisy initial announcements; and
- manually inspect screen-reader labels and secret-sensitive state transitions.

## Enablement gate

Only a separate reviewed enablement change may:

- make beer-profile **Play Brew-Done-It** navigate into play;
- add `/brew-done-it` to application routing/navigation;
- set/require `BREW_DONE_IT_POLICY_ENABLED=true`; or
- promote Brew Done It collections from deferred to deployed contract.

That change requires provider, privacy, cross-device, scoring, recovery, accessibility and cleanup evidence attributable to the exact candidate revision.

## Current blockers

Brew Done It v3 enablement is blocked by its own capability boundary, not by unrelated launch work:

- v3 provider collections/fields/uniqueness constraints are not certified/deployed;
- rating-history consent/privacy behaviour is not connected-certified;
- v3 create/join/round/deduction/formal-outcome recovery has not been failure-injection tested against NoCodeBackend;
- two-account/two-device v3 evidence does not yet exist;
- canonical brewery geography is unavailable for geography-based narrowing; and
- no reviewed enablement change exists.

These blockers remain scoped to Brew Done It and must not block unrelated Pourfolio launch work.