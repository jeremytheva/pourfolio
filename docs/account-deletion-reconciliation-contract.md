# Account-deletion reconciliation contract

## Status

`api/_lib/accountDeletionReconciliation.js` implements the source-only,
count-only reconciliation core for
[Phase 2 issue #152](https://github.com/jeremytheva/pourfolio/issues/152). It
validates one account-deletion discovery plan, compares its identifiers in
memory with a later complete logical owner-data snapshot, and reports aggregate
and per-collection counts.

The module is not imported by an HTTP handler, provider adapter, job worker,
browser service or page. It performs no provider read, write, deletion, session
operation, identity operation, logging or persistence. A `complete` result is
therefore a statement only about the supplied snapshot. It is not provider-backed
final-absence proof and is not evidence that launch gate G23 or Phase 2 is
complete.

## Server contract

```js
reconcileAccountDeletionPlan({
  account: { id },
  plan,
  snapshot: {
    profiles,
    ratings,
    rating_scores,
    bonus_attribute_rating_mapping,
    cellar
  },
  verifiedAt
})
```

`account.id` represents an identity already authenticated by future server
orchestration. The reconciler does not authenticate a request or prove that the
session is recent. `plan` must conform exactly to the
[deletion-plan contract](account-deletion-plan-contract.md). `snapshot` must be
one later complete logical view of the same five owner collections.

The reconciler delegates snapshot ownership and relationship validation to
`buildAccountDeletionPlan`. It therefore uses the same exact `user_id` match,
duplicate-ID rejection, owner-child checks, cellar relationship checks, fixed
collection order and stable string-ID normalisation as discovery. It does not
duplicate or weaken those rules.

`verifiedAt` is normalised to canonical ISO 8601 UTC and must not precede the
source plan's `generated_at`. Neither timestamp proves provider snapshot
consistency or trustworthy wall-clock configuration.

## Source-plan validation

A plan may later be deserialised from an approved server-only job store, so the
reconciler does not trust its object shape. It fails closed unless all of the
following are true:

- the top-level object contains exactly `format`, `schema_version`,
  `generated_at`, `total_records`, `record_counts` and `steps`;
- format is `pourfolio.account-deletion-plan` and schema version is `1.0.0`;
- `generated_at` is already canonical ISO 8601 UTC;
- the count map contains exactly the five owner collections;
- all counts and the total are non-negative safe integers;
- there are exactly five steps in the documented child-first order with
  one-based sequence numbers;
- each step contains exactly `sequence`, `collection`, `count` and
  `record_ids`;
- every identifier is a non-empty string, unique within its collection and
  lexicographically sorted; and
- the identifier length, step count, count map and aggregate total reconcile.

Unexpected fields fail rather than being copied or interpreted. A schema-version
change therefore requires an explicit reconciler update and review.

## Reconciliation semantics

For each collection, identifiers are compared only inside the pure function:

- **planned** — identifiers present in the source plan;
- **removed planned** — planned identifiers absent from the later snapshot;
- **remaining planned** — planned identifiers still present later;
- **unplanned** — later owner identifiers absent from the source plan; and
- **remaining total** — all exact-owner identifiers in the later snapshot.

This distinction prevents a false success when every original identifier has
gone but a concurrent or retried write introduced new owner data. `complete` is
true only when `remaining_total_count` is zero. Equivalently, both remaining
planned and unplanned totals must be zero.

The function does not claim that a missing planned identifier was deleted by a
particular operation. It may have disappeared before the later snapshot for
another reason. Destructive orchestration must independently enforce job state,
write fencing, owner checks, idempotency and provider error handling.

## Reconciliation envelope

| Field | Contract |
| --- | --- |
| `format` | Constant `pourfolio.account-deletion-reconciliation`. |
| `schema_version` | Semantic reconciliation version; initially `1.0.0`. |
| `verified_at` | Canonical ISO 8601 UTC time supplied by the server. |
| `source_plan` | Frozen format, schema-version and generation-time summary; no identifiers. |
| `planned_total_count` | Source-plan total. |
| `removed_planned_total_count` | Planned identifiers absent later. |
| `remaining_planned_total_count` | Planned identifiers still present later. |
| `unplanned_total_count` | Later owner identifiers not present in the source plan. |
| `remaining_total_count` | All exact-owner records in the later snapshot. |
| `complete` | `true` only when `remaining_total_count` is zero. |
| `collection_results` | Five immutable count-only results in child-first order. |

Each collection result contains only:

| Field | Contract |
| --- | --- |
| `sequence` | One-based fixed collection position. |
| `collection` | One allowlisted owner-data collection name. |
| `planned_count` | Source-plan count. |
| `removed_planned_count` | Planned IDs absent later. |
| `remaining_planned_count` | Planned IDs still present later. |
| `unplanned_count` | Later owner IDs absent from the source plan. |
| `remaining_total_count` | All later exact-owner IDs in this collection. |

The top-level result, source-plan summary, result array and every collection
result are frozen. Identical inputs and verification time produce a deeply equal
result.

## Privacy boundary

The result deliberately excludes:

- every source-plan and later-snapshot record identifier;
- the authentication account ID, email, profile content and session data;
- every record body, catalogue definition and relationship identifier;
- provider responses, workflow keys, secrets and request values; and
- deletion job, receipt, retention, legal-hold and identity-operation fields.

The input plan still contains sensitive operational record IDs. Count-only output
does not make that input safe to log, return to a browser or persist outside an
approved server-only job contract. Error messages do not echo identifiers or
unexpected values.

## Executable-workflow entry criteria

Do not import the planner or reconciler into a route or worker until every entry
criterion in the [deletion-plan contract](account-deletion-plan-contract.md) is
resolved and evidenced. In particular, future orchestration must prove a recent
session, use the source-only
[confirmation contract](account-deletion-confirmation-contract.md) inside the
approved endpoint, prove a complete provider snapshot protocol, an approved job
store and retention model, write fencing, exact-owner checks immediately
before deletion, final provider queries, session/identity invalidation, safe
retry and connected owner/other-user/failure/concurrency tests.

The source reconciler may be used inside that future workflow only after the
provider queries have produced a proved complete logical snapshot. Its
`complete` flag cannot by itself authorise identity deletion or a completed user
response.

## Source validation

`api/_lib/__tests__/accountDeletionReconciliation.test.js` covers complete,
partial, empty and new-owner-data states; exact aggregate and per-collection
counts; strict envelope, timestamp, key, order, identifier and count validation;
later-snapshot relationship failures; output redaction; deep immutability; retry
determinism; and static provider/route/browser isolation.

Passing these tests is source evidence only. It does not demonstrate a recent
session, complete provider discovery, an approved job, any deletion, write
fencing, identity removal, provider-backed final absence, policy approval or
connected staging behaviour.