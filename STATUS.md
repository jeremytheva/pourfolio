# STATUS.md

## Status snapshot

**Project:** Pourfolio  
**Snapshot date:** 24 August 2026  
**Overall state:** Active implementation; **not production-ready**.

The codebase has a strong server-mediated launch architecture and substantial source-level validation. Production release remains blocked by external governance, connected-provider certification, data reconciliation and selected reliability controls.

## Current phase position

| Phase | Outcome | Status | Summary |
|---|---|---|---|
| Phase 0 | Governed delivery ready | **Blocked / incomplete** | Core issue exists, but milestone and several administrator-level governance/security controls still require evidence. |
| Phase 1 | Canonical backend contract certified | **Substantially implemented, not certified** | Source contract and auditors are in place; immutable same-state provider evidence, connected staging, import rehearsal/review and independent approval remain open. |
| Phase 2 | Identity lifecycle safe | **Source foundations implemented; executable lifecycle incomplete** | Export/deletion projection, artifact, discovery, reconciliation and exact-confirmation cores exist as source-only boundaries. Recent-auth, provider orchestration, durable jobs, identity deletion and retention approval remain blocked. |
| Phase 3 | Beer discovery dependable | **In progress** | Browser response boundary and request-identity protections are implemented. Canonical catalogue reconciliation, connected browser evidence and WCAG evidence remain open. |

## Immediate delivery focus

Issue **#174 — Align dataProvider regression tests with current NoCodeBackend request contract** is now closed. Merged PR #197 aligned the Swagger request contract and the regression expectations on `main`; its pull-request validation and CodeQL runs passed. The merge SHA still reports a Vercel build-rate-limit status, which is independent deployment-account capacity rather than a `dataProvider` test-contract failure.

The next implementation focus is the remaining Phase 3 catalogue reconciliation work in #159/#154, while #165 remains the key rating-write data-integrity dependency.

## Important open reliability / data work

### Rating idempotency — issue #165

The current deployed database does not yet expose the complete durable idempotency/reconciliation fields expected by the target rating workflow.

Until the schema is deployed and verified:

- duplicate delivery protection is limited;
- `/ratings/reconcile` must not pretend durable reconciliation is available;
- provider transaction / version semantics must not be assumed.

The required target includes stable submission identity, fingerprinting, workflow state, expected child counts and child uniqueness controls.

### Catalogue reconciliation — issues #154 and #159

Source-side response validation is strong, but launch certification still needs:

- accepted canonical product / producer / category mapping;
- deterministic source reconciliation;
- remediation of orphaned or cyclic relationships;
- same-state connected evidence;
- browser and accessibility evidence.

The current source audit work is intentionally read-only and must not invent missing mappings.

## Authentication and server boundary

Current architecture expects:

- browser → same-origin Pourfolio server functions → NoCodeBackend;
- provider discovery to fail closed;
- successful sign-in/sign-up to resolve a real session, including `/get-session` fallback where provider actions only acknowledge;
- server-derived immutable user identity;
- no browser-supplied role or owner authority;
- provider secrets to remain server-only.

Current NoCodeBackend environment names:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

## Rate limiting

The repository has explicit diagnostics for:

- missing rate-limit configuration;
- provider / Redis service unavailability.

The intended production posture is fail-closed, shared storage, no browser secrets and no in-memory production fallback.

## Launch scope state

### In launch scope

- authentication;
- display profile;
- beer catalogue browse/search;
- product details;
- structured beer ratings;
- personal rating history;
- private cellar.

### Deferred / contained

- non-beer rating modes;
- chat;
- Drinking Buddies;
- events and venues;
- analytics;
- producer claims / producer administration;
- platform administration;
- social cellar sharing;
- unenforced privacy controls;
- photo upload;
- Brew Done It interactive gameplay.

Brew Done It remains contained in the launch app. The only accepted future model is the separately reviewed same-device, session-memory design recorded in ADR 0001.

## Validation posture

The repository uses a consolidated validation command:

```bash
npm run validate
```

The validation suite covers linting, unit/policy tests, dependency audit, production build and bundle/security containment checks. Connected-provider and browser evidence remain separately required where source-only tests cannot prove deployment behaviour.

## Key external / human-controlled gates

The following cannot be certified by source code alone:

- branch/ruleset protection state;
- required independent approval;
- exact required GitHub status contexts;
- secret scanning / push protection / CodeQL configuration;
- Vercel production environment configuration;
- provider collection permissions;
- connected NoCodeBackend behaviour;
- production-equivalent import reconciliation;
- backup / restore evidence;
- independent release approval;
- selected privacy / retention decisions;
- production accessibility evidence.

## Recommended sequence

1. Continue #159 source catalogue reconciliation without inventing remediation decisions.
2. Complete remaining #154 connected discovery and accessibility evidence.
3. Deploy and certify the rating idempotency schema in #165.
4. Complete Phase 1 same-state provider/import certification in #144.
5. Finish Phase 0 governance controls in #143.
6. Reassess Phase 2 executable account lifecycle only after recent-authentication, provider consistency, durable-job and retention decisions are available.
7. Resolve independent deployment-account capacity failures affecting Vercel evidence.
8. Run a final launch-readiness audit against the exact candidate SHA.

## Status rule

Do not mark a phase complete because source code exists. A phase is complete only when its issue acceptance criteria, connected evidence, required review and release controls are all satisfied.
