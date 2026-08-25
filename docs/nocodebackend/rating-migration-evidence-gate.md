# Rating migration evidence gate

## Purpose

This gate converts the approval, recovery, post-migration audit and connected-provider evidence required by the rating schema migration runbook into one deterministic, redacted manifest audit.

It is a **pre-enable evidence gate only**. It does not execute a NoCodeBackend migration, change permissions, backfill records, enable `/ratings/reconcile`, or establish that a provider migration has occurred.

## Command

```bash
npm run audit:rating:migration-evidence -- \
  --manifest <private-evidence>/rating-migration-evidence.json \
  --output <private-evidence>/rating-migration-evidence-audit.json
```

A complete manifest exits `0` with `PASS`. An incomplete or contradictory manifest exits `1` with `BLOCKED`. Invalid command/JSON input exits `2`.

## Manifest schema

The manifest uses `pourfolio.rating-migration-evidence.v1` and must contain only these top-level sections:

- `releaseSha` — the exact 40-character candidate commit SHA;
- `environment` — `isolated-staging` for the rehearsal/certification evidence;
- `provider` — redacted references proving the supported schema and bulk-data mechanisms, tenant applicability, provider change ticket, schema/backfill jobs and permission policy;
- `recovery` — backup/export, isolated restore, restore smoke and rollback-rehearsal references;
- `postMigration` — zero-blocker structural schema audit, final schema/data export fingerprints, count reconciliation and proof existing ratings remain readable;
- `connectedContract` — successful connected-provider artifact reference and cleanup verification; and
- `approvals` — migration owner, security/data approver, release approver, independent reviewer and approval record.

The auditor rejects unexpected fields. Do not place row data, product/rating names, account identifiers, emails, passwords, cookies, bearer values, API keys, query-string credentials, provider secrets or raw transcripts in this manifest.

## Example redacted structure

```json
{
  "schema": "pourfolio.rating-migration-evidence.v1",
  "releaseSha": "<40 lowercase hex characters>",
  "environment": "isolated-staging",
  "provider": {
    "tenantRef": "ncb:staging-tenant-reference",
    "schemaMechanism": {
      "name": "<provider-supported mechanism>",
      "version": "<version>",
      "authorityRef": "provider-docs:schema-reference"
    },
    "bulkDataMechanism": {
      "name": "<provider-supported mechanism>",
      "version": "<version>",
      "authorityRef": "provider-docs:bulk-reference"
    },
    "changeTicketRef": "ticket:reference",
    "schemaPlanRef": "job:schema-reference",
    "backfillPlanRef": "job:backfill-reference",
    "permissionPolicyRef": "policy:reference"
  },
  "recovery": {
    "backupExportRef": "backup:reference",
    "isolatedRestoreRef": "restore:reference",
    "restoreSmokeRef": "evidence:restore-smoke-reference",
    "rollbackRehearsalRef": "evidence:rollback-reference"
  },
  "postMigration": {
    "schemaAudit": {
      "status": "PASS",
      "blockerCount": 0,
      "schemaSha256": "<64 lowercase hex characters>"
    },
    "dataExportSha256": "<64 lowercase hex characters>",
    "finalSchemaExportRef": "export:schema-reference",
    "finalDataExportRef": "export:data-reference",
    "countReconciliationRef": "evidence:count-reference",
    "existingRatingsReadable": true
  },
  "connectedContract": {
    "status": "PASS",
    "artifactRef": "github-artifact:reference",
    "cleanupVerified": true
  },
  "approvals": {
    "migrationOwner": "migration-owner",
    "securityDataApprover": "security-approver",
    "releaseApprover": "release-approver",
    "independentReviewer": "independent-reviewer",
    "approvalRef": "approval:reference"
  }
}
```

## Interpretation

`PASS` means only that the supplied redacted evidence set is internally complete for this contract. It must be combined with the underlying private evidence and human review. The manifest auditor cannot prove that an external reference is genuine by itself.

Issue #165 must remain open and `/ratings/reconcile` must remain unavailable until the real provider migration has been performed, the final deployed schema passes the structural audit, the connected provider contract passes against the migrated environment, recovery evidence is accepted, existing ratings remain readable, and the release decision is independently approved.
