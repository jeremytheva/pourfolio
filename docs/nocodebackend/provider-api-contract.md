# NoCodeBackend provider API contract

This document records the Pourfolio production NoCodeBackend contract used by the server-side auth and data adapters.

## Architecture

```text
Browser
  -> same-origin /api/nocodebackend/*
  -> Pourfolio server session/policy layer
  -> NoCodeBackend APIs
```

The browser never receives the NoCodeBackend server secret.

## Production environment contract

Use only these four application variables in Vercel, local development, staging, and connected release jobs:

```env
NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth
NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/
NOCODEBACKEND_SECRET_KEY=<server-only key>
NOCODEBACKEND_INSTANCE=54026_rating
```

No environment variable beginning with the retired short-form NoCodeBackend prefix is permitted anywhere in the repository. Isolated contract-test controls use `NOCODEBACKEND_CONTRACT_*` names.

## Authentication API

The hardcoded fallback authentication URL is:

```text
https://app.nocodebackend.com/api/user-auth
```

Authentication requests use `NOCODEBACKEND_AUTH_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`, and `NOCODEBACKEND_INSTANCE`.

## Data API

The hardcoded fallback data URL is:

```text
https://api.nocodebackend.com/
```

Data requests use `NOCODEBACKEND_DATA_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`, and `NOCODEBACKEND_INSTANCE`.

Every generated table request includes:

```http
Authorization: Bearer <server-only secret>
X-Database-Instance: 54026_rating
```

and:

```text
Instance=54026_rating
```

When an authenticated browser request is available, the server forwards only Better Auth session cookies plus trusted Origin/Referer request context.

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
- Cellar rows remain visible when referenced enrichment cannot be hydrated.

## Error contract

Provider failures never expose raw provider bodies or credentials to browser responses.

- `401` -> `DATA_PROVIDER_UNAUTHENTICATED`.
- `403` -> safe forbidden code that distinguishes session context for diagnostics.
- `404` -> safe not-found handling.
- `409` ordinary write -> `UNIQUE_CONFLICT`.
- `409` compare-and-set -> `VERSION_CONFLICT`.
- malformed/non-JSON, timeout, transport failure, or error envelope -> `502 PROVIDER_ERROR`.

## Health and readiness

`/api/health` reports configuration state without exposing values.

`/api/readiness` performs a bounded, non-destructive products read and reports a safe dependency state without returning provider records, credentials, configured URLs, or raw upstream errors.

## Connected verification

Connected smoke verification must use the same four `NOCODEBACKEND_*` application variables as production and verify non-destructive reads for launch collections. Destructive isolated-staging tests use `NOCODEBACKEND_CONTRACT_*` test-control variables; these are test metadata rather than application configuration.

## Change control

Before changing endpoint shape, operation paths, instance selection, authentication headers, or response semantics:

1. update this contract and the adapter together;
2. update unit and connected contract tests;
3. run the full release gate and connected smoke matrix;
4. verify health/readiness and authenticated production reads after deployment.

The repository validation guard must fail if a retired NoCodeBackend environment-variable prefix or the retired data URL is reintroduced.
