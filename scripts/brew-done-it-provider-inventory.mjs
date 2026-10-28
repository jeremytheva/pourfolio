import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { collectPagedRecords } from '../api/_lib/brewDoneItData.js'
import { resolveDataBaseUrl } from '../api/_lib/nocodeBackendConfig.js'

export const COLLECTIONS = Object.freeze([
  'brew_done_it_games', 'brew_done_it_rounds',
  'brew_done_it_guesses', 'brew_done_it_deductions'
])
const codes = new Set([
  'INVENTORY_CONFIGURATION_INVALID', 'INVENTORY_EXECUTION_GUARD_REQUIRED',
  'INVENTORY_READ_FAILED', 'INVENTORY_PAGINATION_INVALID',
  'INVENTORY_LIMIT_REACHED', 'INVENTORY_ROW_INVALID', 'INVENTORY_CHANGED'
])
const fail = code => { throw Object.assign(new Error(code), { code }) }
const hash = value => createHash('sha256').update(value).digest('hex')
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const fullSha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value) && !/^0+$/.test(value)
const safeCode = error => codes.has(error?.code) ? error.code : 'INVENTORY_READ_FAILED'
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical)
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}

// Reuse the game's paginator, with stricter inventory-specific coverage checks.
// Rows and comparison digests stay in process memory and never enter the report.
const observeCollection = async (provider, collection, { pageSize, maxPages }) => {
  const ids = new Set()
  let exactTotal
  let estimatedProgress = false
  let pagesRead = 0
  const rows = await collectPagedRecords(async (page, limit) => {
    let result
    try {
      result = await provider.listPage(collection, {
        page, limit, orderBy: 'id', order: 'asc', filters: {}, fresh: true
      })
    } catch (error) {
      const safeFailure = new Error('INVENTORY_READ_FAILED')
      safeFailure.code = 'INVENTORY_READ_FAILED'
      if (Number.isInteger(error?.providerStatus) && error.providerStatus >= 100 && error.providerStatus <= 599) {
        safeFailure.providerStatus = error.providerStatus
      }
      if (['DATA_PROVIDER_UNAUTHENTICATED', 'DATA_PROVIDER_FORBIDDEN', 'DATA_CONFIGURATION_INVALID',
        'DATA_CREDENTIAL_MISSING', 'DATA_INSTANCE_MISSING', 'PROVIDER_ERROR'].includes(error?.code)) {
        safeFailure.providerCode = error.code
      }
      throw safeFailure
    }
    pagesRead += 1
    if (!record(result) || !Array.isArray(result.items) || result.page !== page || result.pageSize !== limit ||
        !Number.isSafeInteger(result.total) || result.total < 0 ||
        !Number.isSafeInteger(result.totalPages) || result.totalPages < 0 ||
        (result.totalIsEstimate !== undefined && typeof result.totalIsEstimate !== 'boolean')) {
      fail('INVENTORY_PAGINATION_INVALID')
    }
    const estimated = result.totalIsEstimate === true
    if (estimated) {
      if (exactTotal !== undefined || result.items.length !== limit ||
          result.total !== page * limit + 1 || result.totalPages !== page + 1) {
        fail('INVENTORY_PAGINATION_INVALID')
      }
      estimatedProgress = true
    } else {
      if (exactTotal !== undefined && exactTotal !== result.total) fail('INVENTORY_CHANGED')
      exactTotal = result.total
      if (exactTotal > pageSize * maxPages) fail('INVENTORY_LIMIT_REACHED')
      const expectedPages = exactTotal === 0 ? 0 : Math.ceil(exactTotal / limit)
      const expectedLength = exactTotal === 0 ? 0 : page < expectedPages ? limit : exactTotal - (expectedPages - 1) * limit
      const emptyTerminal = estimatedProgress && result.items.length === 0 &&
        exactTotal === (page - 1) * limit && result.totalPages === page
      if (!emptyTerminal && (result.totalPages !== expectedPages || page > Math.max(1, expectedPages) ||
          result.items.length !== expectedLength)) fail('INVENTORY_PAGINATION_INVALID')
    }
    for (const row of result.items) {
      const id = record(row) && (typeof row.id === 'string' || Number.isSafeInteger(row.id)) ? String(row.id) : ''
      if (!/^[1-9]\d*$/.test(id) || ids.has(id)) fail('INVENTORY_ROW_INVALID')
      ids.add(id)
    }
    if (page === maxPages && result.totalPages > page) fail('INVENTORY_LIMIT_REACHED')
    return result
  }, { pageSize, maxPages })
  if (rows.length !== exactTotal) fail('INVENTORY_PAGINATION_INVALID')
  const ordered = rows.map(row => [String(row.id), canonical(row)])
    .sort(([left], [right]) => left.localeCompare(right))
  return { rowCount: rows.length, pagesRead, digest: hash(JSON.stringify(ordered)) }
}

export const runBrewInventory = async ({
  provider, sourceCommit, providerRef, pageSize = 100, maxPages = 10,
  capturedAt = new Date().toISOString()
} = {}) => {
  if (typeof provider?.listPage !== 'function' || !fullSha(sourceCommit) ||
      typeof providerRef !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(providerRef) ||
      typeof capturedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(capturedAt) || !Number.isFinite(Date.parse(capturedAt)) ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
      !Number.isSafeInteger(maxPages) || maxPages < 1 || maxPages > 10) fail('INVENTORY_CONFIGURATION_INVALID')

  const report = {
    contract: 'pourfolio.brew-done-it-readonly-inventory.v1', sourceCommit, providerRef, capturedAt,
    status: 'BLOCKED', providerRead: 'READ_ONLY',
    observation: 'TWO_BOUNDED_READS_NOT_ATOMIC_SNAPSHOT',
    schemaConstraints: 'NOT_RUN', providerCertification: 'NOT_RUN',
    privacyCertification: 'NOT_RUN', recoveryCertification: 'NOT_RUN', twoAccountFlow: 'NOT_RUN',
    releaseReadiness: 'BLOCKED', collections: []
  }
  const first = new Map()
  let currentCollection
  try {
    for (const collection of COLLECTIONS) {
      currentCollection = collection
      first.set(collection, await observeCollection(provider, collection, { pageSize, maxPages }))
    }
    for (const collection of COLLECTIONS) {
      currentCollection = collection
      const second = await observeCollection(provider, collection, { pageSize, maxPages })
      const before = first.get(collection)
      if (before.digest !== second.digest) fail('INVENTORY_CHANGED')
      report.collections.push({ collection, rowCount: second.rowCount, pagesRead: before.pagesRead + second.pagesRead, status: 'STABLE_READ' })
    }
    report.status = 'PASS'
  } catch (error) {
    report.failure = { collection: currentCollection, code: safeCode(error) }
    for (const key of ['providerStatus', 'providerCode']) {
      if (error?.code === 'INVENTORY_READ_FAILED' && error[key] !== undefined) report.failure[key] = error[key]
    }
  }
  return report
}

export const runBrewInventoryCli = async (args = process.argv.slice(2), {
  env = process.env,
  loadProvider = async () => (await import('../api/_lib/dataProvider.js')).dataProvider
} = {}) => {
  if (args.length || env.RUN_BREW_READONLY_INVENTORY !== '1' ||
      !fullSha(env.BREW_INVENTORY_SOURCE_SHA) || env.BREW_INVENTORY_SOURCE_SHA !== env.GITHUB_SHA ||
      env.GITHUB_REF !== 'refs/heads/main') fail('INVENTORY_EXECUTION_GUARD_REQUIRED')
  if (!['NOCODEBACKEND_DATA_BASE_URL', 'NOCODEBACKEND_INSTANCE', 'NOCODEBACKEND_SECRET_KEY']
    .every(key => typeof env[key] === 'string' && env[key].trim())) fail('INVENTORY_CONFIGURATION_INVALID')
  let baseUrl
  try { baseUrl = resolveDataBaseUrl(env.NOCODEBACKEND_DATA_BASE_URL) }
  catch { fail('INVENTORY_CONFIGURATION_INVALID') }
  return runBrewInventory({
    provider: await loadProvider(), sourceCommit: env.BREW_INVENTORY_SOURCE_SHA,
    providerRef: `sha256:${hash(JSON.stringify([baseUrl, env.NOCODEBACKEND_INSTANCE.trim()]))}`
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runBrewInventoryCli()
    process.stdout.write(`${JSON.stringify(result)}\n`)
    if (result.status !== 'PASS') process.exitCode = 2
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ status: 'BLOCKED', providerRead: 'READ_ONLY', releaseReadiness: 'BLOCKED', code: safeCode(error) })}\n`)
    process.exitCode = 2
  }
}
