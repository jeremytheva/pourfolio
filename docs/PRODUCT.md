# Product

## Launch outcome

Pourfolio’s first public release is a reliable beer portfolio:

- authenticate and maintain a display profile;
- search the live beer product catalogue;
- open a stable product route;
- submit a structured 1–7 rating;
- review and delete personal rating history;
- add, edit and remove private cellar records.

Ratings and cellar records do not require a sharing series or edition.

## Deferred until a real supported workflow exists

- wine, spirits, cider, mead and other rating modes;
- chat and Drinking Buddies;
- events and venues;
- analytics;
- producer claims and producer administration;
- platform administration and moderation dashboards;
- social cellar sharing;
- privacy controls not enforced by backend permissions;
- photo upload.

Deferred modules may remain as prototype source for future research, but they are not reachable or bundled by launch routing and must not show fake success, statistics or user data.

## Brew Done It — approved same-device game

The product review recorded in [ADR 0001](DECISIONS/0001-approve-brew-done-it-same-device.md) approves **same-device play only**. Brew Done It is neither live multiplayer nor asynchronous: two authenticated adults share one device and pass it between turns. The first production slice is deliberately local to the current React session. It does not create a social graph, send invitations or persist game activity.

There is no remote invitation flow. The signed-in player may play with any consenting adult who is physically present; the second player does not need a Pourfolio account and an existing Drinking Buddy relationship is not required. Drinking Buddies, chat and remote play remain deferred.

Questions are selected from a controlled, reviewed question bank and answered **yes** or **no**. Free-typed questions are not permitted. Secret beers must be selected from the live beer catalogue rather than entered as arbitrary text.

### Acceptance criteria

A playable production delivery must satisfy all of the following criteria before its controls are enabled:

- **Round creation:** an authenticated player can start a two-player, same-device round, provide distinct display names and see a clear pass-the-device privacy prompt; creating a round makes no server write.
- **Beer selection:** each player privately selects one secret beer from the live beer catalogue; the opponent cannot reveal that choice before the round completes.
- **Turn order:** the creator chooses who starts, turns then alternate, and the current player and hand-off state are always announced visibly and to assistive technology.
- **Yes/no questions:** on a turn, a player selects one unused question from the controlled question bank and the opponent records only “yes” or “no”; the question and answer remain visible in the round history.
- **Guesses:** instead of asking a question, the current player may make one catalogue-backed beer guess; an incorrect guess ends that turn and a correct guess completes the round.
- **Scoring:** every completed round uses the versioned, UI-independent scoring contract below. The calculation, version and itemised inputs are shown at completion and a draw awards zero points.
- **Completion:** the round completes on a correct guess or, after 20 total turns without one, as a draw; both secret beers are then revealed and no further turns can be recorded.
- **Abandonment:** either player can abandon after a confirmation; the round ends with no winner and zero points, and abandoned activity is not counted in statistics.
- **Rematches:** after completion, both players can start a rematch with names and starting player swapped, cleared secrets/history and no information carried across except the session statistics.
- **Statistics:** the page reports completed rounds, wins and points for the current in-memory session only; it labels those statistics as session-only, excludes abandoned rounds and clears them on refresh or sign-out.

The initial protected route may explain these reviewed rules while the interactive controls remain unavailable. Enabling play is a separate delivery that must demonstrate every criterion above, catalogue-data validation, accessibility, and tests. It must not substitute mock players, beer choices, outcomes or statistics.

### Scoring contract v1.0.0

This contract is authoritative for persisted game rounds and is independent of
how a future UI presents guesses. Inputs are canonical catalogue IDs only:
`products.id` for beer, `producers.id` for brewery and `categories.id` for
style. Style accuracy uses the explicitly maintained `categories.parent_id`
hierarchy. An exact style ID earns exact credit; parent/child styles and styles
with the same non-null direct parent are related. All other styles are
unrelated. Names, free-text labels, spelling, fuzzy matching and inferred
similarity are never scoring inputs.

| Item | v1.0.0 score |
| --- | ---: |
| Exact beer | +10 points and immediately completes the round |
| Exact brewery | +5 points, awarded once |
| Exact style | +3 points, awarded once |
| Related style | +1 point, awarded once instead of exact-style credit |
| Incorrect accepted guess | −1 point |
| Controlled yes/no question | −1 point |

A round permits six accepted guesses and six controlled questions. A duplicate
is the same guess type and canonical ID used earlier in the round: it earns
nothing, costs nothing and does not consume an attempt; the gateway rejects it
rather than storing it. Once a brewery or style award has been earned, that
dimension cannot award more points. A beer match or the sixth accepted guess
completes the round. Activity supplied after completion is ignored by the pure
calculator and rejected by the gateway.

The raw total is awards minus question costs and incorrect-guess penalties. The
round total is clamped to 0–18 inclusive. Thus three exact matches without a
question score the maximum 18; penalties and costs can never produce a negative
stored total. For a multi-round match, rank by (1) rounds won, (2) total points,
(3) fewer accepted guesses across completed rounds and (4) fewer questions.
Players still equal after all four measures share the placing; timestamps,
request order and lexical names never break a tie.

Every completed persistent round stores `scoring_rules_version`, the final
`awarded_points`, and the itemised award/penalty/question breakdown calculated
by the server. A rules change requires a new version; statistics sum each
historical stored result and must not recalculate old rounds under new rules.

## Launch quality bar

The product must never:

- offer privileged roles during public sign-up;
- infer immutable identity from email;
- allow the browser to choose record ownership or rating totals;
- store private cellar records only in browser storage;
- show demonstration content as production data;
- report a simulated success for a failed or unimplemented write.

The complete release decision is in [Launch Readiness](LAUNCH_READINESS.md).
