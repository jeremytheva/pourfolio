# Admin permission foundation

Source foundation for #699, under the Admin Console plan #698 and moderation
contract #700. This module grants no reachable application access: there is no
Admin route, provider-role adapter, credential change or schema migration in
this slice. The existing authentication gateway now also allowlists each
supported POST action's fields. Signup forwards only name, email and password;
signin and OTP actions forward only their documented string fields. Privilege,
owner and arbitrary nested metadata fields are discarded for object, raw JSON
and Buffer bodies. Invalid bodies fail with a safe 400 before provider access.
Password/OTP contents are preserved as strings, and sign-out keeps its empty
cookie-based body. The console and mutable moderation remain unavailable until their
own provider, permission and application acceptance evidence exists.

## Server contract

`api/_lib/adminPolicy.js` provides `createAdminAuthorizer`. A future reviewed
server gateway constructs it with a certified `readRole` adapter. The default
session resolver is the existing `requireSessionUser`; session normalization
and ordinary-user authentication are unchanged.

The guard resolves a fresh immutable session ID on every request. It passes
only that ID and the cancellation signal to the server-owned role adapter.
The adapter returns exactly `{ userId, role }`, projected from an authoritative
provider source. The identity must equal the verified session ID. Only the
exact contract value `Admin` grants catalogue review, moderation, correction
and audit capabilities. Missing or malformed authority returns a safe 503;
ordinary/unknown role or unsupported capability returns 403; invalid session
returns 401. Neither a provider credential named admin, an email hint, a role
embedded in the session projection, nor a browser field grants permission.

An authenticated caller without an adapter receives 503. There is no fallback
provider query or environment allowlist. Adapter and upstream error details
are discarded. The immutable internal principal contains only user ID and the
four catalogue capabilities. It grants no account-role management, scoring,
private-rating or private-cellar access. A future browser capability response
must project the permitted capability names rather than return raw records.

## Required role-source evidence before wiring a gateway

The supplied historical SQL includes `ncba_user.role`, but the deployed
application contract does not yet certify a safe role lookup. #577 concerns
server credential certification, not an application's Admin role authority.

Before selecting/connecting an adapter, retain redacted evidence for:

1. The provider source, exact immutable-user-ID lookup, role value semantics
   and safe projection; no scan or email-based matching.
2. Ordinary signup/profile/direct-provider requests cannot elevate that role.
3. Admin and ordinary identities resolve independently on the exact candidate.
4. Demotion/revocation is visible on the next privileged request; the adapter
   itself must not conceal a stale provider role through an undocumented cache.
5. Missing/forged/expired sessions, missing/ambiguous role records and provider
   failure are denied without revealing records, secrets or credentials.
6. Appropriate request timeout/cancellation and the gateway's same-origin,
   method, size, rate-limit and safe-error controls remain enforced.

These connected rows are NOT_RUN in this source-only slice. Tests with injected
adapters prove the policy contract, not provider permissions or deployment.
Do not wire an adapter that merely trusts a user-editable auth/profile field.

## Continuation

Finish #699 by certifying the actual role source, connecting the contained
console entry and proving its gateway/UI access behavior. #701 separately
certifies moderation storage/concurrency/recovery before #702 mutable commands.
The accepted historical identity rules and existing launch NO-GO remain in
their current owning documents. This file explains this source module only;
it is not another schema, status or release authority.


## Bounded connected session-role observation

`scripts/admin-role-source-assessment.js` reuses the existing protected-owner
session helper and exact release-target verifier for the two configured normal
accounts. A tightly scoped transport observer inspects only their successful
same-origin get-session JSON. Each helper verifies immutable session identity
and account binding, then signs out; the observer cannot turn a role observation
into a permission grant. No business-data request, signup, role assignment or
provider credential is used.

The main-only `Read-only session role assessment` workflow runs after a reviewed
merge explicitly tagged `[assess-admin-role]`, or a manual main-branch dispatch.
It validates source/provenance before providing the existing staging-release
account credentials to the observation step. The target is the fixed production
origin and an exact deployed SHA. No credential is available to dependency
installation. Target readiness GETs may retry; login/mutation requests never do.

The only retained artifact is `artifacts/admin-role-source-assessment/summary.json`:
source/target SHAs, static role classes/source paths, distinct-identity verdict,
cleanup and test states. It contains no email, account ID, password, cookie, raw
role string or provider body. Missing/near-match/conflicting roles remain
unavailable or inconclusive. Failed identity verification/sign-out stops the
run; a configured-user-ID shortcut is deliberately unavailable to this runner.

`authorityCertified` is always false and provider role-write denial/revocation
remain NOT_RUN. A successful diagnostic job does not certify those boundaries,
assign Admin, enable the console or close #699/#701. Use its real observations
to choose the next dependency-correct role-source implementation/certification.
