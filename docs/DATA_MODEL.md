# Data model

The authoritative beer-first data model is maintained in [Canonical NoCodeBackend schema mapping](nocodebackend/schema-mapping.md).

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

Sharing series and edition references on cellar records are nullable and optional. They must be `NULL` when not applicable and are never fabricated to satisfy a rating or cellar write.

The browser cannot write `user_id`, `secret_key`, roles, rating totals or provider metadata. Identity and totals are server authoritative.

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
