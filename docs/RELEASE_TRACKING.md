# Phase 0–6 release tracking contract

## Tracker status and administrator action

The system of record is the repository's [GitHub Issues
tracker](https://github.com/jeremytheva/pourfolio/issues) and its milestones.
Issues are enabled. `PF-P0-01` is represented by
[#143](https://github.com/jeremytheva/pourfolio/issues/143), and `PF-P1-01` is
represented by [#144](https://github.com/jeremytheva/pourfolio/issues/144).

On 15 August 2026, the accountable owner also authorised Phase 2 source work to
start while #144 remains open, with blocked work skipped rather than waived.
The first focused children are
[#146](https://github.com/jeremytheva/pourfolio/issues/146), the owner-safe
account-export manifest core, and
[#148](https://github.com/jeremytheva/pourfolio/issues/148), the deterministic
in-memory artifact envelope, and
[#150](https://github.com/jeremytheva/pourfolio/issues/150), the source-only
account-deletion discovery plan, and
[#152](https://github.com/jeremytheva/pourfolio/issues/152), the source-only
count reconciliation core, and
[#153](https://github.com/jeremytheva/pourfolio/issues/153), the source-only
exact-confirmation core. They expose no route or destructive operation and do
not satisfy the full
`PF-P2-01` outcome, G23, recent-authentication, policy or connected-evidence
requirements.

On 15 August 2026, the accountable owner explicitly authorised Phase 1
implementation to proceed while #143 remains open. This is a sequencing
exception only: it does not close or waive Phase 0, permit production promotion,
or relax Phase 1's connected evidence and independent-review requirements.
The Phase 0 milestone exists; the Phase 1–6 milestones and remaining outcome
issues still require administrator creation and mapping.

The repository administrator must:

1. enable GitHub Issues and record the canonical Issues URL;
2. create the seven milestones below with the names reproduced exactly;
3. create one issue from each contract, replace contract dependency IDs with
   real blocking issue links, assign `@jeremytheva`, the stated milestone and
   priority label, and record the issue number in the mapping table; and
4. verify that public issues contain only redacted evidence references; private
   operational evidence must remain in the access-controlled release record.

## Required issue field contract

Every outcome issue must use the implementation issue form and contain one
observable outcome, one individually named accountable owner, target milestone,
priority, blocking issue links (or `None`), testable acceptance criteria,
in-scope and explicitly excluded work, and data/security/accessibility impact.
It must state which automated, manual, security, accessibility, deployment and
redacted operational evidence is required, using `Not applicable — <reason>`
where an evidence class genuinely does not apply. Evidence references must be
dated and tied to the exact commit and environment without exposing secrets,
tokens, cookies, raw request bodies or private user data.

## Milestones and backlog-to-issue mapping

Milestones are outcome-based; a date may be added only from an approved release
plan. They must not be closed until every mapped issue is closed and its
evidence has been independently reviewed.

| Contract | Exact milestone name | Backlog outcome | Priority | Accountable owner | GitHub issue |
| --- | --- | --- | --- | --- | --- |
| `PF-P0-01` | Phase 0 — Governed delivery ready | Repository changes can reach production only through an evidenced, protected delivery path. | P0 | `@jeremytheva` | [#143](https://github.com/jeremytheva/pourfolio/issues/143) |
| `PF-P1-01` | Phase 1 — Backend contract certified | The production-equivalent backend enforces and proves the canonical launch data contract. | P0 | `@jeremytheva` | [#144](https://github.com/jeremytheva/pourfolio/issues/144) — milestone assignment pending |
| `PF-P2-01` | Phase 2 — Identity lifecycle safe | A user can securely register, authenticate, recover, verify, export and delete their account. | P0 | `@jeremytheva` | Parent outcome issue pending; source-only children [#146](https://github.com/jeremytheva/pourfolio/issues/146), [#148](https://github.com/jeremytheva/pourfolio/issues/148), [#150](https://github.com/jeremytheva/pourfolio/issues/150), [#152](https://github.com/jeremytheva/pourfolio/issues/152) and [#153](https://github.com/jeremytheva/pourfolio/issues/153) in progress; sequencing dependency [#144](https://github.com/jeremytheva/pourfolio/issues/144) remains open |
| `PF-P3-01` | Phase 3 — Beer discovery dependable | A user can reliably browse, search and open canonical beer details. | P1 | `@jeremytheva` | Pending; depends on [#144](https://github.com/jeremytheva/pourfolio/issues/144) |
| `PF-P4-01` | Phase 4 — Ratings trustworthy | A user can create, retry, view and delete only their own internally consistent rating. | P0 | `@jeremytheva` | Pending Phase 1 and 3 issue links |
| `PF-P5-01` | Phase 5 — Cellar and profile owner-safe | A user can manage only their own cellar records and allowed profile fields. | P1 | `@jeremytheva` | Pending Phase 1 and 2 issue links |
| `PF-P6-01` | Phase 6 — Launch evidence approved | The exact production candidate is deployed and independently approved from complete, redacted evidence. | P0 | `@jeremytheva` | Pending all Phase 0–5 issue links |

## Issue contracts

### `PF-P0-01` — Establish the governed delivery path

- **Observable outcome:** an unauthorised actor cannot merge or deploy to
  production without the remotely observed required checks and approvals.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 0 — Governed
  delivery ready**; **P0**.
- **Dependencies:** none. Link any administrator-access request as related work.
- **Acceptance criteria:** Issues and the seven milestones exist; `main`
  protection requires pull requests, fresh approvals, strict successful checks
  and deployment statuses; force-push/deletion and unrecorded bypass are denied;
  secret scanning, push protection and Dependency Graph are enabled; exact
  observed check contexts are recorded against one candidate SHA.
- **Evidence:** automated—successful validation, dependency review and CodeQL;
  manual—issue/milestone and ruleset inspection; security—scanning and bypass
  controls; accessibility—not applicable, no UI behaviour changes;
  deployment—environment protection and candidate statuses; operational—a
  dated, redacted settings export/screenshots with administrator and independent
  reviewer. Store sensitive administration evidence privately.
- **Exclusions:** no launch feature, deferred route, provider schema change,
  production promotion or claim that workflow names prove remote contexts.

### `PF-P1-01` — Certify the canonical backend contract

- **Observable outcome:** production-equivalent requests accept canonical
  launch records while unauthenticated and cross-owner operations fail closed.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 1 — Backend contract
  certified**; **P0**.
- **Dependencies:** [#143](https://github.com/jeremytheva/pourfolio/issues/143)
  remains open. The owner authorised implementation to proceed on 15 August
  2026, but Phase 1 closure still requires the governed delivery path, provider
  access and approved schema rollout decisions.
- **Acceptance criteria:** same-state schema and import preflights pass;
  canonical collections and required constraints exist; provider CRUD/error
  envelopes match the gateway; permission-negative and duplicate/concurrent
  retry tests pass; backup, rollback and idempotent import rehearsals reconcile.
- **Evidence:** automated—schema/import audits and policy tests; manual—provider
  inventory and count reconciliation; security—owner/other-user/privileged
  negatives and server-only secret inspection; accessibility—not applicable,
  backend-only outcome; deployment—isolated production-equivalent staging;
  operational—dated redacted transcripts, checksums, backup/restore identifiers
  and independent approval in the private record. Capture the initial schema
  and collection package with the [same-state baseline evidence
  template](nocodebackend/baseline-export-evidence-template.md); the completed
  package remains in the approved private evidence store. Its repository-safe
  reference is currently **not supplied**, so this evidence item remains
  blocked and no completed export is claimed. The repository can generate and
  validate the private historical-reference decision ledger, but no completed
  decisions or transformed candidate import are claimed.
- **Exclusions:** no browser-direct provider access, legacy aliases, Supabase
  migration, fabricated data reconciliation or deferred collection exposure.

### `PF-P2-01` — Complete the safe account lifecycle

- **Observable outcome:** a user can register, sign in, verify and recover their
  account, export their data and request deletion without accessing another
  person's data.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 2 — Identity
  lifecycle safe**; **P0**.
- **Dependencies:** [#144](https://github.com/jeremytheva/pourfolio/issues/144)
  and approved privacy, retention and deletion decisions remain closure and
  user-facing-workflow blockers. The owner authorised unblocked source work to
  proceed on 15 August 2026; children
  [#146](https://github.com/jeremytheva/pourfolio/issues/146) and
  [#148](https://github.com/jeremytheva/pourfolio/issues/148) implement only the
  portable export manifest and in-memory artifact cores, while
  [#150](https://github.com/jeremytheva/pourfolio/issues/150) implements only the
  source-only account-deletion discovery plan and
  [#152](https://github.com/jeremytheva/pourfolio/issues/152) implements only
  count reconciliation for one supplied later snapshot and
  [#153](https://github.com/jeremytheva/pourfolio/issues/153) implements only
  exact phrase/request-shape validation under that sequencing exception.
- **Acceptance criteria:** lifecycle happy paths and expired/replayed/other-user
  negatives pass; export is complete and deletion follows the published policy;
  errors reveal no account existence or secrets; accessible status and error
  announcements pass keyboard and WCAG 2.2 AA checks.
- **Evidence:** automated—unit/policy/browser/axe tests; manual—email and lifecycle
  walkthrough; security—token, enumeration, authorisation and redaction review;
  accessibility—keyboard, focus and screen-reader checks; deployment—connected
  staging run; operational—redacted provider IDs, timestamps, reconciliation and
  privacy/legal approval stored privately.
- **Exclusions:** no social login, roles UI, administrator journey, public
  profiles, social graph, or retention policy invented by implementation.

### `PF-P3-01` — Prove dependable beer discovery

- **Observable outcome:** a user can browse/search canonical beers and open a
  stable detail route with honest loading, empty and failure states.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 3 — Beer discovery
  dependable**; **P1**.
- **Dependencies:** blocked by the created `PF-P1-01` issue; link catalogue data
  reconciliation work.
- **Acceptance criteria:** canonical product/producer/category references
  reconcile; browse, search, direct detail route, no-result, malformed-data and
  upstream-failure cases pass; all controls, focus order and result/status
  announcements meet WCAG 2.2 AA.
- **Evidence:** automated—service, browser, axe, build and bundle checks;
  manual—responsive keyboard walkthrough; security—projection and untrusted-data
  review; accessibility—axe plus keyboard/focus evidence; deployment—connected
  staging direct-route smoke; operational—redacted catalogue snapshot/checksum
  and run reference.
- **Exclusions:** beer only; no wine/spirits, producer claims, venues, events,
  analytics, social features, photos or deferred prototype routes.

### `PF-P4-01` — Prove trustworthy owner-scoped ratings

- **Observable outcome:** a user can create, safely retry, view and delete one
  complete rating while another user cannot read or mutate it.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 4 — Ratings
  trustworthy**; **P0**.
- **Dependencies:** blocked by the created `PF-P1-01` and `PF-P3-01` issues;
  include both blocking links.
- **Acceptance criteria:** scores 1–7, required attributes, bonuses and calculated
  totals persist consistently; sequential/concurrent retries create one rating;
  forced partial failures reconcile safely; history/delete are owner-scoped;
  validation and errors are keyboard and screen-reader accessible.
- **Evidence:** automated—calculation, policy, rollback and browser/axe tests;
  manual—create/retry/history/delete walkthrough; security—ownership, forged ID
  and sensitive-error negatives; accessibility—labels, focus and announced
  errors; deployment—connected staging concurrency run; operational—redacted
  workflow IDs/counts and reconciliation approved privately.
- **Exclusions:** no rating edits unless separately approved, public feeds,
  comments, reactions, photos, social statistics or game scoring.

### `PF-P5-01` — Prove owner-safe cellar and profile management

- **Observable outcome:** a user can manage their cellar and permitted profile
  fields, and cannot view or change another user's records or protected fields.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 5 — Cellar and profile
  owner-safe**; **P1**.
- **Dependencies:** blocked by the created `PF-P1-01` and `PF-P2-01` issues;
  include both blocking links.
- **Acceptance criteria:** cellar create/read/update/delete and nullable sharing
  references behave as documented; the profile allowlist rejects ownership,
  role and privacy escalation; cross-owner negatives pass; validation, focus,
  status and errors satisfy WCAG 2.2 AA.
- **Evidence:** automated—service/policy/browser/axe tests; manual—responsive
  keyboard CRUD/profile walkthrough; security—mass-assignment and cross-owner
  tests; accessibility—labels, focus and announcements; deployment—connected
  staging smoke; operational—redacted record IDs and correlation references.
- **Exclusions:** no public cellar, trading, social sharing, administrator or
  privacy controls, producer claims, photos, events, venues or analytics.

### `PF-P6-01` — Approve the exact launch candidate

- **Observable outcome:** the exact reviewed commit serves every launch journey
  in production and has a recorded, independent go/no-go decision.
- **Owner / milestone / priority:** `@jeremytheva`; **Phase 6 — Launch evidence
  approved**; **P0**.
- **Dependencies:** blocked by every created Phase 0–5 issue; include all six
  blocking links plus legal, moderation, support and operations approvals.
- **Acceptance criteria:** all blockers close with evidence; required checks are
  green on the deployed SHA; direct routes and health semantics pass; backup,
  restore, rollback, monitoring and alert exercises pass; named technical,
  privacy/legal, moderation and support reviewers approve; published policies
  match observed behaviour.
- **Evidence:** automated—full validation and connected browser/axe suite;
  manual—production smoke and policy/contact review; security—release review,
  scanning and permission negatives; accessibility—WCAG 2.2 AA evidence on
  production-equivalent UI; deployment—provider URL/status tied to exact SHA and
  rollback rehearsal; operational—dated, redacted monitoring/alert/restore
  references and signed decision stored under controlled access.
- **Exclusions:** no waiver by silence, partial evidence, earlier SHA or
  unreviewed exception; no social, event, venue, analytics, producer-claim,
  administrator, photo, non-beer or Brew Done It journey becomes reachable.

## Review suggestions

- Have the administrator and an independent release reviewer compare every
  created issue against its contract before applying `status: codex-ready`.
- Use GitHub's real blocking-issue relationships where available, in addition
  to plain links, so milestone sequencing is queryable.
- Split a contract only when each resulting issue retains one observable
  outcome, one named owner and complete evidence; never split merely to hide an
  unmet security, accessibility or deployment criterion.
