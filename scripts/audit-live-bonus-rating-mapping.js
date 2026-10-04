import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { COLLECTIONS } from '../src/data/contract.js'
import { dataProvider } from '../api/_lib/dataProvider.js'

const PAGE_SIZE = 100
const MAX_PAGES = 1000

const requireReadOnlyMode = () => {
  if (process.env.RUN_LIVE_BONUS_MAPPING_AUDIT !== '1') {
    throw new Error('Set RUN_LIVE_BONUS_MAPPING_AUDIT=1 to run the connected read-only bonus mapping audit.')
  }
  for (const name of ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']) {
    if (!String(process.env[name] || '').trim()) throw new Error(`${name} is required.`)
  }
}

const disableMutations = () => {
  const blocked = async () => {
    throw new Error('Live bonus mapping audit is read-only; provider mutation was blocked.')
  }
  dataProvider.create = blocked
  dataProvider.update = blocked
  dataProvider.compareAndSet = blocked
  dataProvider.remove = blocked
}

const listAll = async (collection) => {
  const items = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await dataProvider.listPage(collection, {
      page,
      limit: PAGE_SIZE,
      orderBy: 'id',
      order: 'asc',
      filters: {}
    })
    items.push(...result.items)
    if (result.totalPages === 0 || page >= result.totalPages || result.items.length < PAGE_SIZE) return items
  }
  throw new Error(`Connected bonus mapping audit exceeded ${MAX_PAGES} pages for ${collection}.`)
}

export const validateBonusRatingMappings = ({ mappings, bonusAttributes, ratings }) => {
  const bonusIds = new Set(bonusAttributes.map((item) => String(item.id ?? '')).filter(Boolean))
  const ratingsById = new Map(ratings.map((item) => [String(item.id ?? ''), item]))

  for (const mapping of mappings) {
    assert.equal(
      Object.hasOwn(mapping, 'bonus_attribute_id'),
      false,
      'rating bonus mapping must not expose the singular category-mapping field'
    )

    const bonusId = String(mapping.bonus_attributes_id ?? '')
    const ratingId = String(mapping.rating_id ?? '')
    assert.match(bonusId, /^[1-9]\d*$/, 'rating bonus mapping must expose bonus_attributes_id')
    assert.match(ratingId, /^[1-9]\d*$/, 'rating bonus mapping must expose rating_id')
    assert.equal(bonusIds.has(bonusId), true, 'rating bonus mapping must reference an existing bonus attribute')
    assert.equal(ratingsById.has(ratingId), true, 'rating bonus mapping must reference an existing rating')

    const rating = ratingsById.get(ratingId)
    const mappingUser = String(mapping.user_id ?? '').trim()
    const ratingUser = String(rating?.user_id ?? '').trim()
    if (mappingUser && ratingUser) {
      assert.equal(mappingUser, ratingUser, 'rating bonus mapping owner must match the parent rating owner')
    }
  }

  return {
    status: mappings.length ? 'PASS' : 'INCONCLUSIVE',
    mode: 'read-only',
    verification: mappings.length ? 'PROVIDER_VERIFIED_EXISTING_ROWS' : 'INCONCLUSIVE_NO_ROWS',
    field: 'bonus_attributes_id',
    mappingsExamined: mappings.length,
    bonusAttributesExamined: bonusAttributes.length,
    ratingsExamined: ratings.length
  }
}

export const runLiveBonusMappingAudit = async () => {
  requireReadOnlyMode()
  disableMutations()

  const [mappings, bonusAttributes, ratings] = await Promise.all([
    listAll(COLLECTIONS.bonusRatingMappings),
    listAll(COLLECTIONS.bonusAttributes),
    listAll(COLLECTIONS.ratings)
  ])

  return validateBonusRatingMappings({ mappings, bonusAttributes, ratings })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLiveBonusMappingAudit()
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result)}\n`)
      if (result.status !== 'PASS') process.exitCode = 2
    })
    .catch((error) => {
      process.stderr.write(`${JSON.stringify({
        status: 'BLOCKED',
        mode: 'read-only',
        error: error?.message || 'Connected bonus mapping audit failed.'
      })}\n`)
      process.exitCode = 1
    })
}
