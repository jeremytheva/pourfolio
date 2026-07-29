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
- **Scoring:** the winner receives `max(1, 10 - questions asked by the winner - incorrect guesses by the winner)` points; the calculation and its inputs are shown at completion and a draw awards zero points.
- **Completion:** the round completes on a correct guess or, after 20 total turns without one, as a draw; both secret beers are then revealed and no further turns can be recorded.
- **Abandonment:** either player can abandon after a confirmation; the round ends with no winner and zero points, and abandoned activity is not counted in statistics.
- **Rematches:** after completion, both players can start a rematch with names and starting player swapped, cleared secrets/history and no information carried across except the session statistics.
- **Statistics:** the page reports completed rounds, wins and points for the current in-memory session only; it labels those statistics as session-only, excludes abandoned rounds and clears them on refresh or sign-out.

The initial protected route may explain these reviewed rules while the interactive controls remain unavailable. Enabling play is a separate delivery that must demonstrate every criterion above, catalogue-data validation, accessibility, and tests. It must not substitute mock players, beer choices, outcomes or statistics.

## Launch quality bar

The product must never:

- offer privileged roles during public sign-up;
- infer immutable identity from email;
- allow the browser to choose record ownership or rating totals;
- store private cellar records only in browser storage;
- show demonstration content as production data;
- report a simulated success for a failed or unimplemented write.

The complete release decision is in [Launch Readiness](LAUNCH_READINESS.md).
