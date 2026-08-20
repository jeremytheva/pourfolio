# NoCodeBackend provider API contract

This document records the Pourfolio production NoCodeBackend generated table API contract used by `api/_lib/dataProvider.js`. It is grounded in the project-specific setup supplied for database instance `54026_rating` plus retained generated-operation evidence. Generic provider conventions must not override this project-specific contract.

## Architecture

The browser never calls NoCodeBackend directly:

```text
Browser
  -> same-origin /api/nocodebackend/*
  -> Pourfolio server session/policy layer
  -> NoCodeBackend generated table API
```

The browser session proves the user to Pourfolio. The database secret remains server-only and authorises generated table requests.

## Canonical production configuration

The supplied project setup defines:

```env
NCB_INSTANCE=54026_rating
NCB_DATA_API_URL=https://app.nocodebackend.com/api/data
NCB_SECRET_KEY=<server-only key>
```

The canonical generated table API root for this repository is therefore:

```text
https://app.nocodebackend.com/api/data
```

`NCB_*` names are the preferred configuration contract. Existing `NOCODEBACKEND_*` variables remain supported as compatibility aliases while deployments are migrated, but an alias must not silently change the canonical endpoint or instance.

Every generated table request includes:

```http
Authorization: Bearer <server-only secret>
X-Database-Instance: 54026_rating
```

and:

```text
Instance=54026_rating
```

When an authenticated browser request is available, the server also forwards only the Better Auth session cookies plus trusted `Origin` and `Referer` context.

## Endpoint override policy

Unverified environment values must not silently replace the canonical endpoint.

- Missing endpoint configuration -> use the canonical API root.
- Canonical `NCB_DATA_API_URL` -> use the canonical API root.
- Retired AWS Lambda URL -> ignore it and use the canonical API root.
- Any other custom URL -> ignore it unless `NCB_ALLOW_CUSTOM_DATA_API=1` is explicitly set after provider verification.
- An opted-in malformed custom URL -> fail closed as `DATA_CONFIGURATION_INVALID`.

This policy prevents stale Vercel configuration from changing the production provider contract without an explicit release decision.

## Generated operation routes

| Adapter operation | Provider method/path | Query/body |
| --- | --- | --- |
| `list(collection, filters)` | `GET /read/{collection}` | `Instance` plus column filters |
| `listPage(collection, options)` | `GET /read/{collection}` | `Instance`, filters, `page`, `limit`, `sort`, `order`; product search uses `product_name[like]` |
| `get(collection, id)` | `GET /read/{collection}/{id}` | `Instance` |
| `create(collection, body)` | `POST /create/{collection}` | `Instance`; JSON record body |
| `update(collection, id, body)` | `PUT /update/{collection}/{id}` | `Instance`; JSON partial record body |
| `compareAndSet(collection, id, expectedVersion, body)` | `PUT /update/{collection}/{id}` | `Instance`, `expected_version`; JSON body |
| `remove(collection, id)` | `DELETE /delete/{collection}/{id}` | `Instance` |

Application routes remain stable product-level operations and never expose arbitrary provider paths to the browser.

## Filtering, search and pagination

Column filtering uses generated API bracket operators where supported, including `field[in]` and `field[like]`.

Catalogue search maps to:

```text
product_name[like]=<search>
sort=product_name
order=asc
page=1
limit=24
```

The adapter accepts provider envelopes including `data`, `records`, `items`, `results`, or a bare array. Explicit pagination metadata is validated. A valid list response without metadata remains usable with an estimated total when necessary.

## Relationship hydration policy

Core product and cellar records must remain usable when optional relationship enrichment is unavailable.

- `product_producers` is optional enrichment and must not blank the catalogue.
- Producers and categories are secondary display enrichment and must not make an otherwise valid product list unavailable.
- Relationship reads should be batched with `field[in]` filters rather than one request per product.
- Cellar rows remain visible when a referenced product, producer, or category cannot be hydrated; the relationship is returned as `null` instead of failing the whole cellar list.

## Response and error contract

Provider failures never expose raw provider bodies or credentials to browser responses.

- `401` -> `DATA_PROVIDER_UNAUTHENTICATED`.
- `403` -> `DATA_PROVIDER_FORBIDDEN`.
- `404` -> safe not-found handling.
- `409` ordinary write -> `UNIQUE_CONFLICT`.
- `409` compare-and-set -> `VERSION_CONFLICT`.
- malformed/non-JSON, timeout, transport failure, or error envelope -> `502 PROVIDER_ERROR`.

## Health versus readiness

`/api/health` reports process/configuration state only. It does not claim that provider reads work.

`/api/readiness` performs a bounded, non-destructive `products` read and reports only a safe dependency state:

```text
ok
misconfigured
unauthenticated
forbidden
contract-mismatch
unavailable
```

It never returns provider records, credentials, configured URLs, or raw upstream error content.

## Connected verification

A release-ready connected smoke matrix must verify non-destructive reads for:

- `products`;
- `profiles`;
- `cellar`;
- `rating_attributes`;
- `bonus_attributes`;
- `producers`;
- `categories`;
- `ratings`;
- `product_producers` when deployed.

The smoke run must use the same endpoint resolution logic as production and must fail when the provider returns authentication, authorisation, route-contract, or malformed-response errors.

## Change control

Before changing endpoint shape, operation paths, instance selection, authentication headers, or response semantics:

1. inspect project-specific setup or generated API documentation for `54026_rating`;
2. update this document and the adapter together;
3. update unit and connected contract tests;
4. run the full release gate and connected smoke matrix;
5. verify `/api/readiness` and authenticated production reads after deployment.

The remediation PR must not be merged while any required release, browser/accessibility, dependency-review, or CodeQL check is missing or failing. A guessed provider URL or inferred CRUD convention is a release blocker.
