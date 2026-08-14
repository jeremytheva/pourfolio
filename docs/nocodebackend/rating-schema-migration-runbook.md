# Rating schema migration runbook

## Purpose, authority and hard gate

This runbook converts the rating collections from the immutable legacy baseline
to the launch contract without treating a SQL dump as a migration. It applies
first to an isolated, production-equivalent NoCodeBackend environment and then,
only after approval, to production.

NoCodeBackend is the system of record. This repository has no executable
migration runner and the delivery environment has no provider administration
credential. The mechanism-selection result in this checkout is therefore
**`BLOCKED — provider mechanism not evidenced`**. Neither the committed SQL
export nor the NoCodeBackend collection API is a migration interface. Before a
rehearsal, the provider must identify the **provider-supported, repeatable
managed schema-change, permission-policy and bulk-data job mechanism available
in the named production-equivalent tenant**. The provider or an authorised
operator then executes a versioned change plan through that mechanism and
returns immutable change/job and audit-log identifiers.

This runbook deliberately does not invent a product feature name or claim that
an unreferenced mechanism is supported. Change the result above to `APPROVED`
only when the authority record contains the exact provider facility name and
version, tenant applicability, documentation/support reference identifiers and
named approvals. An undocumented dashboard edit, an ad-hoc production
console/SQL session, importing the source dump, or a script using the public
collection API is not an approved migration mechanism.

The rollout is **STOPPED** until all blanks in this authority record are filled:

| Required authority | Recorded value |
| --- | --- |
| Provider product and production-equivalent tenant/environment ID | `<required>` |
| Supported managed schema/permission mechanism and version | `<required — rollout blocked>` |
| Supported bulk-data/backfill mechanism and version | `<required — rollout blocked>` |
| Tenant/version applicability statement | `<required — rollout blocked>` |
| Provider documentation title, revision/date and reference/URL | `<required>` |
| Provider support/change ticket ID | `<required>` |
| Versioned schema plan/job ID | `<required>` |
| Versioned backfill plan/job ID | `<required>` |
| Backup/export ID and documented restore procedure reference | `<required>` |
| Named NoCodeBackend operator | `<required>` |
| Named Pourfolio migration owner | `<required>` |
| Named security/data approver | `<required>` |
| Named release approver | `<required>` |
| Approval record and timestamp | `<required>` |
| Provider change ticket/PR | `<required>` |
| Permission-policy prerequisites and evidence reference | `<required>` |
| Backup/restore proof reference | `<required>` |
| Rollback rehearsal evidence reference | `<required>` |
| Retained post-migration schema audit reference | `<required>` |
| Final migrated export reference | `<required>` |

“Supported” means the provider documentation or support response explicitly
covers schema changes, constraints, permissions, consistent exports and restore
for this tenant and engine version. A screenshot showing that a button exists is
not sufficient. If the provider cannot supply a repeatable managed mechanism,
immutable job references and a supported recovery path, stop and obtain an
approved architecture decision; do not substitute console edits.


## Migration execution evidence record

This section is the migration design record's public evidence index. It must be
completed with safe references to the approved private evidence store before any
launch-readiness gate is closed. Do not commit raw exports, personal data,
provider secrets, request bodies or unredacted transcripts here.

### Approval and provider-change references

| Evidence item | Required retained proof | Recorded reference |
| --- | --- | --- |
| Migration approval | Named migration owner, security/data approver and release approver approving the exact provider mechanism, plans, rollback limits and candidate commit. | `<required>` |
| Provider change ticket/PR | Provider support/change ticket and provider or operations PR/change record covering schema, backfill, constraints, permissions, backup, restore and rollback. | `<required>` |
| Provider documentation | Documentation title, revision/date and URL or private support response proving the managed mechanism is supported for this tenant/version. | `<required>` |
| Versioned schema plan | Immutable schema plan/job identifier and approved diff. | `<required>` |
| Versioned backfill plan | Immutable backfill plan/job identifier, deterministic serialisation test vectors and restart/idempotency semantics. | `<required>` |
| Permission-policy deployment | Versioned provider permission bundle and deployment/change identifier. | `<required>` |
| Final approval | Named independent reviewer approval after post-migration audit `PASS`, zero blockers, count reconciliation and final migrated export retention. | `<required>` |

### Backup, restore and rollback proof

| Evidence item | Required retained proof | Recorded reference |
| --- | --- | --- |
| B0 backup/export | Fresh production-equivalent backup/export ID, UTC interval, consistency token, schema/data/config checksums, encryption/key-custodian reference and retention/expiry. | `<required>` |
| Isolated restore | Restore job ID into a new isolated environment, restored schema/data digests, count-sheet totals, representative owner relationships and historical `date_rated` comparison. | `<required>` |
| Restore smoke checks | Old gateway read-only smoke checks against the restored copy and approval by the migration owner plus security/data approver. | `<required>` |
| Rollback rehearsal | Rehearsed provider rollback or safe-forward recovery path, abort thresholds, restore order, validation queries, operator, reviewer and outcome. | `<required>` |
| Deployment rollback | Gateway/client deployment rollback rehearsal proving rating writes remain fenced or safely resumed without weakening the new schema/permissions. | `<required>` |

### Permission prerequisites

Before executing the provider migration, retain evidence that these prerequisites
are already true in the target tenant:

| Prerequisite | Required retained proof | Recorded reference |
| --- | --- | --- |
| Write fence | Rating create, delete and reconcile disabled at the gateway for the migration window; direct browser/provider-public writes denied. | `<required>` |
| Service identity | Only the gateway service identity can create rating children and write owner, workflow, deterministic key, fingerprint, count and state fields. | `<required>` |
| Negative actors | Unauthenticated, owner attempting immutable-field changes, other-user and over-privileged negative cases fail closed for every affected collection. | `<required>` |
| Compatibility reads | Old gateway read-only catalogue/rating projections continue without exposing unsafe fields during the compatibility window. | `<required>` |
| Residual controls | Any provider limitation that cannot enforce ownership or atomic workflow directly is recorded with named security/data approval and gateway enforcement evidence. | `<required>` |

### Execution timestamps and checkpoints

Record every timestamp in UTC and tie it to immutable provider job IDs and the
release candidate commit.

| Checkpoint | Start UTC | End UTC | Job/export/reference | Result |
| --- | --- | --- | --- | --- |
| Write freeze confirmed | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 0 backup/export | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 0 isolated restore proof | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 1 additive schema | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 2 discovery/quarantine/backfill | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 3 timestamp definition | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 4 constraints/relationship controls | `<required>` | `<required>` | `<required>` | `<required>` |
| Phase 5 permissions/workflow certification | `<required>` | `<required>` | `<required>` | `<required>` |
| Gateway canary start/end | `<required>` | `<required>` | `<required>` | `<required>` |
| Compatibility window start/end | `<required>` | `<required>` | `<required>` | `<required>` |

### Retained post-migration audit and final migrated export

The launch-readiness rows G10, G11, G12, G16 and G28 must not be changed from
blocked/open to complete until this retained audit row reports `PASS` with zero
blockers and the supporting evidence rows above are complete.

| Evidence item | Required retained proof | Recorded reference/result |
| --- | --- | --- |
| Audit command | Exact `npm run audit:schema -- --schema <export>` command, repository commit, Node/npm versions, stdout JSON, stderr and exit status. | `<required>` |
| Audit result | Retained JSON reports `"status": "PASS"`, blocker count `0`, and an export taken after constraints and permissions were applied. | `<required>` |
| Final migrated schema export | Immutable provider export/job ID, UTC interval, SHA-256 digest, schema artefact reference and permission-policy version. | `<required>` |
| Final migrated data export | Immutable provider export/job ID, UTC interval, SHA-256 digest, aggregate count manifest and quarantined/remediated ledger reference. | `<required>` |
| Post-migration connected evidence | Timestamp digest, ownership, score-range, relationship, permission-negative, workflow, duplicate retry and forced partial-write evidence references. | `<required>` |

## Immutable baseline and target contract

The known source baseline is `54026_rating_export(2).sql`, audited on 29 July
2026. Preserve that file byte-for-byte, record its SHA-256 digest, provider
snapshot/export ID, source environment and UTC creation time. It is historical
input only. The authoritative rollout baseline is a **fresh, transactionally
consistent export taken immediately before the rehearsal or production change**;
it must receive its own digest and immutable evidence-store reference.

The dated source has the 34 findings partitioned in
[schema preflight](schema-preflight.md): one missing table, nine missing
columns, ten nullable required columns, six missing unique constraints, six
missing foreign keys, one missing integer score-range constraint and one
mutable timestamp default. Do not assume the live baseline still has those
findings. Audit and compare a fresh export before every run.

The target is the complete persisted rating contract in
[schema mapping](schema-mapping.md):

* `profiles.user_id` is non-null and unique;
* all ten `ratings` fields (`user_id`, `rating_id`, `product_id`, `date_rated`,
  `submission_key`, `submission_fingerprint`, `submission_state`,
  `submission_version`, `expected_score_count`, `expected_bonus_count`) are
  non-null;
* `ratings.deleted_at` exists and remains nullable for the recoverable deletion
  tombstone;
* all five `rating_scores` fields (`user_id`, `rating_id`, `attribute_id`,
  `attribute_score`, `uniqueness_key`) are non-null;
* all four `bonus_attribute_rating_mapping` fields (`user_id`, `rating_id`,
  `bonus_attributes_id`, `uniqueness_key`) are non-null; and
* the six exact rating-workflow unique constraints are
  `ratings(user_id, rating_id)`, `ratings(submission_key)`,
  `rating_scores(rating_id, attribute_id)`,
  `rating_scores(uniqueness_key)`,
  `bonus_attribute_rating_mapping(rating_id, bonus_attributes_id)` and
  `bonus_attribute_rating_mapping(uniqueness_key)`; `profiles(user_id)` is an
  additional identity constraint.

The preceding list contains **six rating-workflow unique constraints plus the
profile identity constraint**. The ten legacy columns that require the
preflight's nullable-to-non-null change are:

1. `ratings.user_id`;
2. `ratings.rating_id`;
3. `ratings.product_id`;
4. `rating_scores.user_id`;
5. `rating_scores.rating_id`;
6. `rating_scores.attribute_id`;
7. `rating_scores.attribute_score`;
8. `bonus_attribute_rating_mapping.user_id`;
9. `bonus_attribute_rating_mapping.rating_id`; and
10. `bonus_attribute_rating_mapping.bonus_attributes_id`.

`ratings.date_rated` was already non-null in the dated source. The newly added
workflow and uniqueness fields, plus `profiles.user_id`, must also be non-null
in the final target. The final audit checks every target field; do not misread
the ten legacy nullability findings as the size of the final contract.

## Evidence ledger and count sheet

Keep evidence in the approved private store, never in this repository when it
contains identifiers or personal data. Every artefact records environment, UTC
time, source/target snapshot IDs, SHA-256 digest, job ID and operator. Redact
tokens, cookies, secrets, email addresses and row bodies, but retain aggregate
counts and non-sensitive provider error codes.

For each affected collection record, before and after each phase:

| Measure | Before | Quarantined | Remediated | After | Evidence reference |
| --- | ---: | ---: | ---: | ---: | --- |
| `profiles` rows |  |  |  |  |  |
| `ratings` rows |  |  |  |  |  |
| `rating_scores` rows |  |  |  |  |  |
| bonus mapping rows |  |  |  |  |  |
| nulls per required field |  |  |  |  |  |
| duplicate groups and affected rows per future unique key |  |  |  |  |  |
| orphan/owner-mismatch rows per relationship |  |  |  |  |  |
| out-of-range/non-integer scores |  |  |  |  |  |
| `pending` / `complete` / `failed` headers |  |  |  |  |  |

Reconcile `before = unchanged + remediated + quarantined` for every category.
Record both duplicate **group** count and affected **row** count. Any unexplained
count change is a stop condition.

## Phase 0 — freeze, export, backup and prove restoration

1. Announce the write window and disable rating create, delete and reconcile at
   the gateway. Confirm direct browser/provider-public writes are already
   denied. Catalogue reads may remain available.
2. Record deployed gateway/client commits, permission-policy version, provider
   tenant and engine version, health checks, row counts and maximum update IDs or
   timestamps. Verify that the write count remains unchanged throughout export.
3. Invoke the provider's documented consistent backup/export operation. Capture
   a complete schema export, full data export, relationships, indexes,
   constraints, defaults and permission configuration. Record backup/export job
   IDs, checksums, encryption/key-custodian reference and retention/expiry.
4. Restore the backup with the provider's documented restore operation into a
   new isolated environment—not over staging or production. Record the restore
   job ID. Compare schema/data digests where supported, all count-sheet totals,
   representative owner relationships and historical `date_rated` values.
5. Run the old gateway's read-only smoke checks against the restored copy. The
   named migration owner and security/data approver sign the restoration
   result.

**Checkpoint B0:** stop if the export is not consistent, restore is unsupported
or unproved, permissions are absent from backup, counts differ, a digest is
missing, or rating writes cannot be fenced. Recovery is to leave the source
unchanged, delete the isolated failed restore according to provider procedure
and repeat with a new backup. A backup that has not been restored is not a
rollback plan.

## Phase 1 — additive compatibility schema

Submit one versioned managed schema plan, or provider-documented resumable
sub-jobs with an explicit dependency order. The repository-side structural
allowlist is versioned as `PF-P1-S1-ADDITIVE-COMPATIBILITY-V1` and documented in
the [Phase 1 additive schema preflight](additive-schema-preflight.md):

1. Provision `profiles` with provider-generated primary key as applicable,
   nullable editable `name`, `description` and `avatar_url`, and a `user_id`
   matching the authentication subject type. Initially permit a nullable
   compatibility load only if required by the managed mechanism; populate and
   validate it before making it non-null and unique. Do not copy email, role,
   password, token or provider metadata into the profile.
2. Add nullable compatibility columns to `ratings`:
   `submission_key`, `submission_fingerprint`, `submission_state`,
   `submission_version`, `expected_score_count`, `expected_bonus_count`, and nullable
   `deleted_at`. Use target-capable types: fingerprint stores a full SHA-256 digest; versions
   and counts store non-negative integers; state stores only `pending`,
   `complete`, `failed`, `deleting`, or `deleted`. Do not install a default that conceals an unbackfilled
   legacy row.
3. Add nullable `uniqueness_key` columns to `rating_scores` and
   `bonus_attribute_rating_mapping`, sized for the deterministic values below.
4. Add supporting non-unique indexes only if the reviewed provider plan needs
   them for bounded discovery/backfill. Do not add unique or non-null controls
   yet.

**Checkpoint S1:** export the schema and prove that only the approved additive
changes occurred; old gateway reads still work; existing counts and timestamps
are unchanged. On failure, keep writes fenced. Resume the provider job if its
documented idempotency semantics allow it. Otherwise restore B0 into a clean
environment. Drop newly added empty/nullable fields only through a separately
recorded managed rollback job; never improvise a partial console reversal.

Run the structural part of S1 against the exact before/after exports:

```bash
npm run audit:schema:additive -- \
  --baseline <private-evidence>/schema-before.sql \
  --candidate <private-evidence>/schema-after-additive.sql \
  --output <private-evidence>/phase1-additive-schema-audit.json
```

A `PASS` proves only the approved structural delta. Counts, timestamp digests,
gateway compatibility, provider job identity, write-fence evidence and named
approval remain mandatory connected S1 evidence.

## Phase 2 — deterministic discovery, quarantine and backfill

Run the reviewed provider bulk-data job against a frozen snapshot. It must be
restartable by immutable source row ID, write an audit result for each batch and
never select a duplicate “winner” by accident.

### Discovery before writes

Discover null/blank required values; duplicate groups for every target unique
constraint; missing parents; parent/child owner mismatch; score values that are
not integers from 1 through 7; invalid product/attribute/bonus references;
multiple authentication subjects for a profile; and headers whose child counts
or attribute sets cannot be reconciled. Treat empty strings as invalid, not as
non-null values. Store only row IDs, reason codes and aggregate counts in the
quarantine manifest.

### Deterministic values

* `profiles.user_id`: the immutable authenticated subject already used by owned
  records. Provision one row only when exactly one verified subject is known.
  Absence or ambiguity is quarantined; never derive identity from email/name.
* `ratings.submission_key`: exact `<user_id>:<rating_id>` using the persisted,
  validated owner and positive safe-integer client rating ID.
* `ratings.submission_fingerprint`: SHA-256 of the same canonical serialisation
  used by the gateway: validated `product_id`, nullable same-owner `cellar_id`,
  scores sorted by numeric `attribute_id`, and a de-duplicated bonus-ID set
  sorted numerically. The job implementation, serialisation test vectors and
  digest algorithm revision must be attached to the provider job. Never hash
  display text or row order.
* `ratings.expected_score_count`: count of the reconciled, unique, valid score
  children for that header. `expected_bonus_count`: count of reconciled, unique,
  valid bonus children. These counts describe the accepted canonical payload;
  they must not legitimise missing applicable scores.
* `ratings.submission_state`: `complete` only when owner, references, exact
  applicable attribute set, 1–7 values, deterministic keys and both child counts
  are valid. Otherwise set `failed` only after retaining a reason code in the
  private migration evidence; do not fabricate children. No legacy row is left
  `pending`.
* `ratings.submission_version`: `0` for a deterministically reconciled legacy
  header. Backfill must not invoke the workflow transition endpoint or increment
  it.
* `ratings.deleted_at`: `null` for every migrated active or quarantined row.
  Do not infer deletion timestamps or backfill deletion states from missing children.
* `rating_scores.uniqueness_key`: exact
  `<user_id>:<client-rating_id>:score:<attribute_id>`, where client rating ID is
  the parent header's `rating_id`, not the provider parent primary key.
* bonus mapping `uniqueness_key`: exact
  `<user_id>:<client-rating_id>:bonus:<bonus_attributes_id>`.

### Duplicate remediation

Automatically merge/delete nothing. Exact duplicate children may be proposed
for deterministic remediation only when owner, parent, referenced attribute and
score/bonus value are identical and the named data approver approves the row-ID
manifest. Conflicting children, duplicate headers, owner ambiguity, missing
parents or incompatible payload fingerprints are quarantined from launch reads
and remain `failed`; resolve them through a separately approved owner-safe data
decision. Preserve a redacted before-image and reason. Never reassign ownership,
invent IDs, choose newest/oldest as a winner, or alter a historical timestamp to
make a constraint pass.

After every batch, recompute all discovery queries from persisted data. Verify
zero null/blank target values outside the approved quarantine, zero duplicate
future keys, zero invalid references/owners/scores, exact count-sheet
reconciliation and stable `date_rated` checksums.

**Checkpoint D2:** any non-deterministic row, count drift, digest mismatch,
unexpected duplicate, or job retry that produces a different result stops the
rollout. Because only nullable columns have been populated, the safe-forward
choice is normally to fix the reviewed job and rerun only rows whose before
image still matches. Restore B0 instead if existing canonical fields/rows were
changed incorrectly. Do not continue to constraints while quarantine rows
violate them; approved remediation must either correct them deterministically or
move them through a provider-supported archival/quarantine process that removes
them from the constrained live collections with a recoverable manifest.

## Phase 3 — timestamp definition

Use the managed schema-change mechanism to change only the definition of
`ratings.date_rated`: retain its type, non-null status and create-time
`DEFAULT CURRENT_TIMESTAMP`, and remove `ON UPDATE CURRENT_TIMESTAMP`. The job
must not issue an update of existing values. Before and after, export `(id,
date_rated)` in stable ID order and compare row count and digest. Then update a
non-date field on a disposable staging rating and prove `date_rated` is byte-for-
byte unchanged.

**Checkpoint T3:** any historical timestamp change stops the rollout. Keep
writes fenced and restore B0 unless the provider can use its documented
point-in-time/column recovery to restore every timestamp with verified digest.
Do not reverse the definition by restoring `ON UPDATE`; safe-forward is to keep
the corrected default and recover values from the immutable export.

## Phase 4 — constraints and relationship controls

After discovery returns zero violations, apply the plan in this order:

1. foreign keys and checks;
2. the six rating-workflow unique constraints listed above plus unique
   `profiles(user_id)`; and
3. the ten enumerated legacy nullable-to-non-null rules, followed by non-null
   rules for `profiles.user_id` and every newly added workflow/uniqueness field.

The provider-managed definition must enforce:

* `ratings.product_id -> products.id` and optional
  `ratings.cellar_id -> cellar.id`;
* score `rating_id -> ratings.id` and `attribute_id -> rating_attributes.id`;
* bonus mapping `rating_id -> ratings.id` and
  `bonus_attributes_id -> bonus_attributes.id`;
* profile/owned `user_id` consistency using the provider's supported identity
  relationship, without making profile deletion cascade owner data by default;
* integer `rating_scores.attribute_score BETWEEN 1 AND 7`;
* non-negative integer workflow version/counts and state limited to
  `pending`, `complete`, `failed`; and
* reviewed restrict/cascade behaviour. Parent deletion must not leave children;
  if provider cascade and permission semantics cannot be proved, use the
  gateway's owner-scoped child-first deletion and restrict parent deletion.

Foreign keys alone do not prove ownership. Connected tests must show that score
and bonus child owners equal the parent owner, and optional cellar owner/product
match the rating. If the provider cannot express those multi-row checks, direct
collection writes remain denied and the gateway enforces them; record this as a
named, approved residual control rather than claiming a database constraint.

**Checkpoint C4:** re-export and run the audit. Stop on lock timeout, partial
constraint application, violation, unexpected default/index, or non-`PASS`
result. Consult the recorded provider job state: complete a safely resumable
plan forward when discovery remains zero; otherwise restore B0. Constraint
removal is not routine rollback and requires a new approved managed plan.

## Phase 5 — permissions and workflow certification

Apply a versioned provider permission-policy deployment, not individual UI
toggles. Deny unauthenticated and browser/public direct access. Catalogue reads
remain projected and authenticated. Owners may receive only the gateway's safe
projections; they cannot set `user_id`, deterministic keys/fingerprint, state,
version, expected counts, totals or child parent/owner fields. Only the gateway
service identity can create children and write workflow fields.

The provider must atomically compare `submission_version` with
`expected_version`; stale writes return a conflict without mutation. Permit only `pending -> failed`, `pending|failed -> complete`,
`pending|failed|complete -> deleting`, and `deleting -> deleted`; `deleted` is
terminal and each successful transition increments the version exactly once.
The first deletion transition must exclude the header from reads before child
cleanup begins. The current provider contract has no certified cross-collection
atomic delete, so certify resumable deletion by forcing a failure after every
score and bonus removal, retrying, racing two deletions, and proving that every
child list/get/delete and final reconciliation is scoped to both owner and
parent. Preserve the `deleting` tombstone on failure and the `deleted` tombstone
on success. Only replace this process after production-equivalent certification
proves an atomic graph-delete endpoint commits the parent and all children
together, aborts without mutation at every forced failure point, and enforces
the same owner policy. Test two
owners, a non-owner, unauthenticated actor and gateway identity for allowed and
denied operations; cross-owner parent/cellar attacks; invalid scores and
references; concurrent duplicate header/child creates; stale transitions;
partial-write reconciliation; delete behaviour; and safe response projection.

**Checkpoint P5:** a permissions gap, unconditional workflow update, unexpected
read projection, or failed concurrency invariant stops rollout. Keep the write
fence and disable the new gateway. Restore the last approved permission-policy
version through the provider mechanism if it is demonstrably compatible with
the now-constrained schema; otherwise safely forward with a corrected, reviewed
policy. Never reopen public writes to make old clients work.

## Deployment order and compatibility window

1. **Schema compatibility:** phases 0–4 while all rating writes are fenced.
2. **Permissions:** phase 5, with public/direct writes denied before gateway
   traffic resumes.
3. **Gateway:** deploy a compatibility gateway that reads legacy-safe rows and
   writes the complete new contract, but keep its rating-write flag off. Canary
   with test owners, then enable a bounded percentage while monitoring unique
   conflicts, partial states, count invariants and permission denials.
4. **Clients:** only after the gateway can reconcile new submissions. Clients
   continue using the same same-origin gateway and must never depend on or send
   workflow fields. Roll clients out last.
5. **Compatibility window:** retain nullable-reading/legacy projection support
   in the gateway for at least one full supported-client release window and
   until metrics show no old client behaviour, no unprocessed legacy row and no
   rollback need. Record the explicit start/end UTC times and named release
   approval. The database fields are already non-null after backfill; the window
   is application compatibility, not permission to create incomplete rows.

At each canary stage reconcile header/child counts and states against the
post-migration baseline. Stop new writes first on any invariant breach. A client
rollback is safe because clients never write provider collections directly. A
gateway rollback to the old writer is **not** safe after constraints/new writes
unless it has been certified to preserve the new contract.

## Recovery matrix and rollback limits

| Partial state | Recovery decision |
| --- | --- |
| Backup/export or restore incomplete | No source change: abandon the artefact and repeat phase 0. |
| Some nullable fields/columns added | Keep writes fenced; resume the recorded idempotent job or remove only empty additions with an approved rollback job. |
| Backfill partly complete | Resume from recorded source ID only if before-image guards and deterministic rerun agree; otherwise restore B0. |
| Quarantine/remediation partly applied | Reconcile row-ID manifest and counts; safely forward only with named data approval, otherwise restore B0. |
| Timestamp definition changed | Safely forward with corrected definition; recover any changed values from B0 and verify the full digest. |
| Some constraints applied | Do not accept writes. Resume the reviewed plan if discovery is still clean; otherwise provider-supported restore to a clean environment. |
| Permissions partly applied | Keep new gateway disabled and direct access denied; deploy the complete reviewed policy or restore its compatible prior version. |
| Gateway canary fails before real new writes | Disable canary, retain additive schema/evidence, correct gateway/policy and rehearse again. |
| New-contract writes exist | Fence writes and safely forward/reconcile by default. Do not restore B0 over them or deploy the legacy writer; that would lose accepted ratings. Export the incident state first. |

Once a new-contract write has been acknowledged, destructive rollback to B0
would lose data. Recovery then requires a provider-supported merge/replay plan
that preserves immutable owner, submission key/fingerprint, children and
timestamps, with fresh named approval. Schema fields and constraints remain in
place. Dropping them, re-enabling `ON UPDATE`, weakening permissions, or
restoring a pre-change database are not acceptable shortcuts. If safe merge is
not provider-supported, keep traffic fenced and escalate the incident; do not
claim rollback capability.

## Staging rehearsal and production evidence

Perform the complete run, including every failure injection and recovery path,
in an isolated production-equivalent staging tenant restored from a fresh
baseline. Use the same provider mechanism/version, schema and backfill plans,
permission bundle, gateway commit and operator checklist intended for
production. Record elapsed/lock times, job IDs, counts, quarantine decisions,
permission negatives, concurrency results, timestamp digest and rollback or
safe-forward result. The named migration, security/data and release approvers
must sign the rehearsal record.

After rehearsal, discard earlier exports as launch proof and take **fresh
same-state schema and data exports**. Run from the repository root with Node.js
20:

```bash
npm run audit:schema -- --schema <export> --output <report-path>
```

Retain the exact command, export/job ID and SHA-256, repository commit, Node/npm
versions, stdout JSON, stderr and exit status. Required evidence is exit `0`,
`"status": "PASS"`, zero blockers and an export taken after constraints and
permissions were applied. The audit proves schema shape only; attach the
separate connected foreign-key, score-range, ownership, permission, workflow,
backup/restore and timestamp evidence.

Production requires a new B0 export/restore proof and fresh approvals; staging
IDs cannot authorise production. Repeat the same versioned jobs, checkpoints,
post-change exports and audit. Any plan/version drift invalidates the rehearsal
and requires review. Close the change only after final counts reconcile, the
compatibility window is recorded, monitoring is healthy and every authority
record contains a named person plus provider documentation/change reference.

## Reviewer suggestions

Reviewers should challenge the provider's claim of repeatability and recovery,
the canonical fingerprint test vectors, owner/profile identity source,
quarantine disposition, child-delete semantics, atomic version transition and
whether every reported count comes from one frozen state. Prefer a safe-forward
repair after accepted new writes, and reject evidence assembled from unrelated
exports or dashboard screenshots. If an exact provider mechanism or reference
is still `<required>`, this document is a plan only and the rollout remains
blocked.
