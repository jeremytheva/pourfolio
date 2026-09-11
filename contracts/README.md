# Pourfolio data contracts

Pourfolio is the authoritative repository for application/provider data contracts used across the Pourfolio ecosystem.

`pourfolio-data-contract.json` is the machine-readable publication consumed by services such as `jeremytheva/pourfolio-feeder`. Its human-readable source classification remains `docs/nocodebackend/launch-schema-contract.md`, with field-level detail in `docs/nocodebackend/schema-mapping.md`.

## Repository boundary

Pourfolio and Pourfolio Feeder remain separate repositories because they have different runtime and release responsibilities. Pourfolio owns user-facing application behaviour and the authoritative provider contract. Pourfolio Feeder owns discovery, ingestion, normalisation, reconciliation and scheduled enrichment work.

The authoritative contract describes provider-facing collections, fields, relationships and writer permissions only. Feeder-internal discovery, provenance, source-confidence and lifecycle fields belong in `pourfolio-feeder` and must not be added here merely to make an undeployed backend write appear compatible.

The feeder must not independently declare a provider collection or field deployed. Before any provider mutation it must consume this contract and fail closed when the contract cannot be loaded, the major version is unsupported, or the requested collection, operation or field is not authorised.

Read-only feeder discovery may continue without a mutation-capability claim. Target-state feeder migrations and documentation do not override this contract.

## Compatibility

Major contract versions are breaking. Consumers supporting major version `1` must reject a later major version until deliberately upgraded. Production feeder mutation evidence should record the exact contract version and SHA-256 digest used by the run.

Provider migrations must update the human-readable classification and this machine-readable contract together.
