# Launch NoCodeBackend contract classification

## Purpose

This document is the concise launch-time application contract for the active NoCodeBackend schema. It classifies launch collections and fields so application code does not accidentally require undeployed migration targets.

The detailed field/relationship rules remain in `schema-mapping.md`. This document is the classification layer used when deciding whether a field may be required by launch services, treated as optional, or kept behind a migration/capability gate.

## Evidence semantics

The classifications below distinguish **repository-supplied provider evidence** from fresh connected introspection.

- **DEPLOYED_REQUIRED** — evidenced by the supplied provider export/contracts and required by the active launch application boundary.
- **DEPLOYED_OPTIONAL** — evidenced by the supplied provider export/contracts but nullable, enrichment-only or not required for every record/workflow.
- **DEFERRED_TARGET** — designed/repository-documented future provider state that must not be required until migration plus connected verification is complete.
- **UNAVAILABLE** — capability/collection not evidenced as deployed; the application must fail explicitly or use an already-approved non-persistent fallback rather than inventing persistence.

These labels do **not** claim fresh live schema introspection. Connected behaviour and readiness evidence may confirm that the configured provider is reachable, but destructive schema/constraint probes remain restricted to explicitly authorised isolated staging.

## Launch collection classification

| Collection | Classification | Launch role |
| --- | --- | --- |
| `products` | DEPLOYED_REQUIRED | Catalogue and product detail source. |
| `producers` | DEPLOYED_REQUIRED | Producer catalogue/enrichment. |
| `categories` | DEPLOYED_REQUIRED | Product/style taxonomy. |
| `rating_attributes` | DEPLOYED_REQUIRED | Active structured rating definitions and weights. |
| `bonus_attributes` | DEPLOYED_OPTIONAL | Optional bonus choices for applicable ratings. |
| `ratings` | DEPLOYED_REQUIRED | Owner rating header/history. |
| `rating_scores` | DEPLOYED_REQUIRED | Normalised component scores for a rating. |
| `bonus_attribute_rating_mapping` | DEPLOYED_OPTIONAL | Normalised optional bonus selections. |
| `cellar` | DEPLOYED_REQUIRED | Owner-private cellar CRUD. |
| `profiles` | UNAVAILABLE | No deployed persistence collection is evidenced; profile read remains session-backed and update fails explicitly. |

Prototype/game/account-lifecycle target collections are outside this launch classification unless separately activated by an approved delivery.

## Catalogue contract

### `products`

DEPLOYED_REQUIRED for launch identity and presentation:

- `id`
- `product_name`

DEPLOYED_OPTIONAL catalogue relationships/metadata:

- `product_category_id`
- `producer_id`
- `abv`
- `ibu`
- `declared_category`
- `edition`
- `collaboration`
- `product_image`

The application must tolerate legitimate absence of optional catalogue enrichment. It must not rename `product_category_id` to `category_id` at the provider boundary.

### `producers` and `categories`

The collections themselves are DEPLOYED_REQUIRED for the launch catalogue. Service validators may require stable identifiers on returned rows while treating non-key descriptive/enrichment fields according to the detailed schema mapping and observed response contracts.

Collaboration attribution must never use a sentinel producer ID such as `0`. Where the current provider representation cannot safely encode all producers, preserve the gap as a data-model/schema issue rather than fabricating a relationship.

## Rating read/write contract

### `ratings`

DEPLOYED_REQUIRED active-header fields:

- server-authoritative owner identity (`user_id` at the trusted boundary)
- `product_id`
- `date_rated`
- `total_unweighted`
- `total_weighted`

DEPLOYED_OPTIONAL active-header field:

- `cellar_id`

The server derives owner identity and rating totals. The browser never authoritatively supplies them.

The following durable idempotency/workflow fields are DEFERRED_TARGET under issue #165 and must not become launch preconditions before provider migration and connected certification:

- `rating_id` as durable client submission identity
- `submission_key`
- `submission_fingerprint`
- `submission_state`
- `submission_version`
- `expected_score_count`
- `expected_bonus_count`
- `deleted_at`

### `rating_scores`

DEPLOYED_REQUIRED active write relationship/values:

- `rating_id`
- `attribute_id`
- `attribute_score`
- server-authoritative `user_id` where the provider contract stores owner identity on child rows

DEFERRED_TARGET integrity capability:

- deterministic child `uniqueness_key`
- provider-enforced uniqueness/conditional workflow guarantees required by #165

Score `1` is valid and must not be treated as missing.

### `bonus_attribute_rating_mapping`

The collection is DEPLOYED_OPTIONAL because a rating may have zero bonus selections.

When a bonus row is written, the current evidenced provider field name is:

- `bonus_attributes_id`

Active boundary fields are:

- `rating_id`
- `bonus_attributes_id`
- server-authoritative `user_id` where stored by the provider contract

`bonus_attribute_id` is **not** a launch write alias.

DEFERRED_TARGET integrity capability:

- deterministic bonus-row `uniqueness_key`
- provider-enforced uniqueness/conditional workflow guarantees required by #165

## Cellar contract

The `cellar` collection is DEPLOYED_REQUIRED for the private cellar journey. Server identity remains authoritative and browser writes are constrained by the gateway allowlist.

Current evidenced lifecycle/write fields include:

- `status`
- `quantity_acquired`
- `date_consumed`
- `acquisition_type`
- `historical_import`

DEPLOYED_OPTIONAL relationship field:

- `series_version_id`

Sharing-series/version relationships remain nullable. `series_edition_id` is not a launch write alias. Zero/fabricated relationship identifiers are invalid substitutes for `null`.

The exact writable-field allowlist in the cellar gateway is authoritative for browser mutation; this classification must remain aligned with it.

## Profile capability

Persistent `profiles` storage is UNAVAILABLE in the currently evidenced launch schema.

Permitted current behaviour:

- profile GET may project authenticated session identity/display data;
- profile PUT must fail explicitly with the existing persistence-unavailable contract.

A future `profiles` collection, editable field allowlist and owner/uniqueness policy require provider migration evidence before profile persistence may be enabled.

## Provider/certification boundary

This classification permits application alignment from supplied provider exports without pretending that repository evidence is fresh live schema introspection.

Before advancing a DEFERRED_TARGET capability, record as applicable:

1. production-equivalent schema/field evidence;
2. permissions and owner-boundary evidence;
3. uniqueness/constraint behaviour;
4. conditional-update/concurrency behaviour where required;
5. migration/backfill and cleanup evidence;
6. connected smoke evidence against the exact deployed application/provider combination.

Destructive production test writes are prohibited unless an explicitly safe authorisation and cleanup path exists.

## Change rule

Any launch service or validator change that starts requiring a field classified DEPLOYED_OPTIONAL, DEFERRED_TARGET or UNAVAILABLE must either:

- prove the field/capability has moved to DEPLOYED_REQUIRED through the governed provider evidence path; or
- retain compatibility with the currently deployed contract.

Update this file, `schema-mapping.md`, `DATA_MODEL.md` and affected boundary tests together when a provider migration changes a launch classification.
