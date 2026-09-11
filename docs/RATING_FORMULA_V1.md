# Pourfolio Rating Formula v1

## Status

**Accepted application scoring contract for implementation.**

This document defines the versioned Pourfolio beer-rating formula and the derived venue-score semantics. It does not assert that venue persistence or rating-to-venue attribution is currently deployed.

## Launch scope

Pourfolio launch scope remains beer-only unless repository authority explicitly changes it.

## Rating inputs

Each beer rating contains the following user-scored dimensions:

| Attribute | Input range |
| --- | ---: |
| Design | 1–7 |
| Appearance | 1–7 |
| Aroma | 1–7 |
| Mouthfeel | 1–7 |
| Flavour | 1–7 |
| Follow | 1–7 |
| Bonus | 0–2 |
| Burp | 0 or 1 |

The application exposes two final totals, both out of 5:

- **Weighted total** — the primary Pourfolio score.
- **Unweighted total** — a secondary diagnostic/detail score where each dimension contributes equally after normalisation.

Totals remain server-authoritative when persisted.

## Normalisation

For Design, Appearance, Aroma, Mouthfeel, Flavour and Follow:

`normalised = score / 7`

For Bonus:

`normalised = score / 2`

For Burp:

`normalised = score`

All normalised dimensions are therefore in the range 0–1.

## Unweighted total

`unweighted = 5 * mean(all eight normalised dimensions)`

Equivalently:

`unweighted = 5 * (D + Ap + Ar + M + F + Fo + B + Bu) / 8`

where each variable is its normalised value.

## Weighted total

Version 1 uses these weights:

| Attribute | Weight |
| --- | ---: |
| Design | 10% |
| Appearance | 10% |
| Aroma | 15% |
| Mouthfeel | 15% |
| Flavour | 30% |
| Follow | 10% |
| Bonus | 7% |
| Burp | 3% |
| **Total** | **100%** |

`weighted = 5 * (0.10D + 0.10Ap + 0.15Ar + 0.15M + 0.30F + 0.10Fo + 0.07B + 0.03Bu)`

The weighted score is the default score shown in compact UI. Detailed rating views should also expose the unweighted score and component breakdown.

## Precision

- Calculate using full numeric precision.
- Persist authoritative totals according to the backend contract.
- Display totals to two decimal places unless a specific UI context requires less precision.
- Do not repeatedly round intermediate normalised values.

## Formula versioning

The semantic identity of this formula is **Pourfolio Rating Formula v1**.

Future changes to component ranges, normalisation, weights or aggregation semantics require a new formula version. Historical ratings must not silently be reinterpreted as though they were created under a later formula unless an explicit governed migration is approved.

## Venue-derived score

A future venue score is derived only from beer/product ratings that have a **verified rating-to-venue attribution**.

For a venue with `n` qualifying ratings:

`venue_weighted = sum(rating.total_weighted) / n`

`venue_unweighted = sum(rating.total_unweighted) / n`

Venue attribute summaries may also expose aggregate component averages/distributions from qualifying ratings.

The venue score means **how products consumed/rated at the venue performed**. It is not a rating of service, staff, food, ambience, facilities or general hospitality quality.

UI should label this clearly as **Pourfolio Venue Score** or **Product Rating** and show the qualifying rating count.

## Current venue data boundary

The current verified launch schema does not provide an authoritative `venues` entity or verified rating-to-venue relationship. Therefore:

- do not fabricate venues;
- do not infer a venue from free text or unrelated product/producer data;
- do not display a real venue score until the entity and relationship are deployed and verified;
- any `venue_id` field or relationship-table change is a separately governed provider migration/certification dependency;
- no provider schema/data mutation is authorised by this document.

## Accessibility and rating-flow guidance

The rating flow should present:

`Design → Appearance → Aroma → Mouthfeel → Flavour → Follow → Bonus → Burp → Review`

Design through Follow use the accessible 1–7 sliding/tap interaction. Bonus uses a 0/1/2 interaction. Burp uses a binary 0/1 interaction. The Review screen exposes both weighted and unweighted totals before submission.
