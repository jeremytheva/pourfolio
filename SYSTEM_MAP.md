# SYSTEM_MAP.md

**Last materially reviewed:** 26 August 2026

This map is a compact navigation aid for whole-system analysis. `ARCHITECTURE.md` and `docs/ARCHITECTURE.md` remain the architectural authorities.

## Browser and routing

```text
React / Vite SPA
  → /login
  → /home
  → /search
  → /products/:productId
  → /products/:productId/rate
  → /cellar
  → /profile
```

Launch-excluded prototype modules must remain unreachable from launch routing/navigation.

## Authentication

```text
Browser auth client
  → same-origin /api/nocodebackend/auth/*
  → api/auth-proxy.js
  → origin / method / body / rate-limit controls
  → server-only NoCodeBackend credential + instance
  → NoCodeBackend Authentication API
  → session cookie
  → /get-session identity resolution
```

Authority:

- provider discovery determines enabled authentication methods;
- successful sign-in/sign-up must resolve a stable session identity;
- browser-supplied user/role authority is never trusted.

## Catalogue discovery

```text
Home / Search / Product Details
  → beverage service
  → browser response-contract validation
  → same-origin catalogue API
  → catalogue data proxy
  → dataProvider
  → NoCodeBackend generated data API
      → products
      → producers
      → categories
      → optional collaboration producer relationships
```

Current release blockers:

- #225 generated data API authorization;
- #224 current-main deployment evidence;
- #154 canonical catalogue reconciliation and connected certification.

## Ratings

```text
Rate Beer UI
  → rating service
  → same-origin semantic gateway
  → session / owner policy
  → rating validation + server-derived totals
  → rating workflow
      → ratings
      → rating_scores
      → optional bonus_attribute_rating_mapping
  → durable verification / reconciliation boundary
```

Current constraint: the target idempotency schema must not be treated as deployed until #165 completes real provider migration and connected verification. `/ratings/reconcile` remains unavailable until that gate passes.

## Rating history

```text
Authenticated user
  → rating history service
  → owner-scoped gateway
  → ratings owned by session user
  → product relationship hydration
  → private history projection
```

Incomplete/deleting rating workflow states must not be represented as completed history.

## Cellar

```text
Cellar UI
  → cellar service
  → owner-scoped semantic gateway
  → session ownership policy
  → cellar collection
  → product relationship
  → optional sharing-series/version relationships
```

Sharing-series/version relationships remain optional and normalize to `null` when absent; sentinel relationship IDs are invalid.

## Profiles

```text
Profile UI
  → profile gateway
  → session identity
  → user_id ownership match
  → writable-field allowlist
  → profiles provider record
```

Provider primary ID and authenticated owner ID are separate concepts.

## Rate limiting

```text
Sensitive server route
  → opaque account/client rate-limit key
  → shared Redis-compatible store
  → fixed-window policy
  → allow or fail closed
```

Production must use shared server-side storage; missing configuration and provider outage remain distinguishable diagnostics.

## Health, readiness and release evidence

```text
/api/health
  → process/configuration state
  → validated release SHA/environment provenance

/api/readiness
  → release provenance
  → bounded provider read
  → machine-readable provider readiness

GitHub CI
  → npm run platform:validate
  → hosted browser/accessibility
  → dependency review
  → CodeQL

Vercel production
  → exact deployed SHA
  → health/readiness
  → connected smoke evidence
```

A passing repository validation command is not deployment/runtime verification.

## Account lifecycle — PARTIAL

```text
Owner snapshot
  → export projection
  → deterministic export artifact

Owner snapshot
  → deletion discovery plan
  → exact confirmation
  → reconciliation model
  → [provider execution not yet integrated]
```

Preserve these source foundations. Do not expose destructive account lifecycle as complete until recent-auth, durable execution, identity deletion, final absence proof and retention requirements are resolved.

## Provider/configuration ownership

```text
Application domain + policy
  → server repositories/adapters
  → NoCodeBackend provider

Vercel
  → runtime + environment + deployment

GitHub
  → source + PR/CI/governance evidence
```

Canonical NoCodeBackend server variables:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

Privileged provider access never belongs in browser code.
