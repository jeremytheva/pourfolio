# Launch NoCodeBackend contract classification

## Purpose

This document is the concise launch-time application contract for the active NoCodeBackend schema. It classifies launch collections and fields so application code does not accidentally require undeployed migration targets.

The detailed field/relationship rules remain in `schema-mapping.md`. This document is the classification layer used when deciding whether a field may be required by launch services, treated as optional, or kept behind a migration/capability gate.

## Evidence semantics

The classifications below distinguish **repository-supplied or owner-confirmed provider evidence** from fresh connected introspection.

- **DEPLOYED_REQUIRED** — evidenced by the supplied provider export/contracts or a governed owner-confirmed deployment and required by the active launch application boundary.
- **DEPLOYED_OPTIONAL** — evidenced by the supplied provider export/contracts but nullable, enrichment-only or not required for every record/workflow.
- **DEFERRED_TARGET** — designed/repository-documented future provider state that must not be required until migration plus connected verification is complete.
- **UNAVAILABLE** — capability/collection not evidenced as deployed; the application must fail explicitly or use an already-approved non-persistent fallback rather than inventing persistence.

These labels do **not** claim fresh live schema introspection. Connected behaviour and readiness evidence may confirm that the configured provider is reachable, but destructive schema/constraint probes remain restricted to explicitly authorised isolated staging.

`product_producers` was owner-confirmed as created on 16 September 2026 with the fields `id`, `product_id`, `producer_id`, `is_primary` and `sort_order`. Connected provider smoke remains required as release evidence for application use of the new relationship path; this documentation update is not represented as live introspection.

`profiles` was subsequently owner-confirmed as deployed under #422 and the merged profile implementation uses the provider collection for owner create/read/update and public projection. This promotes the structural capability to `DEPLOYED_REQUIRED`; #422 remains open for connected permission, uniqueness/default-private, cross-owner and recovery certification.

## Launch collection classification

| Collection | Classification | Launch role |
| --- | --- | --- |
| `products` | DEPLOYED_REQUIRED | Catalogue and product detail source; `producer_id` remains a transitional primary-producer compatibility mirror. |
| `producers` | DEPLOYED_REQUIRED | Producer catalogue/enrichment. |
| `product_producers` | DEPLOYED_REQUIRED | Authoritative one-to-many product-to-producer relationship rows, including single-producer products. |
| `categories` | DEPLOYED_REQUIRED | Product/style taxonomy. |
| `rating_attributes` | DEPLOYED_REQUIRED | Active structured rating definitions and weights. |
| `bonus_attributes` | DEPLOYED_OPTIONAL | Optional bonus choices for applicable ratings. |
| `ratings` | DEPLOYED_REQUIRED | Owner rating header/history. |
| `rating_scores` | DEPLOYED_REQUIRED | Normalised component scores for a rating. |
| `bonus_attribute_rating_mapping` | DEPLOYED_OPTIONAL | Normalised optional bonus selections. |
| `cellar` | DEPLOYED_REQUIRED | Owner-private cellar CRUD. |
| `profiles` | DEPLOYED_REQUIRED | Owner-scoped persistent profile create/read/update plus stable public projection; connected permission/uniqueness certification remains pending #422. |

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

`products.producer_id` is retained temporarily as the compatibility mirror of the primary producer. New application writes must keep it synchronized with the primary `product_producers` row. Reads may use it only when a successful `product_producers` lookup returns no relationship rows for that product. A relationship-provider failure must not be interpreted as an empty relationship set.

`products.collaboration` is also transitional. New application writes derive it from relationship count: one producer is not a collaboration and two or more producers are a collaboration. Relationship rows are authoritative when present.

### `producers` and `product_producers`

The `producers` collection is DEPLOYED_REQUIRED for the launch catalogue. Service validators may require stable identifiers on returned rows while treating non-key descriptive/enrichment fields according to the detailed schema mapping and observed response contracts.

The authoritative product/producer relationship for new writes is:

- `product_producers.product_id -> products.id`
- `product_producers.producer_id -> producers.id`

The deployed relationship fields are:

- `id`
- `product_id`
- `producer_id`
- `is_primary`
- `sort_order`

Application writes use the relationship table for both ordinary single-producer products and collaborations. The first producer is written with `is_primary = 1` and `sort_order = 1`; additional producers use `is_primary = 0` and increasing `sort_order`. The `(product_id, producer_id)` uniqueness rule prevents duplicate producer attribution.

During migration, historical products may not yet have relationship rows. In that case only, `products.producer_id` remains the approved fallback and is projected as the single producer. New Add Beer writes create the relationship rows and also mirror the primary producer into `products.producer_id`.

Collaboration attribution must never use a sentinel producer ID such as `0`. A zero or missing relationship remains unresolved rather than being converted into fabricated producer data.

Pourfolio Feeder does not gain write authority to `product_producers` merely because the collection is deployed. Its external-writer policy remains deny until a separately certified ingestion contract authorises those writes.

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

- `bonus_attribute_id`

Active boundary fields are:

- `rating_id`
- `bonus_attribute_id`
- server-authoritative `user_id` where stored by the provider contract

`bonus_attribute_id` is the current live NoCodeBackend API field for rating bonus mappings. The retained July 2026 SQL export's `bonus_attributes_id` spelling is historical and is **not** the current launch write field.

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

The `profiles` collection is DEPLOYED_REQUIRED for the active profile capability.

Evidenced application fields are:

- `id` — provider record identity;
- `user_id` — server-authoritative immutable owner identity;
- `public_id` — stable opaque public profile identifier generated by the server;
- `name` — required display name;
- `description` — optional owner-editable profile text;
- `avatar_url` — optional owner-editable avatar reference;
- `rating_history_public` — default-private opt-in visibility flag.

The browser may edit only `name`, `description`, `avatar_url` and `rating_history_public`. It must never authoritatively write `id`, `user_id`, `public_id`, email, role or provider metadata. Public profile projection excludes internal owner identity, and rating history is exposed only when `rating_history_public` is explicitly enabled.

This classification records the governed deployed structure and current application path. It does not close #422: connected provider evidence is still required for owner create/read/update, uniqueness and default-private behaviour, cross-owner denial, public/private projection, cleanup and recovery.

## Provider/certification boundary

This classification permits application alignment from supplied provider exports and governed owner-confirmed schema changes without pretending that repository evidence is fresh live schema introspection.

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
