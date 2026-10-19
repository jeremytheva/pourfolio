# Rating workflow staging certification

## Custom bonus point-value persistence verification (PR #651)

Creating a private Overall bonus attribute must not return success on the
strength of a NoCodeBackend create ID alone. The server reads the saved
`bonus_attributes` row back, verifies the persisted ID, owner, description
and numeric `point_value`, then creates and reads back the
`bonus_attribute_category_mapping` row. The mapping must persist the
requesting user, Overall category ID and newly created attribute ID before
the route acknowledges HTTP 201. Either unverified write fails closed.

Compensation can delete the newly created attribute only after its owner is
verified **and before any mapping write has been attempted**. Once the mapping
write starts, a timeout, ambiguous create result, incorrect mapping readback
or unavailable read may conceal a committed relationship. In that situation
the route must not blindly delete either record. The potential partial pair
must be investigated and cleaned up with a guarded, account-verified
provider recovery procedure. An unverified ID or read failure must
**never** trigger deletion of a possibly unrelated account's record.

The historical export contains 82 bonus attributes, of which 81 have null/
blank `point_value`; the single explicit value is `0.50`. The existing
legacy `0.2` display/scoring fallback remains intentional for absent stored
values. This change does **not** invent historical point allocations or
backfill provider records. Current production data must be re-read before
any proposed corrective migration.

The existing **read-only** connected mapping audit now also reports a
redacted inventory of actual provider `point_value` fields: global/private
row counts, explicit/missing/invalid values and aggregate point-value counts
for global attributes only. It does not log descriptions, individual IDs or
account identifiers, backfill missing values or treat the legacy fallback as
provider-persisted data. `LEGACY_FALLBACK_PRESENT` is evidence of missing
stored values, not an automatic mapping failure or authorisation to guess
their intended points. A `REVIEW_REQUIRED` inventory needs investigation of
invalid/out-of-range values before release.

### Read-only existing private mapping capability preflight

The connected bonus audit now inspects the existing private Overall
attribute/category mapping when one is already present. It performs
strict `GET` readback of the stored attribute and category mapping
against their paginated inventory, checking persisted identity, owner,
description, numeric point value and mapping foreign keys. Its output is
a status only, without IDs, account identifiers or private point values.

`EXISTING_PRIVATE_PAIR_READBACK_OK` is evidence that **existing**
provider records can be read consistently by ID. If no suitable private
pair exists, `INCONCLUSIVE_NO_PRIVATE_OVERALL_PAIR` must not be
misrepresented as PASS. `READBACK_MISMATCH` or
`READBACK_UNAVAILABLE` blocks certification and requires investigation.
The audit disables provider mutations and makes no fixtures. Even a
successful read-only preflight **does not** certify private create,
concurrent duplicate handling, second-account authorization, rating use,
mapping cleanup or backup/restore.

Connected certification still requires a disposable owner-created attribute
with a non-default value (for example `0.7`), server attribute
write/readback, exact persisted category mapping readback, rating use,
reload, exact provider query, denial from a second account, and verified
cleanup. A passing source test or preview
cannot substitute for these provider rows. Any failed readback requiring
manual cleanup must be reconciled before marking a write run complete.




## Connected rating test driver and cleanup identity

The cleanup-guarded release test uses the same seven-card rating journey as
the current application. Design, Burp and zero-weight manual dimensions are
explicitly skipped; required dimensions receive 4/7, with each next heading
awaited. Burp is a 0–1 optional extra, so the old universal `1 out of 7`
selector could not finish the live form. The final heading is **All bonus
attributes**, not **Bonus attributes**. The shared driver selects one existing
bonus descriptor at its stored value and reaches review without creating a
custom attribute or submitting implicitly. Browser regressions exercise the
real renderer at default and personalised zero-weight settings.

Before submission, the test requires a successful owner-history baseline.
It captures the canonical rating ID directly from an HTTP 201 save response,
requires the expected product, `duplicate: false`, a canonical ID and an ID
absent from that baseline, then retains it before navigation/history checks.
A subsequent assertion failure still invokes exact-ID cleanup. Concurrent
new history entries are never inferred to be this test's deletion targets.
A replay, pre-existing ID, wrong product, malformed or unconfirmed response
must not authorise guessed cleanup.

The guarded check now requires HTTP 204 for deletion and repeated deletion,
then a fresh successful owner-history read excluding the exact test ID.
It preserves both verification and cleanup errors if both occur. These checks
do not independently inspect provider parent/child rows or certify atomicity.
A failed/lost save response may have committed an unidentified partial record;
that case remains **cleanup UNCONFIRMED**, fails the test and must be inspected
under the existing provider-safe recovery protocol. No automatic submit retry
or broad history-difference deletion is allowed.

The explicit `RUN CLEANUP-GUARDED RELEASE WRITES` gate remains unchanged.
Source and mocked-browser acceptance of this driver are not a connected
write certificate. The bonus-create cleanup/isolation boundary under #651,
terminal provider deletion under #165 and historical contradictory row remain
open. Do not create another production bonus fixture to bypass these gates.

## Full rating journey QA — 19 October 2026

The controlled browser journey used one explicitly disposable tasting of an
existing beer, with optional Design/Burp skipped, all five required manual
scores set to 4/7, and six bonus selections worth 2.00 points in total.
The review and freshly loaded stored breakdown agreed: Bonus 2/2 and
weighted/standard score 3.07/5. A 1.80-point selection produced Bonus 1/2;
reselecting the removed 0.2 attribute restored Bonus 2/2.

The new tasting was removed through its exact owner-history row at about
09:08 UTC (20:08 Sydney). Fresh product reads restored the baseline of
4 community ratings (3.96/5) and 2 personal ratings (3.94/5), with both
older personal tastings preserved. A fresh producer profile restored
16 community and 8 personal completions, with 9 catalogue beers. Revisiting
the deleted tasting's exact profile link showed the safe unavailable message.
These are **passing browser observations for this disposable tasting**, not
independently captured HTTP 204, direct provider terminal-parent/child absence,
repeat-delete, concurrency or second-account isolation certification. The
separate contradictory historical deletion finding below remains unresolved.

| Requested step | Observed result |
| --- | --- |
| Search for existing or missing beer | Existing beer resolves; unique QA search returns no matches and prefills the missing-beer form. |
| Add beer and link an existing/new producer | Name/style/ABV/IBU, producer search/new-producer choice, duplicate check and final review work. Final creation NOT_RUN: catalogue fixture cleanup is unavailable. |
| Edit beer | Correct identity and proposed IBU diff reach review; moderation submission is intentionally disabled. Persistence BLOCKED. |
| Edit/delete producer; delete beer | No governed application controls/routes exist; NOT_RUN. No catalogue records were created or deleted. |
| Create bonus attribute | A private QA attribute persisted with description and 0.7 points. The immediate response rendered a blank 0.2 option; a fresh form correctly rendered the stored description and 0.7. PR #651 addresses this response/readback defect. |
| Stored bonus values and thresholds | Existing global 0.5 and private QA 0.7 render correctly on reload; mixed values total correctly and cross the 2-point threshold. The 81 missing global values remain a separate data-source gap. |
| Rate, review, save and view breakdown | PASS for this controlled tasting, five manual scores, derived Bonus and all six selected descriptors. |
| Exact profile link and delete | PASS for selected row, UI removal, fresh aggregate restoration and safe unavailable link; provider terminal/child proof remains pending. |
| Producer totals after cleanup | PASS: original community/personal counts restored. |
| Community attribute averages | FAIL on the original source: saved 4/7 scores were visible in the individual breakdown but absent from attribute averages. The unpaged score read is replaced with the existing paged/batched catalogue convention. |

The single private QA bonus attribute remains because the application has no
owner-scoped bonus deletion control. No additional bonus fixtures were created.
Do not treat the retained QA attribute or missing catalogue cleanup as a fully
completed teardown. Do not invent the missing global point values from the
0.2 fallback or migrate historical/provider records as part of this QA.

The product-attribute source repair must read every score page, scope each
75-ID batch locally, preserve completed/tombstone filtering and fail on an
unavailable later page instead of publishing a partial average. Three new
regressions failed on the original source and pass after correction; a fourth
preserves incomplete/tombstone exclusion. The focused 10-test Node 24 run is
diagnostic only. PR #660 final head `f8c08446795c8974ad84db053a32d470cac63013`
passed canonical Node 22 acceptance (820 passed, 15 gated skips, zero failures),
all 149 browser/accessibility cases, Dependency Review and CodeQL in run
39228933739. The merge `f48d95090e0271557b43ee3035f01aecd05c243f` is deployed;
HTTP 200 health matched it, and a fresh authenticated product read included
Appearance/Aroma from three scores and Mouthfeel/Flavour/Follow from four,
preserving the 4-community/2-personal totals and older tastings. This verifies
the existing provider paged-read integration; it does not close independent
terminal-write, child-absence, second-account or legacy recovery gates.

## Step-by-step acceptance and certification guide

Use the GitHub browser workflow; a local clone is not required. The historical
attempt below is retained as a failed/blocked attempt, not current completion
evidence. Latest results and remaining boundaries belong in `STATUS.md` and
the linked pull requests.

### Exact connected terminal-delete evidence — 19 October 2026

The isolated **read-only** [rating audit run 39196833869](https://github.com/jeremytheva/pourfolio/actions/runs/39196833869)
examined 627 provider ratings and reported one parent with contradictory
`complete` plus nonempty `deleted_at` state. The global child census
found **one surviving `rating_scores` row, zero rating-bonus mappings
for that parent, no mismatched child owners and no child owner missing**.
A source unit test or the frontend hiding the rating cannot clear that
finding: the parent and score remain inconsistent after the partial delete.

The audit returned `REVIEW_REQUIRED` / exit 2 by design, and did not
write to the provider. Terminal delete is therefore still a **FAIL**
for live-data integrity. Any governed repair must verify the actual
owner and exact parent/score relationship, retain a recoverable snapshot,
verify provider conditional update/cleanup semantics, document rollback
and obtain the necessary approval before touching either record. Do not
guess which row should be recreated or deleted from aggregate counts.

### Read-only contradictory deletion child census (PR #655)

A `complete` rating with a nonempty `deleted_at` is excluded from
personal history and community scoring but is **not** a verified terminal
deletion. The connected rating audit now scans the full paginated score
inventory and existing rating-bonus mapping inventory, then reports only
aggregate counts of contradictory parents, any surviving score/bonus
children, absent children, mismatched ownership and missing child owners.
It outputs no rating IDs, user IDs or individual score values.

An empty child census is insufficient to declare delete success; the
parent still needs a correctly verified terminal lifecycle transition.
Any surviving children or ownership conflicts require investigation.
The audit runs with provider writes disabled, records `REVIEW_REQUIRED`
until the contradiction is resolved, and does **not** perform deletion,
repair, schema migration or backfill. Governed recovery still requires
an account-verified read of affected records, documented snapshot/restore,
rollback/cleanup and appropriate approval before any mutation.

### 19 October 2026 terminal-delete investigation

A fresh production delete failed at 01:20:27 UTC (12:20:27 Sydney) on
`2c8d88e8f8d466e8adc26c1a44d5a9814ca18033`, with correlation
`46d8017c-43a3-4305-bcec-838725f0f43a`, a 4xx status class and controlled stage
`mark_rating_deleted`. This narrows the break to the final managed-parent
update, after child-removal verification. It does not independently establish
the current provider row state or a specific field-level rejection reason.
The user's frontend submission succeeded; that observation is not a complete
connected create/retry certification.

The final update used an ISO timestamp (`T`, milliseconds and `Z`) while rating
creation already used the shared UTC provider format `YYYY-MM-DD HH:mm:ss`.
Deletion now reuses that existing formatter. This is a source correction for a
concrete wire-format inconsistency and the leading explanation for the observed
rejection, not proof that the live provider accepted the repaired request.
Regression coverage requires the provider timestamp format, preserves the
original tasting date in the write payload, and verifies resume/repeated-delete
behaviour after the terminal write fails. Mocked checks do not certify a live
provider trigger's timestamp behaviour or replace #165's immutable-date gate.

Keep the observed delete **FAIL** until a fresh controlled retest on the repaired
SHA returns 204 and verifies the terminal tombstone, absence of score/bonus
children, stable repeated deletion and owner isolation. A rating disappearing
from history can result from the earlier `deleting` transition and does not prove
terminal deletion. Use the existing isolated-fixture and cleanup protocol below;
do not recreate or backfill the affected user's removed children.

### Retained 8 October repair and general acceptance protocol

The 8 October failed-delete/author-link/breakdown repair is deployed through
PR #631. Source validation and 140 mocked browser/accessibility cases pass;
connected production run `37753349432` passed 12 baseline cases but skipped the
two private-history fixture cases and two guarded write cases. These skips do
not certify deletion or cross-account access. Retest through the current public
app at `https://brew-buds-mobile-app-design-3577.vercel.app`, checking its exact
health SHA. The immutable `...5pcf74oat...` URL in the failure screenshots keeps
the older code and cannot show the deployed repair.

1. **Select the deployment and fixtures.** Record its HTTPS URL, full commit SHA
   and backend environment. Confirm `/api/health` reports that exact SHA. For
   read-only profile checks, use two distinct supported test accounts, A and B,
   and an existing completed rating owned by A. Prefer an older page and two
   tastings of the same beer with different dates/scores. Record a private
   baseline of A's count, average, dates and canonical rating IDs. More than
   20 completed ratings is needed to certify the older-page case; if the fixture
   is absent, record that case as pending rather than pass.
2. **Check the automated source gate.** In the candidate PR's Checks tab, verify
   the canonical `npm run platform:validate` gate and browser/accessibility
   suite passed for its latest SHA. Dependency/security checks must have no
   unresolved material findings. Mocked tests prove source/browser behaviour;
   they do not certify the live provider or the separate #165/#503 gateway
   changes.
3. **Repeat normal profile loading.** Sign in as A, open Profile and wait for
   My ratings. Compare the dates, scores and total with the baseline. Reload
   three times, leave and return, and sign out/sign in once. Check a genuinely
   empty test account separately. Pass when history loads consistently and an
   unavailable request is never presented as No ratings yet. If known historical
   entries are absent, verify their stored owner/lifecycle against A's actual
   session identity; do not treat uploaded historical exports as live ownership
   proof or run an unapproved backfill. Avoid repeatedly
   signing in merely to refresh pages; the live sign-in budget is ten attempts
   per account/IP over 15 minutes.
4. **Follow exact beer-to-profile links.** Open the beer's Your tasting history
   section and activate one personal score's View in profile link. Verify the
   URL selects its canonical `ratings.id`, the correct history page opens,
   and the matching date/score row is highlighted and focused. Repeat for a
   second tasting of the same beer and an older-page rating. Reload and use
   browser Back/Forward. Pass when every link selects its own tasting, not an
   arbitrary rating of that beer.
   In Shared tasting history, select another user's opted-in tasting. Verify it
   opens `/users/<that author's opaque public_id>?rating=<canonical id>`, focuses
   the correct date/score and survives reload, including an older public-history
   page. It must never open the viewer's private profile. With sharing revoked,
   the copied exact link and breakdown must return the safe unavailable result.
5. **Check pagination and stable totals.** Use Next and Previous. Check at most
   20 entries per page, no missing/duplicate entries across pages, and the
   baseline count and whole-history average remain unchanged between pages.
   Exercise fast navigation and an intentionally delayed response in the
   browser regression suite; a late response must not replace the newer page
   or the next account's data.
6. **Check failure and recovery.** Run the connected profile-history check,
   which injects one client-side 503, then retries against the actual provider.
   Expect a focused error and an operable Retry rating history button; Retry
   must recover the same selected entry, and three subsequent reloads must
   succeed. The server regressions must also show that failed/slow optional
   product, producer, category, score-population or cellar enrichment leaves
   owner history visible with safe fallbacks; a mandatory owner-history read
   failure must remain an error. A selected missing/deleted/invalid ID must
   offer a safe recovery to all my ratings.
7. **Check account isolation and sessions.** In a separate browser context,
   sign in as B and open A's copied `/profile?rating=<id>` URL. Expect the safe
   unavailable-rating message and no A entry. Its authenticated history API
   selector must return 404 with `rating_not_found` and no items. Sign out or
   expire the session and revisit the private URL: require authentication and
   show no stale A data. If B's credentials are unavailable, record the case
   as pending, not passed.
8. **Check keyboard and mobile acceptance.** At desktop and mobile widths,
   operate the score link, page controls and Retry with a keyboard. Verify
   visible focus, correct focus after navigation/recovery, understandable
   screen-reader names/statuses, readable layout at 200% zoom, and no clipped
   controls. Retain manual pass/fail evidence alongside automated axe results.
   Expand View rating breakdown on personal and shared entries. Verify recorded
   Appearance/Aroma/Mouthfeel/Flavour/Follow, Bonus and optional Design/Burp values
   match stored rows, including zero Bonus/Burp values and selected attribute
   descriptions. Check collapsed initial state, lazy loading, keyboard operation,
   collapse/reopen and focused Retry after one failed details request. Missing
   historical components must be labelled unavailable without invented values or
   a changed stored total. Public details must not expose child/account identifiers
   or private cellar prices.
9. **Establish the controlled-write boundary.** Before create/retry/delete
   certification, use an immutable staging deployment connected to a verified
   isolated backend and disposable A/B/product/attribute fixtures. Confirm the
   deployed candidate actually contains the gateway repair. Complete #165's
   required schema/capability/uniqueness/compare-and-set and backup/restore
   evidence and applicable approval package; preserve immutable `date_rated`.
   A Preview URL alone does not prove backend isolation. Do not use this test
   guide to approve a provider migration or enable historical reconciliation.
   Leave the Connected staging release check's destructive confirmation empty
   for read-only runs. Only after this boundary is established may the operator
   use its exact `RUN CLEANUP-GUARDED RELEASE WRITES` opt-in. The generic
   browser write cases alone do not cover every gateway failure/race below.
10. **Certify create and identical retries.** Reject an incomplete/out-of-range
    form without creating a completed rating. Submit valid boundary scores 1
    and 7 in separate disposable cases, verifying server-calculated totals.
    Re-send the same submission sequentially, concurrently and with reordered
    equivalent attributes. Expect one owner rating header, exactly the elected
    score/bonus rows and final state `complete`; retries return the same rating
    ID. Reusing its submission identity with different content must conflict
    without changing the original. Verify profile/beer presentation after
    reload. Then execute every provider-supported failure injection in the
    Required rerun protocol below: partial writes remain invisible, identical
    retries converge, and a stale failure cannot demote a concurrent completion.
11. **Certify owner deletion and write isolation.** Cancel the delete
    confirmation and verify no change. Confirm deletion of a disposable rating,
    then repeat/overlap the delete and inject a child-delete failure followed
    by a retry. Expect resumable, idempotent deletion, no active rating or child
    rows, and only the contract-permitted deletion tombstone. Profile totals
    must refresh; deleting the selected last item on an older page must recover
    to a valid page with usable focus. Its old exact link must become safely
    unavailable, and replaying the old submission must not recreate children.
    As B, attempt read/delete/update and owner-ID injection against A's fixture;
    expect safe denial and unchanged owner/provider state. Exercise a
    create/complete-versus-delete race: completion must not resurrect a
    deleting/deleted rating.
12. **Reconcile evidence and cleanup before feature work.** Record expected and
    actual outcomes for every case, deployment SHA/URL, backend certification
    reference, run URL, request-correlation references and cleanup counts.
    Verify no active test ratings, scores, mappings or cellar records remain;
    retain permitted tombstones explicitly rather than reporting them as lost
    cleanup. Restore any changed disposable profile. Keep evidence redacted.
    Mark skipped/unrun or unsupported fault scenarios as pending. Do not call
    #165/#503 certified or expand dependent features until their required
    create, retry, delete and cross-account rows pass.

To run connected read-only checks through GitHub: open **Actions → Connected
staging release check → Run workflow**, choose the candidate branch, supply its
immutable HTTPS deployment URL and full SHA, and leave destructive confirmation
blank. The protected `staging-release` environment supplies the dedicated
account credentials. Review the job's individual test results and retained
report; a green workflow with skipped required cases is not complete
certification. The owner-only `/release-certify` command on issue #278 is the
existing automation for the current public-production read-only target; it does
not enable cleanup-guarded rating/cellar writes.

## Attempt: 29 July 2026

**Result: BLOCKED — not launch evidence.** This checkout had no configured
`NOCODEBACKEND_DATA_BASE_URL`, `NOCODEBACKEND_SECRET_KEY`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`RATE_LIMIT_KEY_SECRET`, staging application origin or disposable-user
credentials. No remote request was made, no staging record was created, and
there was therefore nothing to clean up. The deployed commit could not be
established because this checkout has no configured Git remote or deployment
metadata; the local pre-change commit was `b51abff`.

Do not interpret the local regression results below as provider certification.
The launch owner must repeat the complete run against the production-equivalent
deployment and retain its redacted transcript in the private launch record.

| Required evidence | Expected | Actual on 29 July | Status |
| --- | --- | --- | --- |
| Deployed commit | Full immutable deployment SHA | Unavailable | Blocked |
| Disposable owner and other user | Two staging-only accounts | Unavailable | Blocked |
| Staging product | One cleanup-safe product ID | Unavailable | Blocked |
| Sequential identical submissions | 1 rating, 2 scores, 1 optional bonus, `complete` | Not run | Blocked |
| Concurrent identical submissions | 1 rating, 2 scores, 1 optional bonus, `complete` | Not run | Blocked |
| Post-parent failure | No success; retry converges to exact counts | Locally simulated only | Not certified |
| Post-score failure | No success; retry converges to exact counts | Locally simulated only | Not certified |
| Post-bonus failure | No success; retry converges to exact counts | Locally simulated only | Not certified |
| Verification re-read failure | No success; retry converges to exact counts | Locally simulated only | Not certified |
| Workflow-state update failure | No success; retry converges to `complete` | Locally simulated only | Not certified |
| Other-user workflow access | No read or mutation | Not run | Blocked |
| Atomic commit and abort probe | Both semantics conclusively demonstrated | No provider capability available | Not adopted |
| Cleanup | 0 test ratings, scores and mappings remain; users/product removed if created for the run | Nothing created | Not applicable |

Local request correlation IDs were fixed test labels rather than production
identifiers and are not launch evidence. Remote evidence must record redacted
request IDs for every baseline, injected-failure, retry, access-control, probe
and cleanup request.

## Required rerun protocol

1. Record the full deployed commit from the staging deployment metadata before
   testing and confirm it matches the intended release candidate.
2. Create two disposable staging users and a cleanup-safe product. Record only
   opaque aliases in evidence; do not record cookies, tokens, email addresses or
   the provider secret.
3. Submit the same payload through the deployed rating service sequentially,
   then concurrently, using a new submission ID for each set. Owner-scoped
   provider queries must show exactly one header, every applicable score once,
   the selected bonus mappings once, and final state `complete`.
4. With a provider-supported staging fault mechanism, fail immediately after
   each persistent boundary: header create, each score create, each bonus create,
   verification re-read and workflow-state update. Each first call must be
   non-successful; the identical retry must converge to the exact expected rows
   and durable `complete` state.
   Also overlap two identical retries so one reaches `complete` while the other
   encounters (a) a child-write failure and (b) a workflow-state update failure.
   After each race, query by owner, submission key and deterministic child keys:
   prove exactly one header and each expected child remain, prove the header is
   still `complete`, and prove a later identical retry returns that completed
   result. Retain the conflicting compare-and-set response as evidence that a
   stale `pending -> failed` write cannot demote `complete`.
5. As the other user, attempt gateway history/delete access and direct provider
   read/update access to workflow fields. Record safe denial responses and
   confirm the owner data and state are unchanged.
6. Repeat the provider capability discovery. If a documented transaction or
   server-workflow API exists, prove a successful multi-collection commit and an
   injected abort that leaves none of the parent or children. Do not adopt it if
   either observation is ambiguous.
7. Delete the disposable ratings through the gateway and re-query all test
   identifiers. Prove zero active test headers, scores and bonus mappings;
   retain only the contract-permitted deletion tombstones and identify them
   explicitly in cleanup counts. Remove products/accounts only if they were
   created for this run and their disposal is authorised. Retain redacted
   request IDs, expected and actual counts, final states and cleanup results
   in the private launch record.
