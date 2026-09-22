# 0007: Tasting visibility and Drinking Buddy sharing

- Status: Accepted
- Date: 2026-09-22
- Related: #434, #436, #524, #526, ADR 0003, ADR 0005

## Context

Pourfolio now has an owner-private Historical Feed over canonical rating events, while ADR 0003 already defines an explicit `profiles.rating_history_public` opt-in for exposing rating history on signed-in public profile pages. ADR 0005 defines repeat tastings as separate historical events and requires their history to remain intact.

The planned Drinking Buddy feature needs selected tasting activity to be shareable with mutually connected users without making existing private history visible by default, exposing private cellar/purchase context, duplicating rating events into a second feed store, or weakening the existing public-profile consent model.

The current provider does not yet have an event-visibility field or a certified Drinking Buddy relationship model. Shared-history endpoints must therefore remain unavailable until the required additive provider capability is deployed and verified.

## Decision

### 1. Canonical visibility scopes

Each user-created tasting event will have one server-validated visibility scope:

- `private` — owner only;
- `drinking_buddies` — owner plus accepted Drinking Buddies;
- `public` — eligible for Drinking Buddy sharing and, when the existing public-profile gate also permits it, signed-in public-profile/shared-public projection.

`private` is the default when no valid explicit/default scope exists.

Visibility is an access-control input. It does not change rating ownership, score eligibility, community aggregates, rating-event identity or historical ordering.

### 2. Existing public-profile consent remains an outer public gate

ADR 0003 remains authoritative for public-profile rating history.

`profiles.rating_history_public` continues to control whether any rating history is exposed to non-buddy signed-in viewers through public-profile/public-history surfaces.

A rating with `visibility_scope = public` is therefore visible to a non-buddy viewer only when:

1. the owner profile permits public rating history;
2. the event is otherwise eligible and not deleted/hidden;
3. the response uses the reviewed share-safe projection.

Turning `rating_history_public` off removes non-buddy public access immediately without rewriting historical events.

An accepted Drinking Buddy may still see an event with scope `drinking_buddies` or `public`, subject to the relationship/block rules below. Public-profile consent and Drinking Buddy consent are separate controls.

### 3. Account default plus per-event override

The target profile/account preference is `default_tasting_visibility` with the same three scopes.

When a new tasting event is created:

1. an explicit event scope requested by the owner may be accepted if valid;
2. otherwise the server applies the owner's valid default;
3. if neither can be proven, the server persists `private`.

The browser may request an allowed visibility scope but may not set ownership, workflow state or another user's sharing state.

Changing the account default affects future events only. Existing event scopes do not silently change.

The owner may later change one event's visibility through an owner-authorised server operation. Revocation takes effect on subsequent reads.

### 4. Existing-rating migration preserves prior consent without widening it

The additive migration must be deterministic and fail closed.

For an existing rating event at the migration snapshot:

- if its owner has already explicitly enabled `rating_history_public = true`, the event may be backfilled to `public` because that history is already intentionally shared under ADR 0003;
- otherwise it is backfilled to `private`;
- missing/ambiguous profile consent is treated as private;
- deleted/incomplete workflow states remain ineligible for shared projections regardless of visibility.

For profile defaults at the migration snapshot:

- an owner with `rating_history_public = true` may receive `default_tasting_visibility = public` to preserve the existing expectation that newly completed rating history participates in the opted-in public history;
- all other owners receive `default_tasting_visibility = private`.

No legacy row is inferred as `drinking_buddies` because no prior Drinking Buddy consent exists.

Until migration/backfill is verified, a missing event visibility value is treated as `private`.

### 5. Drinking Buddies are mutual relationships, not followers

A Drinking Buddy connection requires an explicit request and acceptance between two authenticated users.

The target relationship model stores one canonical relationship for an unordered user pair. It uses server-owned internal identities and exposes only safe public-profile identity to browsers.

The relationship lifecycle is:

- `pending`;
- `accepted`;
- `declined`;
- `cancelled`;
- `removed`.

Only `accepted` grants Drinking Buddy visibility.

A user may cancel their outgoing pending request, decline an incoming request, or remove an accepted connection. Re-request behaviour is server-governed and must remain idempotent and deterministic.

The relationship must use version/idempotency controls appropriate to provider capability so concurrent accept/remove/request operations cannot create two active logical relationships.

### 6. Blocking is directional and overrides relationships

Blocking is a separate owner-controlled directional relationship rather than a lossy single-state field on the mutual Drinking Buddy row.

The target model therefore supports a directional block from blocker to blocked user.

If either direction has an active block:

- no Drinking Buddy relationship grants access;
- new buddy requests are rejected/hidden as appropriate;
- existing shared activity becomes inaccessible immediately;
- profile/feed projections must not reveal private relationship state to the blocked user;
- unblocking does not automatically restore a previously accepted Drinking Buddy relationship.

This allows both users to independently block each other without one action erasing the other's block state.

### 7. Authorization is evaluated on every shared read

Shared activity access is not materialised as a durable copy of the source event.

For an owner reading their own event:
- ownership is sufficient, subject to ordinary rating lifecycle rules.

For an accepted Drinking Buddy:
- the authenticated viewer/owner pair must have an accepted relationship;
- neither direction may have an active block;
- the event scope must be `drinking_buddies` or `public`.

For another signed-in non-buddy viewer:
- the event scope must be `public`;
- the owner's `rating_history_public` gate must be enabled;
- the surface must be an explicitly reviewed public-history projection.

Unauthenticated internet visibility is not introduced by this ADR. A later decision is required before public history becomes anonymous/public-web content.

Permissions are checked at read time so removing a buddy, blocking a user, disabling public history or revoking an event's scope removes access without feed-record cleanup.

### 8. Share-safe event projection

A Drinking Buddy/shared feed may return only the minimum reviewed fields required for display.

Eligible fields include:

- safe public profile identity/display fields;
- canonical product identity and name;
- canonical producer identity and name where verified;
- event type;
- event timestamp;
- the display score appropriate to the event type;
- explicitly approved share-safe notes/media/context in later work.

The shared projection must not expose by default:

- internal `user_id`;
- provider secrets;
- submission/workflow metadata;
- rating child-row identifiers;
- cellar identifiers/details;
- purchase or retail price;
- PPP values derived from private prices;
- private purchase/venue/location context;
- data from deleted/hidden/ineligible events.

Community aggregate calculations remain separate from individual shared activity.

### 9. Historical Feed remains canonical owner history

The owner-private Historical Feed from #524 remains the complete owner view of qualifying canonical events. Visibility does not remove the owner's own event from their history.

Product, brewery, style, recap and future social views consume the same canonical rating-event identity. Pourfolio does not create a separate `historical_feed` or `social_feed` table merely to copy tasting activity.

A future activity system may add other event types, but each must retain its canonical source and reviewed projection.

### 10. Minimum provider target

Before Drinking Buddy/shared tasting activity is enabled, the governed additive target includes at least:

On profiles:
- `default_tasting_visibility` — `private | drinking_buddies | public`, default/fail-closed private.

On ratings:
- `visibility_scope` — `private | drinking_buddies | public`, non-null after verified backfill.

A Drinking Buddy relationship collection with at least:
- canonical pair identity/key;
- the two server-owned participant identities;
- requester identity;
- relationship state;
- version/idempotency metadata;
- created/updated/responded timestamps as required.

A directional block collection with at least:
- blocker identity;
- blocked identity;
- deterministic directional uniqueness;
- created/revoked state or equivalent auditable active-state semantics.

Exact provider column names and constraint mechanics must be documented in the migration plan and verified against NoCodeBackend capability before application code requires them.

### 11. Enablement sequence

1. Keep current owner Historical Feed/private product history unchanged.
2. Add provider target documentation, backup/recovery plan and migration evidence.
3. Obtain explicit approval before provider schema/data mutation where required by project governance.
4. Deploy and verify visibility/default backfill.
5. Deploy and verify Drinking Buddy relationship/block persistence.
6. Implement owner visibility controls and relationship management.
7. Add permission-checked shared activity projection.
8. Add opt-in Drinking Buddy feed.
9. Add reactions/comments only after feed privacy and revocation are proven.

No shared-history endpoint or UI may be enabled merely because application source exists.

## Consequences

### Positive

- Existing private history remains private by default.
- Existing explicit public-history consent is preserved rather than discarded.
- Drinking Buddy sharing is mutual and revocable.
- Blocking immediately overrides prior social permission.
- Public, buddy and owner reads have explicit server-authoritative rules.
- Purchase/cellar details and price-derived PPP stay out of shared projections.
- One canonical tasting event can power owner history, product history, recaps and later social feeds without duplicated feed rows.

### Trade-offs

- Event visibility and relationship persistence require additive provider migration before social sharing can ship.
- Public-profile history now has two relevant controls: the existing profile public gate and event visibility.
- Search/feed code must evaluate relationship and visibility permissions rather than relying on copied feed records.
- Migration must snapshot existing explicit public consent carefully to avoid widening or unexpectedly removing current access.

## Alternatives considered

Making all existing ratings visible to Drinking Buddies was rejected because no prior buddy-sharing consent exists.

Using a follower model was rejected because the intended Drinking Buddy relationship is mutual.

Using only `rating_history_public` for all social sharing was rejected because it cannot distinguish private, buddy-only and public events.

Copying ratings into a social-feed table was rejected because revocation/deletion would require duplicate-state reconciliation and could leak stale activity.

Representing blocking only as a single relationship state was rejected because both users must be able to hold independent block decisions.

## Links

- #434 — Phase 4 personal beer intelligence
- #436 — Phase 6 social and exploration engagement
- #524 — Private personal Historical Feed
- #526 — Tasting visibility and Drinking Buddy sharing contract
- ADR 0003 — Public user profiles and rating history
- ADR 0005 — Rating events, Quick Rate and repeat tastings
