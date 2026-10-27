# Admin catalogue permission contract

The contained source policy under #699 and plan #698 now has one reviewed,
bounded caller: the read-only catalogue workspace. Mutable moderation, audit,
account-role management, scoring and private-rating/cellar access remain
unavailable. This document defines that boundary; `STATUS.md` and GitHub retain
actual execution/evidence state. No schema or provider-credential change occurs.

## Authentication input protection

The authentication gateway allowlists supported POST fields. Signup forwards
only name, email and password; signin/OTP actions forward their documented
string fields. Role, owner, permissions and arbitrary nested metadata are
discarded for object, raw JSON and Buffer bodies. Invalid structures fail with
a safe 400 before provider access. Password/OTP strings are preserved, and
sign-out keeps its empty cookie-based body. Profile updates retain their
existing display/privacy allowlist and cannot write role.

## Internal policy and read-only projection

`api/_lib/adminPolicy.js` provides `createAdminAuthorizer`. Without an injected
server role adapter it fails closed. A principal requires a fresh immutable
session identity and exactly `{ userId, role }`, with matching identity. Only
internal `Admin` can receive the four catalogue policy capabilities. Unknown
roles/capabilities return 403; missing/malformed authority returns safe 503;
invalid sessions return 401. Provider errors are redacted. No email allowlist,
profile/metadata fallback or service-credential label grants authority.

`requireSessionReviewContext` is the bounded read-only adapter: one normal,
fresh provider get-session response supplies both verified identity and the
same `payload.user.role`. Its record ID must match the immutable verified user.
The explicit provider spellings `Admin` and `admin` map to internal `Admin`;
no trimming or case-folding expands that allowlist. Other well-formed roles
are non-Admin; missing/invalid source is unavailable. Alternate session
envelopes and user metadata cannot substitute for this observed source.
Ordinary `requireSessionUser` still projects only id/email/name.

`GET /api/nocodebackend/profile/capabilities` uses this adapter and requests
only `catalogue.review`. The response has exactly version, subjectId,
capabilities, mode (`read_only`) and moderationAvailable (`false`). Ordinary
users receive an empty list; the response discloses no other account or raw
provider role. The profile gateway applies existing method/path, size, unsafe
origin, local rate-limit, safe error and no-store controls. It neither loads
nor creates a profile or any data collection. This endpoint accepts no writes.

The browser validates the complete envelope and exact current subject. No role
or permission is cached in browser storage. Identity changes discard late
responses; entering `/admin` rechecks access. The page only calls existing
authenticated product/producer catalogue APIs, including the canonical producer
list without a has-products filter. It adds no private data access. Search,
type and page are URL state; detail links preserve canonical IDs. No approval
state, pending total or success is invented. The existing ordinary Add Beer
entry keeps its current policy.

## Connected observation and boundaries

The initial protected run 40487355621 at main/runtime `132f620` independently
verified two normal sessions, distinct identities and cleanup. It observed
`user.role` with near-Admin/non-Admin classes. This established the source field,
not complete role semantics or provider write-denial/revocation certification.

The refined `scripts/admin-role-source-assessment.js` uses the existing bounded
login, immutable identity/email binding, exact release-target provenance and
sign-out helper. Its isolated environment cannot use a configured-user-ID
shortcut. After checking session/account binding, it GETs only that session's
own capabilities, validates the exact subject and compares the access verdict
with known role semantics. No catalogue/private data, signup, role write,
provider secret or business-data mutation is used.

The main-only workflow runs for a reviewed merge tagged `[assess-admin-role]`
or explicit main dispatch. It validates source and target before exposing
existing staging-release normal-account credentials to the observation step;
dependency installation receives none. The target is the fixed production
origin and exact SHA. Readiness may retry; login and sign-out never do.

Its sole artifact is `artifacts/admin-role-source-assessment/summary.json`:
source/target SHAs, static classifications/source paths, allowlisted exact
symbols (`Admin`, `admin`, `User`, `user`; otherwise null), distinct-identity,
cleanup and ALLOWED/DENIED/UNAVAILABLE verdicts. No emails, IDs, passwords,
cookies, arbitrary raw roles or provider bodies are retained. Unknown or
conflicting roles and unavailable capabilities are inconclusive; a valid
capability verdict contradicting known role semantics fails. Login/session or
cleanup failure stops the run.

`authorityCertified` is always false. A matching Admin/ordinary capability pair
qualifies only this read-only boundary. It cannot enable a mutable command,
change a role, certify permission inheritance or close all #699 acceptance.

## Required evidence before mutable moderation

Before connecting #702 commands or private audit access, retain:

1. Exact immutable-user-ID role source and provider role semantics, with no
   scans, email matching or user-editable fallback.
2. Ordinary signup/profile/direct-provider role-write denial.
3. Independent Admin/ordinary identities on the exact candidate.
4. Actual demotion/revocation visible on the next privileged request, without
   an undocumented provider or application cache.
5. Missing/forged/expired sessions, malformed/ambiguous authority and provider
   failures denied without leaking records or credentials.
6. Timeout/cancellation, same-origin/method/size/rate and error controls.
7. #701 moderation schema/permissions, provenance, atomic version checks,
   append-only audit and recovery qualification before writes.

Connected role-write denial and revocation remain NOT_RUN. Source tests prove
fresh application checks, not actual provider permissions/cache semantics.
The #696 stable-ID and immediately rateable pending-beer rules remain required.
Existing rating integrity, privacy and public-launch NO-GO gates are unchanged.
