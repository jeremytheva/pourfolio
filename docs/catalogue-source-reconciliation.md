# Catalogue source reconciliation

## Purpose

This document defines the Phase 3 source-only catalogue preflight implemented for issue #159. It is deliberately narrower than connected catalogue certification.

The auditor fingerprints the supplied products, producers and categories CSV files, validates the public catalogue relationship graph and browse-order assumptions, and returns `PASS` or `BLOCKED` without modifying source data or choosing remediation mappings.

## Command

```bash
npm run audit:catalogue -- \
  --products <products.csv> \
  --producers <producers.csv> \
  --categories <categories.csv> \
  --root-category-id 1 \
  --output <report.json>
```

Exit codes:

- `0` — structurally valid source bundle (`PASS`)
- `1` — valid input contract with catalogue blockers (`BLOCKED`)
- `2` — CLI, file or required-header contract failure

## Validation performed

The source auditor checks:

- exact input byte length and SHA-256;
- deterministic ordered bundle SHA-256;
- required source headers;
- positive unique public IDs;
- non-empty trimmed public names;
- blank catalogue `user_id` values;
- producer and category references;
- category parent references, self-links and cycles;
- product category ancestry to the configured launch root;
- duplicate normalised `product_name` browse sort keys;
- optional ABV and IBU numeric values;
- collaboration flag shape;
- control characters, replacement characters and common mojibake markers in public text.

Public evidence does not contain catalogue names or owner values. Findings use stable public identifiers, source row numbers and machine-readable codes.

## Supplied-source result

The supplied source bundle is **BLOCKED**.

| Evidence | Value |
| --- | ---: |
| Products | 350 |
| Producers | 159 |
| Categories | 331 |
| Total blocker records | 209 |
| Missing producer references | 29 |
| Missing category references | 4 |
| Product category ancestry blockers | 127 |
| Duplicate product sort-key rows | 25 |
| Category cycle findings | 22 |
| Category self-links | 1 |
| Suspect public text encoding | 1 |

Input fingerprints and the bundle checksum are retained in `exports/catalogue-source-audit.json`.

The `CATEGORY_CYCLE` count represents every category whose ancestry traversal encounters a cycle; it is therefore broader than the single directly self-linked category. The self-link remains separately recorded by `CATEGORY_SELF_LINK`.

## Evidence boundary

This source preflight proves only what can be derived from the exact supplied CSV bytes. It does **not** prove that those files are a same-state export of the currently connected NoCodeBackend instance.

A `PASS` source audit would therefore still not certify launch discovery by itself. Phase 3 completion additionally requires:

- accepted remediation decisions for source blockers;
- a canonical same-state catalogue snapshot;
- connected production-equivalent browse/search/direct-route evidence;
- deterministic provider pagination and ordering evidence;
- connected failure-path evidence;
- browser and WCAG 2.2 AA evidence;
- independent review and the remaining launch gates.

## Remediation rule

The auditor must never infer a missing producer/category, silently repair text, deduplicate a product, rewrite category ancestry or choose a replacement ID. Any correction requires an explicit reviewed remediation decision and a new source snapshot/fingerprint.

## Re-run trigger

Re-run and replace the evidence whenever any source byte changes, the expected launch-root category changes, or the catalogue contract is revised. A changed input must produce a changed fingerprint and cannot inherit approval from an earlier report.
