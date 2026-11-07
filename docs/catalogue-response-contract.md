# Catalogue response contract

## Scope

`src/services/catalogueResponse.js` is the browser-side validation boundary for
the public beer browse/search and product-detail responses. It runs only after a
same-origin application-data request has returned successful JSON and before
that value enters React state.

This boundary is defence in depth. The data gateway remains responsible for
authentication, provider access and public-field projection. The validator does
not grant browser authority, query the provider, repair historical records or
replace connected provider-policy evidence.

The server provider adapter independently binds successful paginated reads to
the requested page and size, verifies total-page and item-count arithmetic, and
binds every direct record response to the requested identifier. Mismatches are
safe `502 PROVIDER_ERROR` failures before projection. A filtered-list fallback
after provider `404` selects only an exact identifier match.

## Catalogue page

A page has exactly `items`, `page`, `pageSize`, `total` and `totalPages`.
Pagination values are safe integers, the page and page size are positive, the
page size is no greater than 100, and totals are non-negative. `totalPages` must
equal the total divided into pages, the requested page must exist, and the item
count must equal the full-page or final-page remainder implied by the metadata.
The returned page and page size must also equal the values sent by
`beverageService`, preventing a successful response for a different page from
being labelled with the current UI state.

Every item has a unique positive decimal product identifier, a non-empty product
name, and explicit `producer` and `category` values. The two relationships may
be `null` while catalogue reconciliation remains blocked. When a relationship
is present, it has a positive identifier and non-empty name, and its identifier
must equal the product's corresponding foreign key.

The public product allowlist is limited to the server projection: product and
relationship identifiers/names, ABV, IBU, declared category, edition,
collaboration and product image. Optional text must be primitive, bounded and
free of control characters. ABV/IBU must be finite non-negative numeric values.
Images may be same-origin paths or credential-free HTTPS URLs. Unknown fields,
including provider or owner metadata, fail closed.

The gateway reads every filtered provider page when hydrating product-producer
mappings, producers and categories. Provider-default list sizes must not decide
which recorded brewery or style is shown. Both catalogue list and detail use
this hydration path. An authoritative mapping-read failure rejects hydration;
an optional producer/category failure discards its partial pages and retains
the existing unresolved-relationship presentation. No missing relationship is
invented, and unrelated mapping rows never replace canonical attribution.

NoCodeBackend may serialise an absent optional numeric value or relationship
foreign key as either `null` or an empty string. The boundary copies those empty
optional values as `null` so the UI reports “Not recorded”; it does not trim or
coerce non-empty identifiers or measurements.

## Canonical category pages

Authenticated `/catalog/categories` pages have exactly `items`, `page`,
`pageSize`, `pagination`, `hasMore`, `total` and `totalPages`. The category-only
contract does not add fields to the product-page allowlist. Category items have
unique positive identifiers, non-empty names and an explicit nullable parent ID.
The returned page/size must match the request; the size is at most 100.

`pagination: "exact"` means provider-authoritative integer totals. Page count
and item count follow the same arithmetic as product pages, and `hasMore`
must equal `page < totalPages`. The complete collector rejects changed exact
totals/page counts and verifies its final accumulated count.

`pagination: "continuation"` means the provider omitted an exact total. Both
`total` and `totalPages` are explicitly `null`; lower-bound estimates are never
published as authoritative counts. `hasMore: true` requires a full page;
`hasMore: false` requires a short or empty terminal page. A 200-record inventory
with 100-row pages therefore needs a third empty probe, while 201 records end
with a one-row third page. The gateway selects this mode from the adapter's
explicit metadata-free-page flag, including its false terminal value.

The collector latches one pagination mode, rejects mode changes and duplicate
IDs across all pages, and returns no partial result after malformed data or a
later-page failure. It allows at most 25 requests, including a terminal probe;
exhaustion rejects rather than presenting truncated canonical choices. The
connected Add Beer check retains the same bounds and exact-count checks while
using explicit continuation termination when an exact count is unavailable.

## Product detail

Details use the same product projection and additionally require
`ratingSummary.count` and `ratingSummary.average`. Count is a non-negative safe
integer. Zero ratings require a `null` average; a positive count requires a
finite average from 1 through 7. An omitted or empty `ratings` array is
canonicalised to an immutable empty array. Any individual rating entry fails
closed because personal rating history belongs only in its owner-scoped route.

The browser service accepts only a canonical positive decimal product ID; zero,
signs, fractions, leading zeroes, whitespace and encoded path syntax fail with a
safe 400 error before any request. A successful detail response must contain
that exact requested identifier (numeric and decimal-string representations are
equivalent). The gateway repeats the identity comparison, so a provider cannot
substitute a different product whose links would target rating or cellar flows.
The invalid-route state offers a direct “Back to products” link and omits the
retry action because repeating the same non-canonical identifier cannot recover;
remote and not-found failures retain both back and retry recovery actions.

## Failure and immutability

Validation creates a new deeply frozen public value and never freezes or mutates
the parsed input or returns a coerced non-empty value. Invalid structure,
hidden/symbol/accessor fields,
incoherent metadata and unrenderable values all produce the same `ApiError`:

> The server returned invalid catalogue data. Please try again.

The error has status 502 and code `invalid_catalogue_response`. It never echoes
an input key or value. `HomePage` and `BeerDetails` already catch service errors,
so malformed successful data enters their labelled alert and keyboard-operable
retry path instead of partially rendering or reaching the application error
boundary.

## Evidence and limits

Node tests cover valid, empty and malformed pages; exact provider/request page
boundaries and terminal counts; direct/fallback record identity; duplicate
identifiers; renderable fields and relationship agreement; aggregate-only
details; requested product identity; non-canonical route rejection before
network access; exact not-found behaviour; private rating rejection; input
immutability; safe errors; and wiring of both catalogue service reads.
Playwright cases cover recoverable browse/detail malformed-success states plus
non-canonical and exact-missing direct routes.

These source tests do not reconcile the supplied catalogue exports or prove
connected NoCodeBackend responses, stable deployment routes, keyboard/screen-
reader behaviour or WCAG 2.2 AA. Issue #154 remains open until the canonical
catalogue, connected browser and accessibility evidence in `PF-P3-01` is
complete. Earlier Phase 0–2 gates also remain open.
