# Rating workflow staging certification

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
5. As the other user, attempt gateway history/delete access and direct provider
   read/update access to workflow fields. Record safe denial responses and
   confirm the owner data and state are unchanged.
6. Repeat the provider capability discovery. If a documented transaction or
   server-workflow API exists, prove a successful multi-collection commit and an
   injected abort that leaves none of the parent or children. Do not adopt it if
   either observation is ambiguous.
7. Delete children, headers, product and disposable accounts in dependency
   order. Re-query all test identifiers and record zero residual rows. Retain
   redacted request IDs, expected and actual counts, final states and cleanup
   results in the private launch record.
