# Rating schema preflight

The production-equivalent NoCodeBackend schema must return `PASS` before
historical import or public launch. Application checks reduce ordinary errors,
but only the persisted schema can prevent duplicate headers or child rows during
concurrent requests and stop `date_rated` changing automatically when another
field is updated.

## Current source-set finding

The current baseline applies specifically to the supplied
`54026_rating_export(2).sql` source snapshot, audited on 29 July 2026 against
the current `scripts/audit-schema-contract.js` contract. It is blocked with 25
deterministic findings:

- **1 `MISSING_TABLE`:** the required `profiles` table is absent;
- **7 `MISSING_REQUIRED_COLUMN`:** `ratings` lacks `submission_key`,
  `submission_fingerprint`, `submission_state`, `expected_score_count` and
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

These categories sum to 25 (1 + 7 + 10 + 6 + 1). They describe only that dated
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

The command reads the export without modifying it, emits a JSON report and uses
these exit codes:

- `0`: required tables, non-null fields, uniqueness and timestamp behaviour pass;
- `1`: deterministic schema blockers were found;
- `2`: command, file or SQL contract error.

## Required persisted contract

| Table | Required controls |
| --- | --- |
| `profiles` | Non-null, unique `user_id`. |
| `ratings` | Non-null `user_id`, `rating_id`, `product_id`, `date_rated`, `submission_key`, `submission_fingerprint`, `submission_state`, `expected_score_count` and `expected_bonus_count`; unique `(user_id, rating_id)` and `submission_key`; `date_rated` defaults on create and has no automatic update clause. |
| `rating_scores` | Non-null `user_id`, `rating_id`, `attribute_id`, `attribute_score` and `uniqueness_key`; unique `(rating_id, attribute_id)` and `uniqueness_key`. |
| `bonus_attribute_rating_mapping` | Non-null `user_id`, `rating_id`, `bonus_attributes_id` and `uniqueness_key`; unique `(rating_id, bonus_attributes_id)` and `uniqueness_key`. |

Foreign keys, owner permissions, the 1–7 score check and parent/child deletion
behaviour must also be verified in the managed backend. They are separate
connected-environment gates because a SQL export alone cannot prove effective
permissions or provider API behaviour.

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
5. Export the resulting schema and retain the `PASS` report.
6. Exercise concurrent duplicate retries, a controlled non-date rating update,
   owner/other-user permission negatives and forced partial-write rollback.
7. Rehearse recovery and rollback before production rollout.

There is no executable database migration runner in this repository. The
provider-supported migration path and rollback must therefore be approved and
recorded before the remote schema is changed.

## Required evidence

Retain:

1. the schema export name, environment, source-snapshot identifier and
   timestamp;
2. the complete JSON report, including `counts.blockers`, `countsByCode` and
   every blocker (the dated supplied-snapshot baseline is 25, partitioned as
   1/7/10/6/1 above); the launch evidence must be a fresh `PASS` report;
3. duplicate/null cleanup counts before and after remediation;
4. redacted API evidence for concurrent retry and timestamp preservation;
5. permission-negative, rollback and recovery evidence;
6. the approved provider migration and rollback record.
