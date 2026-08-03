# Publication and release evidence procedure

**Prepared:** 3 August 2026  
**Repository status:** implementation and review packet only; no external approval or remote configuration is claimed.

## Public document URLs

The release candidate serves unauthenticated, keyboard-accessible pages at
`/privacy`, `/terms`, `/moderation`, `/support` and `/retention`. Each page
currently says **RC draft 1**, **Not yet effective**, and **Pending independent
Australian privacy and legal review**. These labels are deliberate: deploying
a draft does not turn it into approved legal material.

Before G24 can close, a named publishing owner must replace all pending text,
confirm operator and contact details, assign an immutable version and effective
date, deploy the exact reviewed content, and retain a dated screenshot and HTTP
response for every URL against the frozen release SHA. Links must remain usable
without authentication and pass the connected WCAG 2.2 AA check.

## Australian privacy and legal review record

Store sensitive evidence in the access-controlled private release record. The
reviewer must be an individually named, appropriately qualified Australian
privacy/legal reviewer who is independent of the author. Record:

| Field | Required value | Current value |
| --- | --- | --- |
| Release candidate | Full Git SHA and immutable staging deployment ID | Not supplied |
| Reviewer | Name, role, organisation and basis of qualification | Not supplied |
| Review date | UTC date/time | Not supplied |
| Scope | Exact document versions/URLs, launch data flows, providers, overseas disclosures, account lifecycle, moderation and support process | Draft scope only; not reviewed |
| Findings | Numbered advice, severity and affected text/process | Not supplied |
| Resolutions | Change or documented risk decision for every finding, with owner and evidence | Not supplied |
| Approval | Explicit approve/reject decision for the exact SHA and versions | **BLOCKED** |
| Re-review trigger | At least annual; also law, provider/location, data use, audience, account lifecycle, incident or material product change | Proposed; not approved |

The review must address the Privacy Act 1988 (Cth) and Australian Privacy
Principles where applicable, operator identity and jurisdiction, collection
notices, consent and lawful handling, children/age positioning, overseas
disclosure, direct marketing, access/correction/complaints, notifiable data
breaches, consumer-law terms, liability wording, content rights, moderation,
retention and deletion. This checklist is not legal advice and is not itself a
legal review.

## Ownership and approvals for the frozen candidate

Role labels are insufficient. Release management must enter one person's name,
their accepted responsibility, a private contact-route reference, approval
time, and exact SHA in `PRR-<date>-RC-OWNERS`. Do not commit phone numbers,
personal addresses, on-call credentials or private channel URLs.

| Responsibility | Minimum authority | Named owner | Private escalation reference | Approval for exact SHA |
| --- | --- | --- | --- | --- |
| Privacy | Privacy requests, complaints, incidents and re-review | Not supplied | Not supplied | **BLOCKED** |
| Moderation | Triage, urgent harm escalation, decisions and appeals | Not supplied | Not supplied | **BLOCKED** |
| Support | Monitored intake, identity-safe account help and hand-off | Not supplied | Not supplied | **BLOCKED** |
| Technical/incident | Production operation, security and rollback decision | Not supplied | Not supplied | **BLOCKED** |
| Backup/restore | Backup verification, restore execution and reconciliation | Not supplied | Not supplied | **BLOCKED** |

Exercise each private route with a harmless test message. Retain sender,
receiver, UTC timestamps, acknowledgement time and outcome. A route is not
approved merely because it exists.

## Remote GitHub controls

An administrator must retain a settings export or screenshots tied to the
repository and UTC time for: default-branch pull-request protection; required,
up-to-date `Release gate`, `Browser and accessibility`, `Dependency review` and
CodeQL checks; dismissed stale approvals; disabled force-push/deletion; secret
scanning and push protection; Dependency Graph; and GitHub Issues (or the exact
authoritative alternative tracker URL and operating owner). The dependency
review workflow is already configured to fail on high-severity findings, but
only branch protection makes that result blocking.

This environment has no Git remote, GitHub CLI or administrator session, so it
cannot enable or verify any remote setting. G29–G31 remain open.

## Staging and production execution

Run the connected staging workflow with an immutable HTTPS deployment URL and
the full deployed SHA. It exercises authenticated launch journeys and axe tags
including `wcag22aa`. Preserve the workflow run URL and redacted Playwright
artefact, then have a reviewer confirm the deployed SHA and every result.

Production smoke checks are deliberately narrower and non-destructive. Test
direct requests to `/login`, `/privacy`, `/terms`, `/moderation`, `/support`,
`/retention`, and the authenticated SPA routes to confirm HTML fallback and
expected sign-in routing. Request `/api/health`, record its status and redacted
JSON, and interpret `checks.authenticationConfigured` and
`checks.dataConfigured` only as environment-configuration signals. They do
**not** prove provider availability, authentication success, data-path
read/write readiness or end-to-end service health.

For G22 and G32 record host, deployment ID, full SHA, UTC start/end, operator,
commands or workflow run, results, redacted artefact location, and independent
reviewer approval. Never point a write-capable connected test at production.

## Independent closure rule

G22 and G24–G32 may be checked in `LAUNCH_READINESS.md` only after a reviewer
who did not perform the work compares dated evidence with the exact frozen
candidate and records explicit approval. Any candidate change invalidates the
approval unless the reviewer documents why the evidence remains applicable.
