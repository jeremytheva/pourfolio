---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Connected release credential hardening"
gate: Integration
execution_state: IMPLEMENTING
current_work:
  objective: "Bind protected connected-release account credentials to a verified Pourfolio Vercel deployment and exact release provenance before browser authentication can run."
  issue: 365
  pr: null
  branch: "security/verify-connected-release-target"
next_actions:
  - "Validate the #365 release-target allowlist, readiness provenance preflight and workflow ordering on the exact branch head."
  - "Open a normal PR for #365 and merge when canonical validation, browser/security checks and review are satisfactory."
  - "Resume #225 authenticated catalogue/profile evidence when a protected release-account session is executable."
  - "Confirm the historically exposed provider Bearer credential was rotated or invalidated without recording its value."
  - "Keep #165 DEFERRED_TARGET until #225 certification/hygiene is sufficiently resolved."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated catalogue and session-backed profile certification require an executable protected release-account session; this does not block independent #365 hardening."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation requires provider or secret-management evidence without exposing the credential value; this does not block independent #365 hardening."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Durable rating idempotency fields and connected schema/constraint capability remain DEFERRED_TARGET until #225 certification/hygiene is sufficiently resolved."
requires_owner_decision: false
owner_decision:
  question: "No product decision is required for connected-release target hardening."
  options: []
  recommendation: "Fail closed before protected release-account credentials are supplied unless the target is a Pourfolio Vercel deployment whose readiness provenance exactly matches the requested release SHA."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: NOT_RUN
  runtime: VERIFIED
last_verified_commit: "0af555256ae2fffde3ae0a6a90d18dceb10ed4c4"
last_updated: "2026-09-10T16:22:00+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / connected release credential hardening  
**Execution state:** Implementing issue **#365** on `security/verify-connected-release-target` while the protected evidence in **#225** remains externally blocked.  
**Most recent completed integration:** issue **#363** / PR **#364** reconciled the repository source of truth after API containment and merged at `0af555256ae2fffde3ae0a6a90d18dceb10ed4c4`.

## Autonomous continuation support

Continue the highest-priority dependency-correct launch work that can safely be completed autonomously. The repository is authoritative for current work and blockers; chat history remains supporting context only.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. Exact-main production `/api/readiness` on `0af555256ae2fffde3ae0a6a90d18dceb10ed4c4` returned HTTP 200 with `dataProvider: "ok"`. The remaining #225 work is protected authenticated evidence and historical credential hygiene, not provider routing repair.

When #225 cannot progress because a protected authenticated session or credential-hygiene evidence is unavailable, continue independent launch-scoped reliability/security work that does not weaken provider/schema gates or invent catalogue decisions.

## Current work — #365 connected release credential boundary

The protected connected-release workflow accepts a caller-supplied `release_url` and later supplies protected release-account credentials to Playwright. Before #365, `playwright.release.config.js` validated only that `RELEASE_BASE_URL` used HTTPS. A mistakenly supplied external HTTPS origin could therefore receive protected test-account credentials during sign-in.

Issue **#365** hardens that boundary by:

- accepting only the Pourfolio Vercel deployment hostname family;
- rejecting HTTP, userinfo, non-default ports, query/fragment values and non-root base paths;
- requiring an exact lowercase 40-character release SHA;
- fetching `/api/readiness` without credentials and without following redirects before credentialed browser tests;
- requiring HTTP 200, `status: ready`, the exact requested release SHA, a canonical Vercel release environment and `dataProvider: "ok"`;
- keeping protected release-account secrets only on the subsequent connected browser-test step;
- applying the same target-origin allowlist in Playwright as defence in depth;
- adding deterministic unit and workflow-order regression coverage.

No provider schema/data, production credential, frontend feature or application routing change is included.

## Current #225 provider certification state

Issue **#225** remains the dependency-correct connected certification work, but its historical provider-authorization failure is no longer reproduced.

Existing and freshly refreshed evidence establishes:

- canonical data base URL `https://api.nocodebackend.com/`;
- canonical auth base URL `https://app.nocodebackend.com/api/user-auth`;
- server data requests use the server-only provider credential and intended `54026_rating` instance;
- exact-main production `0af555256ae2fffde3ae0a6a90d18dceb10ed4c4` is deployed READY;
- `/api/readiness` on that exact production release returned HTTP 200 with matching release SHA/environment and `dataProvider: "ok"`;
- profile persistence remains unavailable by design; profile identity is session-backed/read-only;
- provider credentials are not returned to browser/readiness output.

The remaining #225 acceptance work is specifically:

1. authenticated catalogue read through the same-origin application API;
2. authenticated session-backed profile read remaining non-403;
3. confirmation that the Bearer credential present in historical supplied evidence was rotated or otherwise invalidated, without ever recording the credential value;
4. retention of that connected evidence for downstream #165, #144 and #154 work.

These require protected account/provider evidence and cannot be replaced by source changes.

## API capability containment completed — #361 / PR #362

PR **#362** is merged at `d2176025aebb28494894f3782f88112f886e0052`. Ordered Vercel routes send direct implementation URLs for `catalog-data-proxy`, `cellar-data-proxy`, `current-data-proxy`, `profile-data-proxy` and legacy `data-proxy` to the inert `api/internal-not-found.js` handler before filesystem resolution. Canonical `/api/nocodebackend/auth/...` and `/api/nocodebackend/...` routes continue through `auth-proxy` and `data-router` respectively.

Production deployment `dpl_EeHDXDJTgxhPLxJb29PhDT2EruPg` reached READY, and a post-merge production request to `/api/current-data-proxy?path=bad` returned the inert HTTP 404 response without application request-id/rate-limit headers from the contained handler.

## Profile capability correction completed — #359 / PR #360

PR **#360** removed the unavailable profile-persistence journey:

- profile identity is session-backed and read-only;
- sign-up no longer attempts an unavailable profile PUT;
- the Profile page no longer presents persistence controls that must fail;
- rating-history read/delete behaviour remains available;
- profile PUT still fails explicitly until persistent profile storage is genuinely deployed and verified.

## Backend-table alignment completed — #354 / PR #355

PR **#355** aligned active launch contracts to the supplied `54026_rating` backend tables:

- cellar writes/projected records use exported columns only;
- fabricated cellar lifecycle fields were removed;
- catalogue producer enrichment uses `products.producer_id -> producers.id`;
- the nonexistent `product_producers` junction is not queried;
- zero/missing producer attribution remains unresolved rather than fabricated.

The supplied products export contains **7 rows with `producer_id = 0` and 22 rows with a blank producer ID**. Those are governed catalogue-data remediation tasks, not frontend relationship data.

## Launch schema/application contract

Provider-evidenced launch collections remain `products`, `producers`, `categories`, `rating_attributes`, `bonus_attributes`, `ratings`, `rating_scores`, `bonus_attribute_rating_mapping` and `cellar`.

Key rules remain:

- products classify through `product_category_id`;
- current producer relationship is `products.producer_id` only;
- bonus mappings use `bonus_attributes_id`;
- cellar sharing version uses `series_version_id`;
- persistent `profiles` and `product_producers` are **UNAVAILABLE**;
- active rating submission uses only current exported backend fields;
- durable idempotency/workflow fields tracked by **#165** remain `DEFERRED_TARGET` and `/ratings/reconcile` remains unavailable until that provider migration is verified.

## Catalogue remediation boundary

The deterministic catalogue workflow has already materialised **193 governed human decision tasks** covering the known source blockers. Do not auto-fill producer/category mappings, category-cycle decisions, duplicate ordering, removals or edits. Corrections require explicit decisions and independent review before any candidate catalogue or provider mutation can be treated as accepted.

## Destructive connected-write rule

Do not run rating create/delete or cellar CRUD certification against a real connected environment unless the run is explicitly authorised for cleanup-guarded test writes. Exact-record cleanup must be verified. Failure to prove cleanup remains a material blocker and must not be converted into a pass.

## Next dependency-correct work

1. Complete and validate #365 connected-release target/provenance hardening, then merge when safe.
2. Complete #225 authenticated catalogue and profile smoke evidence when a protected session is executable.
3. Complete #225 historical provider credential rotation/invalidation evidence.
4. Activate #165 provider migration/idempotency work only after #225 is sufficiently resolved.
5. Follow with #144 backend/provider certification and backend-dependent #154 completion evidence.
6. Keep catalogue remediation decisions explicit and independently reviewed; do not fabricate the 193 pending decisions.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes, catalogue decisions are governed, and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
