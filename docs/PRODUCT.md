# Product: Pourfolio

## Purpose and users
Pourfolio is an in-development beverage discovery and community application for general beverage enthusiasts, producer representatives, venue operators, and administrators. It combines a beverage catalogue with personal ratings, cellar tracking, producer claims, venue and event discovery, and profile-driven community features.

## Core capabilities and journeys
- **Discover:** signed-in users browse/search beverages, producers, styles, venues, and events.
- **Record:** users rate beverages, retain tasting notes, and manage cellar entries.
- **Participate:** users manage profiles, explore drinking-buddy and chat-oriented UI, and receive recommendations.
- **Operate:** producer representatives submit ownership claims; venue managers and administrators use management and claim workflows.

Typical flow: a user signs in through NoCodeBackend, is routed to protected pages, discovers a beverage or producer, and records a rating or cellar entry. Data-facing services call the configured NoCodeBackend collections; some prototype flows remain browser-local.

## Current scope and non-goals
The repository provides a Vite client and one server-side authentication proxy. NoCodeBackend collection setup and permissions are documented but are operated outside this repository. The app is not a payment system, regulated alcohol-sale platform, or authoritative inventory/identity system. A committed hosting configuration, executable database migrations, complete end-to-end suite, and a comprehensive server API are not present.

## Terminology
- **Beverage:** a catalogued beer, wine, spirit, cider, mead, or similar item.
- **Producer:** a brewery, winery, distillery, cidery, meadery, or similar maker.
- **Cellar item:** a user-owned beverage inventory entry.
- **Producer claim:** a request to associate a user with a producer, reviewed by an administrator.
- **NoCodeBackend:** the active external data and authentication service.
