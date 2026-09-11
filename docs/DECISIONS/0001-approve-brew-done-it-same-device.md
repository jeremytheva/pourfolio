# 0001: Approve Brew Done It as a same-device game

- Status: Superseded by [ADR 0002](0002-approve-brew-done-it-cross-device.md)
- Date: 2026-07-29
- Superseded: 2026-09-11

## Context

Pourfolio's launch boundary intentionally deferred social features because remote interaction introduces identity, invitation, moderation, privacy, retention and authorisation obligations. Brew Done It was proposed as a beer-discovery guessing game, but its play model, invitation rules, question input and data lifecycle had not been decided. Exposing an ambiguous prototype would make the launch boundary misleading and could present simulated social behaviour as production functionality.

## Historical decision

This ADR originally approved a constrained, authenticated Brew Done It discovery route and a future playable slice as two-player, same-device play with React-session-only state.

That product decision is no longer authoritative. On 2026-09-11 the owner clarified that Brew Done It is intended to be a persistent, different-device challenge between two authenticated Pourfolio users: one player chooses a beer and sends the challenge to another player, the challenged player must not see the selected beer while guessing, and scoring accumulates across rounds over time.

ADR 0002 supersedes this decision and is the authoritative Brew Done It product and architecture decision.

## Historical consequences

The former same-device constraints are retained here only as decision history. They must not be used to design, implement or validate the current Brew Done It feature.

In particular, the following former requirements are withdrawn:

- same-device-only play;
- a physically present unauthenticated second player;
- React-memory-only game state;
- clearing the game and statistics on refresh or sign-out;
- prohibition on persistent game collections;
- prohibition on remote invitations or asynchronous turns.

## Links

- [Superseding ADR 0002](0002-approve-brew-done-it-cross-device.md)
- [Product definition and acceptance criteria](../PRODUCT.md#brew-done-it--persistent-cross-device-challenge-currently-contained)
- [Launch readiness](../LAUNCH_READINESS.md)
- [Security boundary](../SECURITY.md)
