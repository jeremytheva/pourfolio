---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "Rating idempotency provider migration"
gate: Integration
execution_state: BLOCKED
current_work:
  objective: "Complete #165 durable rating idempotency/schema capability up to the irreversible provider migration boundary, while continuing safe independent launch-hardening work when that boundary cannot progress."
  issue: 165
  pr: null
  branch: null
next_actions:
  - "Evidence the provider-supported schema/constraint, backup, restore and safe-backfill mechanism required by #165 before any provider mutation."
  - "Do not enable /ratings/reconcile until the #165 provider migration is deployed and verified."
  - "After #165, complete #144 backend/provider certification and then backend-dependent #154 catalogue completion evidence."
  - "While #165 remains blocked, continue independent beer-only launch hardening that does not require destructive provider changes, fabricated catalogue decisions or weakened certification gates."
blockers:
  - scope: rating_idempotency_provider_migration
    issue: 165
    detail: "The application-side contract is defined, but durable idempotency requires irreversible provider schema/constraint and existing-data migration work. Proceed only when the provider-supported migration/backfill plus backup/restore path is evidenced and explicit approval exists."
requires_owner_decision: true
owner_decision:
  question: "Approve the #165 provider migration only after a concrete provider-supported migration, backup/restore and cleanup-safe backfill plan is evidenced."
  options:
    - "Approve the evidenced migration plan when ready."
    - "Keep #165 blocked and continue independent launch work."
  recommendation: "Keep #165 blocked at the irreversible provider boundary until the evidence and explicit migration approval requirements are satisfied."
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "a053797b493ef4747b167efef3bf847ddd81ce92"
last_updated: "2026-09-11T13:05:00+10:00"
---

# STATUS.md

Last materially reviewed: 12 September 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## AI execution gate

**Current gate:** Integration / rating idempotency provider migration  
**Execution state:** **BLOCKED** at the irreversible provider migration boundary in **#165**.  
**Current dependency-correct P1:** issue **#165 — Deploy rating idempotency schema before enabling reconciliation**.

Issue **#225** is complete. The previous STATUS state naming #225 as the active blocker is obsolete and must not be used to defer #165.

## Autonomous continuation support

Continue the highest-priority dependency-correct launch work that can safely be completed autonomously. The repository is authoritative for current work and blockers; chat history remains supporting context only.

Do not reopen provider routing or frontend/backend URL changes without new contradictory runtime evidence. Provider authorization, authenticated catalogue/profile evidence and credential hygiene have been completed. Do not weaken schema or cleanup gates to make #165 appear complete.

When #165 cannot progress because the provider-supported migration/backfill/backup/restore mechanism or explicit migration approval is unavailable, continue independent launch-scoped reliability, accessibility, security and product-hardening work that does not mutate provider schema/data, fabricate catalogue relationships or bypass certification boundaries.

## Independent global entity search — #510 / PR #511

Issue **#510 — Unify global search across beers, breweries and styles** is implemented in normal PR **#511** as independent Phase 3 hardening while #165 remains blocked at its irreversible provider boundary.

The implementation:
- preserves normal unfiltered product browse/pagination when the query is empty;
- uses the existing validated product search for beer matches;
- derives brewery matches only from the verified producer-discovery service and links directly to stable brewery routes;
- derives style matches only from the verified Style Explorer service and links directly to stable style routes;
- keeps partial verified results available when one result type fails, while clearly labelling the unavailable result type;
- removes the unreachable fabricated/mock `src/pages/Search.jsx` implementation;
- adds focused unit and Playwright coverage for beer, brewery, style, partial-failure and no-match behaviour.

This slice intentionally does **not** implement Phase B server-side producer pagination/search, producer statistics, rankings, provider mutation or new producer relationship semantics. Open PR #498 remains the producer-attribution authority; #510 consumes the producer service boundary instead of competing with it.

Exact implementation head `b3cc45d3c1c3e710873cff68bb5857a25434926d` passed canonical `npm run platform:validate`, all **111** browser/accessibility tests, Dependency Review and CodeQL. Vercel deployment reported success, the branch was zero commits behind `main`, the PR was mergeable and there were zero unresolved review threads at the readiness audit.

Lifecycle: **READY / MERGEABLE**, subject to the final docs-only head revalidation after recording this evidence.

## Brewery beer browsing — #516

Issue **#516 — Add brewery beer search, filters and deterministic sorting** is active after the producer-profile statistics work in #514 / PR #515.

Branch `feature/brewery-beer-browsing` currently:
- extends the existing producer detail projection with per-product community and owner-scoped aggregate rating context only;
- adds brewery-local beer-name search, canonical category filtering, rated-state filtering and deterministic sorting;
- supports name, ABV, community score, community rating-count and personal-score sorts with missing values kept distinct from zero;
- shows community score/count and the authenticated user's score on brewery beer cards where available;
- provides reset, result-count and no-match states;
- preserves the #514 privacy boundary: no raw rating rows, community identities, notes, dates, cellar data or purchase prices enter the response;
- remains profile-local and does not introduce the cross-catalogue ranking semantics planned in #441.

No provider schema/data mutation is introduced by #516.

Exact implementation head `f996bf99bda50fee4991944bc3dcf54f81b8cf11` passed canonical `npm run platform:validate`, all **117** browser/accessibility tests, Dependency Review and CodeQL. Vercel deployment reported success, the branch was zero commits behind `main`, PR #517 was mergeable and there were zero unresolved review threads. The separate PR-lifecycle label synchroniser received GitHub `403 Resource not accessible by integration`; this is repository automation permission evidence rather than an implementation acceptance failure.

Lifecycle: **READY / MERGEABLE**, subject to final docs-only head revalidation after recording this evidence.

## Brewery profile statistics — #514

Issue **#514 — Add privacy-safe brewery profile statistics and personal history** is active after the scalable producer discovery work in #512 / PR #513.

Branch `feature/brewery-profile-statistics` currently:
- expands the existing producer-detail gateway response rather than adding a parallel analytics endpoint;
- computes community statistics only from canonical completed ratings for products exactly attributed to the producer;
- preserves multi-producer collaboration attribution and legacy fallback semantics from PR #498;
- exposes aggregate weighted/unweighted scores, rated-beer breadth, core scored attribute averages and deterministic highest-average beers;
- excludes Design and Burp from the core scored attribute profile;
- exposes only the authenticated user's own aggregate brewery history as the personal section;
- does not return raw community rating rows, user IDs, rating IDs, dates, notes, cellar data or purchase prices;
- strictly validates aggregate counts, averages, attributes and top-beer references before browser render;
- upgrades `/breweries/:producerId` with community summary, core attribute profile, personal history and a return path to `/places`.

No provider schema/data mutation is introduced by #514.

Exact implementation head `687910afea5c148eb7f7e39f6c7bcf188814598b` passed canonical `npm run platform:validate`, all **115** browser/accessibility tests and CodeQL. Vercel deployment reported success, the branch was zero commits behind `main`, PR #515 was mergeable and there were zero unresolved review threads at the readiness audit.

Lifecycle: **READY / MERGEABLE**, subject to final docs-only head revalidation after recording this evidence.

## Server-authoritative brewery discovery — #512

Issue **#512 — Add scalable server-side brewery discovery and search** is active Phase 3 hardening after PR **#498** established the authoritative multi-producer relationship contract.

Branch `feature/server-brewery-discovery` currently:
- replaces browser-side full-product-catalogue traversal for brewery discovery with `GET /api/nocodebackend/catalog/producers?...&hasProducts=true`;
- derives attributed beer counts on the server from authoritative `product_producers` rows plus legacy `products.producer_id` only where a product has no junction rows;
- includes collaboration attribution without double-counting and excludes unresolved/fabricated relationships;
- supports server-side brewery name and verified-address search, deterministic ordering and paginated results;
- validates producer discovery pages strictly before render, including positive server-derived product counts;
- updates both global search and `/places` to consume the same producer-discovery authority;
- adds debounced brewery search, pagination, retry/error handling and focus restoration in `/places`;
- removes the temporary browser-side brewery directory cache while retaining the separate short-lived style directory cache.

No provider schema/data mutation is introduced by #512. The implementation consumes the relationship contract already merged in PR #498.

Exact implementation head `ed8698dae5777bd7a564acccca5e4679d67d4d8d` passed canonical `npm run platform:validate`, all **113** browser/accessibility tests, Dependency Review and CodeQL. Vercel deployment reported success, the branch was zero commits behind `main`, PR #513 was mergeable and there were zero unresolved review threads at the readiness audit.

Lifecycle: **READY / MERGEABLE**, subject to final docs-only head revalidation after recording this evidence.

## Production provider certification completed — #225, #381 and #382

Issue **#225** is **COMPLETE**. Production can read the generated NoCodeBackend data API through the server-only application gateway and the provider credential remains outside repository/browser output.

Authoritative provider evidence includes:

- canonical data base URL `https://api.nocodebackend.com/`;
- canonical auth base URL `https://app.nocodebackend.com/api/user-auth`;
- server data requests use the server-only provider credential and intended `54026_rating` instance;
- exact-main production readiness performs a bounded real `products` provider read and reports `dataProvider: "ok"`;
- authenticated catalogue browse/search/direct-detail access passed through the same-origin application gateway;
- session-backed `GET /api/nocodebackend/profile` passed with HTTP 200;
- profile persistence remains deliberately unavailable with HTTP 503 `profile_persistence_unavailable`;
- provider discovery, password sign-in/sign-out and expired-session route behaviour passed;
- the historically exposed provider credential was confirmed rotated without its value being recorded.

Issue **#381** identified auth-rate-budget exhaustion caused by repeated connected-release sign-ins. PR **#382** corrected the harness without weakening the production rate limiter by reusing established authenticated storage state, eliminating the redundant sign-in, disabling serial-suite retry amplification and isolating expired-session coverage.

PR **#382** merged as exact main `52ec6af81a08902571bf574deb2884b19201fe8e`. A subsequent non-destructive production `/release-certify` run **34475738160** completed successfully on that exact production revision, including the final launch-page accessibility checks. This remains the latest completed exact-production certification baseline unless a newer production certification is explicitly recorded.

No provider schema/data mutation was required for this certification work.

## Rating idempotency migration boundary — #165

The repository's target rating retry workflow requires durable submission identity/fingerprint/state fields, expected child counts and child uniqueness guarantees that are not present in the provider-evidenced deployed schema.

Until the migration is deployed and verified:

- launch rating submission must continue using only currently deployed backend fields;
- `/ratings/reconcile` must remain unavailable and return the governed unavailable capability rather than pretending durable reconciliation exists;
- application-side proposed fields must remain distinguished from deployed fields in schema documentation;
- no uniqueness/constraint or existing-row backfill may be performed without a provider-supported migration mechanism, backup/restore evidence, explicit approval and cleanup safeguards.

The remaining #165 work is therefore active P1 work but **blocked at an irreversible provider boundary**, not deferred behind #225.

## Brew Done It deduction v3 — #410, #461 and #477 merged

PR **#410** merged the contained persistent cross-device core. ADR **0002** remains authoritative for the persistent two-account/two-device architecture, protected secret, invitation/resume behaviour, role rotation, concurrency/idempotency and production containment. ADR **0006** defines the deduction-board gameplay model; ADR **0005** is the separate rating-event/Quick Rate decision.

PR **#461** merged the contained v3 deduction redesign at `d555bf493931d8700d6a41fd5ff4fd36736b4025`. Its exact accepted head `da0dbc1ab627e6cbea219923466c99a52ce28326` passed canonical `npm run platform:validate`, Browser/accessibility, Dependency Review and CodeQL, had Vercel deployment success, zero unresolved review threads and zero commits behind `main` at merge assessment.

The merged v3 source includes:

- natural player-to-player yes/no conversation rather than fixed/scored server questions;
- a persistent two-sided **Brewery / Beer & Style** deduction board with `yes` / `no` / `unknown` state;
- explicit brewery/beer exclusions plus a Set Unknown undo/reset path;
- searchable brewery elimination and candidate-scoped beer search;
- candidate narrowing only from governed facts, currently including producer relationships, the guesser's own previous-rating relationship where attribution is complete, style/category, arbitrary ABV/IBU thresholds and collaboration;
- correct formal brewery/style/beer outcomes applied as authoritative candidate constraints across refresh/resume;
- zero/blank relationships and missing catalogue/rating-attribution values preserved as unknown rather than silently converted to `0` / `No`;
- unknown beer categories preserving all style candidates rather than falsely narrowing the style field;
- state/country automatic filtering intentionally unavailable until canonical brewery geography is governed and certified; free-text producer address data is not used to infer geography;
- dark/barrel-aged as manual deduction notes only until trustworthy structured trait metadata exists;
- selector-only answer facts plus optional guesser-controlled aggregate rating-history clues for the hidden brewery/style/exact beer, without exposing raw rating history, notes or cellar data;
- history/familiarity restricted to canonical completed ratings (`submission_state = complete`, weighted total `> 0` and `<= 5`);
- formal brewery, exact-beer and style-fallback submissions validated against canonical catalogue references;
- unresolved hidden brewery/style relationships treated as unscorable rather than incorrect formal guesses;
- scoring v3.0.0: brewery 4 + exact beer 6, or brewery 4 + style fallback 3, minus 1 per incorrect formal submission, clamped 0–10; ordinary conversation/deductions are free;
- normalized provider boolean values at both internal gameplay/scoring and browser projection boundaries;
- stable request idempotency across UI retries, plus safe conflicts when a request key is reused for a different deduction or formal outcome;
- deterministic projection of duplicate logical deduction rows to the latest workspace value;
- v3 formal-outcome reservation/reconciliation, including recovery when round finalisation succeeds before the child commit marker and repair on later reads;
- explicit finish/forfeit replay safety; and
- v3 brewery/exact-beer/style/head-to-head statistics with forfeited rounds included in terminal round counts.

PR **#477** merged the non-destructive provider-migration evidence gate at `e6300768020e024ca877b4f5a25cad2d6660329a`. The repository now provides `npm run audit:brew-provider-evidence -- --manifest <path>` and the versioned evidence schema `pourfolio.brew-done-it-provider-evidence.v1`. The checked-in template `docs/nocodebackend/brew-done-it-provider-evidence.template.json` is deliberately BLOCKED and regression-tested to remain blocked until real evidence replaces its `PENDING` placeholders and `providerMutationApproved` becomes explicitly approved.

Containment is unchanged: `/brew-done-it` remains absent from production routing/navigation, the beer-profile entry point remains informational while contained, `BREW_DONE_IT_POLICY_ENABLED` remains unset, and no Brew Done It provider mutation has been performed.

The v3 provider target is `brew_done_it_games`, `brew_done_it_rounds`, `brew_done_it_guesses` and `brew_done_it_deductions`. `brew_done_it_questions` is legacy v2 only and is rejected by the provider-evidence gate.

Production enablement remains blocked by the Brew-specific provider/certification boundary: real isolated-provider capability/idempotency/recovery/permission/cleanup evidence, explicit provider-mutation approval with independent review, rating-history consent/privacy evidence, failure-injection recovery evidence, two-account/two-device persistence, enabled-route accessibility/browser evidence and a separate reviewed enablement change. These blockers remain scoped to Brew Done It and must not block unrelated Phase 3 work. See `docs/BREW_DONE_IT_READINESS.md`, `docs/nocodebackend/brew-done-it-schema-target.md` and the provider-evidence template.

## Recent launch product work — #384, #385, #388 and #390

PR **#384** completed the accessible swipeable rating-card experience with the 1–7 sliding/tap scale, automatic progression, Back/Next navigation and review-before-submit flow.

PR **#386**, closing **#385**, merged at `d227c59c048c6e80f87da5add8c16572b96b40a9`. It added privacy-preserving product rating insights: aggregate 1–7 distributions, aggregate attribute averages/counts, strict client response validation and an accessible community-rating presentation. Individual rating IDs, user IDs, dates, notes and per-rating score rows remain excluded from the public catalogue response.

PR **#389**, closing **#388**, merged at `7c3f1476f854d0f9865b4d2358c049304d5e0ea4`. It replaced fabricated brewery/profile content with a verified beer-only producer route using only the deployed `products.producer_id -> producers.id` relationship. Product-to-brewery links appear only for validated relationships; missing/zero attribution remains unresolved rather than inferred. Exact-head canonical validation, all 74 Browser/accessibility tests, Dependency Review, CodeQL and Vercel preview evidence passed with zero unresolved review threads.

PR **#391**, closing **#390**, merged at `a053797b493ef4747b167efef3bf847ddd81ce92`. It added privacy-safe signed-in-user versus community product rating comparison using the existing owner-scoped `/ratings/mine` capability. Multiple own ratings are represented as an explicit average/count, invalid or out-of-range totals are excluded, personal-history failure does not make community product detail unavailable, and community distributions/attribute aggregates remain non-identifying. Validation also corrected the UI to distinguish `personal rating(s)` from community `rating(s)`.

Exact-head acceptance for PR #391 at `1501da54d559342b926b74882e8767b64f73103f` passed canonical repository validation, Browser/accessibility, Dependency Review, CodeQL and Vercel status with zero unresolved review threads.

## Breweries & Venues interface and accessibility — #397, #398, #400 and #401

PR **#398**, closing **#397**, merged at `6c26ebe8aa52697f01a4a261b83acda063f92c09`. It added the signed-in `/places` surface, primary **Breweries & Venues** navigation, accessible Brewery/Venue tab semantics and the versioned **Pourfolio Rating Formula v1** definition. Brewery behaviour remains limited to verified producer relationships; the Venue tab truthfully reports that verified venue data is unavailable rather than fabricating venue records or mappings. The separately governed venue entity/rating-attribution dependency is tracked in **#399** and remains blocked at a provider/owner migration boundary.

Exact-head acceptance for PR #398 at `a5758c02928e4b9de6e4f376c38845d9c5a6b6ef` passed canonical repository validation, Browser/accessibility, Dependency Review, CodeQL and Vercel status with zero unresolved review threads.

PR **#401**, closing **#400**, merged at `239a20b4615252ae4356a02b6454ae4b0ea5bdb3`. It corrected the `/places` keyboard-operability gap by implementing roving focus/selection for ArrowLeft, ArrowRight, Home and End, added `/places` to automated WCAG coverage and added a keyboard-only regression proving users can reach the truthful venue awaiting-data state.

Exact-head acceptance for PR #401 at `30376c33250632a7434cb4cfe09c48d997bf89d2` passed canonical repository validation, Browser/accessibility, Dependency Review, CodeQL and Vercel status with zero unresolved review threads.

Neither interface slice changed provider schema/data, created venue relationships, fabricated catalogue mappings or weakened #165.

## Connected release credential hardening completed — #365 / PR #366

PR **#366** prevents protected connected-release account credentials from being supplied to an arbitrary caller-provided HTTPS origin.

The accepted implementation:

- allows only the Pourfolio Vercel deployment hostname family;
- rejects HTTP, userinfo, non-default ports, query/fragment values and non-root base paths;
- requires an exact lowercase 40-character release SHA;
- performs a no-secret `/api/readiness` preflight without following redirects before the credentialed browser-test step;
- requires HTTP 200, `status: ready`, exact requested SHA, canonical Vercel environment and `dataProvider: "ok"`;
- keeps protected release-account secrets only on the subsequent Playwright step;
- applies the same target-origin allowlist inside Playwright as defence in depth.

No provider schema/data, production credential, frontend feature or application routing change was made by that hardening work.

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

- launch scope is beer-only unless repository authority explicitly changes it;
- products classify through `product_category_id`;
- current producer relationship is `products.producer_id` only;
- bonus mappings use `bonus_attributes_id`;
- cellar sharing version uses `series_version_id`;
- persistent `profiles` and `product_producers` are **UNAVAILABLE**;
- active rating submission uses only current exported backend fields;
- durable idempotency/workflow fields tracked by **#165** are proposed/not-yet-deployed and `/ratings/reconcile` remains unavailable until that provider migration is verified;
- verified venue persistence and rating-to-venue attribution remain unavailable until **#399** is completed through governed migration/certification;
- Brew Done It persistent collections remain **DEFERRED / NOT PROVIDER-EVIDENCED** until their separately governed migration and certification are complete.

## Catalogue remediation boundary

The deterministic catalogue workflow has materialised **193 governed human decision tasks** covering known source blockers. Do not auto-fill producer/category mappings, category-cycle decisions, duplicate ordering, removals or edits. Corrections require explicit decisions and independent review before any candidate catalogue or provider mutation can be treated as accepted.

Real producer/brewery routes and links use only producer relationships verified from current provider/source data. Missing or zero attribution must remain unresolved rather than inferred.

## Destructive connected-write rule

Do not run rating create/delete, cellar CRUD certification, provider schema mutation, constraint creation or provider backfill against a real connected environment unless the action is explicitly authorised and appropriate cleanup/restore safeguards are evidenced. Exact-record cleanup must be verified for test writes. Failure to prove cleanup or restoration remains a material blocker and must not be converted into a pass.

The same rule applies to Brew Done It provider schema creation: merged source and a source-auditor do not authorize a provider mutation. No Brew Done It collection should be provisioned or enabled until the completed provider-evidence manifest passes `npm run audit:brew-provider-evidence -- --manifest <path>`, the underlying evidence is genuine, and explicit provider-mutation approval plus independent review are recorded.

## Independent bonus-attribute refinement — #507 / PR #508

Issue **#507** / PR **#508** implements a focused follow-up to the merged provider-backed bonus workflow from #447 / PR #472.

Implemented source scope:

- rating-dimension bonus descriptors are directly visible and have dimension-scoped keyword search;
- the final bonus browser keeps Overall attributes visible and groups other categories below as collapsed disclosures;
- search is case/punctuation insensitive and multi-word token based;
- shared/multi-category selections remain keyed by bonus-attribute ID and contribute only once;
- `data/bonus_attribute_category_plan.csv` records the reviewed category plan for the 82 supplied canonical descriptors without becoming a frontend fallback;
- `scripts/reconcile-bonus-attribute-categories.js` provides dry-run-first, additive, confirmation-gated provider reconciliation for missing canonical categories/mappings.

Exact implementation head `8dc8c0dd54fa896f8dd695ccf9c46c216503fc92` passed canonical `npm run platform:validate`, browser/accessibility validation, dependency review and CodeQL; its Vercel deployment reported success and there were no unresolved review threads.

Live provider mapping reconciliation has **not** been run by this source change. Provider data mutation still requires an immediately preceding dry-run, exact expected mutation count, explicit confirmation and post-write verification.

## Targeted unreachable prototype cleanup — #518

Issue **#518** continues the evidence-based cleanup tracked by #429.

This slice removes seven page entry modules that are absent from the active `src/App.jsx` route graph:
- legacy mock Chat and Drinking Buddies pages;
- localStorage/sample-data Events and Event Details pages;
- fabricated/localStorage Venues and Venue Management pages;
- the hard-coded multi-beverage Style Guide page superseded by the canonical beer-only style surfaces.

The deletion does not add routes, alter provider schema/data, change the #399 venue boundary, remove contained Brew Done It work or implement future social/event/business capabilities.

Lifecycle: **VALIDATING**. Canonical repository, browser/accessibility, security and deployment evidence remain to be confirmed on the exact PR head.

## Next dependency-correct work

1. Progress #165 only up to the provider/irreversible migration boundary; evidence the required schema/constraint semantics, safe backfill and backup/restore mechanism without mutating provider data.
2. When a complete migration plan is evidenced, obtain explicit approval before destructive/irreversible provider schema or data changes.
3. Keep `/ratings/reconcile` unavailable until the migration is deployed and verified.
4. After #165, complete #144 backend/provider certification.
5. While #165 remains blocked, continue independent beer-only launch hardening, reliability, accessibility and security work that does not fabricate catalogue decisions or require destructive connected writes.
6. Keep #399 blocked until an authoritative venue entity/rating-attribution migration and recovery plan is evidenced and approved.
7. Complete backend-dependent #154 catalogue certification when its upstream requirements are satisfied.
8. Keep Brew Done It contained. Its source and provider-evidence gate are merged; the next Brew step is genuine isolated-provider evidence collection, a passing completed evidence manifest and explicit provider-mutation approval before any provider migration. Do not fabricate evidence or enable play early.
9. Finish full launch hardening and exact-production certification.
10. Keep catalogue remediation decisions explicit and independently reviewed; do not fabricate the 193 pending decisions.

## Completion rule

Do not mark Phase 3 or Pourfolio complete until launch journeys match deployed capabilities, connected provider/runtime evidence is sufficient, owner/security boundaries are enforced, canonical validation passes, catalogue decisions are governed, rating idempotency is truthfully represented, and the exact production release is certified. GitHub Actions remain supporting diagnostics rather than duplicate acceptance authority.