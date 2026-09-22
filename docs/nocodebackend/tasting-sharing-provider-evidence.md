# Tasting sharing provider evidence

Issue: #526  
Decision: `docs/DECISIONS/0007-tasting-visibility-and-drinking-buddies.md`  
Target: `docs/nocodebackend/tasting-sharing-schema-target.md`  
State: **EVIDENCE INCOMPLETE — PROVIDER MUTATION NOT AUTHORISED**

This record separates provider capabilities that are documented from capabilities still requiring exact-environment evidence before the tasting visibility and Drinking Buddy migration may be approved.

Reviewed: 22 September 2026.

## Confirmed provider capabilities

Official NoCodeBackend documentation currently establishes the following:

1. **Existing tables can be changed through Manage Tables.** The provider describes adding columns to an existing live table and states that the generated REST API updates after the schema change.
   - Source: https://app.nocodebackend.com/help/en/managing-records
2. **Required columns on populated tables require a default value.** The same provider guide explicitly states that a new required column cannot be added to a table that already contains rows unless a default is supplied.
   - Source: https://app.nocodebackend.com/help/en/managing-records
3. **Column defaults and required/NOT NULL constraints are supported.** The manual schema guide documents both controls and says an omitted POST field receives its configured default.
   - Source: https://app.nocodebackend.com/help/en/manual-setup
4. **Single-field uniqueness exists.** The getting-started troubleshooting guidance documents duplicate-entry rejection for a column marked Unique.
   - Source: https://app.nocodebackend.com/help/en/getting-started
5. **Schema changes are reflected in generated REST documentation.** The REST API guide states that modifying a table updates its generated API/Swagger representation.
   - Source: https://app.nocodebackend.com/help/en/rest-api
6. **Read-only schema inspection is available through the provider MCP integration.** The MCP guide documents `get_schema`, `get_swagger`, and read-only `execute_sql` capabilities. These can support baseline evidence gathering without authorising mutation.
   - Source: https://app.nocodebackend.com/help/en/mcp-api-token
7. **Snapshots and cloning are advertised platform capabilities.** The provider's product page lists snapshots and cloning among the platform features.
   - Source: https://www.nocodebackend.com/

These facts are sufficient to retain the proposed additive visibility fields as technically plausible. They are **not** sufficient to execute the migration.

## Unresolved evidence gates

The reviewed provider documentation does not yet prove the following requirements for the exact Pourfolio environment:

- a tested restore procedure from a snapshot/backup, including recovery scope and expected recovery behavior;
- a supported bulk backfill mechanism suitable for deterministic `private` backfill with auditable row counts;
- composite unique constraints for canonical unordered Drinking Buddy pairs;
- composite unique constraints for directional block pairs;
- an alternative provider-supported atomic/concurrency-safe mechanism if composite uniqueness is unavailable;
- exact-environment baseline schema/export checksum and current `profiles`/`ratings` row counts;
- exact-environment post-change structural diff and row-count reconciliation;
- connected proof that all legacy visibility values are `private` and that `rating_history_public` is not copied into event visibility.

No application-only check-then-create sequence may substitute for missing concurrency-safe pair integrity.

## Safest migration shape supported by current evidence

For `profiles.default_tasting_visibility` and `ratings.visibility`, current provider documentation supports only the design conclusion that a populated table needs a default if the new field is immediately required. The operational migration must still be selected and evidenced for the exact environment.

The conservative target remains:

1. capture immutable pre-change schema/export and row counts;
2. prove rollback/restore for that exact environment;
3. add visibility with an effective default of literal `private` using a provider-supported operation;
4. verify every pre-existing row resolves to `private`;
5. verify no row inherited from `rating_history_public` or another historical signal;
6. capture and audit the post-change export;
7. only then certify connected owner reads/writes.

Relationship and block tables remain a later provider step unless concurrency-safe pair integrity is separately proven.

## Activation decision

**Gate V: BLOCKED.** Provider documentation now supports the populated-table default requirement, but exact-environment backup/restore, backfill and before/after evidence remain absent.

**Gate R: BLOCKED.** No reviewed provider evidence proves the required pair uniqueness/concurrency mechanism.

**Gate S: BLOCKED by V and R.** Do not expose a shared activity API.

**Gate F: BLOCKED by S.** Do not expose a Drinking Buddy feed.

No schema/data mutation, relationship persistence, shared API, feed, reactions or comments are authorised by this evidence record.

## Next evidence acquisition

The next safe provider work is read-only:

- capture exact-environment schema/Swagger using supported read-only tooling;
- capture `profiles` and `ratings` row counts without copying secrets into the repository;
- obtain provider documentation/support evidence for snapshot restore and deterministic bulk backfill;
- obtain provider documentation/support evidence for composite uniqueness or a concurrency-safe alternative;
- attach immutable checksums and non-secret evidence to the governed change record;
- request explicit approval only when every pre-mutation gate in `tasting-sharing-schema-target.md` is satisfied.
