---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Production provider certification"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Complete the remaining authenticated production certification and historical provider credential hygiene tracked by #225 after connected-release credential hardening completed in #366."
  issue: 225
  pr: null
  branch: null
next_actions:
  - "Run authenticated catalogue smoke through the same-origin application API when a protected release-account session is executable."
  - "Verify the authenticated session-backed profile read remains non-403 in the same protected session."
  - "Confirm the historically exposed provider Bearer credential has been rotated or otherwise invalidated without recording its value."
  - "Continue independent launch-quality/security work when #225 evidence remains externally unavailable."
  - "Keep #165 DEFERRED_TARGET until #225 certification/hygiene is sufficiently resolved."
blockers:
  - scope: connected_authenticated_smoke
    issue: 225
    detail: "Authenticated catalogue and session-backed profile certification require an executable protected release-account session; repository/source changes cannot substitute for that evidence."
  - scope: credential_hygiene
    issue: 225
    detail: "Historical provider credential rotation/invalidation requires provider or secret-management evidence without exposing the credential value."
  - scope: connected_schema_inventory
    issue: 165
    detail: "Durable rating idempotency fields and connected schema/constraint capability remain DEFERRED_TARGET until #225 certification/hygiene is sufficiently resolved."
requires_owner_decision: false
owner_decision:
  question: "No product decision is currently required."
  options: []
  recommendation: "Preserve the working provider/routing boundaries and obtain the remaining protected connected evidence rather than weakening gates or changing routing again."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: NOT_RUN
  runtime: VERIFIED
last_verified_commit: "dfc866301881ec82e1dce59b39532190056799fe"
last_updated: "2026-09-10T16:28:30+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / production provider certification  
**Execution state:** **BLOCKED** on the protected connected evidence remaining in **#225**.  
**Most recent completed integration:** issue **#365** / PR **#366** hardened connected-release credential targeting and merged at `dfc866301881ec82e1dce59b39532190056799fe`.

## Autonomous continuation support

Continue the highest-priority dependency-correct launch work that can safely be completed autonomously. The repository is authoritative for current work and blockers; chat history remains supporting context only.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. Exact-main production `/api/readiness` on `dfc866301881ec82e1dce59b39532190056799fe` returned HTTP 200 with matching production release provenance and `dataProvider: "ok"`. The remaining #225 work is protected authenticated evidence and historical credential hygiene, not provider routing repair.

When #225 cannot progress because a protected authenticated session or credential-hygiene evidence is unavailable, continue independent launch-scoped reliability/security work that does not weaken provider/schema gates or invent catalogue decisions.

## Connected release credential hardening completed — #365 / PR #366

PR **#366** prevents protected connected-release account credentials from being supplied to an arbitrary caller-provided HTTPS origin.

The accepted implementation:

- allows only the Pourfolio Vercel deployment hostname family;
- rejects HTTP, userinfo, non-default ports, query/fragment values and non-root base paths;
- requires an exact lowercase 40-character release SHA;
- performs a no-secret `/api/readiness` preflight without following redirects before the credentialed browser-test step;
- requires HTTP 200, `status: ready`, exact requested SHA, canonical Vercel environment and `dataProvider: "ok"`;
- keeps protected release-account secrets only on the subsequent Playwright step;
- applies the same target-origin allowlist inside Playwright as defence in depth;
- includes deterministic regression coverage for approved origins, lookalikes, redirects, malformed responses, provenance drift and workflow ordering.

Validation and release evidence:

- PR head: `7315fb818f1014bcecf74f04e35f8b91422fd076`;
- 393 Node tests: 384 passed, 9 intentionally skipped, 0 failed;
- production audit: zero vulnerabilities;
- canonical Release gate, Browser/accessibility, Dependency Review and CodeQL passed;
- no unresolved review threads;
- exact preview `dpl_2FdE1RMVMhpPGv871XCrVC7QjM4V` reached READY and `/api/readiness` returned the exact preview SHA with `dataProvider: "ok"`;
- merge commit: `dfc866301881ec82e1dce59b39532190056799fe`;
- production deployment: `dpl_8ZArjDYVbmAVGmaKprDX3gC5JRn7`, READY and GitHub-verified;
- post-merge production `/api/readiness`: HTTP 200 with exact merge SHA, environment `production`, and `dataProvider: "ok"`.

No provider schema/data, production credential, frontend feature or application routing change was made.

## Current #225 provider certification state

Issue **#225** remains the dependency-correct connected certification work, but its historical provider-authorization failure is no longer reproduced.

Current evidence establishes:

- canonical data base URL `https://api.nocodebackend.com/`;
- canonical auth base URL `https://app.nocodebackend.com/api/user-auth`;
- server data requests use the server-only provider credential and intended `54026_rating` instance;
- exact-main production is deployed READY;
- exact-main `/api/readiness` completes a real generated-provider products read with `dataProvider: "ok"`;
- profile persistence remains unavailable by design; profile identity is session-backed/read-only;
- provider credentials are not returned to browser/readiness output;
- the connected-release harness now verifies target origin and exact readiness provenance before release-account credentials can be used.

The remaining #225 acceptance work is specifically:

1. authenticated catalogue read through the same-origin application API;
2. authenticated session-backed profile read remaining non-403;
3. confirmation that the Bearer credential present in historical supplied evidence was rotated or otherwise invalidated, without ever recording the credential value;
4. retention of that connected evidence for downstream #165, #144 and #154 work.

These require protected account/provider evidence and cannot be replaced by source changes.

## API capability containment completed — #361 / PR #362

PR **#362** is merged at `d2176025aebb28494894f3782f88112f886e0052`. Ordered Vercel routes send direct implementation URLs for `catalog-data-proxy`, `cellar-data-proxy`, `current-data-proxy`, `profile-data-proxy` and legacy `data-proxy` to the inert `api/internal-not-found.js` handler before filesystem resolution. Canonical `/api/nocodebackend/auth/...` and `/api/nocodebackend/...` routes continue through `auth-proxy` and `data-router` respectively.

## Profile capability correction completed — #359 / PR #360

PR **#360** removed the unavailable profile-persistence journey. Profile identity is session-backed and read-only; sign-up no longer attempts an unavailable profile PUT; the Profile page no longer presents persistence controls that must fail; rating-history read/delete behaviour remains available.

## Backend-table alignment completed — #354 / PR #355

PR **#355** aligned active launch contracts to the supplied `54026_rating` backend tables. Cellar writes use exported columns only; catalogue producer enrichment uses `products.producer_id -> producers.id`; the nonexistent `product_producers` junction is not queried; zero/missing producer attribution remains unresolved rather than fabricated.

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

1. Complete #225 authenticated catalogue and profile smoke evidence when a protected session is executable.
2. Complete #225 historical provider credential rotation/invalidation evidence.
3. Continue independent launch-quality/security work while those external evidence dependencies remain unavailable.
4. Activate #165 provider migration/idempotency work only after #225 is sufficiently resolved.
5. Follow with #144 backend/provider certification and backend-dependent #154 completion evidence.
6. Keep catalogue remediation decisions explicit and independently reviewed; do not fabricate the 193 pending decisions.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes, catalogue decisions are governed, and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
