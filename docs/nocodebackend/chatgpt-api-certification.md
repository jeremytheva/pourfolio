# ChatGPT-triggerable NoCodeBackend API certification

## Purpose

This certification provides a repeatable optional diagnostic for ChatGPT, through the connected GitHub integration, to test generated NoCodeBackend CRUD capability without exposing provider credentials to chat.

It is deliberately separated into two capability planes:

1. **Data plane** — generated record APIs (`read`, `create`, `update`, `delete`).
2. **Schema/control plane** — database/table/column creation and deletion.

The routine connection certification exercises the data plane against a dedicated staging-only table. Schema mutation is reported independently and is not attempted unless NoCodeBackend publishes a supported schema-management API contract that can be configured safely for this project.

This harness is **not a launch prerequisite when the exact deployed Vercel application already proves provider readiness through `/api/readiness` and the authenticated release journey is certified through the deployed application boundary**. It is a direct-provider diagnostic and must not force duplication of production provider credentials into GitHub.

## Why the routine test does not create and drop a table every run

Creating and deleting a table on every connection check would mix connection validation with provider schema administration. That is undesirable because it:

- increases blast radius and provider-state churn;
- can require a different authorization/control plane from generated data APIs;
- can trigger endpoint regeneration or propagation delays unrelated to connection health;
- risks consuming provider schema/database quotas or credits;
- makes a simple connectivity result depend on an undocumented management endpoint;
- adds unnecessary destructive operations when disposable rows are sufficient.

A permanent isolated test table with ephemeral rows gives a more reliable data-plane health check while still proving real create/read/update/delete behaviour.

## One-time NoCodeBackend staging fixture

Create this table only in an explicitly isolated staging NoCodeBackend instance when direct CRUD certification is required:

```text
chatgpt_api_test
```

Required columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `run_key` | text/varchar | Unique certification scope used for filtering and cleanup |
| `label` | text/varchar | Text create/update verification |
| `quantity` | integer | Integer create/update verification |
| `score` | float/decimal | Numeric create/update verification |
| `active` | boolean | Boolean create/update verification |
| `notes` | text/varchar | Additional mutable text verification |

Use the provider-managed `id` field as the record identifier.

Do not place application data in this table. It exists only for connected certification.

## Runtime configuration

The deployed Pourfolio application owns its canonical NoCodeBackend application variables in Vercel. Those values remain server-only and are verified non-destructively through the deployed `/api/readiness` boundary.

A direct-provider GitHub certification run is optional and requires its own protected isolated-staging configuration:

```text
NOCODEBACKEND_DATA_BASE_URL=https://api.nocodebackend.com/
NOCODEBACKEND_SECRET_KEY=<protected isolated-staging secret>
NOCODEBACKEND_INSTANCE=<protected isolated-staging instance>
```

The secret and instance must never be committed, pasted into an issue, or returned in the certification report. Missing GitHub copies of the Vercel production values produce `SETUP_REQUIRED` for this optional diagnostic; they do not make an otherwise healthy deployed Vercel runtime unready.

Test-only execution controls are:

```text
NOCODEBACKEND_CERTIFICATION_ENVIRONMENT=isolated-staging
NOCODEBACKEND_CERTIFICATION_ALLOW_DESTRUCTIVE=1
NOCODEBACKEND_CERTIFICATION_TABLE=chatgpt_api_test
```

The destructive guard prevents accidental use of the runner outside the isolated staging context.

## What the data-plane certification proves

A successful run performs the following sequence using uniquely tagged rows:

1. Read the test table with the current `run_key` to verify reachability and authorization.
2. Create two records in the current run scope.
3. Create a third sentinel record with a different run scope.
4. Filter by `run_key` and verify the current scope does not leak the sentinel record.
5. Read one record by provider-managed `id`.
6. Update text, integer, float and boolean values.
7. Read the updated record and verify persisted values.
8. Delete one record.
9. Read the deleted record and verify absence.
10. Delete the remaining current/sentinel records.
11. Read both run scopes and verify they are empty.
12. Run final cleanup regardless of success/failure and treat residual test rows as a failure.

The report records a capability matrix for:

- `table_read`;
- `create`;
- `filtered_list`;
- `read_one`;
- `update`;
- `delete`;
- `post_delete_read`;
- `final_empty_scope`;
- cleanup.

## Schema/control-plane status

The report currently returns:

```text
schema_plane.status = UNAVAILABLE_NOT_CONFIGURED
```

for create table, add columns and drop table. This is intentional. The repository must not invent or reverse-engineer NoCodeBackend schema mutation endpoints.

Enable automated schema lifecycle certification only after all of the following are available:

1. a documented supported NoCodeBackend schema-management API;
2. its authentication/authorization contract;
3. exact create-table/add-column/drop-table request and response semantics;
4. a staging-only credential with the minimum required scope;
5. cleanup and failure-recovery semantics;
6. repository tests and redaction controls for that management plane.

## ChatGPT invocation

The canonical diagnostic issue is GitHub issue `#278`.

ChatGPT can trigger the optional live isolated-staging test by adding:

```text
/ncb-certify
```

The workflow only runs the secret-bearing job when the issue, exact comment, owner identity and non-PR target guards pass. It can also be run manually from GitHub Actions.

## Result handling

The runner writes:

```text
artifacts/nocodebackend-certification/report.json
artifacts/nocodebackend-certification/summary.md
```

The workflow posts the sanitized summary to issue `#278`, uploads the redacted artifacts and preserves a failed workflow state when the certification result is not `PASS`.

The report never includes the NoCodeBackend secret or configured instance value.

## Result interpretation

### `PASS`

The dedicated isolated test table exists, the provider accepted the configured staging credential/instance, all data-plane CRUD/filter operations behaved as expected, and cleanup left no run-scoped rows.

### `SETUP_REQUIRED`

The optional direct-provider diagnostic cannot run because required isolated-staging configuration is missing, the destructive guard is not enabled, or the dedicated test table does not exist. This status does not override healthy exact-deployment Vercel readiness.

### `FAIL`

The direct-provider test reached the provider but one or more capabilities failed, or cleanup could not prove the test scope was empty. Safe provider status/code evidence is included where available.

A provider `401`/`403` remains an authorization failure. Do not add an application fallback or weaken the server-only secret boundary to make the test pass.

## Relationship to release certification

Launch certification uses the deployed application boundary as the primary evidence source:

- exact-deployment `/api/readiness` proves the Vercel runtime can perform its bounded generated-provider read with its server-only configuration;
- authenticated release checks exercise catalogue, product detail, rating, cellar and profile behaviour through same-origin application APIs;
- `npm run test:provider-smoke`, `npm run test:provider-connection`, and destructive provider-contract tests remain supplementary direct-provider diagnostics for explicitly configured isolated staging.

The optional certification harness therefore answers a narrower question: **can a deliberately configured isolated staging runner directly perform generated NoCodeBackend CRUD operations?**
