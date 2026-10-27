# Style reference comparison

Owner-approved 27 October 2026; reference layer under #443.

Beer details compare recorded ABV/IBU with reviewed guide ranges. Style Explorer
reuses those ranges without inventing an example beer. Guide selection changes
only this panel: ratings, percentiles, product classifications and stored data
are untouched. Missing/invalid/qualified values never become zero or a guideline
midpoint; a real zero remains zero. Closed ranges use inclusive endpoints and
distance to the nearest bound, expressed as percentage points for ABV and IBU
for bitterness. This is descriptive context, not a quality grade or proof of a
style classification. Text accompanies a common, outlier-inclusive metric scale.

## Reference source and explicit mappings

`data/style-guidelines.json` is this slice's sole runtime reference authority:
20 checked records (11 BJCP 2021 and nine Brewers Association 2026). It is not
the complete guides. Each retains edition, official URL and check date. Only
numeric facts, names/official codes and source acknowledgements are published; no full
sensory descriptions, commercial examples or complete guide is republished.
The existing prototype `scripts/data/*Styles.js` and `out/` generation inputs
are not imported and must not be treated as the new reference authority.

BJCP sources checked on 27 October: American IPA 21A, American Pale Ale 18B,
American Porter 20A, Imperial Stout 20C, Hazy IPA 21C, Double IPA 22A, Witbier
24A, Kölsch 5B, American Amber Ale 19A, Cream Ale 1C and Mixed-Fermentation Sour
Beer 28B. URLs are on each record. 28B has base-style-dependent statistics,
represented explicitly as `variable`, correcting the old prototype's fixed
range assumption.

The official [BA 2026 guide](https://www.brewersassociation.org/edu/brewers-association-beer-style-guidelines/)
was checked for American IPA, American Pale Ale, Juicy or Hazy IPA, American
Imperial Porter, American Imperial Stout, Amber/Red Ale, German Koelsch, Witbier
and Session IPA. Read ABV from parenthesised volume values, not ABW. Source
facts differ from the old BA 2023 prototype: Session IPA is 0.5–5.0% ABV/20–55
IBU, Koelsch has 22–30 IBU, Witbier has 4.0–5.5% ABV and Imperial Stout has
50–80 IBU. BA's acknowledgement is displayed. Broader literary republication
or a paid guideline product requires its own source-use review.

BA records have no official short code in this dataset (`code: null`). Internal
slugs identify records only and are never displayed as official guide codes.
The selected source style's full name remains visible on small screens.

`data/style-guideline-mappings.json` contains 18 explicit canonical-category
ID/exact-name mappings from the supplied category CSV. Runtime reads the current
category and requires both fields to match. Reused/renamed IDs, unknown same-name
IDs and broad categories such as Pale Ale/IPA remain unmapped. No fuzzy name,
ABV or IBU classification occurs. Similar catalogue labels are not silently
merged; American Imperial Porter maps only to its reviewed BA reference.

The historical product CSV contains 350 products with no ABV/IBU values. This
does not establish current live coverage. No product enrichment or provenance
certification is claimed. Current product fields establish catalogue values,
not manufacturer/lab provenance, measurement method or batch verification.
The existing catalogue response contract still accepts numeric specifications
only; qualified upstream text support needs its own reviewed contract change.

## Boundaries

`GET /api/nocodebackend/catalog/style-references/:categoryId` uses existing
catalogue session/origin/size/limiter controls and one exact category read. It
returns projected category identity and reviewed references, never private
profile/cellar/rating records. It does not scan or mutate the provider. Other
methods/trailing segments are rejected. Historical SQL tables `category_guide`,
`category_guide_mapping` and `catgegory_characteristics` are not promoted into
the deployed contract. No schema migration is needed for this static read-only
reference layer; a future provider-backed reference source must replace this
authority deliberately rather than create competing defaults.

The browser validates exact envelopes, identity/name, distinct guide identities,
units/bounds, source URLs and permitted fields. Local error/retry and unmapped
states keep the main page usable. Identity-change/unmount guards discard late
responses. Preference is component-local and writes no classification/settings.

## Validation and continuation

Node tests exercise strict values/zero, endpoints/deltas, variable/malformed
references, source audits, ID/name mapping guards, read-only route projection
and browser response contracts. Playwright covers switching, null/zero,
variable ranges, unmapped/failure states, style-page reuse, no writes and axe.

Run Node 22 `npm run platform:validate` plus `npm run test:e2e` on the intended
head. Exact-preview connected read evidence remains separate from unit/mocked
browser results. Existing provider/recovery/privacy and launch NO-GO gates are
unchanged. Expand reviewed references and product-source coverage using this
same authority before adding colour/gravity; do not infer missing measurements.
