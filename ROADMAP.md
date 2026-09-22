# ROADMAP.md

**Last materially reviewed:** 22 September 2026

## Current milestone

**Launch readiness — beer-first Pourfolio**

The launch milestone is to move the implemented beer-first product through the remaining rating-integrity, backend-certification, catalogue-certification and final release evidence. The project is **not globally blocked**: work that does not depend on irreversible provider mutation or unavailable connected evidence should continue.

## Integrated foundation

Do not recreate or treat the following as pending:

- autonomous continuation and normal-PR lifecycle governance;
- hardened same-origin NoCodeBackend auth/data gateway and server-authoritative ownership;
- launch-flow recovery, response-boundary and accessibility hardening;
- runtime-instance externalisation and host-neutral Node deployment support;
- deployment provenance and credential-rotation work;
- generated-data authorization and production provider-read certification under #225/#381/#382;
- unified beer/brewery/style search;
- multi-producer attribution;
- server-authoritative brewery discovery;
- privacy-safe brewery community/personal statistics;
- brewery beer search/filter/sort;
- Producer Stage E brewery rankings and explicit capability boundaries;
- contained Brew Done It v3 source implementation from PR #461.

## Phase 0 — Governed delivery

Issue **#143** remains non-blocking governance work. Before final release, configure or intentionally disposition repository protections, verify least-privilege automation/deployment access where supported, and keep documented governance aligned with actual GitHub enforcement.

GitHub Actions are supporting diagnostic evidence. Empty/non-substantive Platform Validation and GitHub Draft state are not independent acceptance gates.

## Phase 1 — Canonical backend contract

### #165 — rating idempotency/schema

This is the current irreversible provider boundary.

Application-side durability/reconciliation contracts exist, but provider mutation must not proceed until there is evidence for:

1. provider-supported schema migration/backfill mechanics for populated collections;
2. the required uniqueness guarantees;
3. a concrete backup/snapshot and restore procedure;
4. verification of a restored state before production mutation;
5. safe abort/rollback and cleanup steps; and
6. explicit approval for the irreversible provider change.

Until then, `/ratings/reconcile` remains unavailable and no application assumption may be represented as deployed provider capability.

### #144 — canonical backend certification

Proceed after the #165 provider prerequisites are satisfied. Certify the exact provider state, permissions, imports, retry/reconciliation behaviour, failure handling and recovery evidence against an exact candidate revision.

## Phase 2 — Identity lifecycle

Account export/deletion foundations remain **partial future-phase work**. Preserve the existing server-side foundations. Do not make identity-lifecycle completion a current Phase 3 blocker unless a task directly depends on it.

## Phase 3 — Dependable beer discovery

The source/frontend discovery experience is substantially integrated, including unified search, brewery discovery/profiles/statistics, brewery-local beer browsing, style discovery and brewery rankings.

### #154 — catalogue certification

After the applicable backend/provider prerequisites are available, complete connected catalogue reconciliation and production-equivalent evidence. Required completion evidence includes trustworthy product/producer/style relationships, provider-failure behaviour, exact-candidate browser/accessibility evidence and resolution of historical import/reconciliation decisions that affect the launch catalogue.

### #449 — user beer add/edit and cellar alignment

Continue provider-independent portions while #165 is blocked. The workflow must remain proposal/governance based where canonical catalogue mutation is not yet authorized. Do not permit arbitrary client-authoritative producer/style relationships or fabricate catalogue identity.

### #429 — targeted cleanup

Continue evidence-based removal of unreachable prototype/source paths in small reviewable slices. Do not perform broad deletion where reachability or future governed use is uncertain.

## Producer programme status

The producer implementation through the current Stage E safe boundary is integrated:

- **A — Unified producer/search experience:** complete.
- **B — Scalable server-side brewery discovery:** complete after #498 established multi-producer attribution.
- **C — Producer profile community + personal statistics:** complete.
- **D — Producer beer search/filter/sort:** complete.
- **E — Geography/lifecycle/business enhancements:** current-schema brewery ranking/capability-boundary slice complete; canonical geography, historical lifecycle and business ownership remain dependency-driven future work under #444/#399/#437.

Do not infer geography from free-text producer addresses or present product-derived brewery aggregates as service/business-quality ratings.

## Brew Done It — approved, contained and launch-excluded

PR **#410** established the persistent two-account/two-device foundation. ADR **0006**, building on ADR **0002**, defines the persistent social deduction model. PR **#461** merged the contained v3 redesign at merge commit `d555bf493931d8700d6a41fd5ff4fd36736b4025`; its exact accepted head `da0dbc1ab627e6cbea219923466c99a52ce28326` passed canonical `npm run platform:validate`, browser/accessibility, Dependency Review and CodeQL with zero unresolved review threads.

That merge does **not** authorize production enablement. Until the required provider collections/permissions and connected privacy/recovery evidence are certified:

- keep `/brew-done-it` out of production navigation/enablement;
- keep `BREW_DONE_IT_POLICY_ENABLED` unset in normal deployments;
- keep Brew Done It provider collections deferred;
- treat `brew_done_it_questions` as legacy-only for v3 play; and
- require explicit migration approval/recovery evidence for provider mutation.

The next Brew Done It work is provider schema/permission certification, connected two-account/two-device privacy/recovery evidence, then a separate enablement change. It is not a beer-first launch dependency.

## Immediate dependency-correct path

```text
CONNECTED PROVIDER PATH
#165 rating idempotency/schema evidence + approved migration
        ↓
#144 canonical backend/provider certification
        ↓
#154 catalogue certification
        ↓
exact-candidate launch verification

INDEPENDENT LAUNCH WORK
#449 safe provider-independent workflow work
#429 targeted unreachable-code cleanup
reliability / accessibility / truthful-data fixes

BREW DONE IT (SEPARATE)
#410 persistent core — merged
        ↓
#461 v3 deduction implementation — merged and source-validated
        ↓
provider schema + permission certification
        ↓
connected privacy / two-device / recovery evidence
        ↓
separate production enablement

GOVERNANCE (NON-BLOCKING UNTIL RELEASE)
#143 practical GitHub/ruleset hardening
```

## Launch release gate

When the connected provider path is sufficiently complete:

1. identify the exact release-candidate SHA;
2. run canonical project-owned validation and inspect material diagnostics;
3. verify actual repository governance against the release policy;
4. verify production environment configuration without exposing secrets;
5. verify exact deployed SHA/runtime;
6. verify provider readiness and critical auth/catalogue/owner-scoped flows;
7. capture connected accessibility and failure-recovery evidence;
8. record accepted limitations; and
9. mark launch complete only when the required evidence is sufficient.

## Approved post-launch expansion

Issue **#433** remains the umbrella for the approved Untappd/RateBeer-informed expansion. It does not expand or block the beer-first launch.

### Phase 4 — Personal beer intelligence (#434)

Dependency direction:

```text
rating-event semantics / repeat tasting (#438 / #468)
        ↓
historical product / vintage / brewery identity (#444)
        ↓
Style Scaled Score (#440)
        ↓
lists / Taste Profile / personal intelligence
        ↓
rankings and advanced discovery (#441)
        ↓
Taste Map (#442) / Style Explorer (#443)
        ↓
explainable Match Score / similar beers / recap
```

Preserve stable historical identities. Quick Rate must not fabricate structured attribute scores. Recommendations must be explainable rather than opaque. Geography-dependent features must wait for governed canonical geography.

### Phase 5 — Availability and return loop (#435)

After **#399** establishes authoritative venue data, add verified venue-to-product offerings with freshness metadata, Find This Beer, follows and controlled update notifications. Never infer current availability from old ratings/check-ins.

### Phase 6 — Social and exploration engagement (#436)

After an explicit privacy/visibility model exists, add opt-in activity, lightweight contextual interaction, exploration-focused achievements and expertise indicators based on breadth/qualifying tasting detail rather than drinking volume. Direct messaging and conventional standalone forums remain excluded unless separately approved.

### Phase 7 — Brewery, venue and catalogue stewardship (#437)

After venue/business identity is governed, add claim/verification, factual profile/menu/event maintenance, privacy-safe business analytics and moderated catalogue correction/missing-beer proposals. Businesses must never edit, suppress or rewrite consumer ratings or personal tasting history.

## Continuation rule

Use dependency-scoped blocking. Keep a blocker only where the next action actually depends on it. When provider mutation, connected certification or owner approval is unavailable, record the boundary and continue the highest-priority unaffected launch work. Do not weaken schema, privacy, integrity or release gates to manufacture progress.