# 0004: Preserve historical catalogue identity

- Status: Accepted
- Date: 2026-09-12
- Updated: 2026-09-12

## Context

Pourfolio ratings and cellar records are durable historical records. A beer can later be retired, renamed, re-released as a new vintage/edition, or associated with a brewery that closes, renames or is acquired. Those later catalogue changes must not make an old rating/cellar record resolve to a different historical identity or disappear.

The supplied NoCodeBackend structural export and CSV evidence show the current relevant deployed contract:

- `products` has stable `id`, `product_name`, `product_category_id`, `producer_id`, `declared_category`, free-text `edition`, `collaboration` and display metadata;
- `producers` has stable `id`, `producer_name`, address/suburb metadata, but no lifecycle/successor fields;
- `ratings.product_id` points historical ratings at a product identifier;
- `cellar.product_id` points cellar history at a product identifier;
- `cellar.sharing_series_id` and `cellar.series_version_id` are optional relationships associated with sharing series;
- `sharing_series_editions` contains `series_id`, `series_year`, `theme` and `description`;
- there is no deployed generic product-family/vintage relationship, no product/producer lifecycle status, and no rename/acquisition provenance relation.

`products.edition` is free text. It can describe an edition but does not establish identity/lineage between editions. `cellar.series_version_id` must not be repurposed as a generic beer vintage relationship: the deployed structural evidence ties that concept to `sharing_series` / `sharing_series_editions`, and it appears only on cellar records rather than products or ratings.

## Decision

### Stable identity

- `products.id` remains the durable identity referenced by existing ratings and cellar records.
- `producers.id` remains the durable producer identity used by catalogue relationships.
- Identifiers are never reused for a different beer, vintage/edition or producer.
- A catalogue entity referenced by ratings/cellar history is not hard-deleted merely because it is no longer current.

### Product lifecycle

The target lifecycle vocabulary is:

- `active` — currently part of the live catalogue;
- `seasonal` — intentionally intermittent/seasonal but still a current product identity;
- `retired` — no longer produced/currently offered, but retained as a first-class historical identity;
- `historical` — retained primarily to preserve historical records/provenance when normal current-catalogue use is no longer appropriate.

Retirement/history is separate from availability. A retired beer may remain viewable/rankable historically but must not be represented as currently available without separate current availability evidence.

### Producer lifecycle

The target producer lifecycle vocabulary is:

- `active`;
- `closed`;
- `acquired`;
- `renamed`;
- `historical`.

A closed/acquired/renamed brewery remains addressable by its original stable identifier. A successor/acquirer relationship, when evidenced, is additional provenance and does not rewrite historical producer identity.

### Renames

- A spelling/data correction may update the canonical display value when evidence shows the historical identity itself did not change.
- A material rename/rebrand must preserve the previous name as provenance rather than silently erasing it.
- Future schema work should support alias/name-history records (or an equivalent governed representation) with provenance and effective dates where known.
- Ratings/cellar records continue resolving through the same stable product/producer identity unless the underlying historical entity was genuinely a different entity.

### Vintages and editions

- `products.edition` remains display metadata until a governed lineage model is deployed; it is not sufficient by itself to prove two product records belong to one product family.
- A genuinely distinct vintage/edition that users may rate/cellar independently requires its own stable addressable identity.
- Future schema work should introduce an explicit product-family/edition relationship (for example, a stable product-family identifier plus edition/vintage metadata) rather than overloading `sharing_series_editions`.
- Existing `sharing_series_id` / `series_version_id` semantics are preserved for their current sharing-series purpose.
- Unknown edition/family relationships remain unknown; no relationship is inferred solely from similar names, years or free-text edition values.

### Acquisitions and producer changes

- Existing historical product rows must not have `producer_id` rewritten merely because the original producer was later acquired or renamed.
- New products released under a successor entity may reference the successor producer when supported by source evidence.
- If the same beer identity continues across a corporate/name change, the future provenance model must distinguish historical producer attribution from current commercial ownership rather than mutating old history invisibly.

### Deletion and duplicate remediation

Hard deletion of a referenced product/producer is exceptional. It is permitted only through a separately governed remediation/migration that:

1. proves the entity is an invalid duplicate/error rather than valid history;
2. identifies every rating, cellar and other dependent reference;
3. has an explicit canonical destination where references must move;
4. provides backup/recovery or safe-forward evidence;
5. verifies no history is orphaned or silently reassigned.

Ordinary retirement/closure never satisfies this exceptional deletion rule.

## API and UI semantics

- Current catalogue/discovery surfaces may default to current products but must have a path to historical identities when a direct historical rating/cellar reference is opened.
- Product and producer detail responses should eventually expose lifecycle state as factual catalogue metadata once the provider contract exists.
- Availability and lifecycle are independent: `retired`/`historical` means identity state, not proof of current stock absence/presence.
- Rankings must state whether historical/retired entries are included and provide deterministic filters once #441 is implemented.
- Beer Style Explorer and Taste Profile may retain historical entries where they are needed to represent the user's actual history.
- A renamed/retired/closed label must not cause rating or cellar routes to break.

## Required future provider migration

The current deployed schema cannot fully implement this decision. A later governed migration must evaluate the minimum additive representation for:

- product lifecycle state;
- producer lifecycle state;
- product-family / vintage-edition lineage;
- prior/current product and producer names or aliases;
- successor/acquirer relationships where useful;
- provenance/effective-date metadata where source evidence supports it.

Prefer additive fields/tables over destructive rewrites. Any migration must preserve existing product and producer IDs and include backup/recovery, backfill rules and connected evidence before activation.

No migration is authorised by this ADR.

## Consequences

- Historical ratings and cellar records remain meaningful over time.
- Current availability can evolve without deleting historical identity.
- `series_version_id` remains semantically clean and is not overloaded for product vintages.
- The product catalogue may contain inactive records indefinitely; discovery must use lifecycle filters rather than deletion to control current views.
- Future rankings, Match Score, Taste Map and business analytics can reason about current versus historical data explicitly.
- Catalogue corrections need a moderated migration path rather than direct destructive edits.

## Alternatives considered

### Delete retired products
Rejected because it breaks or orphans durable rating/cellar history and destroys catalogue provenance.

### Reuse `cellar.series_version_id` for beer vintages
Rejected because deployed evidence associates it with sharing-series editions, it is not present on product/rating identity, and overloading it would create ambiguous semantics.

### Store vintages only in `products.edition`
Rejected as the long-term identity model because a free-text field does not provide stable family/edition relationships, uniqueness or provenance.

### Rewrite producer IDs after acquisition
Rejected because it changes historical attribution retroactively.

## Evidence reviewed

- `54026_rating_export(2).sql` supplied backend structural export;
- `54026_rating_products.csv`;
- `54026_rating_producers.csv`;
- `54026_rating_cellar.csv`;
- `54026_rating_categories(1).csv`;
- current repository `DATA_MODEL.md` / `docs/DATA_MODEL.md` and provider schema documentation.

## Links

- #444
- #451
- #154
- #441
- `DATA_MODEL.md`
- `docs/DATA_MODEL.md`
