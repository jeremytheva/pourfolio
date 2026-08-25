# Connected catalogue certification evidence

## Purpose

Phase 3 requires connected evidence that beer discovery is operating against an immutable release candidate and a known catalogue state. The existing `Connected staging release check` performs the production-equivalent browser and provider exercise. This contract adds a machine-readable, privacy-minimised catalogue record to that existing artifact.

The evidence is **not** a substitute for the governed catalogue-remediation ledger, canonical catalogue approval, provider migration evidence, or independent release approval.

## Evidence schema

`test-results/release-check/catalogue-evidence.json` uses `pourfolio.connected-catalogue-evidence.v1` and records only:

- the exact 40-character release SHA;
- the UTC observation time;
- browse page/count metadata;
- counts of observed stable product identifiers;
- SHA-256 digests of canonical product-identifier observations;
- a SHA-256 digest of the configured search term rather than the term itself;
- search page/count metadata and identifier digests;
- the stable product identifier used for direct-detail verification; and
- one bundle SHA-256 binding the evidence components to the release SHA.

The retained evidence deliberately excludes product, producer and category names; account identity; email; passwords; cookies; request or response headers; rating records; cellar/profile data; and raw provider payloads.

## Execution boundary

The evidence is generated only by the manual `.github/workflows/connected-release-check.yml` workflow. The workflow:

1. requires the immutable HTTPS staging URL and full deployed commit SHA;
2. checks out that exact SHA and verifies it before testing;
3. runs behind the protected `staging-release` environment;
4. passes the full SHA to the connected Playwright suite;
5. authenticates using protected release-test credentials;
6. reads the same-origin public catalogue projection through Pourfolio;
7. walks contiguous catalogue pages with a bounded page count;
8. verifies a stable direct product route;
9. performs the configured search without retaining the search text; and
10. uploads the resulting evidence with the existing connected-release artifact.

## Interpretation

A source/PR test pass proves only that the evidence builder is deterministic, fail-closed and privacy-minimised. A real Phase 3 connected pass exists only when the protected connected workflow completes successfully against the approved immutable staging deployment.

The catalogue evidence does not by itself prove that the observed catalogue is canonical. Parent issue #154 remains blocked until the 193-task remediation ledger is completed and independently reviewed, the resulting candidate is applied and re-audited, the approved catalogue is deployed/reconciled, and all remaining connected and WCAG evidence is reviewed.
