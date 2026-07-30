# Launch readiness

## Stage 1 containment state

- [x] Brew Done It is absent from launch navigation and routing; direct browser
  requests fall back without loading playable controls or calling game APIs.
- [x] Game gateway routes remain fail-closed behind the unset, server-only
  `BREW_DONE_IT_POLICY_ENABLED` flag.
- [ ] Do not enable Brew Done It unless a reviewed delivery implements the
  accepted same-device ADR or a newly accepted ADR supersedes it.

The accepted ADR permits only session-memory, same-device play: no second
account, invitation, shared-history access, persisted round or score, durable
statistics, or retention schedule. It is an approved future model, not a
currently reachable journey.

These repository checks establish containment only. They do not close any
external release gate or approve the retained remote, persistent game. Its
two-account shared history, invitations, stored scoring, retention and durable
statistics remain an unapproved proposal and require a superseding accepted ADR.

## Decision

Source-controlled launch hardening is implemented for a beer-first MVP, but production remains **no-go** until every external gate below is evidenced and signed off.

## Implemented in this change

- Privileged self-registration, admin credential hint, test-user switching and browser role overrides removed.
- Server-authoritative session identity and editable profile-field allowlist.
- Hardened allowlisted auth proxy.
- Authenticated application data gateway with owner enforcement and explicit response projections.
- Canonical `products`/`product_id`, `ratings`, normalised `rating_scores`, `cellar` contract.
- Stable product routes and live catalogue/search/detail states.
- Complete applicable 1–7 rating form; score `1` remains valid.
- Server-calculated totals, durable retry ID, optional bonus selections and compensating rollback.
- Owner-scoped rating history and delete.
- Owner-scoped cellar CRUD with optional nullable sharing series/edition links.
- Local-only privacy/admin/social/events/venues/analytics/photo/non-beer launch surfaces removed from routing.
- Vercel SPA rewrites, security headers, health endpoint and disabled production source maps.
- Expanded unit/policy tests, mocked browser journeys, automated accessibility
  checks, production audit, bundle budgets, CodeQL, dependency review and
  Dependabot.
- Read-only import and rating-schema preflights that fail closed on incomplete
  catalogue references, missing profile/rating controls, duplicate-permitting
  schema and mutable rating timestamps.

## Historical import evidence

The supplied workbook currently reports:

| Item | Current evidence | Gate |
| --- | ---: | --- |
| Source ratings | 604 | Reconcile exactly after dry run. |
| Ready ratings | 593 | Import idempotently; 11 remain intentionally excluded. |
| Uploadable score rows | 4,177 | 605 PUT + 3,572 POST; reconcile exactly. |
| Excluded score rows | 15 | Must never be uploaded. |
| Bonus selections | 1,785 | 1,716 exact matches; resolve 69 unmatched selections across 10 pending variants. |
| Historical cellar records | 399 | All currently lack `user_id` and confirmed cellar ID. |
| Rating-to-cellar links | 593 | 592 await cellar import; one intentionally has no cellar metadata. |

The previously missing products, cellar, bonus-attribute and SQL exports are now present in the supplied source set. Their presence does not complete import reconciliation. The [historical import preflight](nocodebackend/import-preflight.md) currently blocks the source set because catalogue and producer references do not reconcile.

The [rating schema preflight](nocodebackend/schema-preflight.md) also blocks the
supplied SQL export with 15 findings: the `profiles` table is absent, ten required
columns are nullable, three required unique constraints are absent, and
`ratings.date_rated` changes automatically on update.

### Historical import execution record

**Status (29 July 2026):** Blocked; the repository does not contain the
reconciled historical CSV inputs, an identity-verification record, staging
credentials or provider backup/restore evidence. Consequently, no preflight
`PASS`, staging write, count reconciliation or idempotency result is claimed.

The private release record must identify the environment, source snapshot,
operator, independent reviewer and release commit. It must retain dated,
redacted evidence at a recorded location for each step below; do not place
personal data, credentials or raw staging exports in this repository.

| Step | Required evidence | Current result |
| --- | --- | --- |
| Same-state catalogue export | Complete products and producers exports with provider snapshot/export identifiers and timestamps. | Not supplied; blocked. |
| Catalogue reconciliation | Every rating and cellar product resolves; every product has a positive producer ID resolving in the paired producers export. No name-only substitutions. | Known missing product references and producer ID `0`; blocked. |
| Bonus decisions | A decision ledger containing every unmatched source variant, source count, mapped canonical bonus ID or explicit rejection reason, reviewer and totals. Variant counts must sum to 69 and final accepted/rejected totals must be stated. | Ten variant names and decisions are not supplied; blocked. |
| Cellar identity | A 399-row ledger containing the source record key, verified account owner ID, verification method/evidence reference and confirmed destination cellar ID. Email alone is not identity evidence. | Owners and confirmed IDs are not supplied; blocked. |
| Read-only preflight | Exact command, input checksums and retained JSON report from `npm run audit:import -- --ratings <ratings.csv> --products <products.csv> --producers <producers.csv> --cellar <cellar.csv>` showing `PASS`. | Cannot run against absent reconciled inputs; blocked. |
| Backup and restore | Backup identifiers and checksums for every target collection, followed by a successful isolated restore rehearsal and post-restore count/hash comparison before import writes. | No provider evidence; blocked. |
| Dry run and import | Dry-run diff, approval, actual non-production import log, rejected-record ledger and post-import orphan queries. Reconcile 604 source ratings, 593 accepted ratings, 4,177 uploaded scores, 15 excluded scores, 1,785 bonus selections, 399 cellar records and 593 rating-to-cellar relationships. | Not run. |
| Idempotency rerun | Unchanged input checksums, second-run log, zero creates, zero mutations, zero duplicates and stable per-collection counts/content hashes. | Not run. |
| Rollback | Provider-specific, reviewer-approved procedure naming backup, restore order, validation queries, abort thresholds and responsible operator; rehearse it before production scheduling. | Not supplied; blocked. |

The rejected-record ledger must account for all 11 ratings excluded from the
604 source ratings and all 15 excluded score rows, plus any explicitly rejected
bonus variants. A rejected bonus selection must not silently reject its parent
rating unless that behaviour is reviewed and included in the expected counts.
Final evidence must record per-collection before, first-run and second-run
counts as well as stable identifiers or content hashes; counts alone do not
prove that the rerun avoided mutation.

## External P0 gates

### Backend certification

- **Accountable owner:** `@jeremytheva`
- **Independent reviewer:** Release manager (must not be the accountable owner)

**Status (29 July 2026):** Blocked; this delivery environment has no staging
credentials, schema export or provider access. No certification item below is
claimed as complete.

The accountable owner coordinates the staging work and records the identity of
the operator and independent reviewer in the private release record. Secrets,
session cookies, unredacted response bodies and production or staging data must
not be committed or attached as public evidence. Configure
`NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE_URL` only as server-side
variables in the isolated staging environment; never expose either variable to
Vite or use a `VITE_` prefix.

The backend-certification gate is complete only when the independent reviewer
has checked dated, redacted evidence for every item below against the exact
release candidate:

- [ ] [G01](#evidence-g01) — The two server-only variables are present in isolated staging and absent
  from browser bundles, repository files, command transcripts and evidence.
- [ ] [G02](#evidence-g02) — The canonical collections in
  [the schema mapping](nocodebackend/schema-mapping.md) are provisioned, and an
  inventory proves that no legacy `*_pf2025` alias is used.
- [ ] [G03](#evidence-g03) — A production-equivalent, same-state schema export has been audited with
  `npm run audit:schema -- --schema <export-path>` and the retained JSON report
  says `PASS`.
- [ ] [G04](#evidence-g04) — The schema evidence proves required non-null fields and uniqueness
  constraints, immutable ownership fields, rating idempotency fields and
  workflow-state permissions; an owner-scoped, controlled non-date update also
  proves that `ratings.date_rated` is unchanged.
- [ ] [G05](#evidence-g05) — Redacted provider transcripts exercise the precise paths, filters and
  response envelopes consumed by `api/_lib/dataProvider.js`: list, filtered
  list, get, create, update, delete, not-found fallback, unique conflict,
  malformed response, timeout and upstream failure.
- [ ] [G06](#evidence-g06) — For every launch collection exposed by
  `api/data-proxy.js`, the permission matrix covers
  unauthenticated, owner, other-user and privileged negative cases. The
  privileged cases must demonstrate least privilege, not merely possession of
  a provider secret.
- [ ] [G07](#evidence-g07) — Evidence is dated, redacted, tied to the environment and release commit,
  stored with the private release record, and approved by the independent
  reviewer before any corresponding P0 checkbox below is closed.

Partial completion does not permit this gate or a related P0 entry to be
closed. A rerun is required after any schema, permission, provider-contract or
release-candidate change.

- [ ] [G08](#evidence-g08) — Configure `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE_URL` in staging and production.
- [ ] [G09](#evidence-g09) — Verify the configured data base URL accepts the gateway’s collection paths, query filters and create/update/delete response shapes.
- [ ] [G10](#evidence-g10) — Provision the canonical schema without `*_pf2025` aliases and make the rating schema preflight return `PASS`.
- [ ] [G11](#evidence-g11) — Apply non-null and unique rating controls through an approved provider migration, with cleanup, compatibility and rollback evidence.
- [ ] [G12](#evidence-g12) — Prove `date_rated` remains unchanged during controlled non-date updates.
- [ ] [G13](#evidence-g13) — Prove unauthenticated, owner, other-user and privileged negative permission cases for every collection.
- [ ] [G14](#evidence-g14) — Prove sequential and concurrent duplicate-rating retries return one persisted rating.
- [ ] [G15](#evidence-g15) — Repeat the atomic-workflow capability probe with configured staging credentials and retain redacted evidence.
- [ ] [G16](#evidence-g16) — Apply and prove the documented idempotency fields, constraints, state permissions and owner-safe reconciliation workflow, including forced partial writes and failed state updates.
- [ ] [G17](#evidence-g17) — Obtain complete, same-state products/producers exports and make the historical import preflight return `PASS`; the current source set references absent products and producer ID `0`.
- [ ] [G18](#evidence-g18) — Resolve the 69 unmatched historical bonus selections.
- [ ] [G19](#evidence-g19) — Assign valid owners and confirmed IDs to all 399 historical cellar records.
- [ ] [G20](#evidence-g20) — Run the historical import in non-production, rerun it to prove idempotency, and reconcile imported/rejected counts.
- [ ] [G21](#evidence-g21) — Rotate any credential that may have matched the former published admin hint.

## External P1 gates

- [ ] [G22](#evidence-g22) — Run browser end-to-end and WCAG 2.2 AA checks against the connected staging backend.
- [ ] [G23](#evidence-g23) — Implement and evidence the recovery, verification, export and deletion
  [acceptance contract](account-lifecycle-readiness.md); its current review is a
  design gate, not implementation evidence.
- [ ] [G24](#evidence-g24) — Publish reviewed privacy policy, terms, moderation/escalation procedure,
  support contact and retention schedule at stable, accessible URLs, recording
  version and effective date in the private release record.
- [ ] [G25](#evidence-g25) — Complete appropriate Australian privacy/legal review and record the named
  reviewer, date, scope, findings, resolutions, approval and re-review trigger;
  the current approval fields are explicitly incomplete.
- [ ] [G26](#evidence-g26) — Complete the documented production-equivalent export/deletion exercise and
  reconcile its behaviour to the exact published policy version.
- [ ] [G27](#evidence-g27) — Configure central monitoring, redacted correlation-ID logging, alert ownership and service-level thresholds.
- [ ] [G28](#evidence-g28) — Complete backup, restore and deployment rollback rehearsals with evidence.
- [ ] [G29](#evidence-g29) — Enable GitHub branch protection, required checks, secret scanning and push protection.
- [ ] [G30](#evidence-g30) — Enable GitHub Dependency Graph and make the dependency-review check blocking.
- [ ] [G31](#evidence-g31) — Enable GitHub Issues or nominate another tracker for the remaining gates.
- [ ] [G32](#evidence-g32) — Test direct routes and `/api/health` on the production host.

The thresholds, safe central-logging contract, health semantics, alert-owner
register, backup/restore procedure, rollback rehearsal and release ownership
register are defined in the [production operations readiness runbook](OPERATIONS_READINESS.md).
Its blocked evidence fields are release gates, not evidence of completed remote
configuration or rehearsals.

## Launch sign-off

Public launch requires:

1. every P0/P1 box closed with dated evidence;
2. the release-gate and CodeQL checks green on the exact deployed commit;
3. exact import reconciliation;
4. permission-negative tests passing;
5. restore and rollback exercised;
6. named technical, privacy, moderation and support owners.

## Release evidence register

This register links every launch checkbox to an accountable person and the
private evidence reference that must be reviewed before it can close. The
review date is **29 July 2026**. `PRR` references are identifiers in the
access-controlled private release record, not public links: the underlying
artefacts may contain operational metadata and must remain redacted and access
controlled. A reference marked `not supplied` is evidence of an unresolved
blocker, **not** evidence that the gate passed.

The repository can name `@jeremytheva` as the person accountable for obtaining
or assigning every missing artefact. It cannot invent the independent technical,
privacy/legal, moderation, support, or backup owners. Where specialist approval
is required, the missing named approver remains an explicit blocker even though
the action has an accountable owner.

| Gate | Accountable owner | Dated, redacted evidence | Result on frozen candidate |
| --- | --- | --- | --- |
| <a id="evidence-g01"></a>G01: The two server-only variables are present in isolated staging and… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G01`: not supplied | **BLOCKED** |
| <a id="evidence-g02"></a>G02: The canonical collections in | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G02`: not supplied | **BLOCKED** |
| <a id="evidence-g03"></a>G03: A production-equivalent, same-state schema export has been audite… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G03`: not supplied | **BLOCKED** |
| <a id="evidence-g04"></a>G04: The schema evidence proves required non-null fields and uniqueness | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G04`: not supplied | **BLOCKED** |
| <a id="evidence-g05"></a>G05: Redacted provider transcripts exercise the precise paths, filters… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G05`: not supplied | **BLOCKED** |
| <a id="evidence-g06"></a>G06: For every launch collection exposed by | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G06`: not supplied | **BLOCKED** |
| <a id="evidence-g07"></a>G07: Evidence is dated, redacted, tied to the environment and release … | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G07`: not supplied | **BLOCKED** |
| <a id="evidence-g08"></a>G08: Configure `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G08`: not supplied | **BLOCKED** |
| <a id="evidence-g09"></a>G09: Verify the configured data base URL accepts the gateway’s collect… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G09`: not supplied | **BLOCKED** |
| <a id="evidence-g10"></a>G10: Provision the canonical schema without `*_pf2025` aliases and mak… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G10`: not supplied | **BLOCKED** |
| <a id="evidence-g11"></a>G11: Apply non-null and unique rating controls through an approved pro… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G11`: not supplied | **BLOCKED** |
| <a id="evidence-g12"></a>G12: Prove `date_rated` remains unchanged during controlled non-date u… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G12`: not supplied | **BLOCKED** |
| <a id="evidence-g13"></a>G13: Prove unauthenticated, owner, other-user and privileged negative … | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G13`: not supplied | **BLOCKED** |
| <a id="evidence-g14"></a>G14: Prove sequential and concurrent duplicate-rating retries return o… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G14`: not supplied | **BLOCKED** |
| <a id="evidence-g15"></a>G15: Repeat the atomic-workflow capability probe with configured stagi… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G15`: not supplied | **BLOCKED** |
| <a id="evidence-g16"></a>G16: Apply and prove the documented idempotency fields, constraints, s… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G16`: not supplied | **BLOCKED** |
| <a id="evidence-g17"></a>G17: Obtain complete, same-state products/producers exports and make t… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G17`: not supplied | **BLOCKED** |
| <a id="evidence-g18"></a>G18: Resolve the 69 unmatched historical bonus selections. | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G18`: not supplied | **BLOCKED** |
| <a id="evidence-g19"></a>G19: Assign valid owners and confirmed IDs to all 399 historical cella… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G19`: not supplied | **BLOCKED** |
| <a id="evidence-g20"></a>G20: Run the historical import in non-production, rerun it to prove id… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G20`: not supplied | **BLOCKED** |
| <a id="evidence-g21"></a>G21: Rotate any credential that may have matched the former published … | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G21`: not supplied | **BLOCKED** |
| <a id="evidence-g22"></a>G22: Run browser end-to-end and WCAG 2.2 AA checks against the connect… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G22`: not supplied | **BLOCKED** |
| <a id="evidence-g23"></a>G23: Implement and evidence the recovery, verification, export and del… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G23`: not supplied | **BLOCKED** |
| <a id="evidence-g24"></a>G24: Publish reviewed privacy policy, terms, moderation/escalation pro… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G24`: not supplied | **BLOCKED** |
| <a id="evidence-g25"></a>G25: Complete appropriate Australian privacy/legal review and record t… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G25`: not supplied | **BLOCKED** |
| <a id="evidence-g26"></a>G26: Complete the documented production-equivalent export/deletion exe… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G26`: not supplied | **BLOCKED** |
| <a id="evidence-g27"></a>G27: Configure central monitoring, redacted correlation-ID logging, al… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G27`: not supplied | **BLOCKED** |
| <a id="evidence-g28"></a>G28: Complete backup, restore and deployment rollback rehearsals with … | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G28`: not supplied | **BLOCKED** |
| <a id="evidence-g29"></a>G29: Enable GitHub branch protection, required checks, secret scanning… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G29`: not supplied | **BLOCKED** |
| <a id="evidence-g30"></a>G30: Enable GitHub Dependency Graph and make the dependency-review che… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G30`: not supplied | **BLOCKED** |
| <a id="evidence-g31"></a>G31: Enable GitHub Issues or nominate another tracker for the remainin… | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G31`: not supplied | **BLOCKED** |
| <a id="evidence-g32"></a>G32: Test direct routes and `/api/health` on the production host. | `@jeremytheva` | 29 July 2026 — `PRR-2026-07-29-G32`: not supplied | **BLOCKED** |

### Frozen-candidate decision record

The candidate is frozen by the Git commit created from this review; its full
SHA must be recorded in `PRR-2026-07-29-RC` after commit creation and must be the
SHA supplied to the connected staging workflow. A Git SHA cannot truthfully be
embedded in the content of the commit it identifies. No staging or production
deployment is authorised from this review because every register entry above
is blocked and the environment supplies no deployment credentials or remote
administration access.

**Decision: NO-GO.** Release management must create one public, non-sensitive
issue per unresolved item using the **Release blocker** issue form, then keep
private evidence in the access-controlled release record. Production promotion
is prohibited while any P0 or P1 issue remains open.

### Approval record

| Review | Required named approver | Evidence/date | Decision |
| --- | --- | --- | --- |
| Technical | Independent technical reviewer (not yet named) | Not supplied | **BLOCKED** |
| Privacy/legal | Qualified Australian privacy/legal reviewer (not yet named) | Not supplied | **BLOCKED** |
| Moderation | Moderation and safety owner (not yet named) | Not supplied | **BLOCKED** |
| Support | User support owner (not yet named) | Not supplied | **BLOCKED** |

Explicit approval means an individually named reviewer records approval,
date, scope, frozen SHA, findings and resolutions in the private record.
Silence, a role label, a workflow result, or this repository review is not
approval.

### Post-deployment evidence (not authorised)

If a later review closes every gate and authorises promotion, retain one
redacted smoke report tied to the deployed SHA covering direct SPA routes,
authentication, catalogue list/search/details, rating create/retry/recovery and
history, cellar CRUD, profile editing, `/api/health`, correlation-safe logging,
and every alert route. Record UTC start/end times, operator, reviewer, result
per check, production deployment identifier, monitoring links, observed data
reconciliation, and the explicit rollback decision.

The rollback decision window starts at promotion and remains open for at
least **60 minutes** after the last successful smoke check. During that window
the operator and incident owner must watch all six production indicators in
[the operations runbook](OPERATIONS_READINESS.md). Roll back immediately for an
owner-boundary failure, inconsistent rating data, incompatible API/schema,
failed critical journey, health/configuration regression, missing safe logs, or
an unrouteable P0/P1 alert. The authorised release manager may close the window
only after recording a `retain` decision and reviewer concurrence.
