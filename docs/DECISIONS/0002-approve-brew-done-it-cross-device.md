# 0002: Approve Brew Done It as a persistent cross-device challenge

- Status: Accepted for cross-device architecture; interaction/scoring portions superseded
- Date: 2026-09-11
- Supersedes: [ADR 0001](0001-approve-brew-done-it-same-device.md)
- Partially superseded by: [ADR 0005](0005-adopt-brew-done-it-deduction-board.md)

## Supersession note

ADR 0005 is authoritative for Brew Done It conversation, deduction-board behaviour, brewery/style outcomes, rating-history clue consent and scoring version 3.0.0. This ADR remains authoritative for the persistent two-account/two-device series model, secret-beer privacy, invitation/resume behaviour, role rotation, server-authoritative state, optimistic concurrency/idempotency and production containment.

Any earlier text or implementation based on controlled server questions, question penalties, exact-beer-only outcomes or scoring version 2.0.0 is historical and must not be used as the current gameplay contract.

## Context

Brew Done It is a social beer-discovery challenge played by two authenticated Pourfolio users on different devices and potentially over an extended period. ADR 0001 constrained the game to same-device, session-memory play, which did not match the intended feature.

One user privately chooses a beer and sends a challenge to another user. The challenged user attempts to identify the hidden answer without receiving the secret beer identity. Individual rounds may take place asynchronously, and completed rounds contribute to persistent head-to-head statistics across repeated play over days, weeks or longer.

## Decision retained by this ADR

We approve Brew Done It as an authenticated, persistent, cross-device challenge game.

### Player and series model

- A Brew Done It **series** is the durable head-to-head relationship between two authenticated participants.
- A **round** is one secret beer challenge within that series.
- One participant is the selector and privately chooses a beer from the canonical Pourfolio catalogue.
- The other participant is the guesser and must not receive the selected beer identity until the round is terminal.
- Repeated rounds remain part of the persistent series rather than producing disposable session-only statistics.
- After each completed or forfeited round, selector and guesser roles swap for the next round by default.
- Refresh, sign-out, elapsed time and another device must not erase accepted series, round state or scoring history.

### Challenge creation and joining

The first delivery may use a shareable challenge identifier/code or link. A later in-app user picker or notification surface may complement that transport without changing the series/round model.

The selector chooses the secret beer before the invitation is shared. The server stores that beer as protected round state. Invitation payloads may identify the series and carry a join credential but must not expose the beer to the joining participant.

Waiting invitations expire. Accepted series persist until explicitly archived or removed under an approved retention/deletion policy.

### Secret-beer privacy boundary

The selected beer is server-protected state. During an active round:

- the selector may receive the selected product identifier and approved selector-only answer information;
- the guesser must not receive `selected_product_id` or an equivalent secret field;
- API payloads for the guesser must not add product/producer/category information that directly reveals the answer;
- correctness and score are calculated server-side; and
- only after a round becomes completed or forfeited may the secret beer be returned to both participants.

Hiding a field in React is insufficient. The guesser's HTTP response itself must exclude the secret.

### Persistence, concurrency and replay

State-changing requests use server-authorised participant roles, optimistic version checks and idempotency keys. A stale or replayed request must not create an additional accepted action, round, penalty or score award.

The server remains authoritative for participant identity, role, protected answer, formal action sequence, correctness, scoring and terminal state. Ambiguous provider writes must be recoverable without inventing gameplay state.

### Containment and provider rollout

This decision approves the persistent product architecture but does not claim the required provider collections are deployed.

Brew Done It remains absent from production navigation and playable routing while its NoCodeBackend schema is deferred. `BREW_DONE_IT_POLICY_ENABLED` remains unset in normal production configuration. Contained implementation code may merge provided disabled requests fail closed before provider access.

Production enablement requires the capability-specific gates in [`../BREW_DONE_IT_READINESS.md`](../BREW_DONE_IT_READINESS.md), including connected provider schema/permission evidence, raw-response secret protection, two-account/two-device resume, concurrency/recovery, retention and accessibility evidence, followed by a separately reviewed enablement change.

## Consequences

- ADR 0001 remains fully superseded.
- ADR 0005 defines the current deduction-game interaction and scoring model.
- Persistent Brew Done It tables are an approved target capability but remain deferred until provider migration evidence promotes them.
- Authentication, invitations, idempotency, optimistic versioning, participant projection and asynchronous resume remain foundational requirements.
- A completed round does not complete the series; the series remains available for later rounds and cumulative records.

## Links

- [Current gameplay decision — ADR 0005](0005-adopt-brew-done-it-deduction-board.md)
- [Product definition and acceptance criteria](../PRODUCT.md#brew-done-it--persistent-cross-device-deduction-game-currently-contained)
- [Brew Done It schema target](../nocodebackend/brew-done-it-schema-target.md)
- [Brew Done It readiness](../BREW_DONE_IT_READINESS.md)
- [Launch readiness](../LAUNCH_READINESS.md)
- [Security](../SECURITY.md)
