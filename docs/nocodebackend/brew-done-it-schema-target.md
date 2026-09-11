# Brew Done It persistent schema target

Status: **approved v3 target; not yet provider-certified**  
Decision authority: [ADR 0003](../DECISIONS/0003-adopt-brew-done-it-deduction-board.md)  
Retained architecture authority: [ADR 0002](../DECISIONS/0002-approve-brew-done-it-cross-device.md)

This document defines the minimum persistent NoCodeBackend contract for the Brew Done It v3 deduction game. It is a migration target, not evidence that the collections currently exist. Production routing remains disabled until a connected provider migration and verification promote the capability.

## Design principles

- `brew_done_it_games` is the durable two-player series and stores each participant's history-clue preference.
- `brew_done_it_rounds` is the authoritative ledger of secret-beer challenges and terminal scores.
- `brew_done_it_guesses` stores only formal brewery, exact-beer and style outcome submissions.
- `brew_done_it_deductions` stores the guesser's persistent deduction workspace; deduction rows do not consume formal turns or directly affect scoring.
- ordinary spoken/free-form yes/no questions are not persisted as gameplay actions.
- the selected beer is protected server state and is never projected to the active guesser.
- selector-only answer-sheet/history aggregates are server projected and never exposed to the active guesser.
- formal outcome submissions use durable reservation/reconciliation, optimistic versions and idempotency.
- statistics are derived from terminal rounds rather than independently mutable totals.
- `brew_done_it_questions` is legacy v2 only and is not part of the v3 provider target.

## `brew_done_it_games`

One row per persistent head-to-head series.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `creator_participant_id` | yes | Authenticated account that created the series |
| `opponent_participant_id` | nullable until joined | Authenticated second participant |
| `creator_history_clues_enabled` | yes/default false | Whether creator permits aggregate own-rating clues while guessing |
| `opponent_history_clues_enabled` | yes/default false | Whether opponent permits aggregate own-rating clues while guessing |
| `invitation_digest` | nullable after joined | One-way digest of join credential; never return to browsers |
| `status` | yes | `waiting`, `active`, `archived`, `cancelled`, or `expired` |
| `current_round_number` | yes | Current/latest round number beginning at 1 |
| `version` | yes | Optimistic concurrency version beginning at 0 |
| `creation_idempotency_key` | yes | Creator-scoped unique creation key |
| `join_idempotency_key` | nullable | Join replay key |
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
- history-clue permission does not expose raw ratings, rating notes, cellar records or unrelated account data;
- invitation credentials are stored only as a digest; and
- creation/join/terminal idempotency fields are unique at their intended scopes.

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
| `round_creation_idempotency_key` | nullable for opening round | Later-round replay key |
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
- `selected_product_id` resolves to a real catalogue product;
- selector and guesser are the parent-series participants and differ;
- after the opening round, roles swap by default;
- only the guesser may persist deductions or formal outcomes;
- a correct exact beer also marks the brewery solved;
- a style result is fallback-only for scoring and cannot stack with exact-beer points;
- while a formal reservation is active, a second formal outcome cannot reserve the same round;
- terminal score/outcome fields are immutable once accepted; and
- active guesser projections never include `selected_product_id` or selector-only answer-sheet data.

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
- browser-supplied participant/correctness/sequence/state/points are ignored;
- repeated identical formal outcomes are rejected against committed history;
- only committed rows count toward penalties/statistics/history; and
- ambiguous provider writes are reconciled by idempotency key and the round reservation.

## `brew_done_it_deductions`

One row per persistent structured clue in the guesser's workspace.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `round_id` | yes | Parent round |
| `recorded_by_participant_id` | yes | Server-derived guesser identity |
| `dimension` | yes | Allowlisted deduction dimension |
| `answer` | yes | `yes`, `no`, or `unknown` |
| `value_text` | conditional | State/country/style display value where applicable |
| `reference_id` | conditional | Catalogue reference where applicable |
| `numeric_value` | conditional | ABV/IBU threshold where applicable |
| `idempotency_key` | yes | Stable retry identity |
| `created_at` | yes | Creation timestamp |
| `updated_at` | yes | Latest answer update timestamp |

Initial dimensions:

- `brewery_country`
- `brewery_state`
- `brewery_previously_rated`
- `brewery_ruled_out`
- `style`
- `abv_at_least`
- `abv_below`
- `ibu_at_least`
- `ibu_below`
- `collaboration`
- `dark`
- `barrel_aged`
- `beer_ruled_out`

Rules:

- only the active guesser may create/update rows for that round;
- deduction changes do not increment `turn_sequence` or score penalties;
- `unknown` never eliminates a candidate;
- missing source data is not converted to `no`;
- dark/barrel-aged rows are manual notes until certified structured trait data exists; and
- repeated updates to the same logical clue update that workspace entry rather than creating scored actions.

## Formal-outcome reconciliation protocol

Formal brewery/beer/style submissions use this durable sequence:

1. authenticate the participant and validate guesser role/current round/version;
2. compare-and-set round `N → N+1` with `pending_action_key` and `pending_action_type=outcome:<type>` without changing outcome counters;
3. create the formal guess child as `pending` using the same idempotency key;
4. compare-and-set the reserved round `N+1 → N+2`, applying the formal submission result, penalty/outcome flags, clearing pending fields and recording `last_action_key/type`;
5. mark the child `committed` with the accepted round version; and
6. return success only after durable state can be re-read.

Recovery rules:

- if child creation reports failure but the row is found by idempotency key, continue reconciliation;
- if no child persisted, roll back the empty reservation with no formal turn/penalty;
- reads/resume/forfeit must reconcile v3 `outcome:*` reservations through the v3 reconciler, never through the legacy v2 question/beer reconciler;
- a retry of a committed idempotency key returns the existing result without a second penalty; and
- a stale second device fails safely rather than advancing the round twice.

## Selector clue projection and reference data

The selector-only answer sheet may resolve public catalogue/reference data such as producer, category, suburb, postcode, state and country. These reference tables are not additional Brew Done It ledgers.

If the guesser has enabled history clues, the server may derive aggregate values from that guesser's own ratings and product relationships. The selector receives only approved aggregates (counts, distinct-beer count, average weighted score, last-rated date) scoped to the hidden brewery/style/beer. Raw ratings, notes and cellar data are excluded.

## Provider permission boundary

The application server is the only supported caller of Brew Done It collections. Browser code uses the same-origin Pourfolio API and never receives provider credentials.

Provider/server policy must jointly ensure:

- only series participants retrieve their series/rounds;
- only the selector receives the protected answer sheet;
- only the guesser writes deductions/formal outcomes;
- the guesser cannot query provider data to obtain `selected_product_id` or selector-only history aggregates;
- users cannot enumerate other participants' Brew Done It rows; and
- retention/deletion follows the approved policy once adopted.

## Migration and certification gate

Before setting `BREW_DONE_IT_POLICY_ENABLED=true` in a user-facing environment:

1. create/certify the four v3 collections: games, rounds, guesses and deductions;
2. retain schema evidence for fields/types/indexes/relationships and history-sharing defaults;
3. certify the location/category/product reference data used for candidate narrowing;
4. run disposable two-account/two-device create, join, resume, deduction, brewery guess, exact-beer guess, style fallback, explicit finish, role-swap and next-round flows;
5. prove the active guesser's raw HTTP responses contain no secret beer or selector clue-sheet data;
6. prove history aggregates are absent when sharing is off and contain only approved aggregates when sharing is on;
7. prove yes/no/unknown deductions persist and `unknown` never eliminates candidates;
8. retry/stale-device/failure-injection formal outcomes and prove exactly one committed result or zero with no invented penalty;
9. prove dark/barrel-aged manual notes do not auto-filter before certified trait metadata exists;
10. reconcile v3 statistics exactly to terminal round rows;
11. clean disposable fixtures and retain redacted evidence; and
12. review retention/deletion, accessibility and browser evidence before route/navigation enablement.

Until those gates pass, Brew Done It remains in `DEFERRED_COLLECTIONS`, the playable route remains absent, and the server policy remains fail-closed.
