# Catalogue moderation target and migration preparation

Source contract for #700, #696 and Admin plan #698. The logical machine authority
is `deferred_targets.catalogue_moderation` in
[`pourfolio-data-contract.json`](../../contracts/pourfolio-data-contract.json)
1.6.0. Classification is **DEFERRED_TARGET**; physical mapping is null,
provider evidence NOT_RUN, fresh schema inventory UNVERIFIED and mutable
moderation disabled. No executable migration, collection name/type assertion,
role assignment or provider mutation is supplied by this package.

`mutable_enabled: false` is a target-classification assertion, not a runtime
feature switch. Editing it cannot enable a gateway. The existing read-only
`/admin` entry and own-capability projection do not grant mutable authority.

## Baseline and unresolved provider mapping

Prepared against application main `e920d9df9f68214e6bc9a186770cce03239cba69`.
Existing products, producers, categories and `product_producers` remain the
canonical catalogue. Current ratings, cellar and profile semantics are retained.
The current structural contract includes governed owner-confirmed changes and
bounded connected reads; it is not a fresh complete provider schema export.

| Logical record | Required identity/uniqueness | Physical mapping |
| --- | --- | --- |
| Entity moderation | entity type + stable entity ID | UNVERIFIED |
| Proposal revision | proposal ID + proposal version; submitter + submission key | UNVERIFIED |
| Decision | decision ID; unique operation ID | UNVERIFIED |
| Operation | operation ID; actor + idempotency key | UNVERIFIED |

Exact logical fields are in the canonical JSON. #701 must map every field,
index, relationship, maximum ID/length, null/default and permission to fresh
exact-instance evidence. One logical record need not mean one provider table;
any representation must preserve the same uniqueness and recovery guarantees.
Do not invent SQL or use historic export types as deployment proof.

Catalogue entity IDs cross this target boundary as positive canonical decimal
strings, including values larger than JavaScript's safe integer range. User IDs
remain opaque verified-session strings; proposal/decision/operation IDs are
server-generated opaque strings. Version counters are non-negative safe
integers with guarded exhaustion. Timestamps are server-generated UTC instants.
Structured diff/evidence/checkpoint fields need an evidenced bounded provider
representation; unsupported JSON columns are not assumed.

## State and review semantics

Verification persists pending, approved, needs_changes or rejected. Exposure
independently persists normal/restricted. Lifecycle, stock availability and style
reference comparison remain separate. A reasoned rejection does not implicitly
restrict an entity; resubmission cannot lift restriction.

Missing moderation evidence for a proven pre-activation legacy entity projects
unknown, never approved. An entity created after activation with missing state
is incomplete/unavailable and must not masquerade as legacy. No automatic legacy
approval or mass pending backfill is authorized. Preserve the existing catalogue
and history until deliberate reviewed decisions exist.

A consistently initialized pending beer is searchable, viewable, rateable and
cellar-eligible with an explicit unverified label. Restriction denies new discovery,
rating and cellar additions; authorized existing owner references retain a safe
identity placeholder. Never expose private tasting text or cellar details through
review/audit views. These are activation requirements, not current verified UI
labels; the read-only workspace invents no moderation status.

The JSON transition table owns accepted actions/actors/states. In particular:

- Admin approves pending/needs-changes/legacy-unknown content only at the exact
  reviewed versions, with evidence and current approved producer dependencies.
- Requests for changes and rejection require a safe submitter-visible reason.
- Original submitters can resubmit needs-changes/rejected proposals as a new
  revision. Needs-changes resubmission requires a validated field/evidence diff;
  rejected resubmission requires a recorded response to the prior reason.
  Proposed fields/evidence in prior revisions remain immutable; stable proposal
  ID + version identifies each retained revision. Neither path lifts restriction.
- A reviewed correction to approved content requires an allowlisted final diff,
  reason, evidence, current versions and refreshed producer dependencies.
- Revocation creates a new decision and needs-changes state; it never erases an
  approval. Restrict/unrestrict is a separate Admin command with reason/version.

Product factual fields and producer factual fields have separate explicit
allowlists. Producer relationships use the complete canonical `product_producers`
set, exactly one primary and server-owned ordering. No raw provider ownership,
role, score, rating, cellar, image-upload, lifecycle or arbitrary field is editable.
Unknown measurements remain unknown; zero is valid. Out-of-style measurements
alone never reject a beer or silently reclassify it. Acquisitions/renames are not
permission to rewrite historical attribution under ADR 0004.

## Content, state and dependency versions

`record_version` advances on every committed moderation decision, including
verification/exposure-only decisions. `content_version` advances on material
catalogue content or producer-attribution changes. Keeping them separate prevents
two reviewers from approving/rejecting the same unchanged content concurrently
without detecting the intervening decision.

Approval stores `approved_content_version` matching current content. A content
change invalidates that approval unless a new governed correction decision
approves the new content version. Proposals retain their base content version;
review also binds the current moderation record version and exact proposal
revision. Stale intent conflicts and requires refreshed review.

Product review binds the full producer relation fingerprint and current producer
moderation/content versions. All required primary/collaborating producers must
be effectively approved at commit. Later producer changes/revocation make the
product's effective verification need dependency review; do not continue showing
an unconditional approved badge based only on the old product row. Producer
restriction is checked independently for new dependent-product discovery,
rating and cellar activity, including products approved before that restriction.
Any restricted primary/collaborating producer denies that new exposure and
requires dependency review; retain historical attribution and safe owner
references. This does not rewrite verification history or implicitly unrestrict
a product. Producer approval never approves its products. Guided producer-then-product decisions
remain separate operations and show partial completion honestly.

All writers must participate in the proven version fence: old application
clients, ingestion/feeder jobs, direct-provider writers and Admin commands.
The current feeder contract is unchanged by this source target. Mutable activation
must be refused until those writers are reconciled; a new Admin-only lock cannot
protect against an unfenced ordinary update.

## Durable command and audit protocol

1. Resolve fresh server session/capability; allowlist and validate the intent.
   Derive actor/owner fields and calculate the canonical fingerprint server-side.
2. Create-or-resolve the actor-scoped operation using proven uniqueness. Same key
   and intent returns the original result; a different intent conflicts. Fresh
   role/ownership checks still apply to replays and status reads. The original
   result describes that operation at its version; reload current entity state
   before presenting a current approval after later decisions.
3. Read the target, proposal revision and dependency snapshots. Apply a proven
   atomic version/dependency fence across all relevant writers.
4. Persist durable intent/checkpoints before any canonical write. Commit the
   permitted catalogue state, moderation state, immutable decision and operation
   outcome through a transaction or independently certified fenced recovery
   protocol. No process-local mutex or expiring lease substitutes for this proof.
5. Return success only after consistent durable readback. Unknown responses retain
   the same operation ID and reconcile; do not blindly recreate, compensate or
   announce approval. Inconsistent targets cannot expose a verified state.
6. A blocked operation stops new mutations of the target until a proven recovery
   resolves it. Resume only exact remaining fenced steps, retaining all evidence.

Crash/lost-response rehearsal must cover every durable write boundary, including
initialization, canonical content, relationship set, moderation state, decision
and final operation acknowledgement. Atomicity or certified recovery is NOT_RUN.

Audit stores actor, action, reviewed/resulting versions, permitted before/after
diff, reason/evidence, dependency versions, operation and commit time. It is
append-only through application/provider permissions. Store no raw provider row,
email, session, credentials, private rating or cellar content. Evidence uses
bounded plain-text notes and source URL references with contributor/time; never
fetch arbitrary user URLs server-side or accept HTML. Superseding decisions add
history. Retention/pseudonymization must reconcile existing policy before
activation; account deletion cannot cascade-delete catalogue/audit history.

Browser review/audit projections omit internal actor/submitter IDs and raw
checkpoints; use safe display labels and opaque decision references. Operation
status/replay stays bound to the current authorized actor; knowing another
operation ID never grants access to its payload or outcome.

## Permission and certification matrix

| Capability | Ordinary user | Admin target | Provider proof |
| --- | --- | --- | --- |
| Submit supported product/producer/proposal | Current subject only | Supported subject path | UNVERIFIED for moderation initialization |
| Own submission/operation status | Exact owner, safe projection | Own; scoped catalogue review where permitted | UNVERIFIED |
| Decide/correct/restrict | Denied | Fresh catalogue capability + versions/evidence | UNVERIFIED |
| Write verification/exposure/actor/audit directly | Denied | Only governed server workflow | UNVERIFIED |
| Update/delete audit | Denied | Denied | UNVERIFIED |
| Private ratings/cellar, role grants, score rewrites | No additional access | No additional access | Existing boundaries retained |

Real read-only Admin/ordinary capability access passed in run 40494158943 at
`e920d9d`; provider role-write denial and actual revocation remain NOT_RUN. That
read does not qualify this target's permissions, storage or recovery.

## Bounded additive rollout package

Use the existing [migration evidence gate](rating-migration-evidence-gate.md),
[connected policy certification](connected-policy-certification.md) and baseline
snapshot/restore conventions. Extend their governed evidence path for moderation;
do not treat the rating-specific auditor as already accepting new resources.

Before an executable staging plan, retain an exact source/target/schema identity,
fresh schema and permission inventory, complete consistent preservation baseline,
ID/length/type mappings and an isolated restore rehearsal. Private snapshots and
receipts follow existing encrypted evidence handling; public summaries contain
only safe states/counts/fingerprints, never row bodies or account identities.

Prepare a manifest naming the exact new resources/fields/indexes/permissions,
expected counts, source/target fingerprints, fixture IDs, maximum mutations,
allowed environment, cleanup ownership and per-step abort conditions. Dry run
must show zero unrelated schema/data changes. Existing product/producer IDs,
relationships, ratings, cellar and profiles must be preserved. No business-data
backfill or historical verification default is implicit.

Then certify isolated staging: create/read/filter/page completeness, same-key
uniqueness, conflicting reviewers, stale update rejection with persisted-winner
proof, all-writer/dependency fencing, ordinary/direct-provider denial, audit
immutability, role revocation, every crash boundary and restoration/preservation.
A generic 409 response or an HTTP acknowledgement alone is insufficient.

Only qualified evidence permits a separately reviewed, exact bounded additive
rollout and later application activation. Destructive/irreversible production
operations require their own concrete owner-approved package. This document
requests or performs none.

Abort on stale schema/target, missing baseline/restore, unsupported type/index,
unknown writer, failed denial/concurrency/recovery, unbounded changes or uncertain
write outcome. Before writes, stop without mutation. After partial writes, retain
receipts and reconcile the exact operation; disable new commands and preserve
records. Do not drop populated resources, delete evidence, reverse unrelated
changes or rewrite historical data as a rollback shortcut.

## Deterministic source checks and remaining gate

`npm run check:data-contract` calls `validateModerationTarget`; it rejects silent
promotion, mutable enablement, guessed mapping, widened private fields and erased
version/visibility/recovery safeguards. Eight offline fixture tests exercise
accepted/rejected/stale transitions, producer dependencies, owner resubmission,
restricted exposure, large IDs and actor-bound replay/unknown results.
`ELIGIBLE` means the proposed fixture fits the specification. It grants no
permission, performs no provider call and proves no durable commit.

#701 owns fresh physical mapping and staging proof; #702 owns the real command
implementation, and #703–#706 own decision UI and integrated enablement. No fresh
complete schema inventory, permission negative probe, concurrency/recovery test,
backup/restore or mutation has run in this source package. Those remain explicit
prerequisites. Existing public-launch NO-GO and #165/#144/#154/privacy/bonus gates
remain unchanged.
