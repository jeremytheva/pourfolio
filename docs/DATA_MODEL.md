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

- `products.producer_id` as the deployed product-to-producer relationship; the supplied backend export contains no `product_producers` junction table;
- `products.product_category_id` for product classification;
- `products.edition` as nullable free-text edition metadata, not a relational vintage/product-family identity;
- `cellar.series_version_id` for the optional sharing-series edition/version relationship;
- `bonus_attribute_rating_mapping.bonus_attributes_id` for optional rating bonuses;
- a compact `ratings` header containing `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`;
- a `cellar` row containing `product_id`, `location_id`, `quantity`, `mls`, `container`, `purchase_price`, `retail_price`, `date_received`, `sharing_series_id`, `series_version_id`, `purchase_location_id`, `purchased_by_id`, `gift`, `gift_from`, `bet_id` and `notes`, plus provider/server-owned identifiers.

The exported `cellar` table does **not** contain `status`, `quantity_acquired`, `date_consumed`, `acquisition_type` or `historical_import`; launch browser writes and API projections must not treat those fields as deployed.

These field names are pinned to the supplied schema/export evidence. `series_edition_id` and `bonus_attribute_id` are not launch write aliases.

Sharing series and edition/version references on cellar records are nullable and optional. They must be `NULL` when not applicable and are never fabricated to satisfy a rating or cellar write. `series_version_id` is not a generic beer-vintage field and must not be repurposed for product lineage.

Producer attribution is also not fabricated. A zero or missing `products.producer_id` remains unresolved until valid backend catalogue data or a governed multi-producer relationship is deployed.

The browser cannot write `user_id`, `secret_key`, roles, rating totals or provider metadata. Identity and totals are server authoritative.

## Rating event target contract

ADR [0005: Rating events, Quick Rate and repeat tastings](DECISIONS/0005-rating-events-quick-rate-and-repeat-tastings.md) governs future Quick Rate and repeat-tasting semantics.

The deployed `ratings` table does **not** currently expose an event type, standalone Quick Rate value or Quick→Full expansion relationship. Therefore Quick Rate is not a deployed capability and must not be simulated by writing an overall shortcut value into `total_weighted`.

Approved semantics are:

- user-created event types are `full_tasting` and `quick_rate`;
- every repeat tasting is a separate event; `(user_id, product_id)` is not unique;
- Full Tasting retains the structured #428 score contract and is the only event type eligible for structured attribute aggregates, Overall/Style Scaled Score and PPP;
- Quick Rate uses a separate overall `quick_score` from 0.5 through 5.0 in 0.5 increments and creates no structured `rating_scores` rows;
- Quick Rate keeps `total_unweighted` and `total_weighted` null so it cannot leak into Full Tasting aggregates;
- a later Full Tasting may link back to an earlier Quick Rate but does not overwrite or infer its structured dimensions;
- Full Tasting and Quick Rate personal/community averages remain separately labelled metrics.

Before Quick Rate can be enabled, the minimum additive provider target is:

- `ratings.event_type` (`full_tasting | quick_rate`, with migration-only `legacy_unclassified` where existing data cannot be proven to meet the Full Tasting contract);
- nullable `ratings.quick_score` constrained to the approved Quick Rate range/increment;
- nullable `ratings.expanded_from_rating_id` self-reference from a Full Tasting to an owner-held Quick Rate for the same product.

Existing `date_rated` remains the rating-event timestamp. Existing ratings may be backfilled to `full_tasting` only when their structured child data proves that classification; unknown legacy rows are not guessed. No provider mutation is authorised by documenting this target.

## Historical catalogue identity

ADR [0004: Preserve historical catalogue identity](DECISIONS/0004-historical-catalogue-identity.md) governs product/producer history.

Current structural evidence does **not** provide:

- product lifecycle state;
- producer lifecycle state;
- product-family/vintage lineage;
- product or producer alias/name history;
- producer successor/acquirer provenance.

Therefore these capabilities are future additive provider targets, not deployed fields.

Until that migration exists:

- `products.id` and `producers.id` are durable identities and must never be reused for different entities;
- products/producers referenced by ratings or cellar history are retained rather than deleted merely because they are retired, closed, acquired or historical;
- `products.edition` remains descriptive metadata only;
- `sharing_series_editions` and `cellar.series_version_id` retain their sharing-series semantics and are not overloaded as generic product editions;
- existing `ratings.product_id` and `cellar.product_id` references must continue resolving to the historical product identity originally recorded;
- historical `producer_id` attribution is not silently rewritten after acquisition/rename;
- unknown lineage/rename/acquisition relationships remain unknown rather than inferred.

The target lifecycle vocabulary is `active | seasonal | retired | historical` for products and `active | closed | acquired | renamed | historical` for producers. These states are approved semantics only; they must not be required by runtime code until an additive provider migration, backfill and connected certification are complete.

Current availability is a separate fact from lifecycle identity. A historical/retired beer can remain viewable in rating/cellar history without being represented as currently available.

The portable account export is a versioned JSON projection, not a new provider
collection. Its source-only manifest contract exact-filters the five owner-data
groups above and adds only referenced catalogue/attribute context. Its
source-only artifact contract deterministically serialises that manifest as an
in-memory UTF-8 JSON string with fixed safe metadata, byte length and SHA-256.
It persists no export job or artefact and does not change the canonical schema;
see [Portable account-export manifest contract](account-export-contract.md).

The source-only account-deletion discovery plan is also not a provider
collection. It contains only immutable exact-owner record IDs and counts for
`bonus_attribute_rating_mapping`, `rating_scores`, `ratings`, `cellar` and
`profiles`, in that child-first order. It stores no record bodies, account
identity field, job or receipt. A profile record ID may equal the account ID,
but remains an operational record identifier. The planner changes no schema;
see the
[Account-deletion discovery-plan contract](account-deletion-plan-contract.md).

The source-only account-deletion reconciliation is also an in-memory projection,
not a provider collection or persisted receipt. It consumes a validated plan and
one later complete logical owner snapshot, compares record IDs internally, and
returns only planned, removed, remaining and unplanned counts. No ID or record
body enters the result, and no schema changes; see the
[Account-deletion reconciliation contract](account-deletion-reconciliation-contract.md).

The source-only account-deletion confirmation result is a frozen in-memory
format/version/boolean value, not a provider collection, job, receipt or account
field. It contains no phrase, identity, timestamp or record selector and changes
no schema; see the
[Account-deletion confirmation contract](account-deletion-confirmation-contract.md).