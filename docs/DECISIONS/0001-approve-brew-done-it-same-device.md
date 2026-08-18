# 0001: Approve Brew Done It as a same-device game

- Status: Accepted
- Date: 2026-07-29

## Context

Pourfolio's launch boundary intentionally defers social features because remote interaction introduces identity, invitation, moderation, privacy, retention and authorisation obligations. Brew Done It was proposed as a beer-discovery guessing game, but its play model, invitation rules, question input and data lifecycle had not been decided. Exposing an ambiguous prototype would make the launch boundary misleading and could present simulated social behaviour as production functionality.

## Decision

We approve a constrained, authenticated Brew Done It discovery route and a future playable slice as **two-player, same-device play**. It is not live multiplayer or asynchronous. The second, physically present player does not need an account or Drinking Buddy relationship; consequently this decision creates no invitation capability and approves no Drinking Buddies or chat surface.

The game will use secrets and guesses selected from the live beer catalogue and yes/no questions selected from a controlled, reviewed question bank. Round state and aggregate statistics remain in React memory for the browser session and must not use `localStorage` or a backend collection. Refreshing or signing out clears both. The complete behavioural gate, including scoring, completion, abandonment and rematches, is recorded in `docs/PRODUCT.md`.

The protected, lazy-loaded `/brew-done-it` route may initially publish the approved format and delivery status. Interactive game controls may be enabled only in a separately reviewed delivery after every product acceptance criterion is implemented and tested. This makes the decision discoverable without pretending that unfinished gameplay succeeds.

## Consequences

- The route remains inside the authenticated application shell and its bundle is loaded only when requested.
- The route is an explicitly approved exception to the deferred-feature boundary, but Drinking Buddies, invitations, chat, presence, remote turns and persistent social statistics remain deferred.
- No schema or NoCodeBackend permission change is required for the information-only route or session-only implementation.
- A later remote or persistent version requires a new product review, threat model, server-side ownership policy, retention/deletion design, schema mapping and architecture decision.
- The controlled question bank can be reviewed for safety and accessibility; unrestricted user-generated questions are out of scope.

## Alternatives considered

- **Live multiplayer:** rejected for now because realtime presence, authenticated opponents, reconnection and abuse controls exceed the launch boundary.
- **Asynchronous play:** rejected for now because durable rounds, notifications, expiry and per-player authorisation require new persistent data and policy.
- **Require Drinking Buddies:** rejected because it would reactivate a deferred social graph merely to support a local game.
- **Unrestricted typed questions:** rejected because moderation and safety requirements are disproportionate to the first slice.
- **Keep the feature entirely hidden:** rejected because the reviewed, honest rules page can validate interest without exposing incomplete controls or fabricated behaviour.

## Links

- [Product definition and acceptance criteria](../PRODUCT.md#brew-done-it-accepted-same-device-game-currently-contained)
- [Launch readiness](../LAUNCH_READINESS.md)
- [Security boundary](../SECURITY.md)