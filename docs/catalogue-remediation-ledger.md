# Catalogue remediation ledger

## Purpose

This workflow converts the deterministic Phase 3 catalogue source audit into explicit, reviewable remediation decisions without changing source data or writing to NoCodeBackend.

It is evidence for **decision governance only**. A passing decision ledger does not mean the catalogue itself is valid. Catalogue acceptance still requires applying approved corrections to a new candidate snapshot, rerunning `audit:catalogue`, retaining the new fingerprints/checksum, and completing connected provider/browser certification.

## Commands

Generate a decision template from the same three source files used by the catalogue audit:

```bash
npm run audit:catalogue:remediation -- \
  --products <products.csv> \
  --producers <producers.csv> \
  --categories <categories.csv> \
  --root-category-id <id> \
  --template <catalogue-remediation.csv> \
  --output <decision-audit.json>
```

The command exits `1` because no decisions have yet been supplied. This is expected: template generation must not imply approval.

Audit a completed ledger:

```bash
npm run audit:catalogue:remediation -- \
  --products <products.csv> \
  --producers <producers.csv> \
  --categories <categories.csv> \
  --root-category-id <id> \
  --ledger <catalogue-remediation.csv> \
  --output <decision-audit.json>
```

Exit codes:

- `0`: the decision ledger itself is complete and internally valid;
- `1`: one or more decisions are missing, invalid, stale or deferred;
- `2`: CLI/input contract error.

## Ledger model

Generated task columns are authoritative source provenance and must not be edited:

- task key;
- issue code;
- source collection(s);
- source row(s);
- source record ID(s);
- affected field;
- related stable IDs;
- public product/producer/category name where useful for human reconciliation;
- occurrence count.

Human decision columns are:

- `Decision`;
- `Canonical ID`;
- `Replacement value`;
- `Rejection reason`;
- `Evidence reference`;
- `Operator`;
- `Reviewer`;
- `Reviewed at (UTC)`.

Public names included in CSV templates are neutralised if they begin with spreadsheet-formula characters. Owner values are never included in the template or JSON decision audit.

## Decision classes

`remap` selects an existing canonical producer/category identifier for blocker types where an identifier relationship is the defect. The validator verifies that the identifier exists in the supplied canonical producer/category input.

`edit` records an explicit replacement scalar value. It does not apply that value. The value must be reviewed and later applied in a separately controlled correction step.

`remove` records that the source record should not appear in the corrected candidate and requires a rejection/removal reason.

`accept` records an evidence-backed decision that the finding requires no source mutation. It cannot contain mutation fields. This should be used only where the governing policy genuinely allows the condition to remain.

`deferred` records that no final decision has been made. Deferred rows deliberately keep the ledger `BLOCKED`.

## Review controls

Every non-deferred decision requires:

- an evidence reference;
- an operator;
- a different reviewer;
- a parseable UTC review timestamp ending in `Z` or `+00:00`.

The validator compares all generated task fields with freshly generated tasks. Any edited/stale provenance fails as `CATALOGUE_DECISION_TASK_MISMATCH`.

Unknown tasks, duplicate task decisions and missing tasks also fail closed.

## Evidence boundary

A `PASS` result means only:

1. every task produced from the current source bundle has exactly one non-deferred decision;
2. task provenance still matches the current source data;
3. applicable canonical IDs exist in the supplied catalogue reference inputs;
4. decision review metadata satisfies the governance contract.

It does **not** mean:

- any replacement value is automatically correct;
- any source file has been changed;
- the historical exports are a same-state provider snapshot;
- the corrected catalogue has passed `audit:catalogue`;
- NoCodeBackend contains the approved corrections;
- browse/search ordering has been connected-tested;
- Phase 3 or launch readiness is complete.

## Required next step after ledger approval

Approved decisions must be applied to a new candidate catalogue through a separately reviewed correction process. The original source bundle remains immutable evidence. The corrected candidate must receive new file fingerprints and a new bundle checksum, then pass the deterministic catalogue audit before connected certification proceeds.
