# Historical import preflight

Historical ratings and cellar data must not be uploaded until this preflight
returns `PASS`. Workbook checks that only test whether a product ID is populated
are insufficient; every foreign-key value must resolve against the exact
catalogue export used for the import.

## Current source-set finding

The supplied source set is blocked:

- the products export contains IDs `1–350`;
- ready ratings reference absent product IDs `351`, `352`, `356`, `361`,
  `364`, `365`, and `370–373`;
- the historical cellar CSV also references absent product IDs `357–358`;
- products `318–324` use producer ID `0`, which is not a valid producer;
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
  --cellar ./exports/cellar.csv
```

The command emits a JSON report and uses these exit codes:

- `0`: all supplied references pass;
- `1`: deterministic integrity blockers were found;
- `2`: input or CSV contract error.

Both ratings and cellar inputs are optional so each import stage can be checked
independently. Products and producers are always required.

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
