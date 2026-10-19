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

// Aggregate provider point values without logging descriptions, user IDs or
// individual attribute identifiers. Missing historical values are *not*
// assigned an invented value: the client continues its documented fallback.
export const summariseBonusPointValues = (bonusAttributes) => {
  const counts = {
    total: bonusAttributes.length,
    global: 0,
    private: 0,
    explicitlyStored: 0,
    missingOrBlank: 0,
    invalidNumeric: 0,
    outsideCustomPointRange: 0
  }
  const globalByValue = new Map()
  for (const attribute of bonusAttributes) {
    const isGlobal = !String(attribute?.user_id ?? '').trim()
    counts[isGlobal ? 'global' : 'private'] += 1
    const raw = attribute?.point_value
    if (raw === null || raw === undefined || String(raw).trim() === '') {
      counts.missingOrBlank += 1
      continue
    }
    const value = Number(raw)
    if (!Number.isFinite(value)) {
      counts.invalidNumeric += 1
      continue
    }
    counts.explicitlyStored += 1
    if (value < 0.1 || value > 0.8 || Math.abs(value * 10 - Math.round(value * 10)) > 1e-8) {
      counts.outsideCustomPointRange += 1
    }
    if (isGlobal) globalByValue.set(value, (globalByValue.get(value) || 0) + 1)
  }
  const status = counts.invalidNumeric || counts.outsideCustomPointRange ? 'REVIEW_REQUIRED'
    : !counts.total ? 'INCONCLUSIVE_NO_ATTRIBUTES'
      : counts.missingOrBlank ? 'LEGACY_FALLBACK_PRESENT'
        : 'COMPLETE'
  return {
    status,
    ...counts,
    globalExplicitValueCounts: [...globalByValue]
      .sort(([left], [right]) => left - right)
      .map(([value, count]) => ({ value, count }))
  }
}

// This is a read-only capability preflight against an already persisted
// private attribute/Overall mapping, never an attempt to create a test row.
// The result deliberately contains no user, record or private point values.
export const verifyExistingPrivateBonusReadback = async ({
  attributes, categoryMappings, categories, provider = dataProvider
}) => {
  const categoryById = new Map(categories.map((category) => [String(category.id), category]))
  const attributeById = new Map(attributes.map((attribute) => [String(attribute.id), attribute]))
  const pair = categoryMappings.find((mapping) => {
    const attribute = attributeById.get(String(mapping.bonus_attribute_id ?? ''))
    const category = categoryById.get(String(mapping.category_id ?? ''))
    const owner = String(attribute?.user_id ?? '').trim()
    const value = Number(attribute?.point_value)
    return owner && String(mapping.user_id ?? '').trim() === owner &&
      category && String(category.category ?? '').trim().toLocaleLowerCase() === 'overall' &&
      (!String(category.user_id ?? '').trim() || String(category.user_id).trim() === owner) &&
      attribute.point_value !== null && attribute.point_value !== undefined &&
      String(attribute.point_value).trim() !== '' && Number.isFinite(value) &&
      Number.isSafeInteger(Number(attribute.id)) && Number.isSafeInteger(Number(mapping.id))
  })

  if (!pair) {
    return { status: 'INCONCLUSIVE_NO_PRIVATE_OVERALL_PAIR', checked: 0 }
  }

  const attribute = attributeById.get(String(pair.bonus_attribute_id))
  let storedAttribute, storedMapping
  try {
    ;[storedAttribute, storedMapping] = await Promise.all([
      provider.get(COLLECTIONS.bonusAttributes, attribute.id),
      provider.get(COLLECTIONS.bonusAttributeCategoryMappings, pair.id)
    ])
  } catch {
    return { status: 'READBACK_UNAVAILABLE', checked: 1 }
  }
  const attributeMatches = storedAttribute &&
    String(storedAttribute.id) === String(attribute.id) &&
    String(storedAttribute.user_id ?? '') === String(attribute.user_id ?? '') &&
    String(storedAttribute.description ?? '').trim() === String(attribute.description ?? '').trim() &&
    storedAttribute.point_value !== null && storedAttribute.point_value !== undefined &&
    String(storedAttribute.point_value).trim() !== '' &&
    Number(storedAttribute.point_value) === Number(attribute.point_value)
  const mappingMatches = storedMapping &&
    String(storedMapping.id) === String(pair.id) &&
    String(storedMapping.user_id ?? '') === String(pair.user_id ?? '') &&
    String(storedMapping.category_id ?? '') === String(pair.category_id ?? '') &&
    String(storedMapping.bonus_attribute_id ?? '') === String(pair.bonus_attribute_id ?? '')
  return {
    status: attributeMatches && mappingMatches ? 'EXISTING_PRIVATE_PAIR_READBACK_OK' : 'READBACK_MISMATCH',
    checked: 1
  }
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
    ratingsExamined: ratings.length,
    bonusPointValues: summariseBonusPointValues(bonusAttributes)
  }
}

export const runLiveBonusMappingAudit = async () => {
  requireReadOnlyMode()
  disableMutations()

  const [mappings, bonusAttributes, ratings, categoryMappings, categories] = await Promise.all([
    listAll(COLLECTIONS.bonusRatingMappings),
    listAll(COLLECTIONS.bonusAttributes),
    listAll(COLLECTIONS.ratings),
    listAll(COLLECTIONS.bonusAttributeCategoryMappings),
    listAll(COLLECTIONS.bonusAttributeCategories)
  ])

  const baseline = validateBonusRatingMappings({ mappings, bonusAttributes, ratings })
  const existingPrivateReadback = await verifyExistingPrivateBonusReadback({
    attributes: bonusAttributes, categoryMappings, categories
  })
  return {
    ...baseline,
    status: ['READBACK_MISMATCH', 'READBACK_UNAVAILABLE'].includes(existingPrivateReadback.status) ? 'BLOCKED' : baseline.status,
    existingPrivateReadback
  }
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
