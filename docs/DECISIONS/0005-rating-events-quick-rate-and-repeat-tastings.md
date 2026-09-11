# ADR 0005: Rating events, Quick Rate and repeat tastings

- Status: Accepted
- Date: 2026-09-12
- Related: #428, #434, #438

## Context

Pourfolio currently persists one `ratings` header per completed structured tasting, with normalised `rating_scores` children and optional bonus mappings. The deployed header contains `product_id`, optional `cellar_id`, `date_rated`, `total_unweighted` and `total_weighted`, plus provider/server-owned identity fields. It does not contain a rating-event type or a standalone Quick Rate value.

The advanced scoring work in #428 defines the authoritative Full Tasting score model:

- Appearance /7;
- Aroma /7;
- Mouthfeel /7;
- Flavour /7;
- Follow /7;
- Bonus /2;
- Design /7 and Burp 0/1 remain non-scoring extras;
- default and personalised weighted totals are /5;
- Overall/Style Scaled Score and PPP are derived only from qualifying structured scores and required price inputs.

A Quick Rate must therefore not be represented by inventing missing structured attribute values or by writing a shortcut value into `total_weighted`. Repeat experiences of the same product must also remain separate historical events rather than overwriting the earlier experience.

## Decision

### 1. Canonical user-created rating event types

Pourfolio has two user-created rating-event types:

- `full_tasting` — the structured Pourfolio tasting event governed by #428;
- `quick_rate` — a low-friction overall impression that contains no structured attribute scores.

A migration-only compatibility state `legacy_unclassified` may be used during provider migration when an existing row cannot be proven to satisfy the Full Tasting contract. Users cannot create this state.

The user-facing terms are **Full Tasting** and **Quick Rate**.

### 2. Full Tasting contract

A Full Tasting requires:

- authenticated owner identity derived server-side;
- canonical `product_id`;
- event timestamp (`date_rated` in the current contract);
- all positively weighted scoring dimensions required by #428;
- server-recomputed standard/default-weight and personalised weighted totals.

A zero-weight scoring dimension may be omitted, consistent with #428. Design and Burp remain optional non-scoring extras.

Optional bonus selections and future notes/context fields do not change Full Tasting eligibility unless a later decision explicitly states otherwise.

### 3. Quick Rate contract

A Quick Rate requires:

- authenticated owner identity derived server-side;
- canonical `product_id`;
- event timestamp;
- one explicit `quick_score` on a 0.5 to 5.0 scale in 0.5 increments.

A Quick Rate has no structured Aroma, Appearance, Mouthfeel, Flavour, Follow or Bonus score rows. Design/Burp are not required for Quick Rate.

`quick_score` is a separate field. A Quick Rate must keep `total_unweighted` and `total_weighted` null so it cannot accidentally enter structured-score queries.

The 0.5 increment is a product-input rule, not an invitation to derive attribute scores from the overall value.

### 4. Aggregate eligibility

Full Tasting and Quick Rate values are not blended into one unnamed metric.

| Derived value | Full Tasting | Quick Rate |
| --- | --- | --- |
| Structured attribute aggregates | Eligible | Never eligible |
| Standard/default-weight Pourfolio score | Eligible | Not applicable |
| Personalised weighted Pourfolio score | Eligible | Not applicable |
| Overall Scaled Score | Eligible when #428 rules are satisfied | Never eligible |
| Style Scaled Score | Eligible when #440 rules are satisfied | Never eligible |
| Retail PPP | Eligible when required price/volume inputs exist | Never eligible |
| Purchased PPP | Eligible when required price/volume inputs exist | Never eligible |
| Quick Rate product average | Not included | Eligible |
| Quick Rate personal average | Not included | Eligible |

A product may therefore expose a structured Pourfolio score and a separately labelled Quick Rate aggregate if both exist. Rankings, Style Scaled Score and PPP continue to use qualifying Full Tastings only unless a later ADR explicitly supersedes this rule.

### 5. Repeat tasting identity

Every tasting experience is a distinct rating event with its own immutable provider primary key and event timestamp. There is no uniqueness rule on `(user_id, product_id)`.

Multiple Full Tastings, multiple Quick Rates, or both may exist for the same owner/product pair.

Definitions:

- **latest tasting** — the most recent qualifying event for that owner/product ordered by event timestamp, then stable event ID as deterministic tie-breaker;
- **latest Full Tasting** — the most recent `full_tasting` event;
- **latest Quick Rate** — the most recent `quick_rate` event;
- **personal Full Tasting average** — average of that owner's qualifying Full Tasting weighted scores for the product;
- **personal Quick Rate average** — average of that owner's Quick Rate values for the product;
- **community structured aggregate** — qualifying Full Tastings only;
- **community Quick Rate aggregate** — Quick Rates only.

The UI must not silently label either type-specific average as an all-purpose lifetime average.

### 6. Expanding a Quick Rate into a Full Tasting

A Quick Rate is not mutated into a fabricated structured rating.

If the user later chooses **Expand to Full Tasting**, Pourfolio creates a new `full_tasting` event and may link it to the originating Quick Rate through a nullable self-reference such as `expanded_from_rating_id`.

The original Quick Rate remains historically intact. The UI may group the linked events as one capture lineage, but both records retain their own identity, timestamp and semantics.

The Full Tasting form starts with no inferred attribute scores. The earlier Quick Rate value may be displayed as context only.

### 7. Edit semantics

An edit affects one event only.

For `full_tasting`:

- attribute/bonus changes must be revalidated server-side;
- weighted/default totals and all derived advanced scores are recomputed;
- no other historical tasting is changed.

For `quick_rate`:

- only the Quick Rate value and approved optional event context may change;
- no structured score rows may be created as a side effect.

Changing an event from Quick Rate to Full Tasting is not an in-place type mutation; use the expansion flow above.

### 8. Delete semantics

Deleting a tasting targets one event and its owned child records only. Other events for the same product remain unchanged.

Deleting a Full Tasting that was expanded from a Quick Rate does not delete or reactivate the Quick Rate. Deleting the originating Quick Rate does not delete the later Full Tasting; the surviving record simply no longer exposes an active link to a deleted event.

Any existing recoverable deletion/tombstone rules remain authoritative for the physical provider workflow.

### 9. Optional event context

The following may be added later as optional event context without becoming scoring requirements:

- overall tasting note;
- attribute-level notes for Full Tasting;
- serving/container context;
- consumed-at venue;
- purchased-at location;
- linked cellar record;
- purchase/retail price snapshot where governed;
- future photo/media reference.

Context is never used to fabricate missing structured scores. Private price and private venue/history context remain owner-scoped unless a separately reviewed projection explicitly permits disclosure.

### 10. Existing-rating compatibility

The current provider does not expose `event_type`, `quick_score` or expansion lineage.

Before Quick Rate is enabled, a governed additive migration must add the minimum event fields. Existing rows must be classified conservatively:

1. an existing completed rating that has a valid structured score set satisfying the then-current Full Tasting contract may be backfilled as `full_tasting`;
2. a row that cannot be proven to satisfy that contract must not be guessed into Full Tasting and may remain `legacy_unclassified` until reconciled;
3. no existing `total_weighted` value is reinterpreted as a Quick Rate;
4. existing provider IDs, `product_id`, timestamps and historical references remain unchanged.

### 11. Minimum provider target

Quick Rate/repeat-tasting activation requires an additive provider migration that supports at least:

- `ratings.event_type` — server-controlled enum/string: `full_tasting | quick_rate` plus migration-only `legacy_unclassified` where necessary;
- `ratings.quick_score` — nullable decimal constrained to 0.5–5.0 in 0.5 increments, non-null only for `quick_rate`;
- `ratings.expanded_from_rating_id` — nullable self-reference used only when a Full Tasting was explicitly expanded from an earlier Quick Rate.

Existing `date_rated` remains the event timestamp; a second timestamp field is not required for this feature.

Provider constraints/gateway validation must enforce:

- `full_tasting` => `quick_score IS NULL` and qualifying structured score children/totals;
- `quick_rate` => `quick_score IS NOT NULL`, structured totals null, and no structured `rating_scores` children;
- expansion links point from a Full Tasting to an owner-held Quick Rate for the same product;
- browser input cannot set owner identity, derived totals, lifecycle state or migration-only event states.

Optional context fields should be migrated separately when their UX is implemented rather than pre-creating unused schema.

## Consequences

### Positive

- Quick Rate remains genuinely low friction without contaminating Pourfolio's structured score system.
- Attribute aggregates, Scaled Scores and PPP remain mathematically interpretable.
- Repeat experiences are preserved as history.
- A Quick Rate can lead into a Full Tasting without inventing attribute history or destroying the original impression.
- Future timelines, recaps and personal analytics can distinguish frequency from unique products and event type.

### Trade-offs

- Product pages may eventually display two different overall concepts: structured Pourfolio score and Quick Rate impression. Labels must remain explicit.
- Provider migration is required before Quick Rate can ship.
- Personal/community averages must stay type-specific unless a later explicit metric defines a justified blend.

## Implementation sequence

1. Add and certify the provider event-type/Quick Rate/lineage fields with backup/recovery evidence.
2. Update server projections and validation so existing Full Tastings remain compatible.
3. Implement Quick Rate create/edit/delete endpoints and tests.
4. Add Quick Rate UX with clear separation from Full Tasting.
5. Add repeat-tasting timeline/latest-event presentation.
6. Add optional event context fields only when their persistence contract is approved.

No implementation issue may use different event or aggregate semantics without superseding this ADR.
