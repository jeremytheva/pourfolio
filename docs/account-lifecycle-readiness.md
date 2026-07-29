# Account lifecycle readiness review

## Decision

Account recovery, explicit email verification, portable export and whole-account
deletion are **not implemented or approved for production**. This review defines
the acceptance contract and persistence model that must be approved before code
or provider configuration changes. It must not be used as evidence that the
external privacy, legal or production-equivalent gates have passed.

The current launch router exposes only authentication, beer catalogue, rating,
cellar and profile journeys. Deferred social, venue, event, administrator,
photo, analytics and non-beer modules must remain unreachable during this work.

## Current implementation review

| Area | Evidence | Finding | Required action |
| --- | --- | --- | --- |
| Authentication | The auth gateway allowlists sign-up, sign-in, OTP verification, Google sign-in, session lookup and sign-out. | OTP sign-in is not documented as verified-email status or password recovery. There is no recovery completion route. | Confirm the provider's recovery and verification contracts, then add narrowly allowlisted proxy actions and generic, rate-limited responses. |
| Profile | The profile page supports display-field editing and owner rating history. | There is no export, whole-account deletion or lifecycle status UI. | Add orchestration to the profile page only after the server workflows and policies below are approved. |
| Ratings | Owner deletion removes a rating and its loaded score/mapping children sequentially. | A child-delete failure can leave a partial result; there is no durable deletion job or retry status. | Replace whole-account use of this endpoint with a server-owned, idempotent deletion workflow. |
| Cellar | Owner CRUD is enforced in the gateway. | There is no account-wide export or deletion workflow. | Include every owner cellar row in the snapshot and deletion manifest. |
| Browser transport | Launch services use the same-origin data gateway. | No lifecycle service exists. | Add explicit lifecycle service functions; do not restore arbitrary browser collection authority. |
| Policy and evidence | Launch readiness lists privacy/legal work as an external gate. | No reviewed publication or production-equivalent exercise is evidenced in this repository. | Complete the evidence registers below without committing personal data or privileged transcripts. |

## Acceptance criteria

### Password and account recovery

1. An unauthenticated user can request recovery using an email address without
   the response, timing, status code or wording disclosing whether an account
   exists.
2. Recovery initiation and completion are same-origin, request-size limited and
   protected by both per-client and privacy-preserving per-account rate limits.
3. Recovery links/codes are single use, expire at a provider-reviewed interval,
   are bound to their intended account and purpose, and are never logged or
   persisted in browser storage.
4. The completion screen validates password policy, associates errors with the
   relevant fields, announces status, supports keyboard use and invalidates all
   existing sessions after success.
5. Invalid, used and expired recovery artefacts fail safely and offer a fresh
   request. Retrying a successful completion cannot change another account.
6. OAuth- or OTP-only accounts receive accurate provider-specific guidance and
   are not falsely told that a password was changed.
7. Automated tests cover an owner, another account's artefact, an expired
   artefact, repeated requests, provider failure, retry and session invalidation.

### Email verification

1. Sign-up clearly distinguishes account creation, verification pending and an
   authenticated verified session; OTP sign-in is not assumed to prove a
   durable `email_verified` attribute without provider evidence.
2. Verification artefacts are single use, purpose-bound and expiring. Resend is
   generic, throttled and does not reveal account existence.
3. Verification status comes from the server session/provider. The browser
   cannot submit or override it, and it is never stored in `localStorage`.
4. A verified session can use launch journeys. The approved product decision
   explicitly states which actions, if any, are available while verification is
   pending and the gateway enforces that decision.
5. Changing the identity email, if later supported, requires re-verification and
   cannot be performed through editable profile fields.
6. Tests cover pending, verified, other-user, expired, replayed, resend and
   provider-unavailable cases.

### Portable user-data export

1. A recently authenticated owner can request an export; unauthenticated,
   expired-session and other-user requests receive no private data.
2. The export is generated server-side from an owner-scoped, consistent logical
   snapshot of the profile, rating headers, rating scores, bonus mappings and
   cellar records. It includes a schema version, generation time, collection
   descriptions and stable relationship identifiers.
3. Catalogue records are included only as the minimum human-readable context
   needed to understand owner data. Provider internals, secrets, workflow keys,
   other users' data and internal moderation/security material are excluded.
4. The machine-readable format is UTF-8 JSON in a documented ZIP or JSON file;
   dates use ISO 8601, null is distinct from a missing field, and monetary units
   are documented. The file is usable without Pourfolio software.
5. Synchronous generation either returns the complete manifest or no artefact.
   An asynchronous design uses an opaque job identifier, short-lived authorised
   download, expiry and explicit job states. It never uses public object URLs.
6. Partial reads fail closed with a safe retryable error. Idempotent retry cannot
   duplicate or omit records silently, and the completed manifest contains
   per-type counts for reconciliation.
7. Export artefacts and temporary jobs follow the retention schedule. Download
   responses use `Cache-Control: no-store`, safe content disposition and
   content-type headers.
8. Tests cover owner, other-user, expired-session, empty account, complete
   account, partial provider failure, retry, malicious filenames/content and
   exact relationship/count reconciliation.

### Account deletion

1. A recently authenticated owner must enter the exact phrase `DELETE MY
   ACCOUNT` after being shown the scope, irreversibility, retention exceptions
   and export option. The destructive control is not the default focus and is
   inaccessible to another user.
2. The gateway derives identity exclusively from the session. The request does
   not accept a `user_id`, profile ID or list of records from the browser.
3. One idempotent server workflow enumerates and deletes only the owner's bonus
   mappings, rating scores, rating headers, cellar records and profile, in that
   dependency order, then requests deletion of the authentication identity.
   Catalogue definitions remain because they are not user-owned.
4. The workflow records a non-sensitive deletion job/receipt identifier and
   progress counts outside the user collections. It must not store exported
   record content. A repeated request resumes the same job safely.
5. The account is immediately disabled or sessions are revoked when deletion is
   accepted. If a later step fails, private data is not made reachable again;
   the owner receives a safe pending/retry response and support can resume the
   job without guessing ownership.
6. Success is returned only after every manifest count is reconciled to zero and
   the provider confirms identity deletion. A partial failure is never reported
   as completed. Backup expiry and legally required holds are described by the
   published policy rather than represented as active application rows.
7. Concurrent writes are prevented after acceptance, or included in a final
   owner-scoped sweep before completion. Foreign-key behaviour is verified in a
   production-equivalent provider instead of assuming cascade support.
8. Tests cover owner, other-user, expired-session, missing/wrong confirmation,
   each possible partial-failure boundary, retry after every boundary,
   concurrent/repeated requests, empty account and exact final absence across
   all five owner data groups and the auth identity.

## Deletion and retention model

### Proposed lifecycle

1. **Confirm:** require recent authentication and exact irreversible-action
   confirmation; offer export before proceeding.
2. **Fence:** create an idempotency key on the server, revoke sessions and prevent
   new owner writes.
3. **Discover:** owner-query each collection and freeze a manifest containing
   identifiers and counts, not record bodies.
4. **Delete children:** delete `bonus_attribute_rating_mapping` then
   `rating_scores`, re-reading with both `user_id` and parent relationship.
5. **Delete parents:** delete `ratings`, then `cellar`, then `profiles`.
6. **Delete identity:** invoke the reviewed authentication-provider operation.
7. **Verify:** repeat owner-scoped queries, reconcile every count to zero and
   verify that all sessions and identity access are invalid.
8. **Receipt:** retain only the minimal operational deletion receipt described
   in the approved retention schedule; do not retain former profile content.

The order is intentionally explicit because the repository has no verified
provider transaction or cascade-delete contract. Until the provider supplies a
transactional server workflow, the implementation must be resumable and expose
`pending`, `running`, `failed_retryable` and `complete` states. Compensation
must never recreate deleted personal data.

### Proposed retention schedule requiring review

| Data | Active retention | After deletion request | Rationale / approval needed |
| --- | --- | --- | --- |
| Profile, ratings, rating children and cellar | Until owner deletion or account closure. | Remove through the verified workflow without intentional application-level delay. | Core service data; confirm Australian Privacy Principle obligations and any lawful exceptions. |
| Authentication identity and sessions | While the account is active. | Revoke sessions immediately; delete identity after application data verification. | Prevent access and new writes during deletion. |
| Temporary export artefact/job | Only long enough for generation and download; proposed maximum 24 hours. | Delete on download expiry or account deletion, whichever occurs first. | Minimise duplicate personal-data exposure; legal/security review must approve duration. |
| Deletion receipt | Proposed 30 days, containing job ID, timestamps, state and aggregate counts only. | Automatically erase after 30 days unless a documented legal hold applies. | Operational retries and dispute handling; confirm minimum necessary fields and period. |
| Security/audit logs | Proposed 90 days, with no request bodies, record content, email address, token, cookie or raw user ID. | Retain only pseudonymous security events until normal expiry. | Incident detection; review re-identification and lawful-access controls. |
| Provider backups | Follow the approved backup schedule; proposed maximum 35 days. | Data becomes inaccessible to the application immediately and expires through backup rotation; restore procedures must reapply deletion manifests before service. | Verify provider deletion, backup isolation and restore suppression contract. |
| Legal hold | None by default. | Only a documented, authorised and narrowly scoped hold may override normal expiry. | Legal reviewer must define authority, notice, access and release procedure. |

These periods are proposals, not a published policy. Product and engineering
must not promise them until the reviewer register records approval and provider
configuration has been verified.

## Required architecture before implementation

- `src/pages/`: add recovery/verification route-level screens and an account
  lifecycle section in Profile. Do not add routes for deferred modules.
- `src/services/`: add focused authentication-lifecycle and account-lifecycle
  orchestration, including retry state mapping and export download handling.
- `src/lib/nocodeBackend.js`: retain only typed, explicit same-origin calls to
  the auth and application gateways; do not expose provider collection paths.
- `api/nocodebackend/auth/[...path].js`: allowlist only provider-confirmed
  recovery, verification, session revocation and identity-deletion operations.
- `api/nocodebackend/[...path].js`: enforce recent session, owner discovery,
  export projections, deletion fencing, idempotency and final reconciliation.
- Provider configuration: add a server-only deletion-job/receipt store and
  approved constraints/permissions only through a reviewed rollout and rollback
  plan. Update the canonical schema mapping before merging that change.

## Production-equivalent evidence exercise

The exact release candidate must be exercised against an isolated,
production-equivalent backend with two owner accounts and an expired session.
Seed one owner with a profile, at least two ratings, every applicable score,
bonus/no-bonus variants and two cellar records; seed the other owner with
distinct sentinels. Then:

1. Export the first owner and independently reconcile manifest counts,
   relationships, field projections and absence of the second owner's sentinels.
2. Force one provider failure at every deletion boundary and show that the job
   remains retryable, sessions remain fenced and no completed response is sent.
3. Retry each job, confirm exact absence across owner collections and identity,
   and confirm the second owner and shared catalogue are unchanged.
4. Attempt every operation with the second owner, an expired session and a
   modified job/record identifier; all must fail without disclosure.
5. Restore a production-equivalent backup and show that deletion manifests are
   replayed before application access, so erased data is not resurrected.
6. Retain dated, redacted request/status/count evidence tied to the environment,
   release commit, operator and independent reviewer. Do not commit cookies,
   tokens, emails, record bodies or personal data.

**Current result (29 July 2026): blocked.** This environment contains no
connected provider credentials, approved lifecycle schema, reviewed policy or
legal approval. No production-equivalent export/deletion claim has been made.

## Privacy, legal and operational approval record

Appropriate Australian privacy/legal review is an external human decision and
must not be invented or self-approved by engineering. Store the signed review
in the organisation's restricted governance system and record only this
non-sensitive index in the release record:

| Field | Required value | Current value |
| --- | --- | --- |
| Reviewer and qualification/organisation | Named authorised Australian privacy/legal reviewer. | **Not supplied** |
| Review date | ISO date of review. | **Not completed** |
| Scope | Policy versions, data map, providers, recovery, verification, export, deletion, backup, moderation and support procedure. | **Not reviewed** |
| Findings | Finding identifiers, severity, owner and resolution/evidence reference. | **Not supplied** |
| Approval | Explicit approved/rejected decision, conditions, expiry/re-review trigger and signature/evidence location. | **Not approved** |

Launch remains no-go until the reviewed privacy policy, terms,
moderation/escalation procedure, support contact and retention schedule are
published at stable, accessible URLs; their versions and effective dates match
the approved record; and the production-equivalent exercise demonstrates the
same behaviour.

