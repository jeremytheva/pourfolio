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

## Rating-form behaviour

Bonus categories are loaded from the provider rather than duplicated in frontend source.

For a category whose name corresponds to a rating dimension, its bonus attributes are available from a collapsed section on that rating card. Category matching is case/punctuation insensitive and preserves known historical aliases such as `Appearence` → Appearance and `Finish` → Follow.

After the manual rating cards, the rating flow presents an **All bonus attributes** step. It provides:

- every visible bonus attribute grouped under its provider category;
- independent category expand/collapse controls;
- **Show all categories** and **Hide all categories** controls;
- search across category names and attribute descriptions;
- current selected bonus-point total and calculated Bonus score;
- owner creation of a new custom bonus attribute.

Selecting the same attribute from a rating card or the final browser changes the same selection state.

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
3. sums the effective values;
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

## Privacy and authority

Global provider rows and the current user's own custom rows may appear in their rating form. Custom rows belonging to other users are excluded from the bonus catalogue.

The browser cannot authoritatively set:

- bonus ownership;
- category ownership;
- rating ownership;
- final Bonus score;
- final weighted/unweighted totals.

These remain server-owned decisions.
