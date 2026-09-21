# Bonus attributes

## Purpose

This document defines the Pourfolio bonus-attribute workflow used by the beer rating form.

## Source-backed data model

The supplied NoCodeBackend export contains four related structures:

- `bonus_attributes` — descriptor rows with `description` and optional `point_value`;
- `bonus_attribute_categories` — named categories;
- `bonus_attribute_category_mapping` — category-to-bonus-attribute relationships;
- `bonus_attribute_rating_mapping` — the bonus attributes selected for a rating.

The supplied Tasting Paddle rating workbook records multiple bonus descriptors for a single rating, and the import workbook maps historical descriptor text to canonical `bonus_attribute_id` values. The application therefore treats bonus attributes as selectable descriptors rather than free-text rating notes.

The supplied `bonus_attributes` data contains historical rows whose `point_value` is blank. This feature does not mutate those source rows. A blank historical value receives an effective value of `0.2` when used in rating calculation; an existing stored numeric value is preserved.

## Category authority and canonical model

Provider category rows and `bonus_attribute_category_mapping` remain authoritative at runtime. The frontend must not contain a duplicate hard-coded descriptor catalogue.

The canonical category model used for beer ratings is:

1. Design
2. Appearance
3. Aroma
4. Mouthfeel
5. Flavour
6. Follow
7. Burp
8. Overall

`Bonus` is not itself a descriptor category. Bonus is the score derived from the descriptors selected across the other categories.

A bonus attribute may belong to more than one category where the descriptor genuinely applies to multiple rating dimensions. For example, hop/resin descriptors may be relevant to both Aroma and Flavour, while `Layers` may apply to Flavour and Follow. Selection state is keyed by bonus-attribute ID, so a multi-category attribute contributes its point value only once.

The accepted remediation plan for the 82 supplied canonical descriptors is stored in:

`data/bonus_attribute_category_plan.csv`

That file is migration/remediation input, not a browser fallback. New provider or user-created attributes are not silently inferred from this file.

## Rating-form behaviour

For each rating dimension that has provider-mapped bonus attributes:

- the relevant descriptors are directly visible beneath that rating card;
- the card has its own search field, scoped only to descriptors mapped to that rating dimension;
- search is case-insensitive, punctuation-insensitive and multi-word token based;
- selected descriptors remain selected while searching and when moving between rating cards.

Known historical category aliases remain supported, including `Appearence` → Appearance and `Finish` → Follow.

After the manual rating cards, the rating flow presents an **All bonus attributes** step.

### Overall attributes

The Overall category is displayed immediately and is not hidden behind a disclosure. It contains whole-beer descriptors that are not tied to one specific rating dimension.

User-created custom attributes are assigned to Overall and appear in this visible section as soon as creation succeeds.

### Other attributes

All non-Overall categories are grouped under **Other attributes** and are collapsed by default.

The final browser provides:

- independent category expand/collapse controls;
- **Show all categories** and **Hide other categories** controls;
- search across category names and attribute descriptions;
- automatic reveal of matching non-Overall groups while a search is active;
- current selected bonus-point total and calculated Bonus score;
- owner creation of a new custom bonus attribute.

Selecting the same attribute from a rating card or the final browser changes the same selection state.

## Search contract

Bonus-attribute search normalises case and punctuation, then requires every query token to be present in the searchable category/descriptor text.

Examples:

- `RESIN!!!` matches `Soooo Resinous`;
- `wet hops` matches `Slap you in the face with bag of wet hops`;
- `smooth delicious` matches `SSD (Smooth Sweet and Delicious!)`;
- a query on an Aroma rating card cannot reveal Follow-only attributes.

Search changes presentation only. It never changes selection state or score calculation.

## Bonus score derivation

Each selected descriptor contributes its effective `point_value` to a bonus-point total.

| Selected bonus-attribute points | Bonus score |
| ---: | ---: |
| `0` | `0` |
| `> 0` and `< 2` | `1` |
| `>= 2` | `2` |

Bonus is therefore **not manually rated**. The browser may show a live derived preview, but the server remains authoritative.

On submission the server:

1. validates selected bonus IDs against attributes visible to the authenticated user;
2. reloads their provider-backed point values;
3. sums the effective values once per selected attribute ID;
4. derives Bonus `0`, `1` or `2`;
5. discards/replaces any client-supplied Bonus score before calculating authoritative `/5` rating totals;
6. stores selected IDs in `bonus_attribute_rating_mapping`.

## User-created bonus attributes

Authenticated users may create a personal bonus attribute from the final bonus browser.

Rules:

- description is required and limited to 255 characters;
- default point value in the interface is `0.2`;
- allowed values are `0.1` through `0.8` in `0.1` increments;
- default/fixed category is `Overall`;
- the server assigns authenticated `user_id`; the browser cannot choose an owner;
- personal attributes and their category mappings are visible only to their owner;
- duplicate visible descriptions are rejected;
- creation is compensated if the required category mapping cannot be created.

The server reuses an existing visible `Overall` category where available. If no Overall category exists, it creates an owner-scoped Overall category for the user.

## Canonical provider mapping reconciliation

`scripts/reconcile-bonus-attribute-categories.js` compares the provider catalogue with `data/bonus_attribute_category_plan.csv`.

The default mode is a dry-run. It:

- verifies that each planned global bonus-attribute ID still exists;
- verifies that its description still matches the reviewed source descriptor;
- detects duplicate global category rows;
- reports missing canonical categories;
- reports missing category mappings;
- performs no writes.

Live apply is additive only. It creates missing global categories and missing global category mappings; it does not delete provider rows or rewrite descriptor text.

Apply is fail-closed and requires:

- `RUN_LIVE_BONUS_CATEGORY_RECONCILIATION=1`;
- server-side `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE`;
- exact `LIVE_BONUS_CATEGORY_RECONCILIATION_CONFIRMATION=APPLY LIVE BONUS ATTRIBUTE CATEGORY PLAN`;
- `EXPECTED_LIVE_BONUS_CATEGORY_MUTATIONS` matching the immediately preceding dry-run count;
- successful post-write verification showing zero remaining planned mutations.

A provider description mismatch or catalogue drift blocks the apply rather than silently remapping a different record.

## Privacy and authority

Global provider rows and the current user's own custom rows may appear in their rating form. Custom rows belonging to other users are excluded from the bonus catalogue.

The browser cannot authoritatively set:

- bonus ownership;
- category ownership;
- rating ownership;
- final Bonus score;
- final weighted/unweighted totals.

These remain server-owned decisions.
