# Tasting visibility and Drinking Buddy provider target

Issue: #526  
Decision: `docs/DECISIONS/0007-tasting-visibility-and-drinking-buddies.md`  
State: **TARGET ONLY — NOT DEPLOYED**

This document defines the minimum provider capability required before Pourfolio can enable Drinking Buddy sharing. It is planning and evidence material only. It does not authorise or perform provider schema/data mutation.

## Safety boundary

Until connected provider evidence proves the target has been deployed and verified, application behavior must fail closed:

- legacy/missing tasting visibility is `private`;
- no Drinking Buddy relationship is treated as accepted;
- no shared tasting feed/API is enabled;
- no proposed field or table is sent to the provider as if it already exists;
- the existing owner-private Historical Feed remains owner-only;
- ADR 0003 public-profile history remains a separate compatibility path.

The migration requires explicit approval at the irreversible provider boundary.

## Additive target

### `profiles`

Add:

| Field | Required target | Migration rule |
| --- | --- | --- |
| `default_tasting_visibility` | enum/string restricted to `private`, `drinking_buddies`, `public`; required after backfill | Existing rows become `private`; new rows default `private`. |

Changing this value affects future tastings only. It must never bulk-rewrite existing `ratings.visibility`.

### `ratings`

Add:

| Field | Required target | Migration rule |
| --- | --- | --- |
| `visibility` | enum/string restricted to `private`, `drinking_buddies`, `public`; required after backfill | Existing rows become `private`; new rows default `private`. |

`rating_history_public=true` must not be used as a backfill source for this field.

If the provider cannot safely add a required field to a populated table in one supported operation, use a staged additive path: nullable/default-safe addition → deterministic private backfill → verification → required/default constraint only after evidence proves every row is valid.

### `drinking_buddy_relationships`

Create an additive collection/table with the minimum contract:

| Field | Requirement |
| --- | --- |
| provider `id` | provider-owned immutable row identity |
| `user_low_id` | server-derived canonical lower unordered participant key |
| `user_high_id` | server-derived canonical higher unordered participant key |
| `requester_user_id` | server-derived/request-authorised participant |
| `recipient_user_id` | server-derived resolved recipient |
| `state` | `pending`, `accepted`, `declined`, `cancelled`, or `removed` |
| `created_at` | provider/server timestamp |
| `updated_at` | provider/server timestamp |

Required integrity:

- no self-pair;
- one canonical active row per unordered pair;
- requester and recipient are exactly the pair participants and differ;
- browser input cannot choose the acting account identity;
- only valid state transitions are accepted;
- duplicate/concurrent request operations are idempotent at the gateway boundary.

If NoCodeBackend cannot enforce composite pair uniqueness directly, provider capability evidence must identify the supported alternative. Application-only check-then-create without a concurrency-safe mechanism is insufficient evidence for activation.

### `drinking_buddy_blocks`

Create an additive collection/table:

| Field | Requirement |
| --- | --- |
| provider `id` | provider-owned immutable row identity |
| `blocker_user_id` | authenticated acting user, derived server-side |
| `blocked_user_id` | resolved target user |
| `created_at` | provider/server timestamp |

Required integrity:

- no self-block;
- unique ordered `(blocker_user_id, blocked_user_id)` pair or a provider-supported equivalent;
- block creation is idempotent;
- a block overrides relationship state for authorization immediately;
- unblock does not restore sharing automatically.

## Conservative migration procedure

No command below is an executable provider mutation. The migration operator must translate this sequence into a provider-supported procedure and attach evidence before approval.

1. Freeze the exact provider/environment identity and capture a fresh baseline export/snapshot using the repository evidence process.
2. Record row counts and stable identifiers for `profiles` and `ratings`.
3. Prove the provider-supported restore/rollback mechanism for that exact environment.
4. Add only the approved target structures using provider-supported additive mechanics.
5. Backfill only `profiles.default_tasting_visibility` and `ratings.visibility`, setting every legacy/missing value to literal `private`.
6. Do not derive visibility from `rating_history_public`, rating score, cellar state, dates or any other historical data.
7. Verify zero legacy rows remain null/invalid before applying any required constraint.
8. Verify the relationship/block collections are empty on first deployment unless a separately approved import exists.
9. Capture a fresh post-change export and compare it with the baseline. Unexpected structural changes block activation.
10. Run connected gateway tests proving private default, ownership enforcement, relationship/block authorization and immediate revocation.
11. Only after evidence review may application feature flags/routes for relationship management advance. Shared feed activation remains a later stage.

## Evidence required before provider mutation approval

The change record must contain:

- exact NoCodeBackend instance/environment identity without committing secrets;
- provider-supported schema-change mechanism for populated tables;
- provider-supported default/backfill mechanics;
- provider-supported uniqueness/constraint mechanics for unordered relationship pairs and ordered block pairs, or an accepted concurrency-safe alternative;
- backup/snapshot identifier and a tested/documented restore path;
- immutable pre-change schema/export checksum;
- pre-change `profiles` and `ratings` row counts;
- proposed migration steps reviewed against ADR 0007;
- explicit owner approval for the irreversible provider step.

The existing `docs/nocodebackend/additive-schema-preflight.md` evidence discipline applies. A generic statement that tables/fields can be edited is not enough to approve live mutation.

## Evidence required after migration

Before application code may treat the target as deployed, retain:

- post-change schema/export checksum;
- structural diff showing only approved additions;
- before/after row counts with explanation for any difference;
- proof every pre-existing profile and rating has effective `private` visibility;
- proof no historical row was made `drinking_buddies` or `public` by backfill;
- proof `rating_history_public` values were not copied into event visibility;
- relationship pair uniqueness/concurrency evidence;
- directional block uniqueness/idempotency evidence;
- server-authoritative identity tests;
- read tests for private, accepted buddy, removed buddy and either-direction block cases;
- revocation test showing access disappears on the next read without feed-record cleanup;
- confirmation purchase price, cellar data, private location context and internal IDs are absent from shared projections.

## Activation gates

### Gate V — visibility persistence

May activate owner visibility controls only when `profiles.default_tasting_visibility` and `ratings.visibility` are deployed, backfilled private and connected-write/read certified.

### Gate R — relationships

May activate Drinking Buddy request/accept/remove/block management only when both relationship collections and their concurrency/integrity controls are deployed and certified.

### Gate S — shared projection

May activate the shared activity API only after Gates V and R pass and server tests prove permission checks on every read plus immediate revocation.

### Gate F — feed

May activate the opt-in Drinking Buddy feed only after Gate S passes. The feed must project canonical events at read time; it must not introduce a duplicate persisted social-feed copy.

Reactions/comments remain out of scope until feed privacy and revocation are proven.
