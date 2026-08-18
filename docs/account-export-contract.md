# Portable account-export manifest contract

## Status

`api/_lib/accountExport.js` implements the source-only manifest builder for
[Phase 2 issue #146](https://github.com/jeremytheva/pourfolio/issues/146).
`api/_lib/accountExportArtifact.js` implements the in-memory UTF-8 JSON artifact
envelope for
[Phase 2 issue #148](https://github.com/jeremytheva/pourfolio/issues/148).
Neither module is connected to an HTTP route, browser control or provider
reader. They therefore do not make account export available to users and are
not evidence that launch gate G23 or Phase 2 is complete.

The builder accepts one already-consistent logical snapshot. A future adapter
must prove recent authentication and provider snapshot semantics before calling
it from a downloadable endpoint. Combining independent browser or provider
reads and passing the result to the builder is not an approved substitute.

## Server contract

```js
buildAccountExportManifest({
  account: { id, email, name },
  snapshot: {
    profiles,
    ratings,
    rating_scores,
    bonus_attribute_rating_mapping,
    cellar,
    products,
    producers,
    categories,
    rating_attributes,
    bonus_attributes
  },
  generatedAt
})
```

`account.id` represents the authenticated server identity. The module never
accepts an owner selector separately from that identity. Every snapshot key is
required and must contain an array, including when the array is empty. Every
record requires a unique non-empty `id`; duplicate identifiers fail closed.

The function returns one plain JSON-compatible object only after it has
validated the complete input, ownership, relationships, referenced context,
dates and score range. A thrown validation error returns no partial manifest.
The module performs no read, write, logging or network operation.

The artifact builder accepts the same options and delegates validation and
projection to `buildAccountExportManifest`. It does not accept or derive an
owner selector, filename, media type or response header from a browser. Unknown
option keys have no effect on the fixed artifact metadata.

## Ownership and relationship rules

- `profiles`, `ratings`, `rating_scores`,
  `bonus_attribute_rating_mapping` and `cellar` are included only when their
  exact string `user_id` equals the authenticated `account.id`.
- Zero or one owned profile is valid. Multiple owned profiles are ambiguous and
  fail closed.
- Every exported score and bonus mapping must reference an exported owned
  rating.
- A non-null rating `cellar_id` must reference an exported owned cellar record
  for the same product.
- Products are included only when referenced by an exported rating or cellar
  record. Producers and categories are included only when referenced by those
  products or by an exported rating attribute.
- Rating and bonus definitions are included only when referenced by an exported
  score or mapping.
- Missing or duplicate referenced context fails closed. Unreferenced catalogue
  rows are excluded, even though catalogue definitions are shared data.
- Every output array is ordered by its normalised string `id`, making the result
  deterministic for the same snapshot and `generatedAt` value.

## Manifest envelope

| Field | Meaning |
| --- | --- |
| `format` | Constant `pourfolio.account-export`. |
| `schema_version` | Semantic export schema version; initially `1.0.0`. |
| `generated_at` | Canonical ISO 8601 UTC timestamp supplied by the server. |
| `account` | Authenticated account ID, email and name; absent optional values are explicit `null`. |
| `record_counts` | Exact count for each owner-data and referenced-context type. |
| `collection_descriptions` | Human-readable purpose for every exported record type. |
| `monetary_values` | Documents that the current source schema does not record a currency for cellar prices. |
| `data` | Projected owner data plus the minimum referenced catalogue context. |

All record and relationship identifiers are strings. Nullable values are
present as `null`; they are not silently omitted. Datetimes are canonical ISO
8601 UTC strings. A valid cellar date-only value remains `YYYY-MM-DD`.

The current cellar schema has numeric `purchase_price` and `retail_price`
fields but no currency field. The manifest therefore reports `currency: null`
and `status: not_recorded_in_source_schema`. It must not infer AUD or another
currency. Resolving the source unit requires a separately approved data-contract
decision.

## Portable projections

| Record type | Exported fields |
| --- | --- |
| Account | `id`, `email`, `name` |
| Profile | `id`, `name`, `description`, `avatar_url` |
| Rating | `id`, `rating_id`, `product_id`, `cellar_id`, `date_rated`, `total_unweighted`, `total_weighted`, `submission_state`, `deleted_at` |
| Rating score | `id`, `rating_id`, `attribute_id`, `attribute_score` |
| Bonus mapping | `id`, `rating_id`, `bonus_attributes_id` |
| Cellar | `id`, `product_id`, `location_id`, `quantity`, `mls`, `container`, `purchase_price`, `retail_price`, `date_received`, `sharing_series_id`, `series_version_id`, `purchase_location_id`, `purchased_by_id`, `gift`, `gift_from`, `bet_id`, `notes` |
| Product context | `id`, `product_name`, `product_category_id`, `producer_id`, `abv`, `ibu`, `declared_category`, `edition`, `collaboration` |
| Producer context | `id`, `producer_name` |
| Category context | `id`, `category_name` |
| Rating-attribute context | `id`, `category_id`, `attribute_name`, `is_scored`, `weighting` |
| Bonus-attribute context | `id`, `description`, `point_value` |

Unknown fields are not copied. In particular the projection excludes:

- `user_id` and any browser-supplied owner or role field;
- provider secrets, raw provider envelopes and unrecognised metadata;
- rating submission keys, fingerprints, versions and expected child counts;
- score and bonus uniqueness keys;
- unrelated catalogue records and every other user's values.

Text remains ordinary JSON string data. A future download response must use a
non-executable JSON content type and must never interpolate exported strings
into HTML.

## In-memory artifact envelope

`buildAccountExportArtifact(options)` returns an immutable server value only
after the complete manifest succeeds:

| Field | Contract |
| --- | --- |
| `filename` | Constant ASCII value `pourfolio-account-data.json`. |
| `media_type` | Constant `application/json; charset=utf-8`. |
| `body` | `JSON.stringify(manifest, null, 2)` followed by exactly one line-feed character. |
| `byte_length` | Exact `Buffer.byteLength(body, 'utf8')`; this is not JavaScript string length. |
| `checksum` | Lowercase SHA-256 of the exact UTF-8 body, with explicit `algorithm` and `value` fields. |
| `headers` | Frozen constant response metadata described below. |

The response metadata is fixed at module load time and contains no account,
exported-text or caller-supplied value:

| Header | Constant value |
| --- | --- |
| `Cache-Control` | `no-store` |
| `Content-Disposition` | `attachment; filename="pourfolio-account-data.json"` |
| `Content-Type` | `application/json; charset=utf-8` |
| `X-Content-Type-Options` | `nosniff` |

The body is an immutable JavaScript string. The returned artifact, checksum and
headers objects are frozen so downstream code cannot silently change metadata
after reconciliation. The checksum and byte length are request-local integrity
metadata, not authorisation, proof of a consistent provider snapshot or
permission to log or retain a personal-data-derived value. This helper creates
no HTTP response, file, job, object-store entry, log or retention obligation by
itself.

## Future endpoint entry criteria

Do not expose this builder through `api/data-proxy.js` or a new route until all
of the following are resolved and evidenced:

1. The authentication provider supplies a server-verifiable recent-authentication
   timestamp or an approved re-authentication operation.
2. The data provider supplies a consistent multi-collection snapshot, or an
   approved server orchestration proves equivalent fencing and reconciliation.
3. Owner-scoped reads are proved against an isolated production-equivalent
   environment with another-account sentinels.
4. Partial provider failures produce no artefact and a safe retry response.
5. The endpoint uses `buildAccountExportArtifact` without accepting a filename,
   applies its UTF-8 JSON, `no-store`, constant attachment and `nosniff`
   metadata unchanged, and verifies the actual response bytes match its length
   and checksum in integration tests.
6. Same-origin, request-size and export-specific rate limits are enforced; no
   exported value, account ID, email, cookie, token or provider response is
   logged.
7. The approved privacy and retention record states whether synchronous export
   is permitted and how any temporary artefact is erased.
8. Owner, other-user, expired-session, empty, complete, partial-failure, retry,
   filename/content and exact reconciliation tests pass in connected staging.

## Source validation

`api/_lib/__tests__/accountExport.test.js` covers complete and empty accounts,
other-user sentinels, field stripping, deterministic order, explicit nulls,
count reconciliation, missing collections, duplicate IDs, orphan children,
missing catalogue/definition context, cross-product cellar links, invalid
lifecycle values, scores and dates, and zero/multiple-profile cases.

`api/_lib/__tests__/accountExportArtifact.test.js` covers the exact deterministic
body, final line feed, Unicode byte length, fixed fixture SHA-256, empty data,
frozen metadata, malicious filename/content inputs, manifest failure, changed
content and timestamp digests, and static provider/route/browser isolation.

The repository release gate remains authoritative; passing these unit tests is
source evidence only and does not satisfy the future endpoint entry criteria.