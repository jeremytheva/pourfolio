# Brew Done It readiness

Status: **application core implemented and contained; current head awaiting deferred validation; provider migration not yet approved or deployed**  
Decision authority: [ADR 0002](DECISIONS/0002-approve-brew-done-it-cross-device.md)  
Schema target: [Brew Done It persistent schema target](nocodebackend/brew-done-it-schema-target.md)

## Purpose

This document is the capability-specific readiness gate for Brew Done It. It supersedes older same-device/session-memory readiness language wherever that language conflicts with ADR 0002.

Brew Done It is approved as a persistent, asynchronous, two-account challenge played across separate devices. Approval of the product/application contract does **not** approve provider schema mutation or production enablement.

## Current state

The contained application core provides:

- authenticated two-player challenge ownership;
- selector-first secret beer choice;
- persistent series and rounds;
- role rotation between rounds;
- beer-only catalogue guesses;
- controlled public-catalogue questions;
- scoring v2 and durable head-to-head statistics;
- viewer-specific response projection that hides `selected_product_id` from the guesser until a round is terminal;
- resumable challenge listing across sessions/devices;
- optimistic versioning and idempotency;
- a durable pending/committed/discarded action ledger for recovery from ambiguous provider failures;
- a contained beer-profile **Play Brew-Done-It** entry point that identifies the viewed beer as the intended future secret selection without adding a game route, game API call or browser-persisted game state; and
- fail-closed server containment plus absent production route/navigation.

The provider-evidenced deployed schema does **not** currently contain the required Brew Done It collections. The feature therefore remains unreachable.

## Autonomous continuation state — 11 September 2026

Active implementation is PR **#410** on `codex/brew-done-it-cross-device`.

The earlier contained-core revision passed canonical repository validation, Browser/accessibility, Dependency Review and CodeQL. Subsequent commits added the beer-profile entry point, its product/readiness contract and the contained `initialProductId` preselection path. Those later commits have **not** inherited the earlier acceptance evidence.

The owner has explicitly directed that validation be deferred while the Vercel Hobby build-rate limit is exhausted. Until that limit resets:

- continue source/documentation work that does not require connected execution when useful;
- do not repeatedly trigger or rely on Vercel preview deployment attempts;
- keep PR #410 in **VALIDATING**, not MERGE READY; and
- do not enable the game route, navigation, provider flag or deferred collections.

The next validation action after the limit resets is to freeze the then-current PR head and run canonical `npm run platform:validate`, Browser/accessibility and relevant diagnostics against that exact revision. Review any real defect, confirm containment, then reassess merge readiness. No earlier exact-head result may be substituted for that validation.

## Beer-profile entry-point contract

The beer detail/profile page is an approved selector entry point for future Brew Done It play.

While the feature remains contained:

- the **Play Brew-Done-It** button is visible and keyboard-operable;
- activating it explains that Brew Done It is not enabled yet and identifies the currently viewed beer as the intended secret-beer selection;
- activation performs no Brew Done It API request;
- activation adds no `/brew-done-it` route dependency; and
- activation stores no game or secret-beer state in `localStorage`, session storage or another browser persistence mechanism.

When the separately reviewed enablement change makes the game route reachable, the same entry point must hand off the canonical current `product.id` as the selector's initial beer choice. The Brew Done It screen must treat that value only as a preselection: the user may review/change it before creating the challenge, and the server must still resolve and validate the submitted catalogue product before persisting protected round state. The beer identity must never be encoded into an invitation or guesser-facing payload.

## Merge boundary

The contained application-core PR may merge when repository validation, review and integration evidence are satisfactory because:

- no production route or navigation item is added;
- `BREW_DONE_IT_POLICY_ENABLED` remains unset;
- Brew Done It collections remain deferred;
- no provider schema/data mutation occurs; and
- existing beer-first launch behaviour is unchanged apart from the truthful contained beer-profile entry point described above.

A failed Vercel preview caused solely by account/build-rate quota is diagnostic rather than an application defect when the exact head independently passes the repository-owned build/browser gates and no deployment-specific defect is evidenced. It does not authorize feature enablement.

## Provider migration gate

Before any Brew Done It collection is created or changed in a connected provider environment, retain an evidence package covering:

1. the exact migration target and field/type/index plan;
2. provider support for each required create/update/filter/compare-and-set behavior;
3. backup/restore or disposable-environment recovery appropriate to the migration;
4. permission design preventing browser/direct-user enumeration and secret-beer disclosure;
5. cleanup procedure for disposable two-account fixtures;
6. rollback/abort criteria; and
7. explicit owner approval for the provider mutation.

Do not infer support for conditional updates, unique constraints or filtered reads from source code alone.

## Required provider collections

The migration must provision and certify:

- `brew_done_it_games`;
- `brew_done_it_rounds`;
- `brew_done_it_guesses`; and
- `brew_done_it_questions`.

Field and recovery semantics are defined in `docs/nocodebackend/brew-done-it-schema-target.md`.

## Connected certification

After migration, use dedicated non-personal test accounts and disposable catalogue fixtures where possible. The connected certification must prove all of the following against an immutable candidate revision.

### Authentication and ownership

- unauthenticated requests fail;
- creator and opponent can access only their own shared series;
- unrelated users cannot enumerate or retrieve another series, round, question or guess;
- creator cannot join their own invitation as opponent;
- browser-supplied participant/role/score/correctness fields are ignored or rejected;
- waiting invitation expiry/cancellation behaves as documented.

### Secret projection

Inspect the **raw HTTP responses**, not only rendered UI:

- selector can see their own selected beer where required;
- guesser receives no `selected_product_id` or equivalent secret identifier while the round is active;
- list/resume/detail endpoints all preserve the same boundary;
- question responses expose only the allowed boolean result and public question descriptor;
- the secret is revealed only after the round is terminal.

### Persistent cross-device flow

Using two authenticated browsers/devices:

1. Player A selects a beer and creates a challenge.
2. Player B accepts the challenge on a separate session/device.
3. Both players sign out/refresh/reopen and the same series resumes.
4. Player B asks controlled questions and submits incorrect then correct beer guesses.
5. The round score reconciles to the documented scoring version.
6. The next round swaps selector/guesser roles.
7. Player B selects the next secret beer and Player A resumes from another session/device.
8. Head-to-head totals reconcile exactly to completed round rows.

### Concurrency and failure recovery

Inject or simulate failures at each durable boundary:

- after round reservation but before child creation;
- after child persistence but before round finalisation;
- after round finalisation but before child commit marker;
- during repeated identical requests;
- during stale requests from a second device.

For every case prove:

- at most one committed logical action exists;
- no uncommitted action consumes a gameplay turn;
- pending/discarded rows are never projected as gameplay history;
- retries recover deterministically by idempotency key;
- stale versions fail with a safe conflict;
- no score is duplicated; and
- a later valid action is not permanently blocked by a discarded recovery row.

### Accessibility and browser evidence

Before enabling the route:

- add `/brew-done-it` to the connected browser test matrix only after the provider migration is available;
- run automated WCAG 2.2 AA checks on challenge list, create/join, active round, completion and error/recovery states;
- verify keyboard-only operation for beer-profile entry, beer selection, controlled questions, guesses, refresh/retry and next-round actions;
- verify live-region/status announcements for the contained beer-profile availability message and, once enabled, join, question answer, guess result, stale conflict and completion;
- manually inspect focus order and screen-reader labels for secret-sensitive states.

## Enablement gate

Only a separate reviewed enablement change may:

- make the existing beer-profile entry point navigate into playable Brew Done It;
- add `/brew-done-it` to application routing;
- add Brew Done It to navigation;
- set or require `BREW_DONE_IT_POLICY_ENABLED=true` in a user-facing environment; or
- promote the Brew Done It collections from deferred to deployed application contract.

That change requires all provider, secret-projection, cross-device, concurrency/failure-recovery, accessibility and cleanup evidence above to be complete and attributable to the exact candidate.

## Current blockers

The contained source implementation itself is not blocked by the existing beer-first launch provider migration #165. Production Brew Done It enablement is blocked by its **own** provider migration/certification boundary:

- four collections are not provider-evidenced;
- their permission model is not connected-certified;
- compare-and-set/action-recovery behavior has not been proved against NoCodeBackend;
- two-account/two-device connected evidence does not yet exist; and
- no reviewed enablement change exists.

These blockers should remain scoped to Brew Done It. They must not block unrelated launch work.
