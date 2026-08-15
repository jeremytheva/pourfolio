# Historical import preflight

Historical ratings and cellar data must not be uploaded until this preflight
returns `PASS`. Workbook checks that only test whether a product ID is populated
are insufficient; every foreign-key value must resolve against the exact
catalogue export used for the import. A product with a blank, zero, malformed or
unknown producer ID is also a blocker.

## Current source-set finding

The supplied source set was rechecked on 15 August 2026. Exporting the
workbook's 593 `Ready_Ratings` rows to CSV and auditing them with the supplied
350 products, 159 producers and 500 cellar rows returns `BLOCKED` with **46
record-level blockers**. The redacted, machine-readable result is retained as
[`legacy-import-audit-report.json`](../../exports/legacy-import-audit-report.json):

- **29 `MISSING_PRODUCER_REFERENCE`:** products `187`, `318–327`, `329`,
  `331–332`, `334`, `336–341` and `343–350` include blank, zero or unresolved
  producer references;
- **14 rating `MISSING_PRODUCT_REFERENCE`:** ready ratings reference absent
  product IDs `351`, `352`, `356`, `361`, `364`, `365`, and `370–373`;
- **3 cellar `MISSING_PRODUCT_REFERENCE`:** the supplied cellar CSV references
  absent product IDs `357–358`;
- the workbook still contains 10 pending bonus decisions representing 69
  selections;
- the workbook's 399 historical cellar staging rows still have blank owner IDs;
- the products export contains IDs `1–350`, so the absent references cannot be
  certified from this catalogue snapshot; and
- the workbook's `Cellar_Validation` check reports zero unresolved product IDs,
  but it checks that IDs are populated rather than reconciling them to the
  supplied products export.

Do not create substitute catalogue rows or remap these references by product
name alone. Obtain a fresh complete products/producers export from the same
backend state that assigned the workbook IDs, then repeat the audit.

## Prepare reviewed reference decisions

The 46 record-level reference blockers collapse deterministically into **41
review tasks**: one task for each of the 29 products with a missing producer and
12 tasks for the distinct absent product IDs used by ratings or cellar rows.
Generate the private decision template with:

```bash
npm run audit:import:remediation -- \
  --products ./exports/products.csv \
  --producers ./exports/producers.csv \
  --ratings ./exports/Ready_Ratings.csv \
  --cellar ./exports/cellar.csv \
  --template <private-evidence>/reference-decision-ledger.csv \
  --output <private-evidence>/reference-decision-audit.json
```

The first run is expected to return `BLOCKED` because every generated task has
an empty decision. The template groups repeated uses of the same absent
positive product ID, preserves source rows and record IDs for traceability, and
includes only product/producer labels. It never copies source `user_id`, owner
or rater-name fields. Spreadsheet-formula prefixes in source labels are
neutralised before CSV output.

For every row, set `Decision` to either `mapped` or `rejected`:

- `mapped` requires a positive `Canonical ID` present in the supplied products
  or producers export, as appropriate;
- `rejected` requires a reason and means every occurrence in that task will be
  quarantined, not silently discarded; and
- both outcomes require an evidence reference, operator, distinct independent
  reviewer and valid UTC review timestamp.

Do not change the generated task/provenance columns. Audit the completed ledger
against the same frozen inputs:

```bash
npm run audit:import:remediation -- \
  --products ./exports/products.csv \
  --producers ./exports/producers.csv \
  --ratings ./exports/Ready_Ratings.csv \
  --cellar ./exports/cellar.csv \
  --decisions <private-evidence>/reference-decision-ledger.csv \
  --output <private-evidence>/reference-decision-audit.json
```

A `PASS` from this command certifies only that the decision ledger is complete,
independently reviewed and tied to canonical IDs in the frozen catalogue. Its
JSON deliberately retains `sourceImportStatus: BLOCKED` while the source files
still contain bad references. The command never rewrites or uploads source
data. Apply the approved mappings or quarantines through the controlled import
preparation process, then run `audit:import` on the resulting candidate files;
only that later `PASS` clears the reference gate.

## Run the audit

Export `Ready_Ratings` from the workbook as CSV. Its
`current_product_id` column is accepted directly.

```bash
npm run audit:import -- \
  --products ./exports/products.csv \
  --producers ./exports/producers.csv \
  --ratings ./exports/Ready_Ratings.csv \
  --cellar ./exports/cellar.csv \
  --bonus-decisions <private-evidence>/bonus-decision-ledger.csv \
  --cellar-identity <private-evidence>/cellar-identity-ledger.csv \
  --output <private-evidence>/import-preflight.json
```

The command emits a JSON report containing the file name, byte length and
SHA-256 checksum of every supplied input. `--output` is optional and writes the
same report that is emitted to stdout. Retain the report from each run and
compare the checksums directly; matching file names are not evidence that an
idempotency rerun used identical inputs. The command uses these exit codes:

- `0`: all supplied references pass;
- `1`: deterministic integrity blockers were found;
- `2`: input or CSV contract error.

Ratings, cellar, bonus-decision and cellar-identity inputs are optional so each
import stage can be checked independently. Products and producers are always
required. Supplying the bonus-decision ledger additionally proves that the 10
unmatched variants total 69 selections and each variant is either mapped to a
positive canonical bonus ID or rejected with a reason. Each ledger row must also
record its evidence reference, operator, distinct independent reviewer and a
valid UTC review timestamp; incomplete or self-reviewed rows fail. Supplying the
cellar-identity ledger proves that exactly 399 source cellar rows have a
non-empty verified owner ID, verification method, evidence reference and unique
positive confirmed destination cellar ID, with the same operator, independent-
reviewer and review-timestamp controls. Keep both completed ledgers only in the
private evidence store.

## Required reconciliation evidence

Before upload, retain:

1. the exact source file names and export timestamps;
2. the preflight JSON showing `PASS`;
3. source and accepted/rejected counts for each collection;
4. the second-run result proving idempotency;
5. a post-import query showing no orphan product or producer references.

The remote import remains blocked until owner IDs and confirmed cellar IDs are
also assigned, unmatched bonus selections are resolved, and the permission and
rollback tests in `docs/LAUNCH_READINESS.md` pass.
