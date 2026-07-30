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

## Brew Done It — accepted same-device game, currently contained

Brew Done It is not shipped in the launch application. It has no navigation
item or route, and a direct request returns to the authenticated home screen
without loading game code or calling a game API. The retained remote,
persistent implementation does not match the accepted decision and must remain
unreachable until a superseding ADR and separately reviewed delivery approve a
product model, privacy boundary and data lifecycle.

These are three distinct states and must not be conflated:

1. **Current containment:** no Brew Done It route or controls are shipped.
2. **Accepted model:** ADR 0001 permits a separately delivered, session-memory,
   same-device game with no remote or persistent behaviour.
3. **Unapproved proposal:** retained two-account and persistent implementation
   code is research material only and cannot be enabled or treated as a product
   requirement until a superseding ADR is accepted.

### Accepted same-device contract

The product review recorded in [ADR 0001](DECISIONS/0001-approve-brew-done-it-same-device.md) approves **same-device play only**. Brew Done It is neither live multiplayer nor asynchronous: one authenticated player and a second, physically present adult share one device and pass it between turns. The first production slice is deliberately local to the current React session. It does not create a social graph, send invitations or persist game activity.

There is no remote invitation flow. The signed-in player may play with any consenting adult who is physically present; the second player does not need a Pourfolio account and an existing Drinking Buddy relationship is not required. Drinking Buddies, chat and remote play remain deferred.

Questions are selected from a controlled, reviewed question bank and answered **yes** or **no**. Free-typed questions are not permitted. Secret beers must be selected from the live beer catalogue rather than entered as arbitrary text.

The question bank for the accepted model uses catalogue facts only. It must not
inspect either person's rating history, cellar, account, relationships or other
private records. Every secret, answer, question, guess, score and statistic
exists only in React memory for the current browser session. The implementation
must not write game data to a backend, browser persistence (including
`localStorage`) or analytics. Refresh and sign-out clear the round and all game
statistics.

### Acceptance criteria

A playable production delivery must satisfy all of the following criteria before its controls are enabled:

- **Round creation:** an authenticated player can start a two-player, same-device round, provide distinct display names and see a clear pass-the-device privacy prompt; creating a round makes no server write.
- **Beer selection:** each player privately selects one secret beer from the live beer catalogue; the opponent cannot reveal that choice before the round completes.
- **Turn order:** the creator chooses who starts, turns then alternate, and the current player and hand-off state are always announced visibly and to assistive technology.
- **Yes/no questions:** on a turn, a player selects one unused question from the controlled question bank and the opponent records only “yes” or “no”; the question and answer remain visible in the round history.
- **Guesses:** instead of asking a question, the current player may make one catalogue-backed beer guess; an incorrect guess ends that turn and a correct guess completes the round.
- **Scoring:** the session-memory calculator awards 10 points for a correct beer guess and subtracts 1 point for each earlier question or incorrect guess by that player, clamped to 0–10; the calculation and itemised inputs are shown at completion, and a draw awards zero points to both players. No score is stored remotely or in browser persistence.
- **Completion:** the round completes on a correct guess or, after 20 total turns without one, as a draw; both secret beers are then revealed and no further turns can be recorded.
- **Abandonment:** either player can abandon after a confirmation; the round ends with no winner and zero points, and abandoned activity is not counted in statistics.
- **Rematches:** after completion, both players can start a rematch with names and starting player swapped, cleared secrets/history and no information carried across except the session statistics.
- **Statistics:** the page reports completed rounds, wins and points for the current in-memory session only; it labels those statistics as session-only, excludes abandoned rounds and clears them on refresh or sign-out.

The initial protected route may explain these reviewed rules while the interactive controls remain unavailable. Enabling play is a separate delivery that must demonstrate every criterion above, catalogue-data validation, accessibility, and tests. It must not substitute mock players, beer choices, outcomes or statistics.

### Unapproved remote and persistent proposal

The repository retains an earlier proposal for a different product: two
authenticated accounts create or join persisted rounds through invitations and
may query narrowly disclosed shared rating-history predicates after bilateral
consent. That proposal also includes stored, versioned scoring and itemised
breakdowns; multi-round ranking and durable aggregate statistics; waiting-game
expiry; completed-game retention and deletion; and remote authorisation,
blocking, rate-limit and replay requirements.

None of those requirements is authoritative for the accepted same-device
model. In particular, the accepted model has no second authenticated account,
invitation, shared-history query, backend round, stored score, durable
statistics or retention schedule. Retained client, service, gateway and policy
test code for those behaviours must remain unreachable and fail closed.

The remote proposal cannot be implemented or enabled until a superseding ADR
is accepted following product and privacy review. That decision must define the
threat model, server-side ownership and consent policy, scoring contract,
retention and deletion lifecycle, schema mapping, migration/rollout approach,
abuse controls, accessibility criteria and connected-environment tests.

## Launch quality bar

The product must never:

- offer privileged roles during public sign-up;
- infer immutable identity from email;
- allow the browser to choose record ownership or rating totals;
- store private cellar records only in browser storage;
- show demonstration content as production data;
- report a simulated success for a failed or unimplemented write.

The complete release decision is in [Launch Readiness](LAUNCH_READINESS.md).
