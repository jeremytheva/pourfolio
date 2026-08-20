# NoCodeBackend provider API contract

This document records the production-equivalent NoCodeBackend generated table API contract used by the server-only provider adapter in `api/_lib/dataProvider.js` and the policy gateway. It is grounded in retained generated-API evidence for this project family. Secret values, user identifiers and private provider response bodies are not recorded.

## Architecture

The browser never calls NoCodeBackend directly:

```text
Browser
  -> same-origin /api/nocodebackend/*
  -> Pourfolio server policy/session layer
  -> NoCodeBackend generated table API
```

The server validates the Pourfolio user session and ownership rules before privileged data access. The NoCodeBackend database secret remains server-only.

## Canonical provider configuration

The generated table API host used by the retained provider contract is:

```text
https://api.nocodebackend.com
```

The Pourfolio database instance is:

```text
54026_rating
```

Every generated table request includes:

```http
Authorization: Bearer <server-only secret>
X-Database-Instance: 54026_rating
```

and the required query parameter:

```text
Instance=54026_rating
```

`NOCODEBACKEND_DATA_BASE_URL` may override the host only when an explicitly verified table-API endpoint is required. A stale AWS Lambda URL is not a valid data transport; the adapter bypasses it and uses the canonical generated table API instead.

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

These are provider-generated table operations. Application/browser routes remain stable product-level operations and do not expose arbitrary provider paths.

## Filtering, search, ordering and pagination

Generated read APIs support column-based filters. Operators use bracket notation, including:

```text
field=value
field[ne]=value
field[gt]=value
field[gte]=value
field[lt]=value
field[lte]=value
field[in]=a,b,c
field[like]=value
```

Catalogue product search therefore maps to:

```text
product_name[like]=<search>
```

Ordering and pagination use:

```text
sort=product_name
order=asc
page=1
limit=24
```

The adapter accepts supported provider envelopes including `data`, `records`, `items`, `results`, or a bare array. When explicit pagination metadata exists, it is validated for internal consistency. When the generated API returns a valid list without pagination metadata, the adapter does not turn that response into a false 502: it uses the requested page/limit and marks totals as estimated when a full page means another page may exist.

## Record reads

A direct record read uses:

```text
GET /read/{collection}/{id}?Instance=54026_rating
```

The returned record must have the requested identifier. If the provider returns `404`, the adapter may perform a filtered list fallback using `id=<id>` and accepts only an exact ID match. An unrelated record is never accepted.

## Response normalisation

Supported list/single-record envelopes are normalised before reaching application services. Provider metadata and privileged fields are not passed directly into browser components.

A provider response is treated as failure when any of the following apply:

- HTTP status is not successful;
- response contains `error`;
- `success === false`;
- `status === "error"`;
- response body is malformed/non-JSON where JSON is required;
- the network request fails or times out;
- required explicit pagination metadata is internally inconsistent.

## Error and conflict contract

Raw provider error bodies are never returned to browsers.

- `400` -> safe `PROVIDER_ERROR`.
- `401` / `403` -> safe authentication/authorisation provider error.
- `404` -> safe not-found handling; `get` may return `null` after exact-match fallback also misses.
- `409` ordinary write -> `UNIQUE_CONFLICT`.
- `409` compare-and-set with `expected_version` -> `VERSION_CONFLICT`.
- malformed/non-JSON, timeout, transport failure, or error envelope with a successful HTTP code -> `502 PROVIDER_ERROR`.

## Authentication boundary

NoCodeBackend authentication uses its separate authentication API through Pourfolio's same-origin auth proxy. A user session proves the browser actor to Pourfolio; the server-side database Bearer credential authorises the server's generated-table request. These are separate trust boundaries and neither credential is exposed to browser code.

## Connected verification

The repository includes a non-destructive provider smoke test. Enable it only in an approved connected environment:

```bash
RUN_NOCODEBACKEND_PROVIDER_SMOKE=1 \
NOCODEBACKEND_SECRET_KEY=<redacted> \
npm run test:provider-smoke
```

The smoke test exercises launch-critical reads for:

- `products`;
- `profiles`;
- `cellar`;
- `rating_attributes`;
- `bonus_attributes`.

The generated host and `54026_rating` instance defaults are used unless a verified override is explicitly configured.

## Destructive provider-contract verification

The separate destructive contract suite remains restricted to an isolated, disposable staging provider workspace. It must never run against shared production data. The protected workflow requires the existing explicit destructive opt-in and fixture identifiers, creates only approved synthetic records, deletes them in dependency order, and retains only redacted verification evidence.

## Change control

Do not infer a different NoCodeBackend endpoint shape from generic REST conventions. Before changing this contract:

1. inspect the generated API documentation for `54026_rating` or equivalent retained provider evidence;
2. update this document and the adapter in the same change;
3. update unit and connected contract tests;
4. run full validation and the connected smoke gate;
5. verify production reads after deployment.

A guessed provider URL or invented route shape is a release blocker.
