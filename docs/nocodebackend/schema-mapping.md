# Canonical NoCodeBackend schema mapping

## Status and evidence

This is the launch contract for the beer-first MVP. It is derived from:

- the supplied `54026_rating_export(2).sql` schema export;
- the supplied products, producers, categories, rating-attribute, bonus-attribute and cellar CSV exports;
- `Pourfolio_Beer_Ratings_Swagger_Payloads_With_Cellar(1)(1).xlsx`.

The obsolete `*_pf2025` collection names and `beverage_id` field are not part of this contract. The browser accesses these collections only through the authenticated application gateway in `api/nocodebackend/[...path].js`.

### Atomic-workflow verification (29 July 2026)

The connected runtime could not be interrogated: neither
`NOCODEBACKEND_DATA_BASE_URL` nor `NOCODEBACKEND_SECRET_KEY` is present in the
delivery environment, and the repository contains no provider transaction or
server-workflow endpoint/configuration. The available collection REST contract
exposes individual list/get/create/update/delete operations only. Consequently,
**atomic multi-collection transactions are not verified as supported** and the
gateway uses the idempotent reconciliation design below. This is deliberately
not a claim that the provider can never support transactions. Operations must
repeat this probe against the production-equivalent environment and may adopt a
single provider transaction only after its atomic commit/abort behaviour is
recorded with redacted API evidence.

The 29 July certification attempt is recorded in the
[rating workflow certification record](rating-workflow-certification.md). It was
blocked before remote requests because this environment still has neither
staging endpoint nor credential. No transaction has therefore been adopted.

## Collection summary

| Collection | Purpose | Ownership |
| --- | --- | --- |
| `profiles` | App-facing display profile for an authenticated account. | Owner read/write for editable display fields. |
| `products` | Product catalogue. | Authenticated read for MVP. |
| `producers` | Product producer catalogue. | Authenticated read for MVP. |
| `categories` | Product/style taxonomy. | Authenticated read for MVP. |
| `rating_attributes` | Applicable 1–7 score definitions and weights. | Authenticated read; administrative write outside MVP. |
| `bonus_attributes` | Optional rating bonus definitions. | Authenticated read; administrative write outside MVP. |
| `ratings` | Owner rating header, product reference, date and totals. | Owner create/read/delete; projected community read. |
| `rating_scores` | Normalised attribute scores for a rating. | Same owner as parent rating. |
| `bonus_attribute_rating_mapping` | Normalised optional bonus selections. | Same owner as parent rating. |
| `cellar` | Private user cellar inventory. | Owner CRUD only. |
| `brew_done_it_games` | Invitation and immutable two-participant game relationship. | Participants read; gateway-only create/update. |
| `brew_done_it_rounds` | Authoritative beer selection, roles, turn and completion state. | Participants read through a role-aware projection; gateway-only write. |
| `brew_done_it_guesses` | Immutable, ordered product guesses and server-awarded points. | Participants read through the game relationship; gateway-only create. |

## Account export, deletion and retention status

The existing schema has no deletion-job, deletion-receipt, export-job,
verification-status or retention-control fields. None is implied by an editable
profile row, and no browser-supplied lifecycle status may be trusted. Whole-account
export and deletion are therefore not implemented against this contract.

The proposed owner-data boundary and dependency order are documented in the
[account lifecycle readiness review](../account-lifecycle-readiness.md). It
includes `profiles`, `ratings`, `rating_scores`,
`bonus_attribute_rating_mapping` and `cellar`; shared catalogue and attribute
definitions are not owner data and must not be deleted with an account.

Before implementation, a reviewed provider change must define a server-only,
idempotent deletion job/receipt store, write fencing, authentication identity
deletion, backup-expiry behaviour, permissions, indexes and rollback. Any job
record must contain only the minimum operational identifiers, state, timestamps
and aggregate counts—not exported personal-data bodies. This document must be
updated with the exact approved fields and relationships before persistence is
changed. Until then, the proposed retention periods are not production promises.

## Authoritative relationships

```mermaid
erDiagram
  PROFILES ||--o{ RATINGS : owns
  PROFILES ||--o{ CELLAR : owns
  PRODUCERS ||--o{ PRODUCTS : produces
  CATEGORIES ||--o{ PRODUCTS : classifies
  PRODUCTS ||--o{ RATINGS : receives
  PRODUCTS ||--o{ CELLAR : stored_as
  RATINGS ||--o{ RATING_SCORES : contains
  RATING_ATTRIBUTES ||--o{ RATING_SCORES : defines
  RATINGS ||--o{ BONUS_ATTRIBUTE_RATING_MAPPING : selects
  BONUS_ATTRIBUTES ||--o{ BONUS_ATTRIBUTE_RATING_MAPPING : defines
  CELLAR o|--o{ RATINGS : may_link
```

## Required fields

### `profiles`

`user_id` must be non-null, unique and match the immutable authenticated user
ID. The provider primary key may use the same identity. Editable browser fields
are limited to `name`, `description`, and `avatar_url`. Email, role, identity and
provider metadata are never accepted from a profile update.

### `products`

| Field | Rule |
| --- | --- |
| `id` | Positive integer primary key. |
| `product_name` | Required. |
| `product_category_id` | Optional `categories.id`. |
| `producer_id` | Optional `producers.id`. |
| `abv`, `ibu`, `declared_category`, `edition`, `collaboration`, `product_image` | Optional catalogue metadata. |

### `ratings`

| Field | Rule |
| --- | --- |
| `id` | Provider-generated primary key. |
| `user_id` | Non-null; set by the server from the authenticated session. |
| `rating_id` | Positive safe-integer client submission ID; non-null and unique with `user_id` for durable retry idempotency. |
| `product_id` | Non-null reference to an existing `products.id`. |
| `cellar_id` | Optional owner-held `cellar.id` for the same product. |
| `date_rated` | Non-null server timestamp; defaults on create and must not use `ON UPDATE CURRENT_TIMESTAMP`. |
| `total_unweighted`, `total_weighted` | Calculated by the server from normalised scores and current attribute weights. |
| `submission_key` | Non-null deterministic `<user_id>:<rating_id>` key; unique. |
| `submission_fingerprint` | Non-null SHA-256 digest of the canonical product, owner cellar, scores and bonus selection; never accepts client input. |
| `submission_state` | Non-null enum/string limited to `pending`, `complete`, or `failed`; server write only. |
| `expected_score_count`, `expected_bonus_count` | Non-negative integers fixed from validated input and used to prevent premature duplicate success. |

The supplied database does not contain a rating-notes field. The launch form therefore does not pretend to persist review text. Adding notes requires an approved schema change and migration.

### `rating_scores`

`user_id`, `rating_id`, `attribute_id` and `attribute_score` are non-null. Each
applicable scored attribute must occur exactly once per rating, enforced by a
unique `(rating_id, attribute_id)` constraint. Each row also has a non-null,
globally unique deterministic `uniqueness_key` of
`<user_id>:<client-rating_id>:score:<attribute_id>`. `attribute_score` is an integer
from 1 through 7 inclusive. Score `1` is valid and must not be treated as
missing. `user_id` is set by the server.

### `bonus_attribute_rating_mapping`

Bonus selections are optional. Each submitted `bonus_attributes_id` must exist.
When selected, `user_id`, `rating_id` and `bonus_attributes_id` are non-null and
the pair `(rating_id, bonus_attributes_id)` is unique. Each row also has a
non-null, globally unique deterministic `uniqueness_key` of
`<user_id>:<client-rating_id>:bonus:<bonus_attributes_id>`. `user_id` and `rating_id`
are set by the server.

### `cellar`

The gateway accepts the supplied schema fields through an explicit allowlist. `user_id` is always derived from the session. Quantities and monetary values cannot be negative.

`sharing_series_id` and `series_version_id` are optional. When not applicable they must be `NULL`; zero and fabricated identifiers are rejected. A rating does not require a sharing series or edition.

## Proposed Brew Done It persistent contract (not yet deployed)

This is a deliberately smaller three-collection model. A separate
`brew_done_it_questions` collection is not required for the initial product-guess
rules: every turn is an immutable `product` guess. Adding free-text or yes/no
questions would require a separately reviewed moderation, disclosure and answer
contract. No client route is part of this delivery.

### `brew_done_it_games`

| Field | Rule |
| --- | --- |
| `id` | Provider-generated positive primary key. |
| `selector_participant_id` | Non-null immutable authentication subject; always copied from the creating session. |
| `guesser_participant_id` | Immutable authentication subject set once by the gateway when a different authenticated user proves possession of the one-time invitation. Never accepted as a client field. |
| `invitation_digest` | SHA-256 digest of a 256-bit random invitation; server-only, unique, cleared on join and never projected. |
| `status` | Server-only enum: `waiting`, `active`, `completed`. |
| `created_at`, `joined_at`, `completed_at` | Server timestamps; nullable only before the corresponding transition. |

### `brew_done_it_rounds`

| Field | Rule |
| --- | --- |
| `id`, `game_id`, `round_number` | Provider primary key, non-null game reference and positive sequence; `(game_id, round_number)` is unique. MVP has one round. |
| `selector_participant_id`, `guesser_participant_id` | Non-null immutable copies of the game's authenticated participants. Provider constraints or a server workflow must prevent changes. |
| `selected_product_id` | Existing `products.id`, set once by the selector through the gateway; hidden from the guesser until completion. |
| `status` | Server-only enum: `awaiting_selection`, `guessing`, `completed`. No completed round can transition again. |
| `turn_sequence`, `max_turns` | Server-owned non-negative current turn and immutable limit (six for MVP). |
| `created_at`, `started_at`, `completed_at` | Server timestamps. |
| `completion_reason` | Server-only nullable enum: `correct_guess` or `turn_limit`; required exactly when completed. |

### `brew_done_it_guesses`

| Field | Rule |
| --- | --- |
| `id`, `round_id` | Provider primary key and non-null round reference. |
| `guesser_participant_id` | Immutable copy of the designated guesser, derived from the round rather than the request. |
| `turn_sequence`, `uniqueness_key` | Consecutive positive turn and globally unique `<round_id>:<turn_sequence>` key; `(round_id, turn_sequence)` is also unique. |
| `guess_type` | Immutable enum restricted to `product`. |
| `guessed_product_id` | Existing `products.id`; the only guess value accepted from the browser. |
| `is_correct`, `awarded_points` | Server-derived. Correctness compares against the hidden selection; points are `max_turns - turn_sequence + 1` only for a correct guess, otherwise zero. |
| `created_at` | Immutable server timestamp. |

The explicit application surface is `POST /brew-done-it/games`, `POST
/brew-done-it/games/:id/join`, `GET /brew-done-it/games/:id`, `POST
/brew-done-it/rounds/:id/selection`, `POST
/brew-done-it/rounds/:id/guesses`, and `GET /brew-done-it/stats` below the
authenticated gateway. Arbitrary collection paths are never routed. The create
route makes the session user the selector; join accepts only the opaque
invitation, not an owner or participant ID. Every later operation reloads the
game relationship. Only the selector may select; only the immutable guesser may
guess; a completed round rejects every mutation. Game reads omit
`invitation_digest`; round reads omit `selected_product_id` for the guesser until
completion. Statistics count only authorised completed games/rounds and sum
persisted server-awarded correct-guess points; browser totals are never accepted.

### Safe rollout and rollback

These routes must remain unreleased until the following manual provider change
is reviewed and evidenced because this repository has no executable migration
runner:

1. Back up the production-equivalent provider and prove restoration in staging.
   Create the three collections with foreign keys, enums, non-null rules and
   immutable/server-only fields above. Apply unique constraints to invitation
   digests, `(game_id, round_number)`, `(round_id, turn_sequence)` and guess
   `uniqueness_key`.
2. Implement or verify provider compare-and-set/server workflows for the
   `waiting` to `active`, selection, turn-increment and completion transitions.
   A plain read followed by an unconditional update is **not sufficient** for
   concurrent join or turn safety; production enablement is blocked without
   atomic conditional transitions.
3. Deny browser/provider-public access to all three collections. Permit only the
   gateway service identity, then exercise two simultaneous joins and guesses,
   replayed turns, role swaps, non-participants, forged scores and premature
   answer reads using redacted evidence.
4. Canary the gateway routes by setting the server-only
   `BREW_DONE_IT_POLICY_ENABLED=true` flag only after the preceding atomicity
   proof, reconcile counts and transition invariants, and then gradually enable
   traffic. With the flag absent or false, the gateway returns the same 404 as
   an unknown application route. There is no legacy backfill for this additive
   model.
5. For rollback, disable the flag first and retain the additive collections for
   investigation. Restore the prior gateway release; do not delete records or
   fields. After the retention decision and a redacted export, a separately
   approved provider operation may archive/drop empty collections. If corruption
   occurred, restore the backup and invalidate all outstanding invitations.

## Rating write lifecycle

1. Verify the authenticated server session.
2. Verify the product and optional owner cellar record.
3. Load scored rating attributes and bonus definitions.
4. Require exactly one 1–7 score for every applicable attribute.
5. Calculate authoritative weighted and unweighted totals.
6. Create or owner-safely load the header by unique `submission_key`; a conflict
   is a retry only when both ownership and `submission_fingerprint` match.
7. Create missing children by deterministic `uniqueness_key`. Treat a unique
   conflict as success only after loading the row through owner filters and
   validating its owner, parent and key.
8. Re-read every owner-scoped child, including its parent, attribute or bonus
   reference and score value. Mark the header `complete`, then re-read that
   owner-scoped header and return success only when the exact expected child
   sets and durable `complete` state match. Otherwise mark it `failed`; a
   failure to record that state is logged without owner data.
9. `POST /api/nocodebackend/ratings/reconcile` accepts the original submission
   body and performs this same owner-safe workflow. `submit` retries do likewise;
   both can resume `pending` or `failed` records after a timeout or partial write.
10. Return only projected public fields; never return fingerprints, deterministic
    keys, state internals, raw provider data, arbitrary owner IDs or secrets.

Provider permissions must deny direct browser writes to all workflow fields and
collections. The gateway service identity may create/update rating workflow
fields and create children. Reads/updates used for reconciliation must require
the authenticated `user_id`; child foreign keys must reference `ratings.id`,
`rating_attributes.id`, and `bonus_attributes.id`. `ratings.cellar_id` must
reference `cellar.id`, while the gateway additionally enforces same owner and
product because a foreign key alone cannot express those rules.

## Schema preflight

Run the [rating schema preflight](schema-preflight.md) against a complete,
production-equivalent SQL export. The current supplied export is blocked because
the profile collection and required integrity controls are absent and
`date_rated` changes automatically on update.

## Required remote permission proof

Before public launch, test these cases in the production-equivalent NoCodeBackend instance:

| Actor | Expected |
| --- | --- |
| Unauthenticated | No access to application data endpoints. |
| Owner | CRUD own profile/cellar; create/read/delete own ratings. |
| Other user | Cannot read private cellar/profile fields or mutate another user’s records. |
| Authenticated catalogue user | Can read only projected product/producer/category/attribute data. |
| Administrator/provider secret | Can perform only the server workflows required by the gateway. |

Record screenshots or API transcripts with all secrets, cookies and personal data redacted.

## Rollout

There is no executable migration runner in this repository. Validate collection
paths, fields, filters, permission rules, create response shapes and rollback
behaviour in a non-production instance. Any persistent schema change requires an
approved provider migration and rollback path. Rehearse rollback and backup
restore before switching production traffic.

### Approved safe rollout for idempotent submissions

1. Back up the production-equivalent collections and rehearse restore. Pause
   rating writes during the constraint transition.
2. Add the five rating workflow fields and child `uniqueness_key` fields as
   nullable. Backfill stable submission keys, canonical fingerprints, expected
   counts and deterministic child keys with a reviewed, one-off provider job.
   Quarantine duplicate or incomplete legacy records for owner-safe review; do
   not guess winners.
3. Reconcile every backfilled header against its children, setting only exact
   matches to `complete` and all others to `failed`. Verify counts, ownership,
   parent relationships and key uniqueness from a redacted export.
4. Add unique constraints on `ratings.submission_key`,
   `rating_scores.uniqueness_key`, and mapping `uniqueness_key`, retain the
   existing composite uniqueness constraints, then make all workflow fields
   non-null and restrict state values.
5. Apply and prove the least-privilege permissions above in staging. Exercise
   concurrent requests, post-write timeouts, partial creation, conflicts,
   failed state updates, reconciliation and cross-owner cellar attacks before a
   canary deployment.
6. Roll back application traffic to the previous release only while retaining
   the additive fields. Removing constraints/fields requires a separately
   approved rollback after confirming no new submissions depend on them.
