# Phase 1 additive schema preflight

`scripts/audit-additive-schema-contract.js` implements migration Checkpoint S1.
It compares the immutable legacy schema with a fresh provider export taken after
the additive compatibility job and returns a deterministic
`ADDITIVE_SCHEMA_AUDIT` report.

The audit is read-only. It does not generate or execute SQL, call
NoCodeBackend, change permissions, backfill records or claim that a provider
job has run. Its plan identifier is
`PF-P1-S1-ADDITIVE-COMPATIBILITY-V1`.

## Approved structural delta

The candidate may contain every baseline table and definition unchanged plus
only these additions:

| Table | Approved addition | Additive-state rule |
| --- | --- | --- |
| `profiles` | Provider-generated `id`; `user_id`, `name`, `description`, `avatar_url`; optional `created_at` and `updated_at` | `id` is the only unique key. Editable/identity compatibility fields remain nullable and have no populated default. Email, role, password, token, secret, permission and authentication fields are prohibited. |
| `ratings` | `submission_key`, `submission_fingerprint`, `submission_state`, `submission_version`, `expected_score_count`, `expected_bonus_count`, `deleted_at` | Every field is nullable and has no non-null default. Strings and counters must already support the final contract; state is the exact five-value enum and counters are unsigned integers. |
| `rating_scores` | `uniqueness_key` | Nullable `varchar(255)` or larger, with no non-null default. |
| `bonus_attribute_rating_mapping` | `uniqueness_key` | Nullable `varchar(255)` or larger, with no non-null default. |

The audit blocks removed or changed baseline tables, columns, unique keys,
indexes, foreign keys and checks. It also blocks extra tables or columns,
premature unique/non-null controls and incompatible new-field types. A
supporting index is not accepted until it is added to a separately reviewed
version of this plan; this prevents an undocumented console change from being
treated as approved.

## Run Checkpoint S1

Use the exact immutable pre-migration export and a new export from the same
isolated production-equivalent environment immediately after the additive job:

```bash
npm run audit:schema:additive -- \
  --baseline <private-evidence>/schema-before.sql \
  --candidate <private-evidence>/schema-after-additive.sql \
  --output <private-evidence>/phase1-additive-schema-audit.json
```

The JSON report identifies both inputs by base file name, byte length and
SHA-256 digest. `--output` is optional and writes the same report emitted to
stdout. Exit codes are:

- `0`: the candidate contains only the approved additive delta;
- `1`: deterministic structural blockers were found;
- `2`: an argument, file or SQL parsing error prevented the audit.

The supplied legacy snapshot currently used for planning is 25,869 bytes with
SHA-256
`65a88a92486bc9999816e2c1919a9784ab3f63c292b13272b619583ef43df1aa`.
That file is not automatically accepted as the operational baseline: the
operator must prove it belongs to the same frozen environment and migration
window as the candidate export.

## Evidence still required for S1

A structural `PASS` is necessary but insufficient. Retain, under the same
provider change record:

1. the provider-supported job/mechanism identifier and approved plan version;
2. start/end UTC timestamps, operator and environment/tenant identity;
3. before/after collection counts and historical `date_rated` digests;
4. proof that the old gateway's read-only projections still work;
5. proof that rating writes and direct browser/provider-public writes remained
   fenced;
6. the complete report plus both input checksums; and
7. named migration-owner and security/data review of the result.

Do not begin discovery or backfill when the report is `BLOCKED`, an input is
from a different backend state, or any connected evidence item is absent.
