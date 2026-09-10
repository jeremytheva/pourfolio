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
| `product_producers` | UNAVAILABLE | No junction collection is present in the supplied backend export; launch uses `products.producer_id`. |
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

The deployed producer relationship is `products.producer_id -> producers.id`. The supplied backend export contains no `product_producers` junction table, so launch code must not query one. Response compatibility may expose both a singular `producer` and a `producers` array, but the array can contain only the single producer evidenced by `producer_id`.

Collaboration attribution must never use a sentinel producer ID such as `0`. A zero or missing `producer_id` remains unresolved rather than being converted into fabricated producer data. A future multi-producer relationship requires governed provider migration and verification before the launch path can depend on it.

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

The `cellar` collection is DEPLOYED_REQUIRED for the private cellar journey. Server identity remains authoritative and browser writes are constrained by the same canonical allowlist at both the browser service boundary and the server gateway.

DEPLOYED_REQUIRED create field:

- `product_id`

The server derives `user_id` from the authenticated session. `user_id` is never a browser-authoritative writable field.

DEPLOYED_OPTIONAL writable fields evidenced by the supplied cellar schema/export contract are:

- `location_id`
- `quantity`
- `mls`
- `container`
- `purchase_price`
- `retail_price`
- `date_received`
- `sharing_series_id`
- `series_version_id`
- `purchase_location_id`
- `purchased_by_id`
- `gift`
- `gift_from`
- `bet_id`
- `notes`

The supplied backend table does **not** contain the previously documented fields `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` or `historical_import`. They are UNAVAILABLE for the current launch contract and must not cross the browser write boundary or be fabricated in API projections.

`date_received` may be omitted on create because the server supplies the current date when absent. All other optional fields must remain optional even where a particular UI chooses to require or default a value.

`sharing_series_id` and `series_version_id` are nullable relationships. `series_edition_id` is not a launch write alias. Zero/fabricated relationship identifiers are invalid substitutes for `null`.

The browser service projects create/update bodies through this allowlist before sending them. The server gateway independently repeats allowlisting, type/range/date normalisation, relationship validation and owner enforcement; browser projection is a contract-drift control, not a security boundary.

Any field not listed above—including `user_id`, `secret_key`, `series_edition_id`, the unavailable lifecycle fields and arbitrary caller keys—must not cross the browser cellar write boundary. Adding a new cellar write field requires provider evidence plus coordinated updates to this classification, `CELLAR_EDITABLE_FIELDS`, browser projection, gateway sanitisation and boundary tests.

## Profile capability

Persistent `profiles` storage is UNAVAILABLE in the currently evidenced launch schema.

Permitted current behaviour:

- profile GET may project authenticated session identity/display data;
- profile PUT must fail explicitly with the existing persistence-unavailable contract.

A future `profiles` collection, editable field allowlist and owner/uniqueness policy require provider migration evidence before profile persistence may be enabled.

Until `schema-mapping.md` is reconciled, any persistent-profile rows or required-field statements there are target-state documentation only and must not override this launch classification.

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