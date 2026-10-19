import { pathToFileURL } from 'node:url'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { dataProvider } from '../api/_lib/dataProvider.js'

const PAGE_SIZE = 100
const MAX_PAGES = 1000
const clean = (value) => String(value ?? '').trim()
const hasPositiveId = (value) => /^[1-9]\d*$/.test(clean(value))
const giftFlag = (value) => value === true || value === 1 || value === '1' || value === 'true'

const requireReadOnlyMode = () => {
  if (process.env.RUN_LIVE_CELLAR_AUDIT !== '1') {
    throw new Error('Set RUN_LIVE_CELLAR_AUDIT=1 to run the connected read-only cellar audit.')
  }
  for (const name of ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']) {
    if (!clean(process.env[name])) throw new Error(`${name} is required.`)
  }
}

const disableProviderMutations = () => {
  const blocked = async () => {
    throw new Error('The cellar integrity audit is read-only; provider mutation was blocked.')
  }
  dataProvider.create = blocked
  dataProvider.update = blocked
  dataProvider.compareAndSet = blocked
  dataProvider.remove = blocked
}

const listAll = async (collection, provider = dataProvider) => {
  const rows = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await provider.listPage(collection, {
      page, limit: PAGE_SIZE, orderBy: 'id', order: 'asc', filters: {}
    })
    rows.push(...result.items)
    if (result.totalPages === 0 || page >= result.totalPages || result.items.length < PAGE_SIZE) return rows
  }
  throw new Error('Read-only cellar audit pagination exceeded its safe upper bound.')
}

// The report is deliberately aggregates-only. Never include cellar IDs,
// user IDs, product names or row bodies in CI logs or retained artifacts.
export const summariseCellarIntegrity = ({ cellar, products }) => {
  const productIds = new Set(products.map((item) => clean(item.id)).filter(Boolean))
  const foundIds = new Set()
  const owners = new Set()
  const counts = {
    rows: cellar.length,
    productsExamined: products.length,
    ownedRows: 0,
    ownerlessRows: 0,
    distinctOwners: 0,
    invalidOrDuplicateIds: 0,
    invalidProductReferences: 0,
    invalidQuantities: 0,
    unsupportedGiftFlags: 0
  }

  for (const record of cellar) {
    const id = clean(record?.id)
    if (!hasPositiveId(id) || foundIds.has(id)) counts.invalidOrDuplicateIds += 1
    foundIds.add(id)

    const owner = clean(record?.user_id)
    if (owner) { counts.ownedRows += 1; owners.add(owner) }
    else counts.ownerlessRows += 1

    const product = clean(record?.product_id)
    if (!hasPositiveId(product) || !productIds.has(product)) counts.invalidProductReferences += 1

    const quantity = record?.quantity
    if (quantity !== null && quantity !== undefined && clean(quantity) !== '' &&
      (!Number.isSafeInteger(Number(quantity)) || Number(quantity) < 0)) {
      counts.invalidQuantities += 1
    }

    const gift = record?.gift
    if (gift !== undefined && gift !== null && clean(gift) !== '' &&
      ![false, true, 0, 1, '0', '1', 'false', 'true'].includes(gift)) {
      counts.unsupportedGiftFlags += 1
    }
  }

  counts.distinctOwners = owners.size
  return {
    status: !cellar.length ? 'INCONCLUSIVE_NO_CELLAR_ROWS'
      : counts.invalidOrDuplicateIds || counts.invalidProductReferences ||
        counts.invalidQuantities || counts.unsupportedGiftFlags ? 'REVIEW_REQUIRED'
        : counts.ownerlessRows ? 'LEGACY_OWNERLESS_PRESENT'
          : 'PASS',
    mode: 'read-only',
    ...counts
  }
}

// GET an existing owned row; it is not a substitute for controlled CREATE,
// UPDATE, DELETE, fresh login ownership or second-account session evidence.
export const probeExistingOwnedCellar = async ({ cellar, provider = dataProvider }) => {
  const eligible = cellar.find((record) => clean(record?.user_id) && hasPositiveId(record?.id))
  if (!eligible) return { status: 'INCONCLUSIVE_NO_OWNED_ROW', checked: 0 }
  let stored
  try {
    stored = await provider.get(COLLECTIONS.cellar, eligible.id)
  } catch {
    return { status: 'READBACK_UNAVAILABLE', checked: 1 }
  }
  const matches = stored &&
    clean(stored.id) === clean(eligible.id) &&
    clean(stored.user_id) === clean(eligible.user_id) &&
    clean(stored.product_id) === clean(eligible.product_id) &&
    (stored.quantity === null || stored.quantity === undefined
      ? eligible.quantity === null || eligible.quantity === undefined
      : Number(stored.quantity) === Number(eligible.quantity)) &&
    giftFlag(stored.gift) === giftFlag(eligible.gift)

  return { status: matches ? 'EXISTING_OWNED_ROW_READBACK_OK' : 'READBACK_MISMATCH', checked: 1 }
}

export const runLiveCellarAudit = async () => {
  requireReadOnlyMode()
  disableProviderMutations()
  const [cellar, products] = await Promise.all([
    listAll(COLLECTIONS.cellar),
    listAll(COLLECTIONS.products)
  ])
  const summary = summariseCellarIntegrity({ cellar, products })
  const ownedReadback = await probeExistingOwnedCellar({ cellar })
  return {
    ...summary,
    status: ['READBACK_MISMATCH', 'READBACK_UNAVAILABLE'].includes(ownedReadback.status)
      ? 'REVIEW_REQUIRED' : summary.status,
    ownedReadback
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLiveCellarAudit()
    .then((summary) => {
      process.stdout.write(`${JSON.stringify(summary)}\n`)
      if (summary.status !== 'PASS') process.exitCode = 2
    })
    .catch(() => {
      process.stderr.write('{"status":"BLOCKED","mode":"read-only","error":"Cellar audit could not complete safely."}\n')
      process.exitCode = 1
    })
}
