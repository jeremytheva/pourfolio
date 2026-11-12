# Add Beer release workflow and moderation boundary

Reviewed 27 October 2026 (Australia/Sydney). Work: #695 (form UX) and #696 (moderation contract).

## Current deployed contract

The authenticated `POST /catalog/products` currently performs server-side product/style reference validation, duplicate detection, producer lookup/reuse or creation, stable product creation and product-producer mapping verification. It returns a canonical product ID. `GET /catalog/products/:id` and the rating form load products by that ID. `products.declared_category` is the backend field for the beer's Stated Style, separate from `product_category_id`.

This endpoint does **not** persist moderation status or queue membership. The current NoCodeBackend launch schema has no certified moderation collection/status field. Existing Edit Beer proposals are non-persistent and clearly disabled. This is **not** a moderation-ready backend. Never relabel an immediate canonical creation as 'Submitted for Moderation' until the server returns a verified durable pending status.

## #695 UX implementation

- A single accessible search-and-select control retains only a validated canonical ID. Filtering is integrated into the picker; changing typed text clears a previous ID.
- Brewery selection has a nearby missing-brewery action that prefills what was typed. The existing exact-name producer reuse safeguard is preserved.
- The Add Beer selector reads the complete, paginated canonical `categories` collection from the authenticated catalogue gateway, rather than deriving available categories only from beers already in the catalogue. This keeps unused but valid website styles selectable. Category objects are projected from an allowlist and strictly validated at the browser boundary.
- Website style categories remain the identity users select. The matching BJCP 2021 and BA 2026 names from the reviewed data of PR #694 are shown in parentheses as search aids **only when both category ID and category name match the explicit reviewed mapping**.
- Guideline data contains 20 reviewed numeric references and 18 reviewed canonical category mappings. It is not a full exhaustive BJCP or BA classification and does not authorize guesses for other categories. For unmapped categories only the website category is shown.
- Stated Style (on can/bottle) maps to `declared_category`, not the official style relationship. Canonical category and printed manufacturer description may legitimately differ.
- The unnecessary second review confirmation step is removed. Until #696 is deployed, the truthful action remains 'Add beer to catalogue'; it cannot be described as moderated.
- Verified matches, duplicate check, all producer links, numeric validation, server-side authorisation and redirection to the created product stay intact.

## #696 moderation dependency

Implement only after a governed additive provider data/permissions contract:

- one canonical `products.id` addressable from creation;
- persisted moderation record with status, submitter, timestamp, evidence and audited decisions;
- pending and accepted products available for search/detail/ratings/cellar;
- visible `Community submitted, awaiting verification` label for pending entries, without a verified mark;
- provisional producer verification for newly submitted breweries;
- rejection or quarantine that does not delete a product/rating/cellar history implicitly;
- moderator-only state transitions and two-account enforcement;
- bounded retry/idempotency and duplicate-race handling;
- real server-confirmed moderation submission and after-submit CTA to immediately rate the product;
- provider migration, backup/restore/rollback, schema classification and connected release evidence.

A pending *catalogue verification* is independent of whether a user may rate the beer. Moderation is not rating approval.

## Required evidence

Run `npm run platform:validate`, relevant Add Beer Playwright and accessibility tests, producer/style/duplicate gateway tests, exact-head build, and connected auth/catalogue/rating checks when provider write certification is authorised. Keep NOT_RUN separate from FAIL/PASS. Integrate #695 only after #694 has been accepted; #696 needs its own provider-backed release gate. 
