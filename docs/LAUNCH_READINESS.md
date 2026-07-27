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

The previously missing products, cellar, bonus-attribute and SQL exports are now present in the supplied source set. Their presence does not complete import reconciliation.

## External P0 gates

- [ ] Configure `NOCODEBACKEND_SECRET_KEY` and `NOCODEBACKEND_DATA_BASE_URL` in staging and production.
- [ ] Verify the configured data base URL accepts the gateway’s collection paths, query filters and create/update/delete response shapes.
- [ ] Apply the canonical schema without `*_pf2025` aliases.
- [ ] Prove unauthenticated, owner, other-user and privileged negative permission cases for every collection.
- [ ] Prove forced rating partial-write rollback; prefer a verified provider transaction if supported.
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
