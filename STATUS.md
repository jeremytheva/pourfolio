---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Production provider certification"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Complete the remaining authenticated production certification and historical provider credential hygiene tracked by #225 after API containment merged in #362."
  issue: 225
  pr: null
  branch: null
next_actions:
  - "Run the authenticated catalogue smoke through the same-origin application API when a protected release-account session is executable."
  - "Verify the authenticated session-backed profile read remains non-403 in the same protected session."
  - "Confirm the historically exposed provider Bearer credential has been rotated or otherwise invalidated without recording its value; rotate it first if that cannot be confirmed."
  - "Record the resulting connected evidence for #225 and then activate #165 provider/schema idempotency work."
  - "Keep catalogue remediation decisions explicit and independently reviewed; do not fabricate producer/category mappings."
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
  recommendation: "Preserve the current working provider routing and capability boundaries; obtain the remaining protected connected evidence rather than changing frontend/backend routing again."
validation:
  governance: PASS
  lint: NOT_RUN
  typecheck: NOT_APPLICABLE
  tests: NOT_RUN
  build: NOT_RUN
  ci: NOT_RUN
  runtime: VERIFIED
last_verified_commit: "d2176025aebb28494894f3782f88112f886e0052"
last_updated: "2026-09-10T16:03:30+10:00"
---

# STATUS.md

Last materially reviewed: 10 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / production provider certification  
**Execution state:** **BLOCKED** on the protected connected evidence remaining in **#225**  
**Most recent completed integration:** issue **#361** / PR **#362** contained direct internal API implementation routes and merged at `d2176025aebb28494894f3782f88112f886e0052`.

## Autonomous continuation support

Continue the highest-priority dependency-correct launch work that can safely be completed autonomously. The repository is authoritative for current work and blockers; chat history remains supporting context only.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. The generated NoCodeBackend data credential is currently accepted for server-side reads, auth provider discovery is reachable, the profile capability is session-backed/read-only, and direct implementation-function URLs are contained.

When #225 cannot progress because a protected authenticated session or credential-hygiene evidence is unavailable, continue only independent launch-scoped work that does not weaken provider/schema gates or invent catalogue decisions.

## API capability containment completed — #361 / PR #362

PR **#362** is merged. The final accepted implementation uses ordered Vercel `routes` so direct URLs for:

- `catalog-data-proxy`;
- `cellar-data-proxy`;
- `current-data-proxy`;
- `profile-data-proxy`; and
- legacy `data-proxy`

are routed to the inert `api/internal-not-found.js` handler before filesystem resolution. Canonical `/api/nocodebackend/auth/...` and `/api/nocodebackend/...` routes continue to dispatch through `auth-proxy` and `data-router` respectively.

The earlier ordinary-rewrite and status-only 404 attempts were rejected because live preview testing proved the underlying implementation handler could still execute. They are not the accepted design.

Merge evidence:

- merged PR: **#362**;
- merge commit: `d2176025aebb28494894f3782f88112f886e0052`;
- production deployment: `dpl_EeHDXDJTgxhPLxJb29PhDT2EruPg`;
- deployment target: production;
- deployment state: **READY**;
- GitHub commit verification: verified;
- post-merge production request to `/api/current-data-proxy?path=bad`: HTTP **404** with `{ "error": "Application data route not found." }` and no application request-id/rate-limit headers from the contained implementation handler.

The exact PR head passed canonical platform validation, browser/accessibility, Dependency Review and CodeQL with no unresolved review threads. The implementation-equivalent run recorded 388 Node tests: 379 passed, 9 intentionally skipped, 0 failed; production audit reported zero vulnerabilities.

## Current work — #225 provider certification and credential hygiene

Issue **#225** remains the current dependency-correct work. Its historical provider-authorization failure is no longer reproduced.

Existing connected evidence already establishes:

- the canonical data base URL is `https://api.nocodebackend.com/`;
- the canonical auth base URL is `https://app.nocodebackend.com/api/user-auth`;
- server data requests use the server-only provider Bearer credential and intended `54026_rating` instance;
- production `/api/readiness` has completed a real generated-provider products read with `dataProvider: "ok"`;
- application-owned auth provider discovery has returned email authentication enabled and Google disabled;
- provider credentials are not returned to browser/readiness output.

The remaining #225 acceptance work is specifically:

1. authenticated catalogue read through the same-origin application API;
2. authenticated session-backed profile read remaining non-403;
3. confirmation that the Bearer credential present in historical supplied evidence was rotated or otherwise invalidated, without ever recording the credential value;
4. retention of that connected evidence for downstream #165, #144 and #154 work.

These are evidence/credential-hygiene dependencies, not justification for another routing rewrite.

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

Provider-evidenced launch collections remain:

- `products`;
- `producers`;
- `categories`;
- `rating_attributes`;
- `bonus_attributes`;
- `ratings`;
- `rating_scores`;
- `bonus_attribute_rating_mapping`;
- `cellar`.

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
3. Activate #165 provider migration/idempotency work only after #225 is sufficiently resolved.
4. Follow with #144 backend/provider certification and backend-dependent #154 completion evidence.
5. Continue independent launch-quality work when connected evidence is unavailable, provided it does not bypass these dependencies or fabricate catalogue decisions.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes, catalogue decisions are governed, and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.
