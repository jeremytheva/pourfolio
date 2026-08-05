# NoCodeBackend baseline export evidence template

Complete this record for one quiesced or provider-consistent snapshot and retain
the completed package in the approved, access-controlled evidence store. The
repository retains only this blank template and the redacted evidence-store
reference recorded in the launch-readiness documents. Do not commit exports,
schema contents, credentials, access tokens, request headers, private record
contents or unredacted provider responses.

The operator must export the schema and every collection listed below. A second
person, who is not the operator, must verify the package before it is used to
close a launch gate.


## Current repository status (4 August 2026)

This repository does **not** contain a completed production-equivalent baseline
export package. The current execution environment has no NoCodeBackend provider
access, immutable provider snapshot identifier, approved private evidence-store
identifier, retained export artefacts, pagination ledger, schema audit report or
independent-review decision. Therefore this template cannot be truthfully
completed from the repository alone, and the related launch gates must remain
blocked until a private, reviewed package supplies the required evidence below.

| Required baseline item | Current public status | Blocker that must be resolved in the private evidence store |
| --- | --- | --- |
| Environment identity | Not supplied; blocked | Record the redacted provider project/tenant, production-equivalent environment identifier, release commit and immutable deployment identifier. |
| Export timestamp | Not supplied; blocked | Record UTC start/finish times for one quiesced or provider-consistent export and prove a single logical state. |
| Page coverage | Not supplied; blocked | Retain a complete pagination and terminal-page ledger for schema plus `products`, `producers`, `categories`, `ratings`, `rating_scores`, `rating_attributes`, `bonus_attributes`, `bonus_attribute_rating_mapping`, `profiles` and `cellar`. |
| Row counts | Not supplied; blocked | Record per-artefact row counts reconciled to provider totals and non-duplicated successful pages. |
| SHA-256 checksums | Not supplied; blocked | Recompute byte lengths and 64-character SHA-256 checksums from retained export file bytes. |
| Schema reconciliation | Not supplied; blocked | Run `npm run audit:schema -- --schema <private-path>/schema.sql` against the exported schema and retain a `PASS` JSON report. |
| Products/producers/categories reconciliation | Not supplied; blocked | Prove producer and category relationships have zero unexpected orphans and no legacy `*_pf2025` alias is used. |
| Ratings reconciliation | Not supplied; blocked | Prove ratings resolve to exported products and profiles, and required rating ownership, idempotency and workflow controls pass the schema audit. |
| Rating children reconciliation | Not supplied; blocked | Prove `rating_scores` and bonus mappings resolve to exported parent ratings and attributes, with joined counts matching exported child rows. |
| Profiles reconciliation | Not supplied; blocked | Prove profile owner identifiers reconcile with ratings and cellar rows without exposing private profile data in the repository. |
| Cellar reconciliation | Not supplied; blocked | Prove cellar rows resolve to exported products and profiles, with nullability and approved exceptions documented. |
| Independent review | Not supplied; blocked | A reviewer other than the operator must approve the immutable private package before G02, G03, G04, G07 or Phase 1 rows can close. |

Do not replace this blocked status with pass evidence until the completed
baseline package and retained reports show zero blockers.

## Record identity and scope

| Field | Required value |
| --- | --- |
| Evidence-store reference | Immutable record/package identifier, not a private URL or credential |
| Environment | Provider project/tenant and production-equivalent environment identifier; redact only the sensitive portion consistently |
| Release candidate | Full Git commit and immutable deployment identifier |
| Provider snapshot | Immutable provider snapshot, backup, transaction or consistency-token identifier |
| Logical-state identifier | Identifier shared by every export request, or the quiescence window identifier |
| UTC start | ISO 8601 timestamp immediately before quiescence/consistent-read acquisition |
| UTC finish | ISO 8601 timestamp after the final terminal page and schema export |
| Export mechanism | Provider export/API name and version, exact redacted command or procedure, and output format |
| Page size | Requested page size and provider-effective page size; explain any difference |
| Operator | Identity recorded in the private store |
| Independent reviewer | Different person's identity, review UTC time and approve/reject decision |

Record the immutable deployment and provider identifiers returned by the
systems, rather than a mutable label such as `staging`, `latest` or a branch
name. Times alone do not prove that exports share a logical state.

## Snapshot-consistency control

Select exactly one control and retain its supporting evidence.

### Quiesced export

- record who approved the pause, the UTC pause and resume times, and the
  provider change/freeze identifier;
- identify every application, job, import, administrator and integration write
  path that was disabled or drained;
- retain redacted evidence that in-flight writes finished before the first
  export and that no create, update or delete completed until after the last
  terminal page; and
- record the monitoring/audit-log query, its time bounds and its zero-write
  result. A maintenance-mode UI alone is not proof of quiescence.

### Provider-consistent export

- name the provider facility and document its consistency semantics;
- retain the snapshot/transaction acquisition response and immutable token;
- show how the same token was supplied to the schema export and **every** page
  request, or provide the provider manifest that binds all outputs to it; and
- retain expiry, renewal and completion evidence. If any request falls outside
  the snapshot or the token changes, discard the package and start again.

In the private record, state why the evidence proves that all files represent
one logical state. Do not infer consistency from close timestamps, stable row
counts, matching deployment IDs or an absence of observed application traffic.

## Export manifest

Complete one row per artefact after the export is closed. SHA-256 values must be
64 lower-case hexadecimal characters calculated from the retained file bytes;
do not hash a count, a displayed response, a reserialised copy or a pathname.

| Artefact | Snapshot/logical-state ID | UTC first request | UTC terminal response | Rows | Bytes | SHA-256 | Pagination-ledger reference |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Schema | | | | N/A | | | N/A |
| `products` | | | | | | | |
| `producers` | | | | | | | |
| `categories` | | | | | | | |
| `ratings` | | | | | | | |
| `rating_scores` | | | | | | | |
| `rating_attributes` | | | | | | | |
| `bonus_attributes` | | | | | | | |
| `bonus_attribute_rating_mapping` | | | | | | | |
| `profiles` | | | | | | | |
| `cellar` | | | | | | | |

For the schema, retain the provider-native schema export, its format/version
and any separate permission/constraint manifest needed to describe controls
that the schema file does not contain. Run and retain the result of:

```bash
npm run audit:schema -- --schema <private-path>/schema.sql
```

## Pagination and terminal-page ledger

Retain one ordered row for **every** request, including retries and the request
that proves termination. Never include authorisation headers, signed URLs or
record bodies in the ledger.

| Collection | Sequence | Request UTC | Page number or cursor requested | Page size requested/effective | Snapshot token fingerprint | HTTP/result status | Rows returned | Next cursor/page (redacted) | Response/request evidence reference | Retry of sequence |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- | --- | ---: |
| | | | | | | | | | | |

For each collection, record the provider's documented terminal condition and
point to the final response that satisfies it (for example, an empty next
cursor or an empty final page). Reconcile the sum of rows returned by successful
non-duplicated pages to the manifest row count. Explain retries and prove they
did not duplicate or omit records. Cursor values may be replaced by stable
SHA-256 fingerprints when the raw value is sensitive, provided the private
package preserves enough information for the reviewer to establish the exact
request sequence.

## Relationship reconciliation

Perform reconciliation inside the same snapshot. Record zero for a valid empty
result; never leave a result blank. Adapt field names only where the approved
schema mapping documents the equivalent relationship.

| Check | Calculation | Expected | Actual | Redacted query/report reference |
| --- | --- | ---: | ---: | --- |
| Products without producer | `products.producer_id` missing from `producers` | 0 | | |
| Products without category | non-null `products.category_id` missing from `categories` | 0 | | |
| Ratings without product | `ratings.product_id` missing from `products` | 0 | | |
| Ratings without profile | `ratings.user_id` missing from `profiles.user_id` | 0 | | |
| Scores without rating | `rating_scores.rating_id` missing from `ratings` | 0 | | |
| Scores without attribute | `rating_scores.attribute_id` missing from `rating_attributes` | 0 | | |
| Bonus mappings without rating | mapping `rating_id` missing from `ratings` | 0 | | |
| Bonus mappings without bonus attribute | mapping `bonus_attributes_id` missing from `bonus_attributes` | 0 | | |
| Cellar rows without product | `cellar.product_id` missing from `products` | 0 | | |
| Cellar rows without profile | `cellar.user_id` missing from `profiles.user_id` | 0 | | |
| Rating score relationship count | joined score rows equals exported `rating_scores` rows | exact | | |
| Bonus relationship count | joined mapping rows equals exported mapping rows | exact | | |

Also retain per-parent distributions for rating scores and bonus mappings,
duplicate-key and null-key counts, and provider/schema relationship counts.
Document every intentional nullable relationship and approved exception; an
explanation does not silently turn an orphan into a pass.

## Package verification and redaction

The independent reviewer must:

1. recompute every byte length and SHA-256 checksum from the retained files;
2. verify the schema plus all ten collections are present and bound to the same
   provider snapshot or proven write-pause window;
3. replay the pagination arithmetic, including terminal-page and retry logic;
4. compare manifest counts with provider totals and relationship reports;
5. confirm the schema audit result and investigate every non-zero relationship
   exception; and
6. confirm the repository contains only this template and a safe evidence-store
   reference—no secrets, private rows, raw responses or private store URLs.

Record the review decision, UTC time and immutable evidence-package version in
the private store. If the package is amended, issue a new version and repeat
review; do not overwrite an approved package.

## Repository reference after completion

After approval, replace the `Not supplied; blocked` baseline status in
`schema-preflight.md` and `LAUNCH_READINESS.md` with only:

- the safe evidence-store reference and immutable package version;
- environment class (not credentials or a private endpoint);
- provider snapshot/logical-state identifier in its approved redacted form;
- UTC start and finish;
- release commit and immutable deployment identifier;
- per-artefact row counts, byte lengths and SHA-256 checksums where their
  disclosure is approved; and
- independent review UTC time and result.

Do not mark G03, G07 or Phase 1 complete merely because the baseline exists.
The fresh schema audit must pass, all other backend-certification evidence must
be approved, and no later schema/data/deployment change may have invalidated
the snapshot.
