# Brew Done It persistent schema target

Status: **approved v3 target; not yet provider-certified**  
Decision authority: [ADR 0006](../DECISIONS/0006-adopt-brew-done-it-deduction-board.md)  
Retained architecture authority: [ADR 0002](../DECISIONS/0002-approve-brew-done-it-cross-device.md)

This document defines the minimum persistent NoCodeBackend contract for the Brew Done It v3 deduction game. It is a migration target, not evidence that the collections currently exist. Production routing remains disabled until a connected provider migration and verification promote the capability.

## Design principles

- `brew_done_it_games` is the durable two-player series and stores each participant's history-clue preference.
- `brew_done_it_rounds` is the authoritative ledger of secret-beer challenges and terminal scores.
- `brew_done_it_guesses` stores only formal brewery, exact-beer and style outcome submissions.
- `brew_done_it_deductions` stores append-only deduction workspace events; reads reconcile recoverable pending events and project only the latest committed event for each logical clue.
- ordinary spoken/free-form yes/no questions are not persisted as gameplay actions.
- the selected beer is protected server state and is never projected to the active guesser.
- selector-only answer-sheet/history aggregates are server projected and never exposed to the active guesser.
- formal outcome submissions use durable reservation/reconciliation, optimistic versions and idempotency.
- challenge/round creation idempotency keys remain bound to the originally selected beer and may not replay with a different secret.
- join retries remain bound to the original one-way invitation digest; the raw invitation code is never stored.
- repeated request keys identify one logical mutation and cannot be reused for a different deduction or formal outcome.
- completeness-sensitive catalogue/history/series reads use explicit validated pagination; provider-default list sizes must never silently define the candidate universe, personal-history aggregates, replay history or statistics.
- provider boolean-like values are normalized before gameplay/scoring decisions or browser projection.
- statistics are derived from terminal rounds rather than independently mutable totals.
- `brew_done_it_questions` is legacy v2 only and is not part of the v3 provider target.
- candidate narrowing uses only governed/certified reference data; geography and tasting traits are not invented or inferred.

## `brew_done_it_games`

One row per persistent head-to-head series.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `creator_participant_id` | yes | Authenticated account that created the series |
| `opponent_participant_id` | nullable until joined | Authenticated second participant |
| `creator_history_clues_enabled` | yes/default false | Whether creator permits aggregate own-rating clues while guessing |
| `opponent_history_clues_enabled` | yes/default false | Whether opponent permits aggregate own-rating clues while guessing |
| `invitation_digest` | yes from creation onward | One-way digest of join credential; retained after join only to validate idempotent join retries and never returned to browsers |
| `status` | yes | `waiting`, `active`, `archived`, `cancelled`, or `expired` |
| `current_round_number` | yes | Current/latest round number beginning at 1 |
| `version` | yes | Optimistic concurrency version beginning at 0 |
| `creation_idempotency_key` | yes | Creator-scoped unique creation key |
| `creation_request_fingerprint` | yes | Server-only keyed fingerprint binding the creation key to its original secret product |
| `join_idempotency_key` | nullable until joined | Join replay key bound to the retained invitation digest and opponent |
| `terminal_idempotency_key` | nullable | Cancel/archive/expire replay key |
| `created_at` | yes | Server timestamp |
| `joined_at` | nullable | Server timestamp when opponent joins |
| `last_activity_at` | yes | Latest series-level mutation |
| `expires_at` | yes while waiting | Invitation expiry |
| `archived_at` | nullable | Archive timestamp |

Required invariants:

- creator and opponent are different authenticated accounts;
- an active series has exactly two participants;
- each participant may update only their own history-clue preference;
- setting history-clue permission to its already-persisted desired state is replay-safe;
- history-clue permission does not expose raw ratings, rating notes, cellar records or unrelated account data;
- `creation_idempotency_key` is unique at its intended creator scope;
- `creation_request_fingerprint` is never browser-projected and a matching creation key cannot be replayed with a different selected beer;
- invitation credentials are stored only as a one-way digest, never as the raw code;
- after a successful join, the digest may remain solely to prove that a repeated `join_idempotency_key` carries the same invitation payload; series status prevents the digest from authorising another participant; and
- join/terminal idempotency fields are unique at their intended scopes.

### Series creation and join replay rules

Creation uses the following recovery boundary:

1. derive creator-scoped `creation_idempotency_key` and a keyed `creation_request_fingerprint` from that key plus the selected product;
2. create or recover the game row by creation key;
3. reject the replay if the fingerprint represents a different selected product;
4. create or recover opening round 1 and require its `selected_product_id` to match the same request; and
5. return the deterministic invitation code only through the application response, never by storing the raw code.

Join uses the following boundary:

1. validate the invitation code against `invitation_digest`, expiry, waiting state and creator/opponent rules;
2. use the **server-loaded current game version** for the join compare-and-set because the invited account cannot know a participant-only game version before joining;
3. bind `join_idempotency_key` to the authenticated opponent and retained invitation digest;
4. update/recover the opening round guesser transition; and
5. on retry, require the same join key, opponent and invitation digest before returning replay success.

## `brew_done_it_rounds`

One row per secret-beer challenge.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `game_id` | yes | Parent series |
| `round_number` | yes | Monotonic sequence within series |
| `selector_participant_id` | yes | Participant who selected the secret beer |
| `guesser_participant_id` | nullable only before initial join | Participant making deductions/outcomes |
| `selected_product_id` | yes | Protected catalogue `products.id` |
| `status` | yes | `waiting_for_opponent`, `guessing`, `completed`, or `forfeited` |
| `turn_sequence` | yes | Number of committed **formal outcome submissions**, not questions/deductions |
| `max_turns` | yes | Safety cap on formal outcome submissions; v3 retains 20 |
| `incorrect_formal_guess_count` | yes | Incorrect committed brewery/beer/style submissions |
| `incorrect_guess_count` | transitional | v2-compatible mirror while migration compatibility is retained |
| `brewery_correct` | yes/default false | Whether brewery outcome has been solved |
| `beer_correct` | yes/default false | Whether exact beer has been solved |
| `style_correct` | yes/default false | Whether style fallback has been solved |
| `version` | yes | Optimistic concurrency version |
| `pending_action_key` | nullable | Exclusive formal-outcome reservation key |
| `pending_action_type` | nullable | `outcome:brewery`, `outcome:beer`, or `outcome:style` |
| `pending_action_started_at` | nullable | Reservation diagnostic/recovery timestamp |
| `last_action_key` | nullable | Most recently finalised formal-outcome key |
| `last_action_type` | nullable | Most recently finalised formal-outcome type |
| `round_creation_idempotency_key` | nullable for opening round | Later-round replay key, bound to that round's selected product |
| `terminal_idempotency_key` | nullable | Finish/forfeit replay key |
| `scoring_rules_version` | nullable until terminal | `3.0.0` for v3 terminal rounds |
| `awarded_points` | nullable until terminal | Immutable terminal score, 0–10 |
| `score_breakdown` | nullable until terminal | Server-derived brewery/beer/style/penalty breakdown |
| `completion_reason` | nullable until terminal | `exact_beer`, `style_fallback`, `brewery_only`, `unsolved`, or `forfeit` |
| `created_at` | yes | Server timestamp |
| `started_at` | nullable until opponent exists | Start timestamp |
| `completed_at` | nullable until terminal | Completion timestamp |

Required invariants:

- unique (`game_id`, `round_number`);
- later-round `round_creation_idempotency_key` values are unique at their intended scope;
- `selected_product_id` resolves to a real catalogue product;
- selector and guesser are the parent-series participants and differ;
- after the opening round, roles swap by default;
- only the guesser may persist deductions or formal outcomes;
- a correct exact beer also marks the brewery solved;
- a style result is fallback-only for scoring and cannot stack with exact-beer points;
- while a formal reservation is active, a second formal outcome cannot reserve the same round;
- terminal score/outcome fields become immutable once accepted;
- provider boolean-like values such as `0`, `1`, `"0"`, and `"1"` are normalized before evaluating solved flags; and
- active guesser projections never include `selected_product_id` or selector-only answer-sheet data.

### Later-round creation replay rules

A next-round retry is resolved **before** normal current-round/stale-version gates. If a round already carries the caller's `round_creation_idempotency_key`, it may replay only when its `selected_product_id` matches the requested beer. If round creation persisted but the parent game's `current_round_number` update did not, the server may adopt that persisted child using the **server-loaded current game version** only when the game still points to that child's exact terminal predecessor, the child is the immediate next round, and selector/guesser rotation matches the predecessor. If those structural invariants no longer hold, recovery fails safely rather than adopting the orphan. If the parent update already persisted but its response was lost, the persisted round number is accepted as recovered success.

## `brew_done_it_guesses`

One row per attempted durable **formal outcome submission**. Only `committed` rows affect gameplay/history.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `round_id` | yes | Parent round |
| `turn_sequence` | yes | Server-assigned formal-submission sequence |
| `guess_type` | yes | `brewery`, `beer`, or `style` |
| `guessed_product_id` | conditional | Product ID for exact-beer submission |
| `guessed_producer_id` | conditional | Producer ID for brewery submission |
| `guessed_category_id` | conditional | Category ID for style submission |
| `guesser_participant_id` | yes | Server-derived authenticated guesser |
| `is_correct` | yes | Server-derived result |
| `idempotency_key` | yes | Stable retry identity |
| `action_state` | yes | `pending`, `committed`, or `discarded` |
| `committed_round_version` | nullable until committed | Round version accepting the submission |
| `created_at` | yes | Server timestamp |

Rules:

- exactly one guessed reference is populated according to `guess_type`;
- each referenced brewery/beer/style must resolve to the canonical catalogue before a new formal submission is accepted;
- browser-supplied participant/correctness/sequence/state/points are ignored;
- repeated identical formal outcomes are rejected against the complete committed round history, not only a provider-default first page;
- a committed idempotency key may replay only the same `guess_type` and catalogue reference, including after the round later becomes terminal;
- only committed rows count toward penalties/statistics/history; and
- ambiguous provider writes are reconciled by idempotency key and the round reservation.

## `brew_done_it_deductions`

One row per append-only structured deduction mutation event. Events begin `pending` and are promoted to `committed` only when the server verifies that the same active guessing-round snapshot still exists; stale events become `discarded`. Multiple committed events may represent successive answers for the same logical clue, but only the newest committed event is projected into the active board.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key / deterministic creation-time tie-breaker |
| `round_id` | yes | Parent round |
| `recorded_by_participant_id` | yes | Server-derived guesser identity |
| `dimension` | yes | Allowlisted deduction dimension |
| `answer` | yes | `yes`, `no`, or `unknown` |
| `value_text` | conditional | Canonical/display value where applicable |
| `reference_id` | conditional | Canonical catalogue reference where applicable |
| `numeric_value` | conditional | ABV/IBU threshold where applicable |
| `idempotency_key` | yes | Immutable stable retry identity for this event |
| `observed_round_version` | yes | Round version observed when the event was created |
| `action_state` | yes | `pending`, `committed`, or `discarded` |
| `committed_round_version` | nullable until committed | Verified active round version under which the event was accepted |
| `created_at` | yes | Immutable logical event-order timestamp |
| `updated_at` | yes | Lifecycle/settlement timestamp; must not determine logical clue order |

Initial dimensions retained by the application contract:

- `brewery_country` — future use only after governed geography exists; current server writes reject this dimension;
- `brewery_state` — future use only after governed geography exists; current server writes reject this dimension;
- `brewery_previously_rated`;
- `brewery_ruled_out`;
- `style`;
- `abv_at_least`;
- `abv_below`;
- `ibu_at_least`;
- `ibu_below`;
- `collaboration`;
- `dark`;
- `barrel_aged`; and
- `beer_ruled_out`.

Rules:

- only the active guesser may create events for that round;
- new deductions require the browser's `expectedVersion` to equal the authoritative round version; an existing idempotent replay is resolved before applying that stale-version gate;
- a newly persisted event records `observed_round_version` and starts as `pending`;
- settlement requires the same authenticated guesser, active parent game, `guessing` round state and exact `observed_round_version`;
- settlement first promotes the event to `committed`, then re-reads the round/game snapshot; if a formal or terminal mutation completed before that verification read, the event is changed to `discarded` and the client receives a version conflict;
- if a round mutation occurs only after the verification read, the deduction is linearized before that later mutation and remains validly committed;
- board reads reconcile recoverable `pending` events so a lost provider/client response does not strand accepted state across devices;
- only `committed` events may enter the projected board; `pending` and `discarded` events are never candidate-filtering facts;
- deduction events are append-only in logical payload: a later answer creates a new event rather than mutating the earlier clue/answer/idempotency identity;
- `idempotency_key` must be unique at the intended deduction-event scope and must remain permanently bound to its original payload;
- deduction changes do not increment formal `turn_sequence` or score penalties;
- payload fields are normalized by dimension so unrelated text/reference/numeric values are discarded/rejected;
- style, brewery-exclusion and beer-exclusion references resolve server-side to canonical category/producer/product records before persistence;
- the server canonicalizes style display text from the category record rather than trusting browser labels;
- `unknown` never eliminates a candidate and provides the undo/reset state through a new append-only event;
- missing source data is not converted to `no`;
- zero/blank product producer/category identifiers remain unknown rather than becoming candidates for a fabricated relationship;
- if personal rating attribution is incomplete, an otherwise-unmatched brewery's previous-rating relation remains unknown rather than false;
- if brewery deductions reduce the governed brewery field to zero, beers with governed producer attribution to those eliminated breweries stay eliminated; beers whose producer relationship is missing or does not resolve to the governed brewery universe remain possible as unknowns;
- if any remaining beer has an unknown category, all styles remain possible;
- state/country writes fail closed until canonical geography is governed and certified;
- dark/barrel-aged rows are manual notes until certified structured trait data exists;
- reads collapse committed events by logical clue and order them by immutable `created_at`, using row ID as a deterministic tie-breaker; later lifecycle settlement must not reorder an older event above a newer event;
- duplicate physical rows caused by a provider race must not create contradictory projected state; provider uniqueness on `idempotency_key` is still required before enablement;
- a retry of an older idempotency key returns/reconciles its original event without reverting a newer board answer; and
- an idempotency key may replay only the same logical clue **and answer**; using it for another threshold/reference/answer fails with an idempotency conflict.

## Formal-outcome reconciliation protocol

Formal brewery/beer/style submissions use this durable sequence:

1. authenticate the participant and validate guesser role/current round/version;
2. compare-and-set round `N → N+1` with `pending_action_key` and `pending_action_type=outcome:<type>` without changing outcome counters;
3. create the formal guess child as `pending` using the same idempotency key;
4. compare-and-set the reserved round `N+1 → N+2`, applying the formal submission result, penalty/outcome flags, clearing pending fields and recording `last_action_key/type`;
5. mark the child `committed` with the accepted round version; and
6. return success only after durable state can be re-read.

Recovery rules:

- if child creation reports failure but the row is found by idempotency key, continue reconciliation only when it represents the same formal outcome;
- if no child persisted, roll back the empty reservation with no formal turn/penalty;
- reads/resume/forfeit must reconcile v3 `outcome:*` reservations through the v3 reconciler, never through the legacy v2 question/beer reconciler;
- if round finalisation succeeded but the child commit marker did not, a later list/detail read repairs the matching pending child via `last_action_key` / `last_action_type`;
- a retry of a committed idempotency key returns the existing result without a second penalty even if the round subsequently became terminal;
- reusing a committed idempotency key for a different formal outcome fails safely; and
- a stale second device fails safely rather than advancing the round twice.

## Selector clue projection and governed reference data

The selector-only answer sheet currently resolves only governed public catalogue relationships required for v3 play:

- product → producer;
- product → category/style;
- product ABV/IBU/collaboration/edition fields; and
- optional aggregate history derived from the consenting guesser's complete own-rating history plus complete paged product relationships.

The selector receives only approved history aggregates: rating count, distinct-beer count, average weighted score and last-rated date scoped to the hidden brewery/style/beer. Invalid/missing weighted scores and invalid dates are excluded. A governed relationship with no matching ratings is represented as a known zero result; an unresolved hidden producer/category relationship is represented as `available: false` and must not aggregate unrelated unresolved products together. Raw ratings, rating notes, cellar data and unrelated private account data are excluded.

Brew Done It does **not** currently depend on a provider `suburb`, `postcode`, `state` or `country` collection. Producer free-text address or `suburb_id` is not parsed/inferred into state/country. A future governed geography capability may add automatic state/country filtering under a separate evidence-backed change; it is not a prerequisite for the four v3 Brew collections.

## Provider permission boundary

The application server is the only supported caller of Brew Done It collections. Browser code uses the same-origin Pourfolio API and never receives provider credentials.

Provider/server policy must jointly ensure:

- only series participants retrieve their series/rounds;
- only the selector receives the protected answer sheet;
- only the guesser writes deductions/formal outcomes;
- the guesser cannot query provider data to obtain `selected_product_id` or selector-only history aggregates;
- game responses never project `invitation_digest`, creation/join/terminal idempotency keys or `creation_request_fingerprint`;
- users cannot enumerate other participants' Brew Done It rows; and
- retention/deletion follows the approved policy once adopted.

## Migration and certification gate

Before setting `BREW_DONE_IT_POLICY_ENABLED=true` in a user-facing environment:

1. create/certify the four v3 collections: games, rounds, guesses and deductions;
2. retain schema evidence for fields/types/indexes/relationships, history-sharing defaults, unique (`game_id`, `round_number`), creation/join/round/deduction/formal-outcome idempotency requirements, `creation_request_fingerprint`, and deduction `observed_round_version` / `action_state` / `committed_round_version` fields;
3. certify page/limit/filter behavior for products, producers, categories, ratings, games, rounds, guesses and deductions; prove the application either receives every page or fails closed rather than silently truncating a candidate/history/statistics set;
4. prove game create retries recover ambiguous provider responses and reject the same creation key with a different selected beer;
5. prove join retries use the server-loaded current version, retain only the one-way invitation digest and reject the same join key with a different invitation payload;
6. prove next-round retries are recognized before ordinary stale/current-round gates, structurally adopt a partially persisted legitimate child after unrelated game-version changes, reject an orphan whose predecessor/role invariants no longer hold, and reject the same key with a different selected beer;
7. certify the existing product/producer/category/rating relationships used for candidate narrowing and history aggregates;
8. run disposable two-account/two-device create, join, resume, deduction, exclusion/undo, brewery guess, exact-beer guess, style fallback, explicit finish, role-swap and next-round flows;
9. prove the active guesser's raw HTTP responses contain no secret beer, invitation internals or selector clue-sheet data;
10. prove history aggregates are absent when sharing is off, contain only approved aggregates when sharing is on, distinguish governed zero results from unresolved relationships, and never group unrelated unresolved products together;
11. prove yes/no/unknown deduction events persist, only committed events enter the board, and `unknown` never eliminates candidates;
12. failure-inject deduction creation/settlement and prove read-time recovery of pending events, stale-round discard, exact expected-version enforcement and no pending/discarded event leakage into candidate filtering;
13. prove an older delayed retry keeps its immutable creation order and cannot revert a newer committed board answer even when its settlement timestamp is later;
14. prove zero remaining governed breweries does not restore beers from eliminated governed breweries, while unresolved producer relationships remain possible;
15. prove unknown producer/category/numeric/boolean/rating-attribution facts remain candidates rather than being treated as negative facts;
16. prove geography remains unavailable rather than inferred while no governed canonical source exists;
17. retry/stale-device/failure-injection formal outcomes and prove exactly one committed result or zero with no invented penalty, including committed replay after terminal transition;
18. prove idempotency-key reuse for a different deduction/outcome fails rather than replaying the wrong mutation;
19. prove dark/barrel-aged manual notes do not auto-filter before certified trait metadata exists;
20. reconcile v3 statistics exactly to complete paged terminal-round history, including forfeited rounds in round counts;
21. clean disposable fixtures and retain redacted evidence; and
22. review retention/deletion, accessibility and browser evidence before route/navigation enablement.

Until those gates pass, Brew Done It remains in `DEFERRED_COLLECTIONS`, the playable route remains absent, and the server policy remains fail-closed.
