# STATUS.md

Last materially reviewed: 29 August 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Current objective

Complete the repository-governance and project-control alignment identified by the 29 August whole-system review, then resume only dependency-correct launch-scope work. Backend/provider execution remains deferred pending the required product-owner/provider information.

## Overall status

**Active implementation; not production-ready.**

Repository-side launch architecture and source validation are strong. The immediate repository task is adoption of the current project-managed PR lifecycle without claiming enforcement that GitHub does not yet provide. Provider/data migration, connected certification, current-main production deployment evidence and administrator governance remain unresolved.

## AI execution gate

**Current gate:** INTEGRATION / repository governance alignment  
**Gate state:** IN PROGRESS  
**Active branch/PR:** `governance/pr-lifecycle-alignment` / #247  
**PR lifecycle state:** DRAFT → IMPLEMENTING  
**PR blocker:** merge enforcement cannot be certified until #143 default-branch/ruleset requirements are configured and evidenced  
**Latest validated commit:** pending current-head PR validation  
**Release gate:** BLOCKED by deferred/external evidence.

Passing repository validation does not certify the paused backend/provider or production environment.

## Completed recently

Frontend launch-flow hardening merged on `main` includes:

- catalogue search/results accessibility and loading/error semantics — PR #232;
- structured rating guidance, busy state and focused failure recovery — PR #234;
- cellar/profile owner-scoped mutation feedback and keyboard semantics — PR #236;
- product details → Add to cellar disclosure, save state and error recovery — PR #238;
- authentication UI selected-method, busy-state and focused-error semantics — PR #240;
- persistent app-shell navigation feedback and accessibility hardening — PR #243;
- public document navigation accessibility hardening — PR #245.

The canonical source-validation entry point remains:

```bash
npm run platform:validate
```

Pull requests additionally run browser/accessibility, Dependency Review and CodeQL validation.

## In progress

PR #247 is adopting the current repository governance baseline:

- `PR_LIFECYCLE_STANDARD.md` v1.0;
- `.github/workflows/pr-lifecycle.yml` for safe lifecycle state synchronisation;
- current master-version references in `PROJECT.md`;
- lifecycle-aware repository instructions and continuity fields;
- explicit separation between source validation and administrator-enforced mergeability.

The lifecycle controller intentionally does not auto-merge or mark a PR `MERGEABLE` while #143 enforcement is incomplete.

## Blocked / deferred

### Owner-deferred backend/provider work

Backend/provider implementation remains paused until the required information is available. Preserve these items without advancing or closing them:

- #225 — NoCodeBackend production data authorisation;
- #165 — real rating idempotency/schema migration and connected verification;
- #144 — canonical backend/import/recovery certification;
- backend-dependent parts of #154 — catalogue remediation/provider reconciliation and connected certification.

### External release evidence

- #224 — production is not yet certified from the then-current `main` exact SHA;
- #143 — GitHub default-branch ruleset/protection, independent approval, strict current-head checks and related administrator/security evidence remain incomplete;
- independent release approval and production-equivalent runtime evidence remain outstanding.

## Known defects / constraints

- Production/backend readiness must not be inferred from source tests.
- Vercel project runtime is configured as Node.js 22.x while the repository declares Node.js 20; align this before final release certification.
- Current backend/provider incident evidence is retained but is not the active implementation focus.
- Vercel deployment attempts must not be treated as current-main proof until exact-SHA production evidence exists.
- GitHub currently exposes no repository ruleset for this repository; lifecycle labels/workflows are continuity automation, not a substitute for #143 enforcement.

## Technical debt

- Tailwind 4 is a deliberate future migration, not a launch-time dependency bump. Dependabot PR #95 should remain out of the launch implementation path and be closed without merge as deferred/superseded.
- Lifecycle automation should be promoted to auto-merge/`MERGEABLE` state only after #143 proves independent merge requirements are active.

## Partial / planned preserved work

- Phase 2 executable account lifecycle remains partial; source foundations exist but provider orchestration, recent-authentication, durable jobs, identity deletion and retention approval are not complete.
- Brew Done It remains contained and deferred; ADR 0001 remains authoritative for its accepted future model.
- Non-launch social/producer/admin/analytics capabilities remain deferred as documented in ROADMAP.md.

## Provider / deployment status

Backend/provider state is **deferred for implementation**, not resolved. Historical blockers remain governed by their GitHub issues and must be reverified when backend work resumes.

The most recently observed Vercel production deployment remains behind current repository history and therefore cannot certify the current release candidate. The Vercel project runtime is also Node.js 22.x rather than the repository-declared Node.js 20.

## Next dependency-correct work

1. complete and validate PR #247 against the latest head;
2. keep it in Draft while implementation/doc alignment is incomplete, then move it to Ready when the implementation gate passes;
3. preserve #143 as the independent merge-enforcement blocker and do not self-certify mergeability;
4. close obsolete Tailwind 4 PR #95 without merge and preserve the migration as future planned work;
5. after the governance boundary, perform one holistic review of remaining launch-scope frontend surfaces and fix only material defects;
6. when backend work resumes, reverify provider/deployment state before acting on historical incident evidence.

## Completion rule

Do not mark Phase 3 or the project complete because frontend source hardening or PR #247 passes. Completion still requires catalogue decisions, connected provider/runtime evidence, deployment provenance, migration evidence, governance controls and release verification after the deferred backend work resumes.
