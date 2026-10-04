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

  let pluralFieldRows = 0
  let singularFieldRows = 0
  let bothFieldRows = 0
  let neitherFieldRows = 0
  let conflictingDualFieldRows = 0

  for (const mapping of mappings) {
    const pluralId = String(mapping.bonus_attributes_id ?? '').trim()
    const singularId = String(mapping.bonus_attribute_id ?? '').trim()
    const hasPlural = /^[1-9]\d*$/.test(pluralId)
    const hasSingular = /^[1-9]\d*$/.test(singularId)
    const ratingId = String(mapping.rating_id ?? '')

    if (hasPlural) pluralFieldRows += 1
    if (hasSingular) singularFieldRows += 1
    if (hasPlural && hasSingular) {
      bothFieldRows += 1
      if (pluralId !== singularId) conflictingDualFieldRows += 1
    }
    if (!hasPlural && !hasSingular) neitherFieldRows += 1

    assert.match(ratingId, /^[1-9]\d*$/, 'rating bonus mapping must expose rating_id')
    assert.equal(hasPlural || hasSingular, true, 'rating bonus mapping must expose a usable bonus relationship field')
    if (hasPlural) assert.equal(bonusIds.has(pluralId), true, 'plural bonus relationship must reference an existing bonus attribute')
    if (hasSingular) assert.equal(bonusIds.has(singularId), true, 'singular bonus relationship must reference an existing bonus attribute')
    assert.equal(ratingsById.has(ratingId), true, 'rating bonus mapping must reference an existing rating')

    const rating = ratingsById.get(ratingId)
    const mappingUser = String(mapping.user_id ?? '').trim()
    const ratingUser = String(rating?.user_id ?? '').trim()
    if (mappingUser && ratingUser) {
      assert.equal(mappingUser, ratingUser, 'rating bonus mapping owner must match the parent rating owner')
    }
  }

  let verification = 'INCONCLUSIVE_NO_ROWS'
  if (mappings.length) {
    if (pluralFieldRows === mappings.length && singularFieldRows === 0) verification = 'PLURAL_ONLY'
    else if (singularFieldRows === mappings.length && pluralFieldRows === 0) verification = 'SINGULAR_ONLY'
    else if (bothFieldRows === mappings.length && conflictingDualFieldRows === 0) verification = 'BOTH_SAME_VALUE'
    else verification = 'MIXED_PROVIDER_STATE'
  }

  return {
    status: mappings.length && neitherFieldRows === 0 && conflictingDualFieldRows === 0 ? 'PASS' : mappings.length ? 'BLOCKED' : 'INCONCLUSIVE',
    mode: 'read-only',
    verification,
    mappingsExamined: mappings.length,
    pluralFieldRows,
    singularFieldRows,
    bothFieldRows,
    neitherFieldRows,
    conflictingDualFieldRows,
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
