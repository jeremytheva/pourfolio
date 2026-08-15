# Historical import rehearsal and idempotency auditor

Run `audit:import:rehearsal` in the private evidence workspace after exporting
all ten launch collections before the import, after the first run and after the
unchanged rerun. Never commit completed manifests, exports, record bodies,
provider log references or reports.

## Command

```bash
npm run audit:import:rehearsal -- \
  --manifest <private-evidence>/import-rehearsal-manifest.json \
  --output <private-evidence>/import-rehearsal-audit.json
```

## Manifest contract

The root uses plan ID `PF-P1-HISTORICAL-IMPORT-REHEARSAL-V1` and includes a full
lower-case `release_sha`, `source_bundle_sha256`, immutable `deployment_id`,
approved `evidence_reference`, environment, different operator/reviewer,
review UTC time, `review_decision: "approved"`, `expected`,
`rejected_ledger`, and `runs`.

`expected` must reconcile these frozen source facts:

| Area | Source | Accepted/linked | Rejected/intentional null |
| --- | ---: | ---: | ---: |
| Ratings | 604 | 593 | 11 |
| Score rows | 4,192 | 4,177 | 15 |
| Bonus selections | 1,785 | Completed ledger value | Completed ledger value |
| Cellar rows | 399 | 399 | 0 |
| Rating/cellar relationships | 593 | 592 | 1 |

Accepted and rejected bonus counts are supplied only after the ten decisions
are approved and must sum to 1,785. `rejected_ledger` contains relative `file`,
`rows`, `bytes`, SHA-256 and counts for ratings, `rating_scores`,
`bonus_attribute_rating_mapping` and cellar that exactly match `expected`. The
CSV columns are `Collection`, `Source record key`, `Source count`, `Rejection
reason` and `Evidence reference`. The auditor recomputes the fingerprint and
counts, requires unique source keys and rejects any unexplained row.

`runs.before`, `runs.first` and `runs.rerun` each require a unique `run_id`, UTC
start/finish, provider log reference, and a `collections` entry for every
launch collection. Each collection entry contains relative `file`, `rows`,
`bytes` and lower-case `sha256`; the auditor recomputes all four from the CSV.

The first and rerun records also contain `mutations.created`,
`mutations.updated` and `mutations.deleted` maps with all ten collection names.
The first run may create only accepted ratings, score rows, bonus mappings and
cellar rows and may not update or delete any collection. The rerun must report
zero for every mutation. Both runs require every key exported as
`ORPHAN_CHECKS` and `DUPLICATE_CHECKS` by
`scripts/audit-import-rehearsal.js` to be present with value zero.

The auditor additionally requires byte-identical first/rerun CSVs, exact target
row-count deltas, and unchanged counts and hashes for products, producers,
categories, attributes and profiles from before through rerun. `PASS` does not
replace backup/restore, provider-log, rollback or independent approval evidence.
