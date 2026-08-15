# Account-deletion discovery-plan contract

## Status

`api/_lib/accountDeletionPlan.js` implements the source-only discovery planner
for [Phase 2 issue #150](https://github.com/jeremytheva/pourfolio/issues/150).
It converts one complete logical owner-data snapshot into an immutable list of
record identifiers and counts in the documented child-first order.

The module is not imported by an HTTP handler, provider adapter, browser service
or page. It performs no read, write, deletion, session operation, job creation,
logging or persistence. It is therefore not a whole-account deletion workflow
and is not evidence that launch gate G23 or Phase 2 is complete.

## Server contract

```js
buildAccountDeletionPlan({
  account: { id },
  snapshot: {
    profiles,
    ratings,
    rating_scores,
    bonus_attribute_rating_mapping,
    cellar
  },
  generatedAt
})
```

`account.id` represents an identity already authenticated by future server
orchestration. The planner does not authenticate a request or prove that the
session is recent. Every snapshot collection is required and must be an array,
including when it is empty. Every supplied record must be a plain object with a
non-empty scalar `id` and `user_id`. Identifiers are converted to strings
without changing their exact text.

The caller must supply one complete logical snapshot. The planner cannot prove
that independent provider reads are consistent or complete. Unknown snapshot
keys are ignored and cannot enter the output.

## Ownership and integrity rules

- Selection uses only an exact string match between each record's `user_id` and
  the supplied authenticated `account.id`. Whitespace or other text differences
  do not become an owner match.
- Duplicate primary IDs within any required collection fail before owner
  selection, including an owner/other-user collision.
- Zero or one exact-owner profile is valid. Multiple owner profiles fail as an
  ambiguous source state.
- Every owned rating score and bonus mapping must reference an included owned
  rating.
- A non-null owned rating `cellar_id` must reference an included owned cellar
  record for the same product.
- Other-user records are never planned, even when the snapshot contains them as
  connected-test sentinels.
- Ratings in `pending`, `complete`, `failed`, `deleting` or `deleted` provider
  states remain eligible for physical account cleanup. No workflow field or
  record body enters the plan.
- Missing, malformed, duplicated, orphaned or cross-owner relationships throw
  before a plan is returned. No partial plan is returned.

## Plan envelope

| Field | Contract |
| --- | --- |
| `format` | Constant `pourfolio.account-deletion-plan`. |
| `schema_version` | Semantic plan version; initially `1.0.0`. |
| `generated_at` | Canonical ISO 8601 UTC timestamp supplied by the server. |
| `total_records` | Sum of the five exact-owner collection counts. |
| `record_counts` | Exact count keyed by each collection in deletion order. |
| `steps` | Five immutable child-first steps, including empty steps. |

Each step contains only:

| Field | Contract |
| --- | --- |
| `sequence` | One-based fixed execution position. |
| `collection` | One allowlisted owner-data collection name. |
| `count` | Exact number of identifiers in the step. |
| `record_ids` | Lexicographically sorted immutable string identifiers. |

The fixed dependency order is:

1. `bonus_attribute_rating_mapping`;
2. `rating_scores`;
3. `ratings`;
4. `cellar`;
5. `profiles`.

This order does not authorise a caller to execute it. A future workflow must
re-read every candidate with both owner and relationship predicates, handle
not-found idempotently, reconcile after every stage and prove final absence.
The source-only
[reconciliation contract](account-deletion-reconciliation-contract.md)
strictly validates this envelope and can compare it with one caller-supplied
later snapshot, but it performs no query and cannot prove provider completeness.

## Privacy boundary

The plan deliberately excludes:

- any separate authentication-account field, email, name and profile content;
- every record body and unrecognised provider field;
- product, producer, category and attribute definitions;
- rating values, scores, bonuses, cellar contents and notes;
- submission keys, fingerprints, versions and lifecycle states;
- provider secrets, request data, confirmation text and session data;
- job, receipt, retention, legal-hold and authentication-identity fields.

Raw provider record IDs remain operationally sensitive. The canonical profile
primary key may equal the authentication account ID, so an allowlisted profile
record ID can contain the same text even though the plan adds no separate
identity field. The planner freezes the top-level object, count map, steps and
identifier arrays, but immutability is not permission to log, return or persist
them. A future approved job-store contract must separately establish which
identifiers are necessary, who may access them, how they are protected and when
they are erased.

## Executable-workflow entry criteria

Do not import this planner into `api/data-proxy.js`, another route, a job worker
or browser code until all of the following are resolved and evidenced:

1. A server-verifiable recent-authentication or approved re-authentication
   contract exists.
2. Exact `DELETE MY ACCOUNT` confirmation is checked with the source-only
   [confirmation contract](account-deletion-confirmation-contract.md) inside a
   same-origin, request-size-limited and deletion-specific rate-limited server
   endpoint; the helper alone is not authorisation.
3. The provider supplies a consistent five-collection snapshot or an approved
   write fence and reconciliation protocol that proves equivalent completeness.
4. A server-only idempotent job/receipt schema, access policy, retry state model,
   indexes, retention period and rollback/safe-forward plan are approved.
5. Sessions and new writes can be fenced before destructive work begins.
6. Each planned ID is re-read and exact-owner checked immediately before a
   child-first delete; provider `404` and partial failures converge safely.
7. Final owner queries use the source-only
   [reconciliation contract](account-deletion-reconciliation-contract.md) to
   reconcile every application count to zero before the reviewed
   authentication-provider identity operation can complete; the helper's
   count-only result does not itself prove those queries occurred.
8. Backup expiry, restore suppression, lawful exceptions and support procedures
   match the published reviewed policy.
9. Owner, other-user, expired-session, malformed-confirmation, partial-failure,
   retry, concurrency, empty-account and post-restore tests pass in isolated
   production-equivalent staging.

## Source validation

`api/_lib/__tests__/accountDeletionPlan.test.js` covers mixed owners, exact
owner matching, numeric/string IDs, stable order, exact counts, empty data,
record-body exclusion, malformed input, missing owners, duplicate IDs, multiple
profiles, orphan children, unavailable/cross-owner/cross-product cellar links,
deep immutability, retry determinism and static provider/route/browser
isolation.

Passing these tests is source evidence only. It does not demonstrate a recent
session, complete provider discovery, a durable job, any deletion, identity
removal, final absence, policy approval or connected staging behaviour.
