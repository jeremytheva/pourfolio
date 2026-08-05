# Rating structural SQL audit and launch preflight

`scripts/audit-schema-contract.js` is a **structural SQL audit**, not the complete
Phase 1 exit gate. Its production-equivalent schema report must return `PASS`
before historical import or public launch, but SQL cannot prove the effective
provider permissions or workflow behaviour. Launch therefore also requires a
completed [connected-policy certification](connected-policy-certification.md)
from the same release candidate and environment.

Launch is `PASS` only when **both** reports say `PASS` and each reports zero
blockers. A missing, stale or mismatched report is a launch blocker; one report
must never be used as a substitute for the other.

## Current source-set finding

The current baseline applies specifically to the supplied
`54026_rating_export(2).sql` source snapshot, audited on 29 July 2026 against
the earlier `scripts/audit-schema-contract.js` contract. That historical audit
is superseded by the expanded structural contract: the export must be rerun and
a fresh blocker count retained. It previously recorded 26
deterministic findings:

- **1 `MISSING_TABLE`:** the required `profiles` table is absent;
- **8 `MISSING_REQUIRED_COLUMN`:** `ratings` lacks `submission_key`,
  `submission_fingerprint`, `submission_state`, `submission_version`, `expected_score_count` and
  `expected_bonus_count`; `rating_scores` and
  `bonus_attribute_rating_mapping` each lack `uniqueness_key`;
- **10 `NULLABLE_REQUIRED_COLUMN`:** the four existing required columns on
  `ratings`, the four on `rating_scores` and the three on
  `bonus_attribute_rating_mapping` are nullable, except for the existing
  non-null `ratings.date_rated` (4 + 4 + 3 - 1 = 10);
- **6 `MISSING_UNIQUE_CONSTRAINT`:** the snapshot lacks unique constraints on
  `ratings(user_id, rating_id)`, `ratings(submission_key)`,
  `rating_scores(rating_id, attribute_id)`,
  `rating_scores(uniqueness_key)`,
  `bonus_attribute_rating_mapping(rating_id, bonus_attributes_id)` and
  `bonus_attribute_rating_mapping(uniqueness_key)`; and
- **1 `MUTABLE_RATING_TIMESTAMP_DEFAULT`:** `ratings.date_rated` uses
  `ON UPDATE CURRENT_TIMESTAMP`, so later record changes overwrite the original
  rating date.

These categories sum to 26 (1 + 8 + 10 + 6 + 1). They describe only that dated
source snapshot; a newer production-equivalent export requires a fresh audit
and must not inherit this baseline by assumption.

The launch application does not expose a rating-update route, but the timestamp
definition is still unsafe for imports, administrative changes and future
workflows.

## Run the audit

Export the complete production-equivalent schema as SQL, then run:

```bash
npm run audit:schema -- --schema ./exports/schema.sql
```

The command reads the export without modifying it and emits a JSON report
explicitly labelled `STRUCTURAL_SQL_AUDIT`. It uses
these exit codes:

- `0`: all represented structural controls (tables, fields, keys, checks and
  timestamp definition) pass; this is not launch approval by itself;
- `1`: deterministic schema blockers were found;
- `2`: command, file or SQL contract error.

## Required persisted contract

| Table | Required controls |
| --- | --- |
| `profiles` | Non-null, unique `user_id`. |
| `ratings` | Non-null fields and unique keys listed previously; `product_id -> products.id` and, when present, `cellar_id -> cellar.id`; state limited to `pending`, `complete`, or `failed`; non-negative integer version and expected counts; `date_rated` defaults on create and has no automatic update clause. |
| `rating_scores` | Non-null fields and unique keys; `rating_id -> ratings.id`; `attribute_id -> rating_attributes.id`; integer `attribute_score` from 1 through 7. |
| `bonus_attribute_rating_mapping` | Non-null fields and unique keys; `rating_id -> ratings.id`; `bonus_attributes_id -> bonus_attributes.id`. |

The audit checks foreign keys, score and workflow checks, and create-time-only
timestamp behaviour where the provider export represents them reliably. Owner
and field permissions, cross-row ownership, deletion behaviour and workflow
transitions remain connected-environment gates because SQL alone cannot prove
effective provider API behaviour.

## Safe remediation sequence

1. Provision and validate the missing `profiles` collection in a
   production-equivalent non-production instance.
2. Query and resolve null required values, duplicate submission IDs, duplicate
   attribute scores and duplicate bonus selections.
3. Remove the automatic-update behaviour from `ratings.date_rated` while
   preserving explicit historical timestamps and the create-time default.
4. Apply the non-null and unique controls through the approved NoCodeBackend
   schema/migration mechanism. Do not edit production first or execute the
   supplied source dump as a migration.
5. Export the resulting schema and retain the structural `PASS` report.
6. Complete the connected-policy checklist with provider configuration evidence
   and positive and negative results for every listed invariant.
7. Exercise concurrent duplicate retries, a controlled non-date rating update,
   owner/other-user permission negatives and forced partial-write rollback.
8. Rehearse recovery and rollback before production rollout.

There is no executable database migration runner in this repository. The
provider-supported migration path and rollback must therefore be approved and
recorded before the remote schema is changed.

## Required evidence

Capture the same-state schema and collection baseline with the
[baseline export evidence template](baseline-export-evidence-template.md). The
completed, appropriately redacted package belongs in the approved private
evidence store, not this repository.

**Migrated structural audit status (5 August 2026):** The approved provider
migration target is retained as `exports/schema.sql` and the structural audit
report is retained as `exports/schema-audit-report.json`. The report records
`status: "PASS"` and `counts.blockers: 0` for the SQL invariants checked by
`scripts/audit-schema-contract.js`. Connected provider policy, workflow
transition and permission evidence remain separate launch gates.

Retain:

1. the schema export name, environment, source-snapshot identifier and
   timestamp;
2. the complete JSON report, including `counts.blockers`, `countsByCode` and
   every blocker (the dated supplied-snapshot baseline is 26, partitioned as
   1/8/10/6/1 above); the launch evidence must be a fresh `PASS` report;
3. duplicate/null cleanup counts before and after remediation;
4. redacted API evidence for concurrent retry and timestamp preservation;
5. permission-negative, rollback and recovery evidence;
6. the approved provider migration and rollback record.
