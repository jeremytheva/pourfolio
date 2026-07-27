# Rating schema preflight

The production-equivalent NoCodeBackend schema must return `PASS` before
historical import or public launch. Application checks reduce ordinary errors,
but only the persisted schema can prevent duplicate headers or child rows during
concurrent requests and stop `date_rated` changing automatically when another
field is updated.

## Current source-set finding

The supplied `54026_rating_export(2).sql` is blocked with 15 deterministic
findings:

- the required `profiles` table is absent;
- ten required identity, relationship and score columns remain nullable;
- `ratings` does not enforce unique `(user_id, rating_id)` submissions;
- `rating_scores` does not enforce unique `(rating_id, attribute_id)` scores;
- `bonus_attribute_rating_mapping` does not enforce unique
  `(rating_id, bonus_attributes_id)` selections;
- `ratings.date_rated` uses `ON UPDATE CURRENT_TIMESTAMP`, so later record
  changes overwrite the original rating date.

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
| `ratings` | Non-null `user_id`, `rating_id`, `product_id` and `date_rated`; unique `(user_id, rating_id)`; `date_rated` defaults on create and has no automatic update clause. |
| `rating_scores` | Non-null `user_id`, `rating_id`, `attribute_id` and `attribute_score`; unique `(rating_id, attribute_id)`. |
| `bonus_attribute_rating_mapping` | Non-null `user_id`, `rating_id` and `bonus_attributes_id`; unique `(rating_id, bonus_attributes_id)`. |

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

1. the schema export name, environment and timestamp;
2. the complete JSON `PASS` report;
3. duplicate/null cleanup counts before and after remediation;
4. redacted API evidence for concurrent retry and timestamp preservation;
5. permission-negative, rollback and recovery evidence;
6. the approved provider migration and rollback record.
