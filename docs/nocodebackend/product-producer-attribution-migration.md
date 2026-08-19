# Product-to-producer attribution migration

## Purpose

Issue #164 requires collaboration beers to retain every participating brewery instead of forcing a single `products.producer_id` or the invalid placeholder value `0`.

The supplied `54026_rating_products.csv` contains seven products with `producer_id = 0`. The supplied ratings workbook provides brewery evidence for four of those products. The other three must not be guessed.

## Target collection

Create a `product_producers` junction collection/table with:

| Field | Requirement |
| --- | --- |
| `id` | Provider-generated primary key. |
| `product_id` | Non-null positive `products.id`. |
| `producer_id` | Non-null positive `producers.id`. |
| `is_primary` | Non-null boolean/0-1 marker; at most one primary producer per product. |
| `role` | Optional short role such as `producer` or `collaborator`; not required by the browser contract. |

Required controls:

- unique `(product_id, producer_id)`;
- foreign-key/relationship validation to `products.id` and `producers.id` where supported;
- no zero identifiers;
- authenticated catalogue reads only through the Pourfolio gateway;
- administrative/provider-controlled writes only.

Keep `products.producer_id` during the compatibility period. For migrated collaborations it should reference the designated primary producer, never `0`.

## Evidence-backed collaboration backfill

The following mappings are supported by the supplied ratings workbook and producer export:

| Product ID | Product | Producer ID | Producer | Primary |
| ---: | --- | ---: | --- | --- |
| 324 | Vampyre Lovers | 8 | Akasha Brewing Company | Yes |
| 324 | Vampyre Lovers | 101 | Newstead Brewing Co | No |
| 320 | Gluttony Imperial Pastry Stout | 121 | Rocky Ridge Brewing | Yes |
| 320 | Gluttony Imperial Pastry Stout | 107 | One Drop Brewing Co | No |
| 323 | The Abomination | 84 | Kaiju! Beer | Yes |
| 323 | The Abomination | 156 | Working Title | No |
| 319 | Can I Kick It | 114 | Range | Yes |
| 319 | Can I Kick It | 85 | Kicks Brewing | No |

For these four products:

1. create both junction rows;
2. set `products.collaboration = 1`;
3. replace `products.producer_id = 0` with the primary producer ID shown above.

## Unresolved zero producer rows

The supplied product export also contains these `producer_id = 0` rows without sufficient brewery evidence in the supplied ratings workbook:

- product 318 — Brekkie Juice;
- product 321 — Lumberjack;
- product 322 — Oaked Guava DIPA.

For these rows, replace `producer_id = 0` with `NULL` unless additional authoritative source evidence is supplied. Do not set `collaboration = 1` and do not create junction rows by inference alone.

## Ordinary-product backfill

For every product whose existing `producer_id` is a valid positive producer identifier, create one junction row using that producer and mark it primary. The operation must be idempotent through the unique `(product_id, producer_id)` constraint.

## Application compatibility

The catalogue API exposes:

- `producer`: the primary/legacy-compatible producer;
- `producers`: every attributed producer, ordered with the primary producer first.

Until the provider junction is deployed, the catalogue gateway falls back to the existing positive `products.producer_id` so ordinary products remain readable. A legacy zero producer is never exposed as a real producer.

## Verification before closing #164

- no `products.producer_id = 0` remains;
- every ordinary product with a known producer has at least one junction row;
- each known collaboration above has exactly the two evidence-backed producers;
- `(product_id, producer_id)` duplicates are impossible;
- API responses for the four known collaborations expose both producers;
- ordinary single-producer responses remain compatible;
- producer-based game/history logic must use the junction relationship before Brew Done It is enabled.

The final item remains a release gate for Brew Done It; the current launch catalogue support does not itself enable that deferred game feature.
