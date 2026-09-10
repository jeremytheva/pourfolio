# NoCodeBackend provider API contract

This document records the Pourfolio production NoCodeBackend contract used by the server-side auth and data adapters.

## Architecture

```text
Browser
  -> same-origin /api/nocodebackend/*
  -> Pourfolio server session/policy layer
  -> NoCodeBackend APIs
```

The browser never receives the NoCodeBackend server secret or configured instance. Browser authentication and ownership checks are enforced by Pourfolio before data-provider operations are executed.

## Production environment contract

Use only these four application variables in Vercel, local development, staging, and any deliberately direct provider-certification runtime:

```env
NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth
NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/
NOCODEBACKEND_SECRET_KEY=<stored outside repository>
NOCODEBACKEND_INSTANCE=<stored outside repository>
```

No environment variable beginning with the retired short-form NoCodeBackend prefix is permitted anywhere in the repository. Isolated contract-test controls use `NOCODEBACKEND_CONTRACT_*` names.

`NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE` are runtime-only configuration. Neither has a repository fallback. Server auth and data adapters fail closed before provider access when the required value is missing. The canonical deployed application runtime owns these values in Vercel; connected release certification must not require duplicate copies in GitHub merely to prove the deployed application can reach its provider.

## Authentication API

The hardcoded fallback authentication URL is:

```text
https://app.nocodebackend.com/api/user-auth
```

Authentication requests use `NOCODEBACKEND_AUTH_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`, and the runtime `NOCODEBACKEND_INSTANCE`.

## Data API

The hardcoded fallback data URL is:

```text
https://api.nocodebackend.com/
```

Data requests use `NOCODEBACKEND_DATA_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`, and the runtime `NOCODEBACKEND_INSTANCE`.

The generated table API requires:

```http
Accept: application/json
Authorization: Bearer <server-only secret>
```

with the runtime instance supplied as a query parameter:

```text
Instance=<runtime-configured instance>
```

Pourfolio does not forward browser cookies, `Origin`, `Referer`, or `X-Database-Instance` to the generated table API. Those headers are not part of the supplied generated-table request contract. Browser session context remains inside Pourfolio's own session/policy layer.

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

For requests with a JSON body, Pourfolio additionally sends `Content-Type: application/json`.

## Filtering, search and pagination

Column filtering uses generated API bracket operators documented by Swagger:

- `field=value` — equal;
- `field[ne]=value` — not equal;
- `field[gt]=value` — greater than;
- `field[gte]=value` — greater than or equal;
- `field[lt]=value` — less than;
- `field[lte]=value` — less than or equal;
- `field[in]=a,b,c` — list membership;
- `field[like]=value` — partial match.

Catalogue search maps to:

```text
product_name[like]=<search>
sort=product_name
order=asc
page=1
limit=24
```

The adapter accepts provider envelopes including `data`, `records`, `items`, `results`, or a bare array. The normal success envelope is:

```json
{
  "status": "success",
  "data": []
}
```

Explicit pagination metadata is validated. A valid list response without metadata remains usable with an estimated total when necessary.

## Product schema confirmed by provider contract evidence

The supplied products contract identifies these fields:

- `id`;
- `user_id`;
- `product_name`;
- `product_category_id`;
- `producer_id`;
- `abv`;
- `ibu`;
- `declared_category`;
- `edition`;
- `collaboration`;
- `product_image`.

`producer_id` remains the default/legacy producer relationship. `product_producers` is optional collaboration enrichment and must not block the core catalogue.

## Relationship hydration policy

Core product and cellar records must remain usable when optional relationship enrichment is unavailable.

- `product_producers` is optional enrichment and must not blank the catalogue.
- Producers and categories are secondary display enrichment and must not make an otherwise valid product list unavailable.
- Relationship reads should be batched with `field[in]` filters rather than one request per product.
- Cellar rows remain visible when referenced enrichment cannot be hydrated.

## Error contract

Provider failures never expose raw provider bodies, credentials, or the configured instance to browser responses.

- missing runtime instance -> local `503 DATA_INSTANCE_MISSING` before any provider request;
- missing server credential -> local `503 DATA_CREDENTIAL_MISSING` before any provider request;
- `401` -> `DATA_PROVIDER_UNAUTHENTICATED`;
- `403` -> `DATA_PROVIDER_FORBIDDEN`;
- `404` -> safe not-found handling;
- `409` ordinary write -> `UNIQUE_CONFLICT`;
- `409` compare-and-set -> `VERSION_CONFLICT`;
- malformed/non-JSON, timeout, transport failure, or error envelope -> `502 PROVIDER_ERROR`.

## Health and readiness

`/api/health` reports configuration state without exposing values. It reports `instanceConfigured`; authentication and data configuration cannot be ready unless the runtime instance is present. The configured instance value itself is never returned.

`/api/readiness` performs a bounded, non-destructive products read using the same Bearer + `Instance` contract and reports a safe dependency state without returning provider records, credentials, configured URLs, or raw upstream errors. A missing runtime instance is reported as `misconfigured`; a provider `403` is reported separately as `forbidden`.

## Connected verification

For the deployed application, exact-deployment `/api/readiness` is the canonical non-destructive proof that the Vercel runtime can use its configured NoCodeBackend credential and instance. Authenticated browser release checks then verify the owner-facing catalogue/profile and CRUD journeys through same-origin application APIs. This avoids copying provider credentials into GitHub solely for release certification.

`npm run test:provider-smoke`, `npm run test:provider-connection`, and destructive provider-contract suites remain available for deliberately direct provider testing in an explicitly configured isolated staging runtime. If GitHub is used for those direct-provider diagnostics, its protected environment may hold separate staging credentials; absence of duplicate GitHub provider credentials is not itself a launch blocker when exact-deployment Vercel readiness is healthy.

Destructive isolated-staging tests continue to use `NOCODEBACKEND_CONTRACT_*` or certification-specific test-control variables and must retain their explicit isolation/cleanup guards. Production application tables must not be used for routine destructive certification.

## Change control

Before changing endpoint shape, operation paths, instance selection, authentication headers, or response semantics:

1. compare against the generated provider contract for the runtime-configured instance;
2. update this contract and the adapter together;
3. update unit and connected contract tests;
4. run the full release gate and connected smoke matrix;
5. verify health/readiness and authenticated production reads after deployment.

The repository validation guard must fail if a retired NoCodeBackend environment-variable prefix, the retired data URL, or a repository value for `NOCODEBACKEND_SECRET_KEY` or `NOCODEBACKEND_INSTANCE` is reintroduced into `.env.example`.
