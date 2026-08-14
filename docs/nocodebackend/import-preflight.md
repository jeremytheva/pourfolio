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
