# Pourfolio Interface Plan

## Launch information architecture

Primary signed-in navigation:

1. Discover
2. Breweries & Venues
3. Search
4. Cellar

Profile remains available from the account control rather than as a primary discovery tab.

## Breweries & Venues

`/places` is the shared places-discovery surface with two accessible tabs:

- **Breweries** — activates against verified producer data and only verified `products.producer_id -> producers.id` relationships.
- **Venues** — remains a truthful unavailable/awaiting-data state until a governed venue entity and verified rating-to-venue relationship are deployed and certified.

Do not fabricate venue records, product-to-venue mappings or producer relationships.

## Brewery journey

Current brewery profile route remains `/breweries/:producerId`.

Product-to-brewery links are shown only where producer attribution is verified by the launch data contract. Missing or zero producer attribution stays unresolved.

The places surface may progressively gain a full producer directory using the same verified producer capability; it must not reintroduce dummy brewery datasets.

## Venue journey

Future venue profile route target: `/venues/:venueId`.

Activation requires completion of the governed provider migration tracked separately from the safe interface work. Until then, no real venue card, link, count or score may be inferred.

The future venue detail page should show:

- venue identity from verified source data;
- Pourfolio Venue Score (weighted `/5`) as the primary product-derived score;
- unweighted `/5` score in detail;
- qualifying product-rating count;
- aggregate rating-attribute breakdown;
- products with verified ratings attributed to the venue.

The score must be described as product-derived and must not imply ratings of service, staff, food, ambience, facilities or general hospitality quality.

## Rating journey

Canonical progression:

`Design -> Appearance -> Aroma -> Mouthfeel -> Flavour -> Follow -> Bonus -> Burp -> Review`

Inputs:

- Design: 1-7
- Appearance: 1-7
- Aroma: 1-7
- Mouthfeel: 1-7
- Flavour: 1-7
- Follow: 1-7
- Bonus: 0-2
- Burp: 0 or 1

Design through Follow retain the accessible sliding/tap-card interaction with automatic progression plus Back/Next controls. Bonus and Burp use controls appropriate to their discrete ranges. Review shows both calculated totals before submission.

The versioned scoring contract is defined in `docs/RATING_FORMULA_V1.md`.

## Score presentation

Compact rating surfaces display the weighted score as the primary Pourfolio score.

Detailed rating surfaces display:

- weighted total `/5`;
- unweighted total `/5`;
- component values;
- aggregate/community context where available and privacy-safe.

Do not expose private per-rating records merely to calculate public aggregates.

## Accessibility requirements

- Primary navigation remains keyboard reachable with visible focus.
- `/places` uses correct tablist/tab/tabpanel semantics.
- Tabs must be operable without pointer input.
- Route changes retain the existing route-announcement/focus-management behaviour.
- Score controls have explicit accessible names and current values.
- Auto-advance must not prevent users from navigating backward or reviewing/editing prior answers.

## Data and migration boundaries

Launch scope remains beer-only unless repository authority changes.

A future venue entity or rating-to-venue relationship is a provider schema/data capability and is not authorised by interface implementation alone. Provider changes require the repository migration safeguards, connected verification and explicit approval where irreversible/destructive.

The #165 rating-idempotency migration boundary remains authoritative and must not be bypassed by venue work.
