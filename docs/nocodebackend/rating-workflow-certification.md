# Rating workflow staging certification

## Step-by-step acceptance and certification guide

Use the GitHub browser workflow; a local clone is not required. The historical
attempt below is retained as a failed/blocked attempt, not current completion
evidence. Latest results and remaining boundaries belong in `STATUS.md` and
the linked pull requests.

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