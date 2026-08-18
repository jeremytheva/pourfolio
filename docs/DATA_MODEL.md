# Data model

The uploaded NoCodeBackend database structure is the authoritative launch schema for the currently deployed beer-rating and cellar paths. The broader target model remains documented in [Canonical NoCodeBackend schema mapping](nocodebackend/schema-mapping.md), but code must not require proposed fields before those fields are actually deployed.

The application uses the supplied relational names:

- `products` and `product_id`;
- `producers`;
- `categories`;
- `ratings`;
- normalised `rating_scores`;
- `rating_attributes`;
- `bonus_attributes` and `bonus_attribute_rating_mapping`;
- `cellar`.

Legacy `beverages_pf2025`, `ratings_pf2025`, `cellar_items_pf2025` and `beverage_id` names are not used by launch routes.

## Current deployed field contract

The current database uses:

- `cellar.series_edition_id` for the optional sharing-series edition relationship;
- `bonus_attribute_rating_mapping.bonus_attribute_id` for optional rating bonuses;
- the cellar lifecycle fields `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` and `historical_import`;
- a compact `ratings` header containing `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`.

Sharing series and edition references on cellar records are nullable and optional. They must be `NULL` when not applicable and are never fabricated to satisfy a rating or cellar write.

The current `ratings` table does **not** expose the proposed submission-state, fingerprint, version, expected-child-count or deletion-tombstone fields described in the target schema mapping. The launch gateway therefore must not send those fields to NoCodeBackend. Retry reconciliation that depends on those undeployed idempotency fields is unavailable until the database migration is completed and verified.

The browser cannot write `user_id`, `secret_key`, roles, rating totals or provider metadata. Identity and rating totals are server authoritative.

## Collaboration limitation

`products.producer_id` can represent only one producer. The current schema has no product-to-producer junction table, so a collaboration cannot correctly attribute two or more breweries without a schema change. `products.collaboration` identifies that a product is collaborative but does not preserve all producer relationships. A dedicated many-to-many product/producer relationship is required before collaboration attribution is considered complete.
