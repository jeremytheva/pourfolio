# Catalogue remediation candidate application

## Purpose

This document defines the source-only Phase 3 step that converts a **completed and independently reviewed** catalogue remediation ledger into new candidate CSV files. It is deliberately separate from decision making and from NoCodeBackend import/write operations.

The candidate applicator is `scripts/apply-catalogue-remediation.js`.

## Hard gate

The applicator refuses to run unless the existing governed decision audit returns `PASS` for the exact current task set. A missing, stale, duplicated, invalid or deferred decision therefore blocks candidate generation before any output is written.

A passing decision ledger does not mean the candidate catalogue is valid. After applying decisions, the applicator reruns the catalogue audit and reports every unapproved residual blocker.

## Supported application semantics

- `remap` — updates only the deterministic relationship field implied by one single-record task:
  - missing producer → `products.producer_id`;
  - missing/invalid product category → `products.product_category_id`;
  - category parent/cycle/self-link → `categories.parent_id`.
- `edit` — updates one deterministic scalar field on one source record. Grouped edits fail closed. For a public-name encoding finding with no explicit field, the collection's documented public name field is used.
- `remove` — removes exactly one source record. Grouped removals fail closed.
- `accept` — performs no mutation. Only an independently reviewed duplicate-product sort task can remain as an explicit approved residual exception.
- `deferred` — never applies; the decision audit remains `BLOCKED`.

The applicator never interprets free text as an instruction to choose a mapping and never selects a canonical ID itself.

## Candidate outputs

The CLI writes new files under the operator-selected output directory:

- `products.csv`
- `producers.csv`
- `categories.csv`

It also emits a JSON report containing:

- candidate status (`PASS` or `BLOCKED`);
- applied decision count;
- explicitly approved duplicate-sort exceptions;
- unapproved residual remediation tasks;
- row counts, byte counts and SHA-256 digests for all three candidate files;
- an ordered candidate bundle SHA-256.

Source row order and field order are preserved for retained rows. The source inputs are not modified in place.

## Example

```bash
npm run apply:catalogue:remediation -- \
  --products <private-source>/products.csv \
  --producers <private-source>/producers.csv \
  --categories <private-source>/categories.csv \
  --root-category-id 1 \
  --ledger <reviewed-evidence>/catalogue-remediation-ledger.csv \
  --output-dir <candidate-output> \
  --report <candidate-output>/catalogue-remediation-candidate.json
```

Do not run the committed blank ledger as if it were approved; it must remain blocked until every decision and independent review field is completed.

## Evidence boundary

A candidate `PASS` means only that:

1. the exact decision ledger passed governance validation;
2. all deterministic mutations were applied to source copies;
3. no unapproved catalogue audit tasks remain; and
4. any remaining duplicate-sort findings are explicitly listed as independently reviewed exceptions.

It does **not** prove that NoCodeBackend contains the candidate, that a provider import succeeded, that connected browse/search behaviour is correct, or that Phase 3 is complete.

After a real reviewed ledger is applied, retain the candidate files, report and digests as immutable evidence, then perform the separately governed provider/import and connected browser certification steps required by #154.

## Safety rules

- Never fill the real ledger automatically.
- Never write directly to NoCodeBackend from this script.
- Never overwrite source exports in place.
- Never collapse an ambiguous grouped edit/remove into a guessed record choice.
- Never hide residual blockers because a reviewer selected `accept`; only the documented duplicate-sort exception is allowed.
- Never treat a candidate digest as provider-state evidence.
