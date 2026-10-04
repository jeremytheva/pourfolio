# NoCodeBackend implementation sources

Use the following source hierarchy when changing the integration:

1. Current connected provider evidence from the governed environment.
2. Project-specific setup guides supplied for this deployment.
3. Generated API documentation/export for the actual database instance, where it is not contradicted by newer connected evidence.
4. Retained working implementation evidence.
5. General provider documentation only where it does not conflict with project-specific evidence.

When a dated static export conflicts with a later read-only connected provider verification, preserve the export as historical evidence but use the verified live API shape for current application integration. Do not mutate provider schema merely to make it match an older export.

Current project-specific records:

- `/auth_proxy_setup.md` — authentication proxy contract.
- `docs/nocodebackend/data-auth-context.md` — recovered data request authentication context.
- `docs/nocodebackend/provider-api-contract.md` — generated table CRUD contract; update only when verified against the current database-generated API.

Do not infer data CRUD semantics from the auth setup guide.

## Runtime environment contract

The canonical server-only NoCodeBackend environment contract includes:

- `NOCODEBACKEND_AUTH_BASE_URL`
- `NOCODEBACKEND_DATA_BASE_URL`
- `NOCODEBACKEND_AUTH_SECRET_KEY`
- `NOCODEBACKEND_SECRET_KEY`
- `NOCODEBACKEND_INSTANCE`
- `NOCODEBACKEND_USER_EMAIL`
- `NOCODEBACKEND_USER_SECRET_KEY`
- `NOCODEBACKEND_ADMIN_EMAIL`
- `NOCODEBACKEND_ADMIN_SECRET_KEY`

The user/admin emails and all secret-key values are runtime-only. Repository examples contain names/placeholders only; real values must remain in the deployment environment and must never be committed or exposed to browser code.


## Provider-schema authority

For this repository, the NoCodeBackend equivalent of a conventional database/schema folder is intentionally distributed across the existing governed sources:

- `contracts/pourfolio-data-contract.json` — machine-readable provider-facing contract and classification;
- `launch-schema-contract.md` — concise deployed/deferred capability classification;
- `schema-mapping.md` — detailed provider representation and relationship rules;
- migration/evidence records in this directory — controlled transitions and retained proof;
- `../../exports/schema.sql` — reference/target schema used by audit tooling only, not deployed-provider authority.

Do not create a second provider-schema document or fictional executable SQL unless the provider actually supports that mechanism and an architecture decision adopts it.

## Provider certification baseline

Provider capabilities must be recorded at the strongest evidence state actually achieved:

- **IMPLEMENTED** — repository/application support exists;
- **PROVIDER VERIFIED** — the provider capability/state is evidenced in the relevant environment;
- **APPLICATION VERIFIED** — the application behaviour has been proven against that provider capability/state.

Use the existing connection/provider contract suites and evidence records to certify the relevant subset of:

- configuration and authentication;
- server-only credential handling;
- CRUD and ownership/isolation;
- filtering and pagination;
- error semantics;
- idempotency and uniqueness;
- optimistic concurrency;
- transaction/atomic behaviour;
- schema contract;
- migration capability;
- backup/snapshot capability;
- restore/recovery capability.

Generic provider documentation alone is not sufficient when application safety depends on the behaviour.

## Migration approval package

Before any irreversible or production-impacting provider/schema operation, the project must assemble a compact approval package containing:

- change and affected tables/resources;
- existing-data scope;
- current and proposed provider schema;
- constraint/uniqueness changes;
- backup/snapshot evidence;
- restore/recovery evidence;
- backfill algorithm;
- duplicate/conflict handling;
- dry-run result where possible;
- rollback or safe-forward path;
- post-migration verification;
- the exact irreversible operation;
- explicit owner approval requirement.

Perform reversible preparation and evidence gathering before requesting approval. The current #165 rating migration uses `rating-migration-evidence-gate.md` plus `rating-schema-migration-runbook.md` as its project-specific approval package; extend those sources rather than creating a parallel generic migration document.

## Drift rule

When application data requirements change, update the domain model, machine-readable provider contract/classification, detailed provider mapping, required migration/evidence, validation and material project status together.

Existing schema/data auditors should be extended to detect meaningful drift such as missing/extra fields, nullability or uniqueness mismatches, relationship drift, deprecated deployed fields, incomplete target migration and application/provider contract disagreement.
