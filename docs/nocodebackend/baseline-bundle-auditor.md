# Same-state baseline bundle auditor

Use `audit:baseline` only inside the approved private evidence workspace. Do
not commit manifests, exports, provider identifiers, user rows or completed
reports. The auditor emits aggregate filenames, counts, checksums and blockers;
it does not copy source rows into its report.

## Command

```bash
npm run audit:baseline -- \
  --manifest <private-evidence>/baseline-manifest.json \
  --output <private-evidence>/baseline-audit.json
```

All artefact paths must be relative to the manifest and must remain inside its
directory. Symlink or `..` escapes are rejected.

## Manifest contract

The root object must contain:

| Field | Required value |
| --- | --- |
| `plan_id` | `PF-P1-BASELINE-BUNDLE-V1` |
| `environment`, `deployment_id`, `snapshot_id`, `evidence_reference` | Non-empty immutable or approved redacted identifiers |
| `release_sha` | Full lower-case 40-character commit SHA |
| `consistency_control` | Exactly `quiesced` or `provider-consistent` |
| `export_started_at`, `export_completed_at`, `reviewed_at` | Valid UTC ISO 8601 values; start must not follow finish |
| `operator`, `reviewer`, `reviewed_at`, `review_decision` | Different identities, UTC review time and the exact decision `approved` |
| `artifacts` | Exactly one schema record and one record for every required collection |
| `pages` | Ordered, complete page rows for every required collection |

Each `artifacts` record contains `collection`, relative `file`, `snapshot_id`,
`bytes`, lower-case `sha256`, and `rows`. Schema `rows` is `null`; every CSV row
count is a non-negative integer. Required collections are `products`,
`producers`, `categories`, `ratings`, `rating_scores`, `rating_attributes`,
`bonus_attributes`, `bonus_attribute_rating_mapping`, `profiles` and `cellar`.

Each page record contains `collection`, one-based contiguous `sequence` and
`page`, `rows`, `terminal`, `status: "success"`, a non-empty private
`evidence_reference`, and the same `snapshot_id`. Exactly one terminal page
must be present per collection and it must be last. Page-row totals must equal
both the declared and recomputed CSV counts. Record retries as distinct private
evidence, but include only the successful, non-duplicated logical page sequence
in this manifest.

## Automated reconciliation

The auditor requires canonical key columns, detects missing/duplicate primary
keys, executes the current five-state schema audit, and requires zero orphans
for product producer/category, rating product/profile, score rating/attribute,
bonus mapping rating/attribute and cellar product/profile relationships. A
blank product category is treated as an intentional nullable relationship;
every other listed relationship must resolve.

Retain the manifest, report, exact source bytes and provider pagination log
together. `PASS` establishes package integrity and structural reconciliation,
not provider permission, migration, rollback or release approval.