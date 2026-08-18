# Production operations readiness

This runbook defines the operational release contract for Pourfolio. It does
not claim that settings in Vercel, GitHub or NoCodeBackend have been changed:
those controls require an authorised administrator and dated evidence in the
private release record. Production remains **no-go** until the evidence fields
below are complete and independently reviewed.

## Service objectives and alerts

The measurement boundary is the production Vercel deployment. Synthetic
requests must use the public host, while gateway measurements cover
`/api/nocodebackend/*` and `/api/nocodebackend/auth/*`. Exclude planned,
announced maintenance from the availability objective, but never remove real
incidents or provider outages from the measurements.

| Indicator | Calculation and objective | Page threshold | Ticket threshold |
| --- | --- | --- | --- |
| Availability | Successful production HTTP responses divided by all valid requests, measured over 30 days. Expected `4xx` responses other than `408`/`429` are excluded. Objective: **99.9%**. | Below 99% over 5 minutes with at least 20 requests, or two consecutive failed synthetic checks. | Below 99.9% over 1 hour or forecast 30-day error-budget exhaustion within 7 days. |
| Gateway latency | Vercel request duration for valid gateway requests. Objective: **p95 below 1,000 ms** and **p99 below 2,500 ms** over 30 days. | p95 above 2,000 ms for 10 minutes with at least 20 requests. | p95 above 1,000 ms for 30 minutes. |
| Authentication failures | Authentication proxy `5xx` plus shared-limiter `503`, divided by auth attempts. User mistakes (`400`/`401`/`403`) are not service failures; `429` is charted separately. Objective: **below 1%** over 30 days. | Above 5% for 5 minutes with at least 10 attempts, or any sustained limiter `503` for 5 minutes. | Above 1% for 30 minutes, or `429` above three times the trailing 7-day same-hour baseline for 15 minutes. |
| Provider failures | Gateway/auth requests ending in upstream timeout, malformed response, network error or provider `5xx`, divided by requests that call the provider. Objective: **below 0.5%** over 30 days. | Above 3% for 5 minutes with at least 10 provider calls. | Above 0.5% for 30 minutes. |
| Rating reconciliation | Rating submissions logged as `Rating reconciliation failed`, divided by rating submissions. Objective: **zero failures**; every accepted alert must reconcile to a terminal state. | **Any occurrence**, grouped only when the correlation ID and release are identical. | Not applicable; this is always page-worthy. |
| Unexpected authorisation denial | `403` responses for authenticated launch journeys that pass the synthetic owner fixture, or a production `403` reported by support and confirmed not to be an intended cross-owner/origin denial. Objective: **zero**. | Any synthetic-owner denial or three confirmed reports in 15 minutes. | One confirmed report, or production `403` volume above three times the trailing 7-day same-hour baseline for 15 minutes. |

Low-traffic thresholds deliberately combine rates with minimum counts. The
monitoring dashboard must show numerator, denominator, percentile window,
deployment/commit and region so a percentage cannot hide a single critical
failure or be distorted by an idle service. Review thresholds after 30 days of
representative production traffic; a change requires a dated rationale and the
technical owner's approval, not silent alert muting.

## Central monitoring and safe telemetry

Use Vercel deployment/function metrics and runtime logs as the source, then
send them to the organisation's approved central monitoring destination using
a Vercel log drain or supported integration. Configure one dashboard for the
six indicators above and separate production from preview/development data.
The dashboard and alerts must identify only environment, route template,
method, status class, duration, safe event name, deployment/commit, region and
correlation ID.

The gateway already returns `X-Request-Id` and includes the same value in safe
server-error logs. The central pipeline must preserve that value as
`correlation_id` without treating a caller-supplied value as trusted identity.
At ingestion, allowlist the fields above and drop all other HTTP and log fields.
In particular, do not ingest or index:

- `Authorization`, `Cookie`, `Set-Cookie` or any other credentials or tokens;
- request or response bodies, query-string values or raw provider responses;
- IP addresses, email addresses, account/user IDs or profile fields;
- product history, cellar contents, ratings, scores or bonus selections; or
- provider base URLs, provider collection payloads or environment-variable
  values.

Application failure events are emitted through `api/_lib/telemetry.js`, which
applies that same field allowlist before serialisation. Its sentinel test is a
repository-level control proving that representative credentials, cookies,
bodies, query values, IP and email addresses, user identifiers, private
records, provider URLs and provider responses cannot enter an application
event. This control does **not** prove the separately administered log drain is
safe: the operator must inject different sentinel values through the connected
production-scoped pipeline and export the resulting central query showing
each is absent. `X-Request-Id` is cleaned of control characters and length
bounded, but remains caller-controlled correlation metadata, never identity or
authorisation evidence.

Retain operational metadata for 30 days unless the approved privacy/retention
review sets a shorter period. Restrict dashboard, alert and log access to the
production support group, audit access, and test redaction with sentinel
credentials and private fixture values before enabling the drain. Evidence
must include screenshots or exported configuration, a redaction test, one
dashboard query per indicator and the exact release commit; redact tenant IDs
and webhook addresses before placing evidence outside the private record.

### Monitoring evidence

For the shared authentication limiter, add dedicated panels for `429` count
and rate by route template, `503` count and rate by safe failure category, auth
attempt denominator and request latency. Page on any sustained limiter `503`
for 5 minutes; ticket when auth failures exceed 1% for 30 minutes; and ticket
when limiter `429` exceeds three times the trailing seven-day same-hour
baseline for 15 minutes. Keep the existing minimum-attempt requirements where
the authentication-failure rate is used. The connected procedure and safe
evidence contract are defined in
[Shared authentication limiter staging certification](RATE_LIMIT_STAGING_CERTIFICATION.md).

| Item | Required private evidence | Status on 29 July 2026 |
| --- | --- | --- |
| Deployment and gateway dashboard | Dashboard identifier, production scope, six queries, retention and access-control capture | **Blocked:** no monitoring-administrator access or destination was supplied. |
| Correlation/redaction | One request traced from response header to central event; sentinel secrets, cookies, body and private data proved absent | **Blocked:** central pipeline is unavailable in this environment. |
| Alert rules | Export/capture of each threshold tied to the exact query and production environment | **Blocked:** no alerting system access was supplied. |

## Alert ownership and route exercise

Every row needs two individually named people and a non-public contact route.
An account, role, team name or `TBD` is not a named backup. The repository only
evidences `@jeremytheva`; it does not identify another authorised person, so it
would be unsafe to invent assignments or claim route tests.

| Alert | Primary | Backup | Last exercise and evidence | Current status |
| --- | --- | --- | --- | --- |
| Availability and latency | `@jeremytheva` | **Unassigned** | Not exercised | **Blocking** |
| Authentication failures | `@jeremytheva` | **Unassigned** | Not exercised | **Blocking** |
| Provider failures | `@jeremytheva` | **Unassigned** | Not exercised | **Blocking** |
| Rating reconciliation failures | `@jeremytheva` | **Unassigned** | Not exercised | **Blocking** |
| Unexpected authorisation denials | `@jeremytheva` | **Unassigned** | Not exercised | **Blocking** |

An authorised operator must trigger each route using the alert platform's test
facility or a production-safe synthetic signal, acknowledge as primary, repeat
with the primary unavailable, acknowledge as backup, and record delivery and
acknowledgement timestamps. Never cause a real provider write failure, weaken
authorisation or send credentials/private data to prove paging. Repeat after
route or owner changes and at least quarterly.

## Health endpoint decision

`GET /api/health` remains an **unauthenticated, configuration-only liveness
signal** for launch. A `200` response means only that the function can execute;
the two Boolean checks separately report whether the required server variables
are present. Those checks do not validate either value, contact NoCodeBackend,
inspect data, or establish that login, catalogue or writes are ready. The
response is sent with `Cache-Control: no-store`. Callers must not interpret it
as readiness or use its status alone to admit production traffic.

A provider-backed readiness probe is deferred because an unauthenticated probe
would disclose provider availability and could consume provider/rate-limit
capacity, while authenticating an external monitor adds a credential that must
be rotated and protected. Add a separate endpoint only with a reviewed design
that uses monitor authentication, least-privilege read-only provider access,
strict throttling and a generic `ready`/`unavailable` response. It must not
return secret presence, credential validity, provider identity/URL, collection
names, response bodies, counts, latency detail or private data. Liveness must
remain independent so a provider outage does not cause the platform to recycle
otherwise healthy functions.

## Backup and isolated restore rehearsal

The authorised data operator must use provider-supported, encrypted export or
snapshot facilities. Never commit an export or attach it to a public issue.

1. Freeze the rehearsal scope and record UTC time, environment, release commit,
   operator, independent reviewer, provider backup identifier and encrypted
   evidence location.
2. Back up every canonical collection in the schema mapping from the same
   production-equivalent state. Record provider checksums when available;
   otherwise calculate encrypted-file SHA-256 checksums inside the controlled
   environment.
3. Create an access-isolated, non-production destination with outbound
   notifications/integrations disabled. Restore in provider-approved dependency
   order without changing production.
4. Compare per-collection counts and stable content hashes. Reconcile at least
   one catalogue product and producer, one complete rating with all score and
   bonus children, and one same-owner cellar link. Include a rating without a
   bonus and confirm no orphaned or cross-owner child exists.
5. Run owner/other-user negative reads in the isolated environment. Destroy the
   restore after review according to the approved retention policy.

Abort and investigate on any checksum mismatch, count mismatch, orphan,
ownership mismatch, missing relationship or unexpected notification. Retain a
dated, redacted report with exact queries/tool versions and reviewer approval.

**Current result (29 July 2026): blocked.** No provider access, snapshot,
production-equivalent export, isolated destination or reviewer evidence was
provided, so no backup or restore is claimed.

## Deployment rollback rehearsal

Use Vercel's immutable deployment promotion/rollback mechanism; do not rebuild
the previous commit with newer unlocked tooling. Before rehearsal, name the
current candidate and immediately previous known-good commit/deployment, check
that no incompatible persistent-data change is involved, and back up data.

1. Run the connected release checks against the candidate and capture results.
2. Promote the previous known-good deployment in isolated staging (preferred)
   or an approved production window, recording operator, reviewer and UTC
   timestamps.
3. Verify direct SPA routes, `/api/health`, sign-in/session handling, catalogue
   list/search/details, owner rating history/submission/retry, cellar CRUD and
   profile editing. Exercise safe invalid, unauthenticated and other-owner
   cases. Confirm the rolled-back client understands current API response
   shapes and the current gateway accepts its request shapes.
4. Check all six indicators and correlation-ID tracing, then re-promote the
   release candidate and repeat smoke checks.

Abort if rollback requires a destructive schema/data reversal, if any owner
boundary fails, or if the old client/API contract is incompatible. In that
case, keep production at the known-safe deployment and follow the incident
procedure; never patch production data ad hoc.

**Current result (29 July 2026): blocked.** This environment has no Vercel
project access, connected production-equivalent backend, named previous
known-good deployment or private evidence destination. No rollback or
compatibility result is claimed.

## Release ownership and sign-off

Sign-off requires individually named people; role labels are insufficient. A
person may hold more than one role only when the release manager records why
that does not undermine privacy or moderation independence.

| Responsibility | Named owner | Approval date/evidence | Status |
| --- | --- | --- | --- |
| Technical operations and incident command | `@jeremytheva` | Not supplied | Incomplete |
| Privacy and data-subject escalation | **Unassigned** | Not supplied | **Blocking** |
| Moderation and safety escalation | **Unassigned** | Not supplied | **Blocking** |
| User support and incident intake | **Unassigned** | Not supplied | **Blocking** |

The release manager must replace every unassigned entry, confirm acceptance
with each person, add primary/backup contact routes to the private release
record, and record dated approval on the exact commit. Contact details and
private escalation routes do not belong in this public repository.