# STATUS.md

## Status snapshot

**Project:** Pourfolio  
**Snapshot date:** 25 August 2026  
**Overall state:** Active implementation; **not production-ready**.

The codebase has a strong server-mediated launch architecture and substantial deterministic source-level validation. Production release remains blocked by external governance, connected-provider certification, canonical catalogue decisions/reconciliation, the real rating-schema migration, and independent approval evidence.

## Current phase position

| Phase | Outcome | Status | Summary |
|---|---|---|---|
| Phase 0 | Governed delivery ready | **Blocked / incomplete** | Repository delivery controls exist, but administrator-level ruleset/security/environment evidence and required independent governance evidence remain open under #143. |
| Phase 1 | Canonical backend contract certified | **Substantially implemented, not certified** | Source contract, migration/import auditors and evidence gates are in place; same-state connected provider evidence, real migration evidence and independent approval remain open under #144/#165. |
| Phase 2 | Identity lifecycle safe | **Source foundations implemented; executable lifecycle incomplete** | Export/deletion projection, artifact, discovery, reconciliation and exact-confirmation cores exist as source-only boundaries. Recent-auth, provider orchestration, durable jobs, identity deletion and retention approval remain blocked. |
| Phase 3 | Beer discovery dependable | **Source controls implemented; connected certification incomplete** | Deterministic catalogue audit/remediation tooling and browser response/request boundaries are implemented. Accepted canonical remediation, provider reconciliation, connected browser evidence and WCAG evidence remain open under #154. |

## Current repository baseline

Recent merged reliability slices on `main`:

- **PR #212** — machine-checkable rating migration evidence gate. It verifies a redacted exact-SHA evidence manifest covering provider authority, backup/restore/rollback, final schema audit, export fingerprints, connected-provider verification and independent approval. This gate does **not** perform the NoCodeBackend migration or enable `/ratings/reconcile`.
- **PR #214** — Vite native config-loader compatibility fix. `vite.config.js` now uses the ESM-native directory reference and the previous `__dirname` compatibility warning is removed.
- **PR #216** — deterministic `package.json` / `package-lock.json` root dependency contract gate. `npm run validate` now fails early if dependency names or specifiers drift between the manifest and lockfile.

Issue **#159** is closed: the deterministic read-only catalogue source reconciliation slice has been implemented. It must not be presented as an active next task.

Issue **#165** is open. Its repository-side migration tooling is implemented, but the retained evidence explicitly confirms that the real NoCodeBackend rating idempotency migration has not yet occurred. Closing #165 requires the deployed-schema and connected verification acceptance criteria, not merely source tooling.

Dependabot PR **#162** has been recreated for current dependency versions and is being refreshed against the latest `main`. It must be merged only after validation of a candidate that includes the current package-lock contract gate; stale pre-#216 validation is insufficient.

## Immediate delivery focus

The remaining core launch outcomes now cross a repository/external boundary:

1. **#154 — dependable beer discovery:** complete and independently review the canonical catalogue remediation decisions, generate/re-audit the accepted candidate, reconcile it with the provider, then capture connected browse/search/direct-route and WCAG evidence.
2. **#165 — rating idempotency:** execute the authorised NoCodeBackend schema/backfill migration, run the final structural and connected verification, satisfy the migration-evidence gate, and only then consider re-enabling `/ratings/reconcile`.
3. **#144 — canonical backend certification:** capture immutable same-state provider/import/recovery evidence and the required approvals against an exact release candidate.
4. **#143 — governed delivery:** complete the administrator-controlled GitHub ruleset/security/environment evidence and independent governance requirements.

Repository-only maintenance may continue where it reduces risk, but it must not be used to imply these connected/admin outcomes are complete.

## Important open reliability / data work

### Rating idempotency — issue #165

The supplied database evidence still reflects the legacy rating shape and does not prove deployment of the complete durable idempotency/reconciliation fields expected by the target workflow.

Until the provider migration is executed and verified:

- `/ratings/reconcile` must remain unavailable;
- duplicate-delivery and child-row uniqueness guarantees must not be claimed from source tests alone;
- provider conditional/version semantics must not be assumed;
- existing-rating readability after migration remains an acceptance requirement.

The repository now contains both structural schema auditing and a machine-checkable migration evidence gate. Those controls prove whether evidence is complete; they do not substitute for the migration itself.

### Catalogue reconciliation — issue #154

The source-side catalogue audit/remediation system is implemented, including deterministic fingerprints, relationship checks, governed remediation decisions and candidate re-auditing. Launch certification still needs:

- complete accepted product / producer / category remediation decisions;
- independent review of those decisions;
- accepted canonical candidate reconciliation with the provider;
- same-state connected evidence;
- connected browser and accessibility evidence.

The tooling must continue to fail closed rather than invent missing mappings or silently approve residual blockers.

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

The validation sequence now starts with the deterministic package manifest/lock contract and then covers the NoCodeBackend environment contract, linting, unit/policy tests, production dependency audit, production build, bundle limits, Brew Done It containment and browser release-security checks. Pull requests additionally run browser/accessibility, dependency-review and CodeQL gates.

The exact PR #216 candidate passed 354 tests: 345 passed, 9 connected-provider tests skipped by design, 0 failed. Its production dependency audit reported zero vulnerabilities, and Release gate, Browser/accessibility, Dependency Review and CodeQL all passed.

Connected-provider, migration, governance and production/browser evidence remain separately required where source-only tests cannot prove deployed behaviour.

## Key external / human-controlled gates

The following cannot be certified by source code alone:

- branch/ruleset protection state and required independent approval;
- exact required GitHub status contexts and administrator security settings;
- Vercel production environment configuration;
- provider schema changes and collection permissions;
- connected NoCodeBackend behaviour;
- production-equivalent import/catalogue reconciliation;
- backup, restore and rollback evidence;
- independent release approval;
- selected privacy / retention decisions;
- production accessibility evidence.

## Recommended sequence

1. Finish the governed catalogue decision/reconciliation and connected certification work required by #154.
2. Execute and certify the real rating idempotency migration required by #165; do not enable reconciliation beforehand.
3. Complete Phase 1 same-state provider/import/recovery certification and approvals in #144.
4. Complete Phase 0 administrator governance/security evidence in #143.
5. Reassess Phase 2 executable account lifecycle only after recent-authentication, provider consistency, durable-job and retention decisions are available.
6. Merge dependency maintenance only from current-main candidates that pass the package-lock contract and hosted gates.
7. Run a final launch-readiness audit against the exact release candidate SHA.

## Status rule

Do not mark a phase or externally dependent issue complete because source code, a runbook or an evidence auditor exists. Completion requires the issue acceptance criteria, connected/deployed evidence, required independent review and release controls to be satisfied.
