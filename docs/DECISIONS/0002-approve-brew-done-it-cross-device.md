# 0002: Approve Brew Done It as a persistent cross-device challenge

- Status: Accepted
- Date: 2026-09-11
- Supersedes: [ADR 0001](0001-approve-brew-done-it-same-device.md)

## Context

Brew Done It is intended to be a social beer-discovery challenge played by two authenticated Pourfolio users on different devices and potentially over an extended period. ADR 0001 constrained the game to same-device, session-memory play. The owner has clarified that this does not match the intended feature.

The desired behaviour is that one user privately chooses a beer, sends a challenge to another user, and the challenged user attempts to identify the beer without receiving the secret beer identity. Individual beer challenges may take place asynchronously. Completed rounds contribute to persistent scoring and head-to-head statistics across repeated play over days, weeks or longer.

The repository already retains a remote-game prototype with authenticated participants, invitations, persistence, optimistic versioning and idempotency. Some of those mechanics remain useful, but its shared-rating-history questions, fixed one-game/one-round lifecycle and legacy scoring contract do not define the approved product.

## Decision

We approve Brew Done It as an authenticated, persistent, cross-device challenge game.

### Player and series model

- A Brew Done It **series** represents the durable head-to-head relationship between two authenticated participants.
- A **round** represents one secret beer challenge within that series.
- One participant is the selector for a round and privately chooses a beer from the canonical Pourfolio catalogue.
- The other participant is the guesser and must not receive the selected beer identity until the round is terminal.
- Repeated rounds remain part of the persistent series rather than creating disposable session-only statistics.
- After each completed or forfeited round, selector and guesser roles swap for the next round by default.
- Refresh, sign-out, elapsed time and use of another device must not erase accepted series, round state, guesses, questions or scoring.

### Challenge creation and joining

The first delivery may use a shareable challenge identifier/code or link to connect the second authenticated participant. A later in-app user picker or notification surface may replace or complement that transport without changing the series/round model.

The selector chooses the secret beer before the invitation is shared. The server stores that beer as protected round state. The invitation response may identify the series and carry a join credential, but it must not expose the beer to the joining participant.

Waiting invitations expire. Accepted series persist until explicitly archived or removed under an approved retention/deletion policy.

### Guessing and questions

The core guess is an exact catalogue beer. Brewery- or style-only submissions do not count as beer guesses.

The base game may provide controlled yes/no questions derived from public catalogue facts such as producer, category, ABV threshold, IBU threshold or collaboration status. These questions are evaluated by the server against the hidden beer and return only the controlled answer. They must not inspect either participant's rating history, cellar, account data or social relationships.

Unrestricted free-text questions are not part of the approved base game.

### Round scoring

Scoring rules are versioned and server-derived. For scoring version 2.0.0:

- a correct beer guess starts at 10 points;
- each earlier controlled question in that round costs 1 point;
- each earlier incorrect beer guess costs 1 point;
- the round score is clamped to 0–10;
- a round ending without a correct beer guess awards 0 points.

The server stores the completed round score and its scoring-rules version. Client-supplied totals, correctness or score fields are not authoritative.

### Long-term scoring

Persistent statistics are derived from completed round records. At minimum the product reports:

- number of persistent series;
- completed rounds;
- rounds played as guesser;
- correct beer guesses;
- total points earned as guesser;
- average points per guessing round; and
- head-to-head points and completed rounds against each opponent.

Round records remain the scoring ledger. Aggregate totals must be derived or independently reconcilable from that ledger so request replay cannot add points twice.

### Secret-beer privacy boundary

The selected beer is server-protected state. During an active round:

- the selector may receive the selected product identifier;
- the guesser must not receive `selected_product_id` or an equivalent secret field;
- API payloads for the guesser must not include a product name, producer/category identity or other server-added field that directly reveals the answer;
- correctness is calculated server-side;
- only after a round becomes completed or forfeited may the secret beer be returned to both participants.

Hiding a field in React is insufficient. The guesser's HTTP response itself must exclude the secret.

### Persistence, concurrency and replay

State-changing requests use server-authorised participant roles, optimistic version checks and idempotency keys. A stale or replayed request must not create an additional round, guess, question or score award.

The server is authoritative for participant identity, role, turn/action sequence, correctness, scoring and terminal state.

### Containment and provider rollout

This decision approves the product and application architecture but does not claim that the required provider collections are deployed.

Brew Done It remains absent from production navigation and routing while its NoCodeBackend schema is deferred. `BREW_DONE_IT_POLICY_ENABLED` remains unset in normal production configuration. The application may merge contained implementation code provided the disabled route fails closed before provider access.

Production enablement requires, at minimum:

1. governed creation/certification of the persistent Brew Done It collections and indexes;
2. participant-scoped provider permissions or an equivalent server-only enforcement boundary;
3. connected tests proving the guesser never receives the secret before completion;
4. cross-device create/join/resume/guess/complete/next-round evidence;
5. idempotency and stale-version evidence;
6. retention/deletion behaviour for games and round history;
7. keyboard and WCAG 2.2 AA evidence for the enabled UI; and
8. a separately reviewed change that adds the route/navigation and enables the policy flag.

## Consequences

- ADR 0001 is superseded and its same-device/session-memory rules are historical only.
- Persistent Brew Done It tables are an approved target capability but remain deferred until provider migration evidence promotes them.
- Existing remote prototype concepts such as authentication, invitations, idempotency and version checks may be reused after alignment with this ADR.
- Shared-rating-history question logic is not part of the approved base game and must remain unreachable or be removed.
- A completed round does not complete the series. The series remains available for future rounds and cumulative scoring.
- The frontend must support asynchronous waiting/resume states rather than assuming both players are simultaneously online.

## Alternatives considered

- **Same-device session game:** rejected because it does not match the intended user experience or persistent competition model.
- **One disposable game per beer:** rejected because it fragments the long-term head-to-head score and makes repeated play harder to resume.
- **Expose the selected beer and hide it only in the UI:** rejected because the challenged user's device could inspect the response and reveal the answer.
- **Use private rating history as the question source:** rejected for the base game because it is unnecessary to the guessing mechanic and expands the privacy boundary.

## Links

- [Product definition and acceptance criteria](../PRODUCT.md#brew-done-it--persistent-cross-device-challenge-currently-contained)
- [Brew Done It schema target](../nocodebackend/brew-done-it-schema-target.md)
- [Launch readiness](../LAUNCH_READINESS.md)
- [Security](../SECURITY.md)
