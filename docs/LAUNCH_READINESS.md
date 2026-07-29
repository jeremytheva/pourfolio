# Launch readiness

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

- [ ] The two server-only variables are present in isolated staging and absent
  from browser bundles, repository files, command transcripts and evidence.
- [ ] The canonical collections in
  [the schema mapping](nocodebackend/schema-mapping.md) are provisioned, and an
  inventory proves that no legacy `*_pf2025` alias is used.
- [ ] A production-equivalent, same-state schema export has been audited with
  `npm run audit:schema -- --schema <export-path>` and the retained JSON report
  says `PASS`.
- [ ] The schema evidence proves required non-null fields and uniqueness
  constraints, immutable ownership fields, rating idempotency fields and
  workflow-state permissions; an owner-scoped, controlled non-date update also
  proves that `ratings.date_rated` is unchanged.
- [ ] Redacted provider transcripts exercise the precise paths, filters and
  response envelopes consumed by `api/_lib/dataProvider.js`: list, filtered
  list, get, create, update, delete, not-found fallback, unique conflict,
  malformed response, timeout and upstream failure.
- [ ] For every launch collection exposed by
  `api/nocodebackend/[...path].js`, the permission matrix covers
  unauthenticated, owner, other-user and privileged negative cases. The
  privileged cases must demonstrate least privilege, not merely possession of
  a provider secret.
- [ ] Evidence is dated, redacted, tied to the environment and release commit,
  stored with the private release record, and approved by the independent
  reviewer before any corresponding P0 checkbox below is closed.

Partial completion does not permit this gate or a related P0 entry to be
closed. A rerun is required after any schema, permission, provider-contract or
release-candidate change.

- [ ] Configure `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE_URL` in staging and production.
- [ ] Verify the configured data base URL accepts the gateway’s collection paths, query filters and create/update/delete response shapes.
- [ ] Provision the canonical schema without `*_pf2025` aliases and make the rating schema preflight return `PASS`.
- [ ] Apply non-null and unique rating controls through an approved provider migration, with cleanup, compatibility and rollback evidence.
- [ ] Prove `date_rated` remains unchanged during controlled non-date updates.
- [ ] Prove unauthenticated, owner, other-user and privileged negative permission cases for every collection.
- [ ] Prove sequential and concurrent duplicate-rating retries return one persisted rating.
- [ ] Repeat the atomic-workflow capability probe with configured staging credentials and retain redacted evidence.
- [ ] Apply and prove the documented idempotency fields, constraints, state permissions and owner-safe reconciliation workflow, including forced partial writes and failed state updates.
- [ ] Obtain complete, same-state products/producers exports and make the historical import preflight return `PASS`; the current source set references absent products and producer ID `0`.
- [ ] Resolve the 69 unmatched historical bonus selections.
- [ ] Assign valid owners and confirmed IDs to all 399 historical cellar records.
- [ ] Run the historical import in non-production, rerun it to prove idempotency, and reconcile imported/rejected counts.
- [ ] Rotate any credential that may have matched the former published admin hint.

## External P1 gates

- [ ] Run browser end-to-end and WCAG 2.2 AA checks against the connected staging backend.
- [ ] Complete account recovery, email verification, data export and account deletion workflows.
- [ ] Publish reviewed privacy policy, terms, moderation procedure, support contact and retention schedule.
- [ ] Complete appropriate Australian privacy/legal review.
- [ ] Configure central monitoring, redacted correlation-ID logging, alert ownership and service-level thresholds.
- [ ] Complete backup, restore and deployment rollback rehearsals with evidence.
- [ ] Enable GitHub branch protection, required checks, secret scanning and push protection.
- [ ] Enable GitHub Dependency Graph and make the dependency-review check blocking.
- [ ] Enable GitHub Issues or nominate another tracker for the remaining gates.
- [ ] Test direct routes and `/api/health` on the production host.

## Launch sign-off

Public launch requires:

1. every P0/P1 box closed with dated evidence;
2. the release-gate and CodeQL checks green on the exact deployed commit;
3. exact import reconciliation;
4. permission-negative tests passing;
5. restore and rollback exercised;
6. named technical, privacy, moderation and support owners.
