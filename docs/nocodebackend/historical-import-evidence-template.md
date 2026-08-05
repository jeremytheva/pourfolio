# Historical import private evidence template

Use this template in the access-controlled release evidence store. Do not copy
the completed record, source exports, personal information, credentials or raw
provider responses into this repository. A second person must review the
completed package before gates G17–G20 are changed in `LAUNCH_READINESS.md`.

## Release record

Record the evidence-store reference, UTC date/time, non-production environment,
provider snapshot identifier, release commit, operator identity and independent
reviewer identity. Confirm the reviewer is not the operator.

## Frozen inputs and catalogue preflight

Record the products, producers, reconciled ratings and cellar export timestamps.
Run and retain:

```bash
npm run audit:import -- \
  --products <products.csv> \
  --producers <producers.csv> \
  --ratings <ratings.csv> \
  --cellar <cellar.csv> \
  --bonus-decisions <bonus-decision-ledger.csv> \
  --cellar-identity <cellar-identity-ledger.csv>
```

The retained JSON must say `PASS`. Record its SHA-256 checksums and byte lengths.
Confirm every export belongs to one provider snapshot, all product references
resolve, each product has a positive producer ID found in the paired export, all
10 bonus variants accounting for 69 source selections have reviewed decisions,
and all 399 cellar identity rows have verified owners plus confirmed destination
cellar IDs.

## Bonus decision ledger

Keep one row per unmatched source variant with these columns:

| Source variant | Source count | Decision | Canonical bonus ID | Rejection reason | Evidence reference | Operator | Reviewer | Reviewed at (UTC) |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |

There must be 10 distinct variants and the source counts must total 69. State
accepted and rejected totals separately. A rejection must not implicitly reject
the parent rating unless that separately reviewed decision is explicit.

## Cellar identity ledger

Keep exactly 399 rows in the private store with these columns:

| Source record key | Verified owner ID | Verification method | Evidence reference | Confirmed destination cellar ID | Operator | Reviewer | Reviewed at (UTC) |
| --- | --- | --- | --- | --- | --- | --- | --- |

Use provider/account identifiers rather than names or email addresses. Email
alone is not identity evidence. Commit only the ledger schema and aggregate
counts, never the populated ledger.

The preflight accepts the completed private ledger as an optional
`--cellar-identity` input and fails unless exactly 399 rows are supplied with a
source record key, verified owner ID, verification method, evidence reference
and unique positive confirmed destination cellar ID.

## Backup and isolated restore

For every target collection, record the provider backup identifier, UTC time,
row count and stable content hash. Record restore order, the isolated restore
environment, rehearsal log reference, restored count/hash, validation queries,
abort thresholds and reviewer approval. Counts and hashes must match before any
import write is approved.

## Import and reconciliation

Retain the approved dry-run diff, first-run log, rejected-record ledger and
post-import orphan checks. Complete this table with before, first-run and rerun
counts and stable content hashes:

| Item | Required reconciliation | Before | First run | Rerun | Stable hash |
| --- | ---: | ---: | ---: | ---: | --- |
| Source ratings | 604 | | | | |
| Accepted ratings | 593 | | | | |
| Uploaded scores | 4,177 | | | | |
| Excluded scores | 15 | | | | |
| Bonus selections | 1,785 | | | | |
| Cellar rows | 399 | | | | |
| Rating-to-cellar relationships | 593 | | | | |

The rejected-record ledger must explain all 11 excluded ratings, all 15
excluded scores and every rejected bonus decision. Verify no orphaned product,
producer, rating, score, bonus or cellar relationship remains.

## Idempotency and rollback approval

Rerun with the exact checksums retained by `audit:import`. Record zero creates,
zero mutations and zero duplicates, unchanged per-collection counts and stable
hashes, plus the provider log reference. Record the rehearsed rollback command
or provider procedure, restore order, backup identifiers, validation results,
operator and reviewer approval.

Only after the independent reviewer signs every section should a separate,
reviewed change replace the `BLOCKED` results for G17–G20 with dated, redacted
evidence references.
