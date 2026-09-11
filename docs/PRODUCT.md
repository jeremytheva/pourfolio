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

## Brew Done It — persistent cross-device deduction game, currently contained

Brew Done It is an approved persistent social deduction game under [ADR 0003](DECISIONS/0003-adopt-brew-done-it-deduction-board.md). ADR 0003 retains the cross-device architecture and security model from [ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md) while superseding its controlled-question and scoring model. The feature is not yet shipped in the launch application: it has no production navigation item or playable route, and the server capability remains fail-closed while the required NoCodeBackend collections are unverified.

### Product model

Two authenticated Pourfolio users play from their own devices. A Brew Done It **series** is the durable head-to-head relationship between those players. A **round** is one secret-beer challenge within that series.

For each round:

1. the selector chooses one secret beer from the canonical Pourfolio catalogue;
2. the challenge is made available to the other authenticated player;
3. the guesser must not receive the secret beer identity while the round is active;
4. the players may ask and answer natural yes/no questions without those questions becoming scored server actions;
5. the guesser records useful answers in a persistent two-sided deduction board for **Brewery** and **Beer / Style**;
6. catalogue-backed deductions narrow candidate breweries, styles and beers;
7. the guesser submits formal brewery, exact-beer and/or style-fallback outcomes when ready;
8. the server determines correctness, formal-submission sequence and score; and
9. the guesser explicitly finishes the round to bank the best achieved outcome.

The primary objective is to identify the brewery and exact beer. Because exact beer identification is not always practical, identifying the beer style/category is an approved fallback.

After a terminal round, selector and guesser roles swap by default for the next round. A completed round does not complete the series. The same two users may continue over days, weeks or longer and their record accumulates across completed rounds.

Refreshing, signing out or moving to another device must not erase an accepted series, its rounds, saved deductions, formal guesses or scoring history.

### Challenge creation and joining

The selector chooses the secret beer before sharing the challenge. The server stores that choice as protected round state.

The beer detail/profile page is an approved selector entry point. It exposes **Play Brew-Done-It** beside the normal beer actions. While the game remains contained, activating this button truthfully explains that play is not yet enabled and performs no Brew Done It API request or game-state persistence. Once a separately reviewed enablement change makes the game route reachable, the button carries the viewed canonical `product.id` into Brew Done It as a reviewable beer preselection. The selector may change it before creating the challenge, and the server must validate the selected product before persisting it.

The initial transport may use a game number plus challenge code or a shareable challenge link. Both participants authenticate. Joining binds the second authenticated account to the persistent series. A later in-app player picker or notification workflow may supplement this transport without changing the series/round model.

Waiting invitations expire. Once joined, the series remains available until an approved archive/deletion action removes it.

### Secret-beer privacy

The secret beer is protected on the server, not merely hidden by React.

During an active round:

- the selector may receive the selected product identifier and a private answer sheet;
- the guesser response must omit `selected_product_id` and equivalent answer fields;
- the guesser must not receive the selector-only answer sheet or history aggregates about the hidden answer;
- the browser cannot submit authoritative correctness or score values; and
- candidate lists contain only data the authenticated guesser is already permitted to use for deduction.

After the round becomes completed or forfeited, the selected beer may be revealed to both players.

### Conversation and deduction board

Conversation is deliberately not a scored game action. The players may ask questions such as:

- Is the brewery in this state or country?
- Have I rated beer from this brewery before?
- Is it this style?
- Is the ABV or IBU above a threshold?
- Is it a collaboration?
- Is it dark?
- Is it barrel aged?

The guesser records useful answers as structured `yes`, `no` or `unknown` deductions. `unknown` never eliminates a candidate. Missing source data must never be silently treated as `no`.

The deduction card has two accessible sides/tabs:

- **Brewery:** location, previous-rating relationship, brewery candidates and formal brewery guess; and
- **Beer / Style:** style, ABV, IBU, collaboration, supported traits, beer candidate count, exact-beer guess and style fallback.

Catalogue-backed deductions automatically narrow candidates. Dark and barrel-aged remain manual notes until reliable structured trait metadata is certified; they must not be inferred from product names.

### Selector answer sheet and history clues

The selector receives a private server projection containing the facts needed to answer questions accurately, including supported brewery location, beer/style, ABV, IBU, collaboration and edition information.

Each participant controls whether their own Pourfolio rating history may be used for game clues. When enabled, the opponent acting as selector may receive aggregate facts about the hidden answer, such as:

- number of ratings and distinct beers from the hidden brewery;
- average weighted rating and last-rated date for that brewery;
- equivalent aggregates for the hidden style; and
- equivalent aggregates for the exact hidden beer.

The selector must not receive the guesser's raw rating list, review notes, cellar data or unrelated account information. Turning history clues off must suppress those aggregates.

### Formal outcomes and scoring

Only formal outcome submissions affect the round score. Scoring version **3.0.0** is:

- correct brewery: 4 points;
- correct exact beer: 6 additional points;
- correct style fallback when the exact beer is not solved: 3 points instead of the exact-beer component;
- minus 1 point for each incorrect formal brewery, beer or style submission; and
- score clamped to 0–10.

A correct exact beer also confirms the brewery. Style fallback does not stack with exact-beer points. Ordinary questions and saved deduction notes are free.

The guesser may finish the round after obtaining the result they consider achievable. Terminal outcomes are `exact_beer`, `style_fallback`, `brewery_only`, `unsolved` or `forfeit`.

The completed round stores the scoring-rules version, total and itemised breakdown. Request replay must not create another formal submission, penalty or score award.

### Persistent statistics

Statistics are derived from completed rounds rather than browser-session state. At minimum the product reports:

- persistent series count;
- completed rounds and rounds played as guesser;
- breweries solved;
- exact beers solved;
- style fallbacks solved;
- total points and average points per guessing round; and
- per-opponent head-to-head points and outcome counts.

The round ledger remains authoritative so aggregates can be recomputed and reconciled.

### Asynchronous states

The product must represent waiting states honestly. A user may close the app and return later while:

- a challenge is waiting to be accepted;
- the other participant is choosing the next beer;
- the guesser is part-way through a deduction board;
- a formal outcome submission is being safely reconciled; or
- a completed round is waiting for the next selector to start another round.

An enabled delivery must let authenticated participants resume their persistent active series without relying on previous browser memory.

### Acceptance criteria before enablement

A playable production delivery must satisfy all of the following before `/brew-done-it`, navigation or the server policy flag is enabled:

- **Two-device identity:** two distinct authenticated accounts participate from separate sessions/devices and cannot impersonate the other role.
- **Beer-profile entry:** Play Brew-Done-It carries the canonical product into challenge creation as a reviewable preselection without creating a challenge automatically or exposing the secret.
- **Secret-first challenge:** the selector chooses a valid catalogue beer before sharing the challenge.
- **Secret projection:** the guesser cannot obtain selected product identity or selector-only clue data from any active-round response.
- **Persistent resume:** both participants can leave, sign back in and resume an accepted series and deduction board on another device.
- **Natural conversation:** no fixed server question list is required for normal play and ordinary questions do not reduce score.
- **Deduction persistence:** `yes`, `no` and `unknown` deductions survive refresh/device changes and missing data is never converted to `no`.
- **Candidate narrowing:** supported brewery/style/ABV/IBU/collaboration deductions narrow only from certified catalogue facts.
- **Trait safety:** dark/barrel-aged or future traits do not auto-filter until their source data is certified.
- **History consent:** rating-history aggregates are selector-visible only when the guesser has enabled that preference, and raw rating/cellar data is not disclosed.
- **Formal outcomes:** brewery, exact beer and style submissions resolve to valid catalogue identifiers; forged correctness/score fields do not alter state.
- **Versioning and replay:** stale writes fail safely and idempotent retries do not create duplicate formal guesses, penalties, rounds or points.
- **Scoring:** version 3.0.0 produces the documented 0–10 outcome score exactly once.
- **Round lifecycle:** explicit completion or forfeit terminates the round and reveals the beer; the persistent series remains active.
- **Role rotation:** the previous guesser becomes selector for the next round by default.
- **Long-term statistics:** terminal rounds reconcile to durable overall/head-to-head brewery, exact-beer, style and point totals.
- **Expiry/archive:** waiting challenges expire safely and an active series can only be archived when it has no live round.
- **Accessibility:** enabled flows pass keyboard, focus, status-announcement and WCAG 2.2 AA evidence.
- **Provider evidence:** the required collections, version/idempotency fields, privacy projections and permissions are verified in the connected provider environment.

### Current containment

The source may contain the approved future implementation while the feature remains disabled. Production containment remains mandatory until provider schema and connected evidence are complete:

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