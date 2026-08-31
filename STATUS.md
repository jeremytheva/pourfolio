---
project: Pourfolio
portfolio_state: ACTIVE
phase: "Phase 3 — Beer discovery dependable"
stage: "NoCodeBackend certification harness merged; live certification blocked by staging inputs and provider authorization"
gate: Release
execution_state: BLOCKED
current_work:
  objective: "Provision #281 staging certification inputs, rerun the ChatGPT-triggered NoCodeBackend certification, then use the result to resume the provider dependency chain."
  issue: 281
  pr: null
  branch: main
next_actions:
  - "Provision NOCODEBACKEND_SECRET_KEY and NOCODEBACKEND_INSTANCE in the protected GitHub staging-release environment under #281."
  - "Create the isolated staging chatgpt_api_test fixture with the documented fields, then comment /ncb-certify on #278."
  - "If the certification reaches NoCodeBackend but returns 401/403, resolve #225 at the provider/credential layer before #165, #144 and backend-dependent #154."
  - "When GitHub administration becomes available, complete the remaining non-blocking main-branch/ruleset hardening under #143."
blockers:
  - "The GitHub staging-release environment does not currently supply NOCODEBACKEND_SECRET_KEY or NOCODEBACKEND_INSTANCE to the certification workflow."
  - "The isolated chatgpt_api_test NoCodeBackend fixture is not yet provisioned; no supported schema-management mutation contract is configured for automated creation."
  - "Production Vercel has NoCodeBackend configuration present but /api/readiness still reports dataProvider: forbidden, tracked by #225."
  - "GitHub reports main unprotected with no repository rulesets, but branch/ruleset administration is unavailable through the connected execution capability; this remains non-blocking for provider certification."
requires_owner_decision: false
owner_decision:
  question: null
  options: []
  recommendation: null
validation:
  governance: PASS
  lint: PASS
  typecheck: NOT_APPLICABLE
  tests: PASS
  build: PASS
  ci: PASS
  runtime: VERIFIED
last_verified_commit: "4bc951247b7414e3cb33c7aabefbdabfda5c0d56"
last_updated: "2026-08-31T15:05:00+10:00"
---

# STATUS.md

Last materially reviewed: 31 August 2026

## Current phase

**Phase 3 — Beer discovery dependable**

## Current objective

Complete the external staging setup required by issue #281, rerun the merged ChatGPT-triggerable NoCodeBackend certification, and use the resulting real provider evidence to progress the provider dependency chain without weakening the server-only trust boundary.

## Overall status

**The NoCodeBackend connection-certification harness is implemented and merged, but the first live run correctly stopped before provider access because the protected GitHub staging environment does not yet supply the provider secret or instance. Pourfolio remains not production-ready.**

PR #280 merged the generic certification harness and owner-only `/ncb-certify` trigger to `main` as merge commit `bc02ca78aace06b42a465e55f0bfed459fbf92c0`. The exact implementation head `4bc951247b7414e3cb33c7aabefbdabfda5c0d56` passed `npm run platform:validate` in the PR release-gate job before merge.

The first live certification run, GitHub Actions run `33358937200`, returned `SETUP_REQUIRED / RUNTIME_CONFIGURATION_MISSING` because `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_INSTANCE` are absent from the protected `staging-release` environment. The workflow posted the sanitized result back to #278 and retained redacted evidence; no provider mutation was attempted.

Production Vercel remains a separate provider state: `/api/health` reports the NoCodeBackend secret and instance as configured, while `/api/readiness` returns HTTP 503 with `dataProvider: "forbidden"`. That authorization failure remains tracked by #225.

## AI execution gate

**Current gate:** Release  
**Gate state:** BLOCKED by external provider/staging configuration, with separate non-blocking GitHub governance hardening remaining.  
**Certification source state:** MERGED through PR #280.  
**Latest certification implementation validation:** PASS at head `4bc951247b7414e3cb33c7aabefbdabfda5c0d56`.  
**First live certification result:** SETUP_REQUIRED before provider access.  
**Production readiness:** DEGRADED with `dataProvider: forbidden`, tracked by #225.  
**Verified production runtime:** Node 24.x.  

GitHub Actions/CI remains diagnostic evidence under project policy. Real defects it exposes remain actionable, but hosted status is not itself the merge authority.

## ChatGPT-triggerable provider certification

Issue #278 and PR #280 established a reusable provider certification path that ChatGPT can invoke without receiving NoCodeBackend credentials.

The canonical command is an exact issue comment on #278:

```text
/ncb-certify
```

The merged workflow only permits the secret-bearing job for the repository owner's exact command on the designated issue, or an explicit manual workflow dispatch. It uses the protected `staging-release` environment, generates redacted JSON/Markdown evidence, posts a safe summary to #278, and preserves a failing workflow result when certification is not PASS.

The data-plane sequence uses the staging-only `chatgpt_api_test` fixture and verifies:

1. table/reachability read;
2. create of uniquely tagged disposable rows;
3. filtered-list isolation using a separate sentinel scope;
4. read by provider-managed id;
5. update and persisted-value verification across text, integer, decimal and boolean values;
6. delete;
7. post-delete absence;
8. final run-scope emptiness;
9. unconditional cleanup and residual-row verification.

Schema/control-plane capability is deliberately reported as `UNAVAILABLE_NOT_CONFIGURED`. Current verified Pourfolio generated-table contracts cover record CRUD, while NoCodeBackend's documented V2 setup flow creates tables and columns through its schema/Quick Create/AI tooling. Do not guess or reverse-engineer a schema mutation endpoint merely to make the test self-provisioning.

## Active external setup — #281

Issue #281 is the active dependency-correct work boundary.

Required external setup:

- GitHub environment `staging-release` secret: `NOCODEBACKEND_SECRET_KEY` using a provider-authorized generated-data API credential;
- GitHub environment `staging-release` variable: `NOCODEBACKEND_INSTANCE`, expected to resolve to `54026_rating` unless an explicitly approved isolated clone is used;
- staging-only NoCodeBackend table `chatgpt_api_test` with provider-managed `id` and fields `run_key`, `label`, `quantity`, `score`, `active`, and `notes`.

Once those inputs exist, ChatGPT can rerun `/ncb-certify` and inspect the posted sanitized capability matrix. If the next run returns a provider 401/403, fix the provider credential/authorization under #225 rather than bypassing authorization or exposing the secret.

## Autonomous continuation support

The autonomous-continuation control plane remains merged on `main`. Repository entry, duplicate-work prevention, whole-system analysis, durable state maintenance and the `Draft → Implementing → Validating → Ready → Mergeable → Merged` lifecycle remain the execution contract.

This request explicitly resumed provider verification. The prior blanket statement that backend/provider work was owner-deferred is therefore superseded for the connection-certification path. Broader migration and reconciliation work remains dependency-gated until provider authorization and connected evidence exist.

## Integrated recommendations

The current source queue includes these completed or integrated items:

- governance/autonomous continuation: #261;
- profile rating-history recovery: #262;
- cellar load recovery: #263;
- product load recovery: #264;
- sign-out failure recovery: #265;
- catalogue load-error focus recovery: #266;
- zero-valued catalogue IBU preservation: #267;
- zero-valued product-detail IBU preservation: #268;
- catalogue pagination focus recovery: #269;
- NoCodeBackend runtime-instance externalisation: #270;
- Node.js 24 runtime migration: #271;
- release/runtime evidence reconciliation: #274 and #275;
- PR lifecycle least-privilege hardening: #276;
- ChatGPT-triggerable NoCodeBackend API certification harness: #278 / PR #280.

Active external/provider work is now #281 followed by #225 and the dependency-gated #165/#144/#154 sequence.

## Current-main production evidence

Issue #224 is complete.

Merging PR #274 produced a verified Vercel production deployment from `main` and established that subsequent `main` changes create new production deployments. Build evidence confirmed the governed Node 24 runtime target from repository configuration.

The production health endpoint continues to return HTTP 200 with canonical data transport and required configuration-presence checks. The production readiness endpoint continues to return HTTP 503 with `dataProvider: "forbidden"`; this is provider-authorization evidence for #225, not deployment-provenance failure.

Do not interpret deployment provenance, source validation, or configuration presence as proof that generated NoCodeBackend data operations are authorized.

## Runtime and provider configuration

The NoCodeBackend application environment contract remains:

- `NOCODEBACKEND_AUTH_BASE_URL=https://app.nocodebackend.com/api/user-auth`
- `NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/`
- `NOCODEBACKEND_SECRET_KEY` supplied outside the repository;
- `NOCODEBACKEND_INSTANCE` supplied outside the repository.

Missing required instance/secret configuration fails closed before privileged provider access. The new certification workflow follows the same rule and reports missing protected inputs without exposing values.

## Backend/provider state

Provider verification is **resumed for the connection-certification path**.

Current dependency order:

- #281 — provision protected staging certification inputs and the isolated test fixture, then rerun `/ncb-certify`;
- #225 — resolve NoCodeBackend generated-data API authorization if the credential is rejected; production currently reports `dataProvider: forbidden`;
- #165 — deploy/verify rating idempotency schema and connected reconciliation only after provider capability is established;
- #144 — canonical backend/import/recovery certification after prerequisite provider/schema evidence;
- backend-dependent parts of #154 — catalogue remediation/provider reconciliation and connected certification.

The merged certification harness does not itself authorize provider mutations or certify production data.

## Governance state

Issue #143 remains open as non-blocking repository-governance hardening.

Verified remote evidence remains that `main` is not protected by a repository ruleset through the currently visible GitHub configuration, and the connected GitHub integration does not expose the required branch/ruleset administration capability. Existing workflow permissions have been reduced where repository source can control them.

The remaining #143 branch/ruleset protection criteria require external GitHub administration. Do not claim those controls are enabled until remote evidence changes. This does not block #281 provider certification setup.

## Known constraints

- The protected GitHub `staging-release` environment currently lacks the NoCodeBackend secret and instance required for the new certification job.
- The `chatgpt_api_test` fixture must be provisioned once in an isolated staging provider context unless a supported NoCodeBackend schema-management API contract becomes available and is deliberately adopted.
- Production NoCodeBackend generated-data access currently returns forbidden despite configuration being present.
- Source validation and runtime/deployment evidence do not certify provider authorization, schema state or production data.
- #143 remains useful hardening but is not a blanket merge/provider-certification blocker.

## Next dependency-correct work

1. Complete the protected GitHub staging inputs and isolated NoCodeBackend fixture under #281.
2. Rerun `/ncb-certify` on #278 and inspect the sanitized capability result.
3. If provider authorization fails, resolve #225 without weakening the server-only secret boundary.
4. After connected data-plane capability is proved, continue #165 → #144 and backend-dependent #154 in dependency order.
5. Complete #143 branch/ruleset administration when the required GitHub capability is available.

## Completion rule

Do not mark Phase 3 or Pourfolio complete from the merged certification harness, source validation, Node 24 certification or deployment provenance alone. Completion still requires connected provider authorization, schema/migration evidence, catalogue/rating acceptance evidence, and the remaining release criteria appropriate to launch.
