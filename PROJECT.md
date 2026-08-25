# PROJECT.md

## Project

**Pourfolio**  
Beer-first discovery, structured rating and private cellar platform.

**Repository:** `jeremytheva/pourfolio`  
**Primary branch:** `main`  
**Project control baseline:** 23 August 2026

## Purpose

Pourfolio is a beer-first portfolio that lets authenticated users:

- discover and search a live beer catalogue;
- open stable product detail routes;
- submit structured 1–7 ratings;
- review and delete their own rating history;
- maintain a private cellar;
- maintain a basic display profile.

The launch product is deliberately narrower than the broader prototype. Social, event, venue, producer administration, platform administration, analytics, photo upload, non-beer rating modes and other prototype modules are deferred unless separately approved and implemented against production-grade backend, privacy and permission controls.

## Current launch outcome

The intended first public release is a reliable beer portfolio with:

1. NoCodeBackend authentication through an application-owned same-origin server boundary.
2. Server-authoritative user identity and ownership.
3. Live catalogue browse/search and stable product routes.
4. Normalised structured ratings.
5. Owner-scoped personal rating history.
6. Owner-scoped private cellar CRUD.
7. Explicit failure handling rather than simulated success or prototype data.

Ratings and cellar records do **not** require a sharing series or edition. Those relationships are optional and must remain null when not applicable.

## Product principles

- Beer-first launch scope.
- Server-side authority for identity, ownership, permissions and derived rating totals.
- Fail closed on malformed provider data, unavailable authentication discovery, ownership uncertainty and unsupported workflows.
- No production secret in browser code.
- No fake success, demonstration data or placeholder workflow presented as real.
- Preserve stable identifiers and deterministic data relationships.
- Treat provider integration as a controlled adapter boundary rather than direct browser-to-provider access.
- Prefer root-cause corrections over local workarounds.
- Keep each implementation issue focused enough to produce one reviewable pull request.

## Technology

| Area | Current implementation |
|---|---|
| Frontend | React 19.2 |
| Build tooling | Vite |
| Runtime | Node.js 20 |
| Package manager | npm |
| Hosting | Vercel |
| Backend provider | NoCodeBackend |
| Server boundary | Vercel Functions under `api/` |
| Rate limiting | Vercel KV / Upstash-compatible Redis integration |
| CI / validation | GitHub Actions plus repository validation scripts |
| Browser routing | Small same-origin History API router |

## Provider configuration contract

The repository currently standardises on these server-only NoCodeBackend variables:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

Canonical hard-coded defaults where a fallback is required:

- Data: `https://api.nocodebackend.com/`
- Authentication: `https://app.nocodebackend.com/api/user-auth`
- Instance: `54026_rating`

Browser code must not receive the provider secret or bypass the Pourfolio same-origin server boundary.

## Repository authority

Use the following source hierarchy:

1. implemented code and configuration;
2. `AGENTS.md`;
3. repository product, architecture, data, security, testing and decision documents;
4. GitHub issues;
5. pull requests and validation evidence;
6. milestones / project tracking;
7. ChatGPT conversation context.

Conflicts must be identified and resolved explicitly rather than silently reconciled.

## Canonical repository documents

This project-control set is intended to sit above the detailed repository documents rather than replace them.

- `PROJECT.md` — durable project purpose, scope and operating context.
- `STATUS.md` — current implementation and delivery state.
- `docs/ARCHITECTURE.md` — detailed technical architecture.
- `docs/DATA_MODEL.md` — current deployed data contract.
- `docs/SECURITY.md` — security model and controls.
- `docs/TESTING.md` — validation strategy.
- `docs/LAUNCH_READINESS.md` — production gate evidence.
- `docs/RELEASE_TRACKING.md` — release evidence and phase tracking.
- `docs/DECISIONS/` — accepted decision records.

## Definition of launch-ready

Pourfolio is launch-ready only when:

- all required launch workflows work against the connected production-equivalent backend;
- authentication, session, ownership and rate-limit controls are proven;
- canonical catalogue and imported data are reconciled;
- rating writes are reliable and data-integrity controls are deployed;
- required CI, security, accessibility and production build checks pass on the exact candidate SHA;
- environment configuration and provider permissions are verified;
- all P0/P1 launch gates are closed with evidence;
- required repository governance controls are active;
- current documentation matches the implemented state;
- no deferred prototype module is accidentally routed, bundled or represented as production-ready.
