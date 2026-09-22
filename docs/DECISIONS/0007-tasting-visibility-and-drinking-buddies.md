# ADR 0007: Tasting visibility and Drinking Buddy sharing

- Status: Accepted
- Date: 2026-09-22
- Related: #526, #436, #434, ADR 0003, ADR 0005

## Context

Pourfolio now has owner-private historical tasting views built from canonical rating events. Existing ratings were created under an owner-scoped contract. ADR 0003 permits a separate explicit public-history opt-in at profile level, but Pourfolio does not yet have a per-event sharing contract or a mutual Drinking Buddy relationship.

A social feed must not turn historical owner data into a second persisted copy or make access depend on stale feed rows. Sharing therefore requires an explicit event visibility model, server-authoritative mutual relationships, conservative migration semantics and a permission-checked projection of canonical tasting events.

Private cellar data, purchase prices, Purchased PPP derived from private prices, private venue/location context and provider/internal identifiers are outside the social projection unless a later accepted decision explicitly permits a field.

## Decision

### 1. Visibility states

Each user-created tasting event has exactly one effective visibility state:

- `private` — owner only;
- `drinking_buddies` — owner plus viewers who are currently accepted mutual Drinking Buddies;
- `public` — shareable only after the owner explicitly selects public visibility and a public surface is separately enabled.

`private` is the default for both account defaults and new events when no explicit owner choice exists. Browser input may request an allowed visibility value for an owner-held event, but the server derives owner identity and authorises the mutation.

Public is a visibility capability, not an instruction to publish an event everywhere. A public feed/API remains disabled until its own product and provider gates are satisfied.

### 2. Account default and per-event override

The profile may hold `default_tasting_visibility`. It controls only the initial visibility of future tasting events.

Each persisted tasting event holds its own `visibility`. Creating a tasting copies the then-current account default into the event unless the owner explicitly chooses another allowed value during creation.

Changing the account default never rewrites existing tasting events. Editing one event changes only that event. This makes historical visibility deterministic and prevents a later preference change from silently exposing earlier history.

### 3. Legacy migration and backfill

Existing rating rows without visibility metadata are treated as `private` on every read before and during migration.

The governed additive migration target is:

- `profiles.default_tasting_visibility` — required enum/string with default `private`;
- `ratings.visibility` — required enum/string with default `private`.

Allowed values are `private | drinking_buddies | public`.

Backfill rules are conservative:

1. every existing profile without a value becomes `private`;
2. every existing rating without a value becomes `private`;
3. existing `rating_history_public=true` from ADR 0003 does **not** backfill individual events to `public` or `drinking_buddies`;
4. no historical event becomes shareable without a later explicit owner action;
5. missing/unknown/invalid visibility fails closed as `private` at the application boundary.

Provider mutation is not authorised by this ADR alone. Before migration, Pourfolio must have provider-supported evidence for additive schema change on populated tables, defaults/backfill, backup/restore or rollback, and verification of the deployed fields. The migration must be separately approved at the irreversible boundary.

### 4. Existing profile-history opt-in

ADR 0003's `rating_history_public` remains authoritative for the existing signed-in public-profile history surface until that capability is deliberately migrated.

It must not be interpreted as a Drinking Buddy permission and must not automatically rewrite `ratings.visibility`.

A later migration may retire or redefine `rating_history_public` only with explicit compatibility rules. Until then, the new shared-activity projection and the existing public-profile history projection are separate authorization paths.

### 5. Drinking Buddy relationship

Drinking Buddies are mutual. Pourfolio does not model this feature as unilateral following.

The canonical relationship is one unordered user pair with server-authoritative participant identity. The target relationship states are:

- `pending` — one participant has requested the relationship;
- `accepted` — both participants are mutual Drinking Buddies;
- `declined` — terminal request outcome; a later request creates/reopens through governed server logic rather than pretending acceptance;
- `cancelled` — requester cancelled a pending request;
- `removed` — an accepted relationship was removed by either participant.

Pending rows record requester and recipient so only the recipient may accept/decline and only the requester may cancel. Either participant may remove an accepted relationship.

There must be at most one active relationship for an unordered pair. Self-relationships are forbidden. Request/accept/remove operations are idempotent at the gateway boundary and concurrency must not create duplicate active pairs.

### 6. Directional blocking

Blocking is directional and independent of friendship history. The provider target is a dedicated block record keyed by `blocker_user_id` and `blocked_user_id`, unique per ordered pair.

A block immediately denies shared access in both directions between the pair, prevents new requests and prevents acceptance of a pending request. Existing accepted/pending relationship state may be retained for audit/history but is not an access grant while either directional block exists.

Unblocking does not automatically restore an accepted relationship or expose history. A new/explicit relationship action is required according to the then-current relationship state policy.

Block existence and relationship internals are not exposed as social activity.

### 7. Provider target for relationships

The additive provider target is conceptually:

`drinking_buddy_relationships`

- provider primary key;
- `user_low_id` and `user_high_id` — canonical unordered pair keys derived server-side;
- `requester_user_id`;
- `recipient_user_id`;
- `state` — `pending | accepted | declined | cancelled | removed`;
- `created_at`, `updated_at`;
- optional accepted/ended timestamps where provider support and audit requirements justify them.

`drinking_buddy_blocks`

- provider primary key;
- `blocker_user_id`;
- `blocked_user_id`;
- `created_at`.

Provider constraints or the server gateway must enforce pair uniqueness, ordered block uniqueness, no self-pairs and valid state transitions. Browser-supplied account IDs are never trusted as acting identity.

Exact provider field types, uniqueness mechanics and migration commands remain deployment evidence, not assumptions in this ADR.

### 8. Shared activity projection

Shared activity is a read-time projection of canonical tasting events. Pourfolio must not persist a duplicate social-feed copy merely for display.

For each request, the server derives the viewer from the authenticated session and checks current event visibility, ownership, relationship state and block state before returning an event.

The maximum initial share-safe tasting projection is:

- explicitly shareable display profile identity (`public_id`, display name, avatar where profile rules allow it);
- canonical product display identity;
- canonical producer display identity required for that product;
- event type (`full_tasting` or `quick_rate` when deployed);
- event timestamp;
- event-appropriate display score: Full Tasting weighted score or Quick Rate score;
- stable public/client-safe event reference only if required for navigation/reactions later.

The initial projection excludes:

- purchase price or retail/purchased price snapshots;
- Purchased PPP or any value that can reveal/infer a private purchase price;
- cellar IDs, cellar state or cellar history;
- private venue/location context;
- private notes/media/context unless separately and explicitly shared later;
- provider secrets, internal user IDs and workflow/submission identifiers;
- detailed rating child rows unless a later accepted projection permits them;
- hidden, deleted, incomplete or migration-only events;
- events whose current visibility/relationship/block checks fail.

Overall/Style Scaled Score may only be added to a shared projection after confirming it contains no private-input leakage and the relevant scoring contract explicitly permits that social surface.

### 9. Read authorization

Authorization is evaluated on every shared read.

- owner: may read their own event subject to normal owner-history rules;
- `private`: deny every non-owner;
- `drinking_buddies`: allow only when the viewer and owner have a current `accepted` relationship and neither has blocked the other;
- `public`: allow only through a separately enabled public/shared surface and only when all profile/event publication gates pass.

No client-side filter is an authorization boundary. Provider queries should narrow candidates where possible, but the same server-owned policy must guard the returned projection.

### 10. Revocation, removal and deletion

Changing an event from a shareable state to `private` removes non-owner access on the next read.

Removing a Drinking Buddy or creating a block removes access to `drinking_buddies` events on the next read. No feed cleanup job is required because the feed is a live projection.

Deleting/hiding an event removes it from shared projections immediately according to the canonical rating deletion/tombstone contract. Cached responses, if introduced later, must be private/short-lived or actively invalidated so they cannot defeat revocation semantics.

### 11. Relationship privacy and discovery

The initial relationship API exposes only the minimum information needed by the signed-in participant to manage their own requests and accepted buddies. It does not expose a public buddy graph, relationship counts for arbitrary users, requester/recipient internal IDs, blocks created by other users, or relationship history to third parties.

User discovery for sending requests must use safe public profile identity and must not expose email or internal account identity.

### 12. Implementation sequence

Implementation remains dependency-ordered:

1. document and evidence the provider target and migration/rollback procedure without mutating provider data;
2. after explicit migration approval, add visibility/default fields with conservative private backfill;
3. add mutual relationship and directional block persistence;
4. add owner visibility controls and relationship management;
5. add permission-checked shared activity projection;
6. add an opt-in Drinking Buddy feed;
7. add reactions/comments only after privacy, removal, block and revocation tests prove the read boundary.

Each stage must fail closed when required provider capability is absent. Application code must not pretend proposed fields/tables are deployed.

## Consequences

Historical tastings remain private unless the owner explicitly changes each event. Default changes affect future tastings only. Drinking Buddy access is mutual, revocable and block-aware. Social activity remains derived from canonical rating events rather than duplicated into a second source of truth.

The design requires additive provider capability before social sharing can activate. This intentionally delays the feed rather than weakening privacy or fabricating provider state.

## Alternatives considered

A follower model was rejected because the requested product relationship is mutual. Backfilling existing ratings from `rating_history_public` was rejected because a broad legacy profile opt-in is not equivalent to per-event social consent. Persisting feed rows was rejected because stale copies make revocation harder and create a second source of truth. Client-side filtering was rejected because it cannot enforce authorization. Automatically restoring a friendship after unblock was rejected because unblock is not consent to reshare history.

## Links

- #526
- #436
- #434
- `docs/DECISIONS/0003-public-user-profiles-and-rating-history.md`
- `docs/DECISIONS/0005-rating-events-quick-rate-and-repeat-tastings.md`
- `docs/nocodebackend/schema-mapping.md`
