# Brew Done It persistent schema target

Status: **approved target; not yet provider-certified**  
Decision authority: [ADR 0002](../DECISIONS/0002-approve-brew-done-it-cross-device.md)

This document defines the minimum persistent NoCodeBackend data contract required for cross-device Brew Done It. It is a migration target, not evidence that these collections currently exist. Production routing remains disabled until a connected provider migration and verification promote the capability.

## Design principles

- `brew_done_it_games` is a durable two-player series.
- `brew_done_it_rounds` is the authoritative ledger of individual beer challenges and completed scores.
- the selected beer is protected server state and is never projected to the guesser while a round is active;
- browser input never controls participant ownership, correctness, sequence, score or terminal state;
- round actions use a persisted reservation plus child-action state so ambiguous provider failures can be reconciled without inventing a turn;
- only `committed` question/guess rows are projected as gameplay history;
- idempotency and optimistic version fields are persisted so retries and stale devices cannot duplicate state changes; and
- statistics are derived from completed rounds rather than stored as independently mutable totals.

## `brew_done_it_games`

One row per persistent head-to-head series.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `creator_participant_id` | yes | Authenticated account that created the series |
| `opponent_participant_id` | nullable until joined | Authenticated second participant |
| `invitation_digest` | nullable after joined | One-way digest of the join credential; never return it to browsers |
| `status` | yes | `waiting`, `active`, `archived`, `cancelled`, or `expired` |
| `current_round_number` | yes | Current/latest round number, beginning at 1 |
| `version` | yes | Optimistic concurrency version, beginning at 0 |
| `creation_idempotency_key` | yes | Creator-scoped unique creation key |
| `join_idempotency_key` | nullable | Join replay key after acceptance |
| `terminal_idempotency_key` | nullable | Replay key for cancel/archive/expire |
| `created_at` | yes | Server timestamp |
| `joined_at` | nullable | Server timestamp when opponent joined |
| `last_activity_at` | yes | Server timestamp of latest series-level mutation |
| `expires_at` | yes while waiting | Waiting invitation expiry |
| `archived_at` | nullable | Server timestamp when archived |

Required invariants:

- creator and opponent must be different authenticated accounts;
- an `active` series has exactly two participants;
- only the creator can cancel a waiting challenge;
- waiting invitations cannot be joined after `expires_at`;
- `creation_idempotency_key`, `join_idempotency_key` when present, and `terminal_idempotency_key` when present must be unique at their intended scope; and
- invitation credentials are stored only as a digest.

## `brew_done_it_rounds`

One row per beer challenge within a series.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `game_id` | yes | Parent `brew_done_it_games.id` |
| `round_number` | yes | Monotonic sequence within the series |
| `selector_participant_id` | yes | Participant who chose the secret beer |
| `guesser_participant_id` | nullable only before initial join | Participant who guesses |
| `selected_product_id` | yes | Protected catalogue `products.id` |
| `status` | yes | `waiting_for_opponent`, `guessing`, `completed`, or `forfeited` |
| `turn_sequence` | yes | Number of committed questions + guesses |
| `max_turns` | yes | Versioned round action limit; v2 uses 20 |
| `question_count` | yes | Committed controlled questions |
| `incorrect_guess_count` | yes | Committed incorrect beer guesses |
| `version` | yes | Optimistic concurrency version; reservation and finalisation each advance it |
| `pending_action_key` | nullable | Idempotency key currently holding the exclusive round mutation reservation |
| `pending_action_type` | nullable | `guess` or `question` for the reserved action |
| `pending_action_started_at` | nullable | Server timestamp used for diagnostics/recovery of a reservation |
| `last_action_key` | nullable | Idempotency key of the most recently finalised round action |
| `last_action_type` | nullable | `guess` or `question` for the most recently finalised action |
| `round_creation_idempotency_key` | nullable for opening round | Unique replay key for later-round creation |
| `terminal_idempotency_key` | nullable | Unique replay key for forfeit |
| `scoring_rules_version` | nullable until terminal | Scoring contract used for the completed round |
| `awarded_points` | nullable until terminal | Immutable terminal score, 0–10 |
| `score_breakdown` | nullable until terminal | Server-derived scoring inputs/breakdown |
| `completion_reason` | nullable until terminal | `correct_guess`, `turn_limit`, or `forfeit` |
| `created_at` | yes | Server timestamp |
| `started_at` | nullable until opponent exists | Server timestamp |
| `completed_at` | nullable until terminal | Server timestamp |

Required indexes/invariants:

- unique (`game_id`, `round_number`);
- `selected_product_id` references a real catalogue product;
- selector and guesser must be the parent series participants and must differ;
- only the selector may create/select the secret for the next round;
- only the guesser may ask questions or submit guesses;
- after the opening round, roles swap from the previous round by default;
- a question/guess must reserve the exact expected round version before its child row is created;
- while `pending_action_key` is set, another round action cannot reserve or advance the round;
- a finalised action clears the pending fields and copies its key/type to `last_action_key` / `last_action_type`;
- terminal score fields become immutable once accepted; and
- `selected_product_id` is never included in an active-round projection to the guesser.

## `brew_done_it_guesses`

One row per attempted durable beer-guess action. Only rows with `action_state = committed` are gameplay history.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `round_id` | yes | Parent round |
| `turn_sequence` | yes | Server-assigned candidate action sequence |
| `guessed_product_id` | yes | Catalogue beer guessed |
| `guesser_participant_id` | yes | Server-derived authenticated guesser |
| `is_correct` | yes | Server-derived exact-product result |
| `uniqueness_key` | yes | Diagnostic/action identity; duplicate-product policy is enforced against committed rows server-side |
| `idempotency_key` | yes | Stable retry identity |
| `action_state` | yes | `pending`, `committed`, or `discarded` |
| `committed_round_version` | nullable until committed | Round version that durably accepted the action |
| `created_at` | yes | Server timestamp |

Required indexes/invariants:

- unique idempotency key at the intended participant/round scope;
- browser-supplied `is_correct`, participant, sequence, state or points fields are ignored;
- only `committed` rows count toward history/scoring/projection;
- `pending` rows may be promoted only when the round reservation/finalisation proves the same action key; and
- an unaccepted ambiguous row is marked `discarded` and must never consume a turn or block a later valid beer guess.

Do not require provider uniqueness on (`round_id`, `turn_sequence`) or (`round_id`, `guessed_product_id`) across all action states. A timed-out provider create may leave a non-committed recovery row; serial reservation plus committed-row validation is the authoritative duplicate control.

## `brew_done_it_questions`

One row per attempted durable controlled catalogue question. Only rows with `action_state = committed` are gameplay history.

| Field | Required | Purpose |
| --- | --- | --- |
| `id` | yes | Provider primary key |
| `round_id` | yes | Parent round |
| `turn_sequence` | yes | Server-assigned candidate action sequence |
| `question_type` | yes | Controlled allowlisted question type |
| `reference_id` | conditional | Producer/category identifier when applicable |
| `threshold` | conditional | Approved ABV/IBU threshold when applicable |
| `answer` | yes | Server-derived boolean answer |
| `asked_by_participant_id` | yes | Server-derived authenticated guesser |
| `uniqueness_key` | yes | Diagnostic/action identity; repeated-question policy is enforced against committed rows server-side |
| `idempotency_key` | yes | Stable retry identity |
| `action_state` | yes | `pending`, `committed`, or `discarded` |
| `committed_round_version` | nullable until committed | Round version that durably accepted the action |
| `created_at` | yes | Server timestamp |

Approved base `question_type` values:

- `producer`
- `category`
- `abv_at_least`
- `ibu_at_least`
- `collaboration`

The base question collection contains no rating-history predicate, rating ID, cellar ID or private account-data reference. Provider uniqueness must not make stale `pending`/`discarded` rows block a later valid committed question; the server's exclusive round reservation and committed-row duplicate check are authoritative.

## Action reconciliation protocol

Question and guess writes use the following durable sequence:

1. authenticate the participant and validate the current round/version;
2. compare-and-set the round from version `N` to `N+1`, storing `pending_action_key` and `pending_action_type` without incrementing turn/scoring counters;
3. create the child action as `pending` using that idempotency key;
4. compare-and-set the reserved round from `N+1` to `N+2`, applying the turn/scoring result, clearing pending fields and storing `last_action_key` / `last_action_type`;
5. mark the child `committed` and record the accepted round version; and
6. return success only after the committed child can be re-read.

Recovery rules:

- if child creation reports failure but the child can be found by idempotency key, continue reconciliation rather than creating another row;
- if no child was persisted, roll back the empty reservation without incrementing the gameplay turn;
- if round finalisation succeeded but marking the child committed failed, the next read/retry promotes the matching `pending` child using `last_action_key` / `last_action_type`;
- a pending child that does not match the active reservation or last finalised action is discarded and never projected;
- a second device cannot reserve the same round version while another reservation exists; and
- retries of a committed idempotency key return the existing action/round without another turn or score.

## Provider permission boundary

The application server is the only supported caller of these collections. Browser code uses the same-origin Pourfolio API and must never receive provider credentials.

Provider permissions and server policy must jointly ensure:

- only series participants can retrieve a series or its rounds;
- only the selector can create the protected beer choice for the round they select;
- only the guesser can write question/guess actions;
- the guesser cannot directly query the provider collection to obtain `selected_product_id`;
- arbitrary users cannot enumerate series, rounds, questions or guesses belonging to other participants; and
- deleted/archived data follows the approved retention policy once that policy is adopted.

## Migration and certification gate

Before setting `BREW_DONE_IT_POLICY_ENABLED=true` in any user-facing environment:

1. create the four collections with the documented fields and uniqueness constraints;
2. retain a schema export proving field names/types/indexes/relationships;
3. run disposable two-account fixtures through create, join, resume, question, incorrect guess, correct guess, role swap and next-round flows;
4. inspect the guesser's raw HTTP responses and prove no secret-product data is present before terminal state;
5. retry identical mutations and prove row/score counts remain unchanged;
6. send stale versions from a second device and prove they fail with a safe conflict;
7. inject failures after reservation, after child persistence and after round finalisation, then prove reconciliation produces either one committed action or zero committed actions with no invented turn;
8. verify `pending` and `discarded` action rows are never projected as gameplay history;
9. verify aggregate statistics reconcile exactly to terminal round rows;
10. clean up disposable fixtures and retain redacted evidence; and
11. review retention/deletion and accessibility evidence before route/navigation enablement.

Until those steps are complete, the collections remain in `DEFERRED_COLLECTIONS`, the browser route remains absent, and the server policy remains fail-closed.
