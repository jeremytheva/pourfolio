# ROADMAP.md

**Last materially reviewed:** 12 September 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The launch milestone remains to move the implemented beer-first scope through the remaining data-integrity, backend-certification and final release evidence without making Brew Done It a launch dependency.

The project is **not globally blocked**. Independent source/frontend work may continue whenever it does not depend on provider schema mutation or connected certification.

## Integrated foundation

The following work is already integrated and must not be recreated or treated as pending:

- autonomous continuation and project-managed PR lifecycle;
- launch-flow recovery/accessibility hardening;
- NoCodeBackend runtime-instance externalisation;
- Node.js 24 migration and production-runtime verification;
- release/deployment provenance reconciliation;
- least-privilege lifecycle workflow hardening;
- ChatGPT-triggerable NoCodeBackend certification harness;
- production generated-data authorization and credential rotation under #225/#381/#382.

Completed work such as #224, #225, #249 and #281 must not remain in the active blocker chain.

## Phase 0 — Governed delivery

**Outcome:** repository and release governance are sufficient for evidence-based autonomous delivery.

Issue #143 remains open for practical repository/ruleset hardening, but under current project policy it is **non-blocking governance work** rather than a blanket merge or implementation gate.

Remaining, to be completed before final release where practical:

- configure or intentionally disposition branch/ruleset protections;
- document bypass/force-push/deletion behaviour;
- verify least-privilege Actions, deployment-environment and connected-app access where supported;
- keep repository documentation aligned with actual remote enforcement.

**Sequencing:** proceed independently of ordinary implementation. Re-activate as a release-governance task near final launch.

## Phase 1 — Canonical backend contract

**Outcome:** NoCodeBackend integration, rating integrity, imported data and recovery behaviour are certified against connected evidence.

### Active dependency

1. **#165 — rating idempotency/schema**
   - current irreversible provider boundary;
   - application-side contract is implemented;
   - provider-supported migration/backfill plus backup/restore evidence and explicit approval are required before mutation;
   - does not block unrelated source/frontend work.

### Subsequent dependency-gated work

2. **#144 — canonical backend certification**
   - proceed after provider/schema prerequisites are available;
   - remaining work is primarily connected same-state provider/import/recovery evidence and approvals.

**Exit condition:** connected provider, schema, import, retry/reconciliation and recovery evidence are sufficient against an exact candidate state.

## Phase 2 — Identity lifecycle

**Outcome:** account export and deletion operate as safe server-owned workflows.

Current state: **PARTIAL / future-phase work**.

Preserve the existing source foundations. Do not make this a current Phase 3 blocker unless a task directly depends on account-lifecycle completion.

Future work includes recent-authentication proof, consistent provider snapshot semantics, durable orchestration/write fencing, provider-backed deletion, authentication identity deletion, final absence proof, retention/legal policy decisions and connected accessible UI verification.

## Phase 3 — Dependable beer discovery

**Outcome:** users can reliably browse, search and open the canonical beer catalogue against reconciled production-equivalent data.

Source/frontend failure recovery, response-boundary, data-presentation and accessibility hardening is substantially integrated.

### Work that may continue now

- independent frontend/source corrections;
- truthful-data-presentation fixes;
- accessibility/interaction improvements;
- regression coverage that does not require provider mutation or connected certification.

### Completion-only dependencies

- rating/provider migration under #165;
- connected catalogue reconciliation/provider evidence;
- backend-dependent portions of #154;
- production-equivalent browser and accessibility evidence against a recorded release state.

**#154 remains the current Phase 3 outcome, not a blanket blocker on every Phase 3 task.**

## Brew Done It — approved contained capability

PR **#410** merged the persistent two-account/two-device foundation. ADR **0006**, building on ADR **0002**, now defines Brew Done It as a persistent social deduction game. PR **#461** implements the contained v3 redesign and remains **IMPLEMENTING / VALIDATION PENDING**. Brew Done It is not part of the current beer-first launch milestone and must not be treated as a launch dependency.

The approved v3 capability model is:

- one authenticated selector privately chooses a catalogue beer before sharing the challenge;
- a second authenticated user accepts and plays from their own device;
- the secret beer and selector-only answer sheet are server-protected and absent from the guesser's active-round response;
- challenges, deduction state and rounds persist across refresh, sign-out, device changes and elapsed time;
- players ask natural yes/no questions; conversation itself is not a scored server action;
- the guesser uses an accessible two-sided **Brewery / Beer & Style** deduction board with `yes` / `no` / `unknown` saved deductions;
- current automatic narrowing uses governed producer relationships, the guesser's previous-rating relationship, style/category, ABV, IBU and collaboration;
- state/country filtering stays unavailable until canonical brewery geography is governed and certified, and location is never inferred from free-text addresses;
- dark/barrel-aged remain manual notes until trustworthy structured trait metadata exists;
- the selector may see guesser-controlled aggregate rating-history clues for the hidden brewery/style/beer, never raw ratings, notes or cellar data;
- formal outcomes are brewery, exact beer and style fallback;
- scoring v3 awards 4 points for brewery + 6 for exact beer, or 4 + 3 for style fallback, minus one per incorrect formal submission, clamped 0–10;
- ordinary questions and saved deductions cost no points;
- formal-outcome writes use a durable v3 reservation/reconciliation protocol so ambiguous provider failures cannot invent or duplicate penalties/results;
- rounds alternate selector/guesser roles and accumulate durable head-to-head brewery/exact-beer/style/point statistics.

Production enablement is a separate governed phase. Until the four v3 Brew Done It collections and their permissions are provisioned and certified, keep:

- `/brew-done-it` absent from production routing/navigation;
- `BREW_DONE_IT_POLICY_ENABLED` unset;
- Brew Done It collections in `DEFERRED_COLLECTIONS`;
- `brew_done_it_questions` legacy-only rather than part of new v3 play; and
- all connected schema/data mutation subject to explicit migration approval and recovery evidence.

The next Brew Done It phases are **exact-head validation of PR #461**, followed later by **provider migration/certification**, connected two-account/two-device/privacy/recovery evidence and a separate enablement change. Required evidence is defined in `docs/BREW_DONE_IT_READINESS.md` and `docs/nocodebackend/brew-done-it-schema-target.md`.

## Immediate dependency-correct path

```text
INDEPENDENT SOURCE / FRONTEND WORK
        ↓
Continue whenever safe and launch-scoped

CONNECTED PROVIDER PATH
#165 rating idempotency/schema capability
        ↓
#144 canonical backend/provider certification
        ↓
backend-dependent #154 catalogue certification
        ↓
launch verification

BREW DONE IT PATH (separate from launch)
#410 persistent contained core — merged
        ↓
#461 deduction-board v3 implementation + exact-head validation
        ↓
provider schema + permission migration/certification
        ↓
connected two-account / two-device / privacy / recovery evidence
        ↓
separate route/navigation enablement change

INDEPENDENT GOVERNANCE PATH
#143 practical GitHub/ruleset hardening
        ↓
complete before final release where practical
```

## Explicitly removed from the active blocker chain

- #224 — deployment provenance: complete;
- #225 — generated-data authorization: complete;
- #249 — Node 24 migration: complete;
- #281 — staging certification setup: closed;
- GitHub Actions/CI status as a platform status;
- empty/non-substantive Platform Validation;
- ChatGPT/GitHub Draft → Ready connector failure.

A real implementation, security, data-integrity or runtime defect remains a blocker regardless of how it was discovered.

## Launch release gate

When the connected provider path is sufficiently complete:

1. identify the exact release candidate SHA;
2. run appropriate project-owned validation and inspect relevant diagnostics;
3. verify actual repository governance state against the then-current release policy;
4. verify production environment configuration without exposing secrets;
5. verify exact deployed SHA and runtime;
6. verify provider readiness and critical authentication/catalogue/owner-scoped flows;
7. capture connected accessibility and failure-recovery evidence;
8. record accepted limitations, if any;
9. mark launch complete only when the relevant evidence is sufficient.

GitHub CI status alone and empty Platform Validation are not release authorization mechanisms.

## Deferred / launch-excluded capabilities

Unless separately approved, keep these outside the current launch milestone:

- non-beer rating modes;
- chat and Drinking Buddies;
- events and persistent venue rating attribution;
- analytics;
- producer/platform administration;
- social cellar sharing;
- photo upload;
- major framework/styling migrations unrelated to a launch blocker.

Brew Done It is no longer an unapproved concept: ADR 0002 approves its persistent cross-device architecture and ADR 0006 approves the deduction-board gameplay model. It remains **launch-excluded and disabled** until its separate validation, provider migration/certification and enablement gates pass.

## Continuation rule

Use dependency-scoped blocking. Keep blockers only where they protect work that actually depends on them. Postpone future-phase/release-only evidence until it becomes relevant, remove completed/stale blockers, and continue independent implementation without waiting for unrelated external administration.

## Approved post-launch product expansion

Issue **#433** is the original authoritative tracker for the Untappd-informed Pourfolio expansion. The RateBeer review is incorporated into the same plan rather than creating a parallel roadmap. This entire expansion remains separately approved for post-launch planning and does **not** expand or block the current beer-first launch milestone.

The combined product direction is:

```text
discover → save → taste → analyse → compare → explore → find → follow → return
```

The Untappd-derived loop contributes low-friction capture, discovery, availability and retention. The RateBeer-derived additions contribute fair style-relative comparison, rankings, analytical exploration, style reference depth and historical catalogue preservation. Pourfolio remains differentiated by structured attribute scoring, personalised weights, Overall/Style Scaled Scores, Retail/Purchased PPP, personal taste analytics and an explainable personal Match Score.

### Phase 4 — Personal beer intelligence (#434)

Implement, in dependency order:

- **#438** rating-event semantics for **Quick Rate**, **Full Tasting** and repeat tastings;
- low-friction Quick Rate without fabricating structured attribute scores;
- repeat-tasting history and comparison;
- optional attribute-level Full Tasting notes so users can record why individual dimensions received their scores;
- **#444 historical product/brewery lifecycle** so active, seasonal, retired/historical products, vintages/editions and renamed/closed/acquired breweries preserve stable historical identity for ratings and cellar records;
- **#440 Style Scaled Score** alongside the existing Overall Scaled Score, using verified canonical style identity and the same governed tie-aware percentile principles;
- Want to Try, Favourites, Rebuy and other owner lists without duplicating Cellar;
- private Taste Profile analytics using both Overall and Style Scaled Score context where valid;
- **#441 Pourfolio Rankings and advanced discovery** by verified style, producer, geography, time period and metric, with deterministic ties, explicit minimum samples, advanced filters and curated seasonal/top-list presets;
- **#442 Taste Map / Beer Passport** showing private exploration across verified countries/regions, breweries and styles, with accessible non-map equivalents;
- **#443 Beer Style Explorer** pages that keep governed style reference facts separate from community aggregates and combine style information, rankings, personal history and discovery;
- explainable 0–100 Pourfolio Match Score plus similar-beer suggestions that state why a recommendation is similar, using documented style/brewery/attribute-profile signals rather than opaque ML;
- unauthenticated read-only guest browsing through public catalogue/product/brewery/style/ranking projections;
- Year in Pourfolio recap including privacy-safe exploration, style and value insights;
- data portability through the existing Phase 2 export authority.

### Phase 5 — Availability and return loop (#435)

After **#399** establishes authoritative venue data:

- define verified venue-to-product offerings/menus with freshness metadata;
- implement **Find This Beer** from verified offering data rather than old ratings;
- add follows for beers, breweries and venues;
- add an in-app updates/notification model and user controls;
- later layer additional delivery channels without changing the core event/subscription contract.

Historical identity from #444 must remain separate from current availability: a retired beer may remain fully visible in history while correctly reporting no current verified availability.

### Phase 6 — Social and exploration engagement (#436)

After an explicit privacy/visibility model exists:

- add an opt-in activity feed;
- add lightweight reactions/comments and Save to Want to Try;
- add exploration-focused achievements that reward breadth rather than drinking volume or speed;
- add expertise indicators based on breadth and qualifying detailed tasting history within styles/regions/breweries, never raw consumption leaderboards;
- add brewery/venue events after verified business ownership exists.

Direct messaging remains excluded unless separately approved. Conventional standalone forums are also not planned at this stage; discussion should remain attached to relevant feed/product/event contexts unless a later product decision changes this.

### Phase 7 — Brewery, venue and catalogue stewardship ecosystem (#437)

After venue/business identity is governed:

- add brewery/venue claim and verification;
- allow verified businesses to maintain factual profile/menu/event data;
- add live menus using the Phase 5 offering contract;
- add privacy-safe aggregate brewery/venue analytics;
- add a moderated community/business **catalogue correction and missing-beer submission** workflow where submissions are proposals, not direct mutations, and accepted corrections preserve stable identifiers/history from #444;
- evaluate a separate **Beer Venue Experience** rating after #399/product-derived Venue Score are stable; if approved, keep it explicitly separate and limited to beer-relevant dimensions such as selection, freshness/quality, beer service/knowledge and value;
- add POS/menu adapters only after the native menu contract is stable.

Businesses must never be able to edit, suppress or rewrite consumer ratings or personal tasting history. The current Venue Score remains product-derived and must not imply service, staff, food or ambience quality. Any future Beer Venue Experience score must have a separate label, dimensions and aggregate contract and must never be merged into the product-derived Venue Score.

### Expansion sequencing

```text
#428 advanced scoring
        ↓
#438 rating-event decision
        ↓
#444 historical identity / vintage compatibility audit
        ↓
#440 Style Scaled Score
        ↓
#434 Quick Rate / repeat tastings / lists / Taste Profile
        ↓
#441 rankings + advanced discovery
        ↓
#442 Taste Map / #443 Style Explorer
        ↓
Match Score / similar beers / recap

#399 verified venue foundation
        ↓
#435 offerings / Find This Beer / follows / updates
        ↓
#437 verified business menus / catalogue stewardship / analytics

privacy/visibility decision
        ↓
#436 social feed / exploration achievements / expertise indicators / events
```

### Explicit product exclusions and boundaries

- no direct messaging unless separately approved;
- no conventional standalone forum in the current roadmap;
- no gamification or leaderboards based on drinking speed or raw alcohol volume;
- no business modification/suppression of consumer ratings;
- no inference of current venue availability from stale ratings/check-ins;
- no opaque ML recommendation model in Match Score V1;
- no direct community mutation of canonical catalogue data;
- no deletion/reuse of historical product identities referenced by rating or cellar history;
- no conflation of product-derived Venue Score with a future Beer Venue Experience rating;
- no RateBeer-derived feature becomes a blocker for the existing beer-first launch without a separate explicit scope decision.

All expansion work remains subject to the repository's normal non-draft PR policy, focused issue-to-PR sizing, server-side authority, provider migration/recovery controls, privacy boundaries and applicable browser/accessibility evidence.