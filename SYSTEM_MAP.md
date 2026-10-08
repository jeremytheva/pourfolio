# SYSTEM_MAP.md

**Last materially reviewed:** 9 October 2026 (Australia/Sydney)

This map is a compact navigation aid for whole-system analysis. `ARCHITECTURE.md` and `docs/ARCHITECTURE.md` remain the architectural authorities.

## Browser and routing

`src/App.jsx` owns reachable routes; `src/data/publicDocuments.js` owns public document routes. The inventory below is checked by `npm run check:project-docs`.

<!-- current-browser-routes:start -->
- `/login`
- `/home`
- `/search`
- `/products/propose`
- `/places`
- `/styles`
- `/styles/:styleId`
- `/taste-map`
- `/features`
- `/brew-done-it`
- `/products/:productId`
- `/products/:productId/propose-edit`
- `/products/:productId/rate`
- `/breweries/:producerId`
- `/users/:publicProfileId`
- `/cellar`
- `/history`
- `/profile`
- `/settings`
- `/`
- `*`
- `/privacy`
- `/terms`
- `/moderation`
- `/support`
- `/retention`
<!-- current-browser-routes:end -->

Reachability is separate from production discovery and certification. `/features` is an informational feature-status surface. `/brew-done-it` remains directly reachable only for controlled authenticated testing, is absent from production-facing navigation/CTAs, and remains policy/provider-gated and launch-excluded; `/` and `*` redirect. Current blockers and acceptance evidence belong only in `STATUS.md` and linked issues.

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

Current certification dependencies: see `STATUS.md` and #154. Historical provider-access and deployment incidents #225 and #224 are closed; reopen only with new contradictory evidence.

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
  → paged completed ratings owned by session user
  → page-bounded optional relationship enrichment
  → private history projection
```

Incomplete/deleting rating workflow states must not be represented as completed history.
Personal beer-page links select the canonical rating through `/profile?rating=:ratingId`.
The gateway resolves the containing page and retains whole-history totals. Recorded
score/selected-attribute breakdowns are lazy reads of the authorised parent;
missing components are not reconstructed from current weighting settings.

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

`Profile.jsx` uses `profileService` and `api/profile-data-proxy.js` for persistent
owner profile access. `profileStore.js` resolves the authenticated owner, creates
a default-private profile with a server-generated opaque `public_id` when absent,
and allowlists owner display/privacy updates. Provider primary ID, authenticated
owner ID and public profile ID are separate concepts.

Signed-in public profile reads use `/users/:publicProfileId`; shared beer-page
links select `/users/:publicProfileId?rating=:ratingId` for the authoritative
author, not the viewer. Current explicit sharing opt-in and exact parent/profile
ownership are checked before shared history or its safe breakdown is returned.
Private account identifiers, child identifiers, workflow fields and cellar
prices are excluded. See [ADR 0003](docs/DECISIONS/0003-public-user-profiles-and-rating-history.md).

`Settings.jsx` is the reachable rating-preference screen; `settingsManager.js`
also serves `RateBeer.jsx`. The unused legacy `ProfileSettings.jsx` is retired,
not replaced with another preference or profile implementation. Deferred
event/venue components and their shared helpers remain contained and retained.

These are implemented source contracts, not completed connected provider
certification. Live acceptance, the failed deletion and unsupported #422 rows
remain governed by `STATUS.md` and the rating workflow certification guide.

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

Canonical provider variables and URLs: `contracts/pourfolio-data-contract.json` and `.env.example`. Architectural use: `ARCHITECTURE.md`. Privileged provider access never belongs in browser code.
