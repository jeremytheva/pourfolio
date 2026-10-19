# Pourfolio rating formula

## Current application contract — v2

The current implementation declares formula version `v2` in
`src/lib/ratingFormulaV1.js`. The existing filename and this document path are
retained for compatibility. The v1 specification below is historical, not the
formula for new v2 submissions. This reconciliation documents implemented
behaviour; it changes no scores, preferences, provider schema or historical data.
Provider-backed integrity and scoring certification remain separate release gates.

### Inputs and normalisation

| Dimension | Input | Contribution to v2 totals |
| --- | --- | --- |
| Appearance, Aroma, Mouthfeel, Flavour, Follow | Integer 1–7 | Divide by 7, then apply the relevant weight. |
| Bonus | Server-derived integer 0–2 | Divide by 2, then apply the Bonus weight. |
| Design | Optional integer 1–7 | Fun dimension, no direct contribution. |
| Burp | Optional 0 or 1 | Fun dimension, no direct contribution. |

Bonus is derived from the selected canonical bonus attributes, not a
browser-authoritative score. Distinct selected attribute IDs contribute their
point values once. A point total at or below zero gives Bonus 0; a positive
total below 2 gives Bonus 1; a total of at least 2 gives Bonus 2. The server
rebuilds that value before validating and calculating a submission.

### Default and personalised totals

| Scoring dimension | Default weight |
| --- | ---: |
| Appearance | 10% |
| Aroma | 10% |
| Mouthfeel | 20% |
| Flavour | 25% |
| Follow | 25% |
| Bonus | 10% |

For normalised dimension values `n_i` and positive weights `w_i`:

`weighted = 5 × sum(w_i × n_i) / sum(w_i)`

Only positive-weight scoring dimensions enter the calculation. Each such
dimension must have a valid recorded score. A zero-weight dimension may be
omitted or scored without changing the personalised total. Weights must be
finite values from 0 to 1 and at least one must be positive. Design/Burp
numeric scores do not enter either scoring weight set.

The current settings UI reserves Bonus at 10% and rebalances the five other
dimensions to 90%, preserving elected zero weights. The formula/submission
boundary separately accepts valid explicit weight sets, including zero Bonus;
it does not itself enforce that UI allocation. These are distinct implemented
boundaries, not evidence that UI personalisation and provider persistence have
been fully certified. Do not infer a new product rule or silently rewrite old
weights from this documentation reconciliation.

The current **standard/comparison total** applies the default weights to the
same recorded values. Its provider compatibility field is
`total_unweighted`; the name does not mean an equal-weight average in v2.
When a default-weight dimension was legitimately omitted from a personalised
rating, that comparison cannot be computed and remains null. Never replace
the missing dimension with zero or a current preference.

Calculate with full precision and round persisted weighted/comparison totals
to two decimals at the submission boundary. A completed persisted total must
be greater than zero and at most 5. Historical reads use saved totals and
recorded component rows, not a reconstruction using today's settings.

### Advanced scores

**Score out of 100** is the absolute conversion `weighted × 20`. It is
different from a relative Scaled Score.

**Overall Scaled Score** compares the qualifying completed rating with the
completed-rating population. **Style Scaled Score** uses the existing verified
style/cohort and eligibility rules. Population reads traverse all provider
pages; incomplete, failed or deleted workflow records must not enter the cohort.
Retain returned cohort/eligibility metadata and show unavailable results honestly.

For an eligible cohort of size `N > 1` containing the compared score:

`average_rank = count(lower scores) + (count(equal scores) + 1) / 2`

`scaled_score = 100 × (average_rank - 1) / (N - 1)`

Ties use their average rank. A singleton or entirely tied cohort returns 50.
An unavailable/empty cohort returns null. This is relative position in the
defined cohort, not another absolute conversion of the rating.

**Retail PPP** and **Purchased PPP** use the relevant price independently.
First normalise to 375 ml:

`price_375 = price × 375 / volume_ml`

Then select the adjustable dollar score:

| Normalised price | Dollar score |
| --- | ---: |
| Below 6 | 10 |
| 6 to below 8 | 10.33 |
| 8 to below 10 | 10.66 |
| 10 to below 15 | 11 |
| 15 to below 20 | 12 |
| 20 to below 25 | 13 |
| 25 to below 30 | 14 |
| 30 and above | `15 + floor((price_375 - 30) / 2.5)` |

`PPP = weighted / dollar_score × 375`

Higher PPP indicates better value under this formula. A missing, non-positive
or invalid price/volume produces no PPP; it is not a valid zero-price bargain.
Advanced-score display rounds according to the implementation and must not
change the saved rating itself.

### User interface and history

The review view shows the personalised total and available standard comparison,
derived Bonus and elected dimension/descriptor details. Zero-weight and fun
dimensions remain optional. Attribute-specific bonus search/grouping and
collapsed recorded breakdowns remain governed by the existing rating UI and
history contracts. Public breakdown access additionally requires the current
sharing/ownership policy; this formula gives no permission to disclose history.

### Version and data boundary

Future scoring changes require a versioned decision, implementation, regression
coverage and any applicable governed data migration. A documentation correction
does not authorise recalculating v1/imported ratings or inferring missing historical
weights. Preserve stored history and explicitly distinguish unavailable values.
The future verified-venue attribution boundary retained below is unchanged.

## Retained v1 specification — historical

The following original v1 specification is retained for traceability. Its
all-eight-dimension weights and equal-weight diagnostic formula do not govern
new v2 submissions.

## Status

**Historical v1 contract, superseded for new v2 submissions.**

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
