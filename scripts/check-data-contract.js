import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const contractPath = path.join(root, 'contracts', 'pourfolio-data-contract.json')
const findings = []

const requiredClassifications = new Set([
  'DEPLOYED_REQUIRED',
  'DEPLOYED_OPTIONAL',
  'DEFERRED_TARGET',
  'UNAVAILABLE'
])

const requiredEnvironment = [
  'NOCODEBACKEND_AUTH_BASE_URL',
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE'
]

const requiredProductFields = new Set([
  'id',
  'user_id',
  'product_name',
  'product_category_id',
  'producer_id',
  'abv',
  'ibu',
  'declared_category',
  'edition',
  'collaboration',
  'product_image'
])

const expectedUnavailable = [
  'product_producers',
  'profiles',
  'catalogue_source_records',
  'product_images',
  'producer_logos',
  'product_external_ids',
  'product_image_orphans',
  'product_image_reconciliation_audit'
]

const add = (code, detail = {}) => findings.push({ code, ...detail })

if (!fs.existsSync(contractPath)) {
  add('DATA_CONTRACT_MISSING', { path: 'contracts/pourfolio-data-contract.json' })
} else {
  let contract
  try {
    contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'))
  } catch (error) {
    add('DATA_CONTRACT_INVALID_JSON', { message: error.message })
  }

  if (contract) {
    if (contract.contract_name !== 'pourfolio-data-contract') add('DATA_CONTRACT_NAME_INVALID')
    if (!/^1\.\d+\.\d+$/.test(contract.contract_version ?? '')) {
      add('DATA_CONTRACT_VERSION_UNSUPPORTED', { version: contract.contract_version ?? null })
    }
    if (contract.authority?.repository !== 'jeremytheva/pourfolio') {
      add('DATA_CONTRACT_AUTHORITY_INVALID', { repository: contract.authority?.repository ?? null })
    }
    if (contract.authority?.classification_document !== 'docs/nocodebackend/launch-schema-contract.md') {
      add('DATA_CONTRACT_CLASSIFICATION_SOURCE_INVALID')
    }

    const classifications = new Set(contract.classification_values ?? [])
    for (const value of requiredClassifications) {
      if (!classifications.has(value)) add('DATA_CONTRACT_CLASSIFICATION_MISSING', { value })
    }

    const environment = contract.provider?.canonical_environment_variables ?? []
    if (JSON.stringify(environment) !== JSON.stringify(requiredEnvironment)) {
      add('DATA_CONTRACT_ENVIRONMENT_INVALID', { environment })
    }
    if (contract.provider?.auth_base_url !== 'https://app.nocodebackend.com/api/user-auth') {
      add('DATA_CONTRACT_AUTH_BASE_URL_INVALID')
    }
    if (contract.provider?.data_base_url !== 'https://api.nocodebackend.com/') {
      add('DATA_CONTRACT_DATA_BASE_URL_INVALID')
    }

    const products = contract.collections?.products
    if (!products || products.classification !== 'DEPLOYED_REQUIRED') {
      add('DATA_CONTRACT_PRODUCTS_CLASSIFICATION_INVALID')
    } else {
      const actualFields = new Set(products.provider_fields ?? [])
      for (const field of requiredProductFields) {
        if (!actualFields.has(field)) add('DATA_CONTRACT_PRODUCT_FIELD_MISSING', { field })
      }
    }

    for (const collection of expectedUnavailable) {
      if (contract.collections?.[collection]?.classification !== 'UNAVAILABLE') {
        add('DATA_CONTRACT_UNAVAILABLE_COLLECTION_INVALID', { collection })
      }
    }

    const writer = contract.external_writers?.['pourfolio-feeder']
    if (!writer || writer.default_policy !== 'deny') {
      add('DATA_CONTRACT_FEEDER_DEFAULT_POLICY_INVALID')
    } else {
      const productPolicy = writer.collections?.products
      const writable = new Set(productPolicy?.writable_fields ?? [])
      const providerFields = new Set(products?.provider_fields ?? [])
      for (const field of writable) {
        if (!providerFields.has(field)) add('DATA_CONTRACT_FEEDER_FIELD_NOT_DEPLOYED', { field })
        if (field === 'id' || field === 'user_id' || field === 'secret_key') {
          add('DATA_CONTRACT_FEEDER_PROTECTED_FIELD_WRITABLE', { field })
        }
      }
      for (const collection of expectedUnavailable) {
        const policy = writer.collections?.[collection]
        if (!policy || (policy.operations ?? []).length !== 0 || (policy.writable_fields ?? []).length !== 0) {
          add('DATA_CONTRACT_FEEDER_UNAVAILABLE_WRITE_ENABLED', { collection })
        }
      }
    }
  }
}

findings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
const result = { status: findings.length ? 'BLOCKED' : 'PASS', findings }
process.stdout.write(`${JSON.stringify(result)}\n`)
if (findings.length) process.exitCode = 1
