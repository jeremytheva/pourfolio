# DATA_MODEL.md

## Purpose

This is the project-level data model summary. The detailed repository contract in `docs/DATA_MODEL.md` and `docs/nocodebackend/schema-mapping.md` remains authoritative for field-level implementation.

## Provider instance

**NoCodeBackend instance:** `54026_rating`

The launch code must use deployed schema facts rather than proposed target fields that are not yet present.

## Core launch entities

```mermaid
erDiagram
    PRODUCERS ||--o{ PRODUCTS : produces
    CATEGORIES ||--o{ PRODUCTS : classifies
    PRODUCTS ||--o{ RATINGS : receives
    PRODUCTS ||--o{ CELLAR : stored_as
    RATINGS ||--o{ RATING_SCORES : contains
    RATING_ATTRIBUTES ||--o{ RATING_SCORES : defines
    RATINGS ||--o{ BONUS_ATTRIBUTE_RATING_MAPPING : has
    BONUS_ATTRIBUTES ||--o{ BONUS_ATTRIBUTE_RATING_MAPPING : defines
    CELLAR o|--o{ RATINGS : may_source
```

## Canonical collection names

Launch paths use:

- `products`
- `producers`
- `categories`
- `ratings`
- `rating_scores`
- `rating_attributes`
- `bonus_attributes`
- `bonus_attribute_rating_mapping`
- `cellar`

Legacy names such as `beverages_pf2025`, `ratings_pf2025`, `cellar_items_pf2025` and `beverage_id` are not canonical launch identifiers.

## Ownership

Private user data is owner-scoped.

The browser must not authoritatively write:

- `user_id`;
- provider secrets;
- roles;
- authoritative rating totals;
- provider workflow metadata.

Authenticated owner identity comes from the server-side session.

## Products

`products` is the canonical beer catalogue entity.

Important relationships:

- `producer_id` → `producers`
- `category_id` → `categories`

Launch behaviour depends on stable product identity. Product routes, provider responses and browser projections must agree on the requested product identifier.

Current data work includes reconciliation of orphaned producer/category references and deterministic browse ordering before catalogue certification.

## Producers and collaborations

A product may require attribution to more than one producer for collaboration beers.

A sentinel producer ID such as `0` must not be used to represent collaboration. Collaboration needs an explicit relationship capable of preserving all participating breweries.

Where the currently deployed schema cannot represent multiple producers safely, the gap must be handled as a schema/data-model issue rather than silently collapsing collaboration to one brewery or inventing an invalid producer.

## Categories

Categories form a hierarchy.

The canonical catalogue audit must verify:

- unique category IDs;
- valid parent references;
- no self-reference;
- no cycles;
- required ancestry to the launch root;
- deterministic relationships for every product.

## Ratings

`ratings` is the rating header.

Current deployed fields include:

- `product_id`;
- optional `cellar_id`;
- `date_rated`;
- `total_unweighted`;
- `total_weighted`.

Totals are server-authoritative.

A rating does not require a sharing series or edition.

## Rating scores

`rating_scores` stores normalised component scores linked to:

- one rating;
- one rating attribute.

The public catalogue must not expose individual private rating rows merely to compute product aggregate summaries.

## Bonus attributes

Optional bonus ratings use:

- `bonus_attributes`;
- `bonus_attribute_rating_mapping`;
- `bonus_attribute_rating_mapping.bonus_attribute_id`.

Bonus relationships are optional.

## Cellar

`cellar` is private owner data.

Current deployed lifecycle fields include:

- `status`;
- `quantity_acquired`;
- `date_consumed`;
- `acquisition_type`;
- `historical_import`;
- optional `series_edition_id`.

Sharing-series / edition relationships are optional and must be null when not applicable.

A rating may optionally reference a cellar record, but rating validity must not depend on sharing-series metadata.

## Rating idempotency target

The durable target schema requires enough information to make coordinated rating writes retry-safe.

Target capabilities include:

- stable client submission identity;
- submission fingerprint;
- workflow state;
- expected child counts;
- deterministic child uniqueness keys;
- version / conditional update semantics;
- safe partial-write reconciliation.

These fields must not be treated as deployed until issue #165 is completed and provider behaviour is verified.

## Account export and deletion projections

The repository's account export and account-deletion structures are **in-memory server projections**, not new NoCodeBackend collections.

They do not alter the provider schema and must not be mistaken for deployed database tables.

## Migration rules

Any schema change must include:

- explicit deployed-field contract;
- compatibility assessment;
- backfill strategy where needed;
- uniqueness / constraint rollout sequencing;
- fixture and test updates;
- permission review;
- recovery / rollback or safe-forward consideration;
- updated schema mapping;
- connected-provider verification before dependent features are enabled.

## Data integrity rules

- Never invent missing producer/category mappings.
- Never use invalid sentinel IDs to model unresolved relationships.
- Preserve null separately from absent where the contract distinguishes them.
- Keep optional sharing-series relationships optional.
- Verify ownership before private mutation.
- Verify parent/child relationships before coordinated write completion.
- Do not declare imported or exported files canonical until reconciliation evidence exists.
