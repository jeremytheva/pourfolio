# STATUS.md

## Status snapshot

**Project:** Pourfolio  
**Snapshot date:** 26 August 2026  
**Overall state:** Active implementation; **not production-ready**.

The codebase has a strong server-mediated launch architecture and substantial deterministic source-level validation. Production release remains blocked by external governance, connected-provider certification, canonical catalogue decisions/reconciliation, the real rating-schema migration, current-main deployment evidence, and independent approval evidence.

## AI execution gate

**Current gate:** RELEASE  
**Gate state:** BLOCKED  
**Missing material evidence:** current provider-authorised NoCodeBackend data access, current-main production deployment provenance/readiness, connected catalogue/browser evidence, real rating migration evidence, and remaining governance/approval evidence.

Project Entry, Change and repository-side Integration controls are sufficiently established for safe independent repository work. This status does **not** imply that every launch capability has passed connected integration or release verification.

## Current phase position

| Phase | Outcome | Status | Summary |
|---|---|---|---|
| Phase 0 | Governed delivery ready | **Blocked / incomplete** | Repository delivery controls exist, but administrator-level ruleset/security/environment evidence and required independent governance evidence remain open under #143. |
| Phase 1 | Canonical backend contract certified | **Substantially implemented, not certified** | Source contract, migration/import auditors and evidence gates are in place; same-state connected provider evidence, real migration evidence and independent approval remain open under #144/#165. |
| Phase 2 | Identity lifecycle safe | **Source foundations implemented; executable lifecycle incomplete** | Export/deletion projection, artifact, discovery, reconciliation and exact-confirmation cores exist as source-only boundaries. Recent-auth, provider orchestration, durable jobs, identity deletion and retention approval remain blocked. |
| Phase 3 | Beer discovery dependable | **Source controls implemented; connected certification incomplete** | Deterministic catalogue audit/remediation tooling and browser response/request boundaries are implemented. Accepted canonical remediation, provider reconciliation, connected browser evidence and WCAG evidence remain open under #154. |

## Current repository baseline

Recent merged reliability work on `main` includes deterministic rating-migration evidence controls, Vite config-loader compatibility, package manifest/lock consistency enforcement, dependency maintenance, release provenance support and server-side NoCodeBackend authorization diagnostics.

Issue **#159** is closed: the deterministic read-only catalogue source reconciliation slice has been implemented. It must not be presented as an active next task.

Issue **#165** remains open. Repository-side migration tooling is implemented, but the real NoCodeBackend rating idempotency migration has not yet been proven deployed and verified.

Issues **#224** and **#225** track current release-boundary evidence: production must be proven against the current `main` commit, and the NoCodeBackend production data credential must be authorised for the generated data API before readiness/catalogue certification can pass.

## Immediate delivery focus

The remaining core launch outcomes cross repository/external boundaries:

1. **#225 — NoCodeBackend data authorization:** restore/verify the production server credential against the generated data API while preserving the server-only trust boundary.
2. **#224 — deployment provenance:** deploy the then-current `main` candidate and prove the exact SHA through health/readiness before using production evidence.
3. **#154 — dependable beer discovery:** complete canonical catalogue remediation decisions/reconciliation and capture connected browse/search/direct-route and WCAG evidence.
4. **#165 — rating idempotency:** execute the authorised schema/backfill migration, verify it structurally and against the connected provider, and only then consider re-enabling `/ratings/reconcile`.
5. **#144 — canonical backend certification:** capture immutable same-state provider/import/recovery evidence and required approvals against an exact release candidate.
6. **#143 — governed delivery:** complete administrator-controlled GitHub ruleset/security/environment evidence and independent governance requirements.

Repository-only maintenance may continue where it reduces risk, but it must not be used to imply these connected/admin outcomes are complete.

## Important open reliability / data work

### Rating idempotency — issue #165

The supplied database evidence still reflects the legacy rating shape and does not prove deployment of the complete durable idempotency/reconciliation fields expected by the target workflow.

Until the provider migration is executed and verified:

- `/ratings/reconcile` must remain unavailable;
- duplicate-delivery and child-row uniqueness guarantees must not be claimed from source tests alone;
- provider conditional/version semantics must not be assumed;
- existing-rating readability after migration remains an acceptance requirement.

### Catalogue reconciliation — issue #154

The source-side catalogue audit/remediation system is implemented, including deterministic fingerprints, relationship checks, governed remediation decisions and candidate re-auditing. Launch certification still needs accepted canonical decisions, independent review, provider reconciliation, same-state connected evidence, and connected browser/accessibility evidence.

The tooling must continue to fail closed rather than invent missing mappings or silently approve residual blockers.

## Authentication and server boundary

Current architecture expects:

- browser → same-origin Pourfolio server functions → NoCodeBackend;
- provider discovery to fail closed;
- successful sign-in/sign-up to resolve a real session, including `/get-session` fallback where provider actions only acknowledge;
- server-derived immutable user identity;
- no browser-supplied role or owner authority;
- provider secrets to remain server-only.

Current canonical NoCodeBackend environment names:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`

## Rate limiting

The repository has explicit diagnostics for missing rate-limit configuration and provider/Redis service unavailability. The intended production posture is fail-closed, shared storage, no browser secrets and no in-memory production fallback.

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

The repository exposes one canonical full source-validation entry point:

```bash
npm run platform:validate
```

`platform:validate` composes the existing `validate` sequence rather than duplicating validation logic. The current sequence covers the deterministic package manifest/lock contract, NoCodeBackend environment contract, linting, unit/policy tests, production dependency audit, production build, bundle limits, Brew Done It containment and browser release-security checks. Pull requests additionally run browser/accessibility, dependency-review and CodeQL gates.

A passing `platform:validate` proves only its declared repository checks. Connected-provider, migration, governance, deployment and production/browser evidence remain separately required by the Release gate.

## Key external / human-controlled gates

The following cannot be certified by source code alone:

- branch/ruleset protection state and required independent approval;
- exact required GitHub status contexts and administrator security settings;
- Vercel production environment configuration and exact deployed commit;
- provider schema changes and collection permissions;
- connected NoCodeBackend behaviour and credential authorization;
- production-equivalent import/catalogue reconciliation;
- backup, restore and rollback evidence;
- independent release approval;
- selected privacy / retention decisions;
- production accessibility evidence.

## Next dependency-correct work

1. Restore and verify provider-authorised NoCodeBackend production data access under #225.
2. Obtain a production deployment from the then-current `main` candidate and verify exact-SHA health/readiness under #224.
3. Complete connected catalogue certification under #154.
4. Execute and certify the real rating idempotency migration under #165.
5. Complete Phase 1 provider/import/recovery certification under #144.
6. Complete Phase 0 governance/security evidence under #143.
7. Reassess Phase 2 executable account lifecycle after recent-authentication, provider consistency, durable-job and retention requirements are available.
8. Run the final launch-readiness audit against the exact release candidate SHA.

## Status rule

Do not mark a phase or externally dependent issue complete because source code, a runbook, a passing source-validation command or an evidence auditor exists. Completion requires the relevant gate evidence, issue acceptance criteria, connected/deployed verification, required independent review and release controls to be satisfied.
