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

## Brew Done It — persistent cross-device challenge, currently contained

Brew Done It is an approved persistent social game under [ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md), but it is not yet shipped in the launch application. It has no production navigation item or route, and the server capability remains fail-closed while the required NoCodeBackend collections are unverified. ADR 0001's same-device/session-memory model is superseded and must not be used as the current product contract.

### Product model

Two authenticated Pourfolio users play from their own devices. A Brew Done It **series** is the durable head-to-head relationship between those two players. A **round** is one beer challenge within that series.

For each round:

1. the selector chooses one secret beer from the canonical Pourfolio catalogue;
2. the challenge is made available to the other authenticated player;
3. the guesser must not receive the selected beer identity while the round is active;
4. the guesser may ask controlled catalogue questions and submit catalogue-backed beer guesses;
5. the server determines answers, correctness, action sequence and score;
6. the round ends on a correct beer guess, the action limit or a forfeit; and
7. the completed score is retained as part of the persistent series record.

After a terminal round, selector and guesser roles swap by default for the next round. A completed round does not complete the series. The same two users may continue playing over days, weeks or longer and their scores accumulate across completed rounds.

Refreshing, signing out or moving to another device must not erase an accepted series, its rounds, questions, guesses or scoring history.

### Challenge creation and joining

The selector chooses the secret beer before sharing the challenge. The server stores that choice as protected round state.

The beer detail/profile page is an approved selector entry point. It exposes **Play Brew-Done-It** beside the normal beer actions. While the game remains contained, activating this button truthfully explains that play is not yet enabled and performs no Brew Done It API request or game-state persistence. Once the separately reviewed enablement change makes the game route reachable, the button must carry the viewed canonical `product.id` into Brew Done It as the selector's initial beer preselection. The selector must be able to review or change that beer before creating the challenge, and the server must still validate the submitted product before persisting it as protected round state.

The initial supported transport may use a game number plus challenge code or a shareable challenge link. Both participants must authenticate. Joining binds the second authenticated account to the persistent series. A later in-app player picker or notification workflow may replace or supplement the shareable-code transport without changing the series/round model.

Waiting invitations expire. Once joined, the persistent series remains available until an approved archive/deletion action removes it.

### Secret-beer privacy

The secret beer is protected on the server, not merely hidden by React.

During an active round:

- the selector may receive the selected product identifier;
- the guesser response must omit `selected_product_id` and equivalent answer fields;
- the server must not add product, producer, category or other fields that directly reveal the answer to the guesser;
- the browser cannot submit authoritative correctness or score values; and
- catalogue questions return only their controlled answer and non-secret question metadata.

After the round becomes completed or forfeited, the selected beer may be revealed to both players.

### Questions and guesses

A guess is an exact beer selected from the canonical catalogue. Brewery-only and category/style-only submissions are not beer guesses.

Controlled yes/no questions may use public catalogue facts. The approved base question types are:

- producer/brewery;
- beer category;
- ABV threshold;
- IBU threshold; and
- collaboration status.

Questions must not inspect either player's rating history, cellar, account data or relationships. The retained shared-rating-history prototype is not part of the approved base game. Free-text questions are not approved for the first delivery.

### Round scoring

Scoring is versioned and calculated by the server. Scoring version 2.0.0 is:

- 10 starting points for a correct beer guess;
- minus 1 point for each earlier controlled question in that round;
- minus 1 point for each earlier incorrect beer guess in that round;
- clamped to 0–10 points; and
- 0 points when the round ends without a correct beer guess.

The completed round stores the scoring-rules version, total and itemised penalty breakdown. Request replay must not create another score award.

### Persistent statistics

Statistics are derived from completed persistent rounds rather than browser-session state. At minimum the product reports:

- persistent series count;
- completed rounds;
- rounds played as guesser;
- correct beer guesses;
- total points earned;
- average points per guessing round; and
- per-opponent head-to-head completed rounds, points for/against and correct guesses.

The round ledger remains authoritative so aggregates can be recomputed and reconciled.

### Asynchronous states

The product must represent waiting states honestly. A user may close the app and return later while:

- a challenge is waiting to be accepted;
- the other participant is choosing the next beer;
- the guesser has not yet taken another action; or
- a completed round is waiting for the next selector to start another round.

An enabled delivery must provide a way for authenticated participants to resume their persistent active series without relying on previous browser memory.

### Acceptance criteria before enablement

A playable production delivery must satisfy all of the following before `/brew-done-it`, navigation or the server policy flag is enabled:

- **Two-device identity:** two distinct authenticated accounts can participate from separate browser/device sessions and neither can impersonate the other role.
- **Beer-profile entry:** Play Brew-Done-It on a beer profile carries that canonical product into the create-challenge screen as a reviewable preselection without creating a challenge automatically or exposing the secret to the opponent.
- **Secret-first challenge:** the selector chooses a valid catalogue beer before the challenge is shared.
- **Secret projection:** the challenged user cannot obtain the selected product identifier or equivalent answer data from any active-round response.
- **Persistent resume:** both participants can leave, sign back in and resume an accepted series from another session/device.
- **Controlled questions:** only reviewed catalogue-backed question types are accepted and answers are calculated server-side.
- **Beer-only guesses:** guesses resolve to valid catalogue products; duplicates and forged score/correctness fields do not alter authoritative state.
- **Versioning and replay:** stale writes fail safely and idempotent retries do not create duplicate questions, guesses, rounds or points.
- **Scoring:** version 2.0.0 produces the documented 0–10 round score and persists the completed score exactly once.
- **Round lifecycle:** a correct guess, action-limit completion or forfeit produces a terminal round and reveals the beer; the persistent series remains active.
- **Role rotation:** the previous guesser becomes selector for the next round by default.
- **Long-term statistics:** completed round records reconcile to durable overall and head-to-head statistics across multiple sessions.
- **Expiry/archive:** waiting challenges expire safely and an active series can only be archived when it has no live round.
- **Accessibility:** enabled flows pass keyboard, focus, status-announcement and WCAG 2.2 AA evidence.
- **Provider evidence:** the required collections, uniqueness/version fields and permissions are verified in the connected provider environment.

### Current containment

The source may contain the approved future implementation while the feature remains disabled. Production containment remains mandatory until the provider schema and connected evidence are complete:

- no application route or navigation item;
- no playable Brew Done It frontend code in the production browser bundle;
- the beer-profile Play Brew-Done-It entry point remains informational only and makes no game request;
- `BREW_DONE_IT_POLICY_ENABLED` unset in normal deployment configuration; and
- disabled API requests return the ordinary application 404 before provider access.

The persistent schema target is documented in [Brew Done It schema target](nocodebackend/brew-done-it-schema-target.md).

## Launch quality bar

The product must never:

- offer privileged roles during public sign-up;
- infer immutable identity from email;
- allow the browser to choose record ownership or rating totals;
- store private cellar records only in browser storage;
- show demonstration content as production data;
- report a simulated success for a failed or unimplemented write.

The complete release decision is in [Launch Readiness](LAUNCH_READINESS.md).