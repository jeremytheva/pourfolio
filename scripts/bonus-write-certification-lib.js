import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { persistBonusWithCategory } from '../api/bonus-attribute-data-proxy.js'

const ATTRIBUTE = COLLECTIONS.bonusAttributes
const CATEGORY = COLLECTIONS.bonusAttributeCategories
const MAPPING = COLLECTIONS.bonusAttributeCategoryMappings
const RATING_MAPPING = COLLECTIONS.bonusRatingMappings
const idOf = (value) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null
  if (!['string', 'number'].includes(typeof value)) return null
  const text = String(value)
  return text === text.trim() && /^[1-9][0-9]*$/.test(text) ? text : null
}
const requireThat = (condition, code) => {
  if (!condition) throw Object.assign(new Error(code), { code })
}
const failureCode = (error) => /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code || '')
  ? error.code : 'BONUS_CERTIFICATION_FAILED'
const same = (left, right) => String(left ?? '') === String(right ?? '')
const first = (value) => Array.isArray(value) ? value[0] : value

export const readAllBonusCertificationRows = async (provider, collection) => {
  const rows = []
  const seen = new Set()
  for (let page = 1; page <= 1000; page += 1) {
    const result = await provider.listPage(collection, { page, limit: 100, orderBy: 'id', order: 'asc', filters: {} })
    requireThat(Array.isArray(result.items) && Number.isSafeInteger(result.totalPages) && result.totalPages >= 0,
      'BONUS_BASELINE_INVALID')
    for (const row of result.items) {
      const id = idOf(row?.id)
      requireThat(id && !seen.has(id), 'BONUS_BASELINE_INVALID')
      seen.add(id)
      rows.push(row)
    }
    if (page >= result.totalPages) return rows
  }
  throw Object.assign(new Error('BONUS_PAGE_LIMIT'), { code: 'BONUS_PAGE_LIMIT' })
}
const listAll = readAllBonusCertificationRows

const referencesAttribute = (row, id) => same(row.bonus_attribute_id, id) || same(row.bonus_attributes_id, id)
const requireReferenceFields = (rows) => requireThat(rows.every((row) =>
  idOf(row.bonus_attribute_id) || idOf(row.bonus_attributes_id)), 'BONUS_REFERENCE_READ_UNCONFIRMED')

// Both the original test and explicitly reviewed recovery use the same exact
// ownership, nonce and full-reference guards. This helper never creates rows.
export const cleanupBonusTestFixture = async ({ provider, userId, attributeId, mappingId, categoryId, description, report }) => {
  const attributeMatches = (row) => row && same(row.id, attributeId) && same(row.user_id, userId) && row.description === description
  const mappingMatches = (row) => row && same(row.id, mappingId) && same(row.user_id, userId) &&
    same(row.category_id, categoryId) && same(row.bonus_attribute_id, attributeId)
  report.cleanup = 'UNCONFIRMED'
  try {
    requireThat(idOf(attributeId) && (!mappingId || idOf(mappingId)) && idOf(categoryId) &&
      typeof userId === 'string' && userId.trim() === userId && userId.length > 0 &&
      /^Pourfolio release QA bonus-[a-f0-9-]{36}$/.test(description || '') && report.deletesAttempted === 0,
    'BONUS_CLEANUP_SCOPE_UNCONFIRMED')
    const [attribute, mappings, ratingMappings] = await Promise.all([
      provider.get(ATTRIBUTE, attributeId), listAll(provider, MAPPING), listAll(provider, RATING_MAPPING)
    ])
    requireThat(attributeMatches(attribute), 'BONUS_CLEANUP_PROVENANCE_UNCONFIRMED')
    requireReferenceFields(ratingMappings)
    requireThat(!ratingMappings.some((row) => referencesAttribute(row, attributeId)), 'BONUS_FIXTURE_IS_REFERENCED')
    requireThat(mappings.every((row) => idOf(row.bonus_attribute_id)), 'BONUS_REFERENCE_READ_UNCONFIRMED')
    const linked = mappings.filter((row) => same(row.bonus_attribute_id, attributeId))
    requireThat(mappingId ? linked.length === 1 && mappingMatches(linked[0]) : linked.length === 0,
      'BONUS_CLEANUP_MAPPING_UNCONFIRMED')
    if (mappingId) {
      requireThat(mappingMatches(await provider.get(MAPPING, mappingId)), 'BONUS_CLEANUP_MAPPING_UNCONFIRMED')
      report.deletesAttempted += 1
      await provider.remove(MAPPING, mappingId)
      requireThat(await provider.get(MAPPING, mappingId) === null, 'BONUS_MAPPING_DELETE_UNCONFIRMED')
      report.removed += 1
    }
    const [remainingMappings, remainingRatings, currentAttribute] = await Promise.all([
      listAll(provider, MAPPING), listAll(provider, RATING_MAPPING), provider.get(ATTRIBUTE, attributeId)
    ])
    requireReferenceFields(remainingRatings)
    requireThat(remainingMappings.every((row) => idOf(row.bonus_attribute_id)) &&
      !remainingMappings.some((row) => same(row.bonus_attribute_id, attributeId)) &&
      !remainingRatings.some((row) => referencesAttribute(row, attributeId)) && attributeMatches(currentAttribute),
    'BONUS_CLEANUP_REFERENCES_CHANGED')
    report.deletesAttempted += 1
    await provider.remove(ATTRIBUTE, attributeId)
    requireThat(await provider.get(ATTRIBUTE, attributeId) === null, 'BONUS_ATTRIBUTE_DELETE_UNCONFIRMED')
    report.removed += 1
    report.cleanup = 'PASS'
  } catch (error) {
    report.cleanupFailure = failureCode(error)
  }
  return report
}

// Runs only the candidate's server persistence function against the provider.
// It does not certify HTTP authentication, browser submission or cross-owner denial.
export const runBonusWriteCertification = async ({ provider, userId, runKey, verify = async () => {} }) => {
  const report = {
    version: 1, mode: 'current-instance-bounded-bonus-write', status: 'BLOCKED',
    persistence: 'NOT_RUN', reload: 'NOT_RUN', cleanup: 'NOT_RUN',
    createsAttempted: 0, deletesAttempted: 0, removed: 0
  }
  let attributeId = null
  let mappingId = null
  let mappingAttempted = false
  let baselineAttributes
  let baselineMappings
  let categoryId
  let primaryFailure
  const description = `Pourfolio release QA ${runKey}`
  const input = { description, point_value: 0.7 }
  const attributeMatches = (row) => row && same(row.id, attributeId) && same(row.user_id, userId) && row.description === description
  const mappingMatches = (row) => row && same(row.id, mappingId) && same(row.user_id, userId) &&
    same(row.category_id, categoryId) && same(row.bonus_attribute_id, attributeId)

  try {
    requireThat(typeof userId === 'string' && userId.trim() === userId && userId.length > 0, 'BONUS_TEST_OWNER_MISSING')
    requireThat(/^bonus-[a-f0-9-]{36}$/.test(runKey || ''), 'BONUS_RUN_KEY_INVALID')
    const [attributes, mappings, categories, ratingMappings] = await Promise.all([
      listAll(provider, ATTRIBUTE), listAll(provider, MAPPING), listAll(provider, CATEGORY), listAll(provider, RATING_MAPPING)
    ])
    requireReferenceFields(ratingMappings)
    baselineAttributes = new Set(attributes.map((row) => String(row.id)))
    baselineMappings = new Set(mappings.map((row) => String(row.id)))
    requireThat(!attributes.some((row) => same(row.user_id, userId) &&
      String(row.description || '').startsWith('Pourfolio release QA bonus-')), 'BONUS_PRIOR_FIXTURE_UNRESOLVED')
    requireThat(!attributes.some((row) => row.description === description), 'BONUS_FIXTURE_ALREADY_EXISTS')
    const overall = categories.find((row) => String(row.category || '').trim().toLowerCase() === 'overall' &&
      (!String(row.user_id ?? '').trim() || same(row.user_id, userId)))
    requireThat(overall, 'BONUS_OVERALL_CATEGORY_MISSING')
    categoryId = overall.id

    const guardedProvider = {
      async create(collection, body) {
        if (collection === ATTRIBUTE) {
          requireThat(report.createsAttempted === 0 && same(body.user_id, userId) &&
            body.description === description && body.point_value === 0.7 && Object.keys(body).length === 3,
          'BONUS_MUTATION_SCOPE_REJECTED')
        } else {
          requireThat(collection === MAPPING && report.createsAttempted === 1 && attributeId &&
            same(body.user_id, userId) && same(body.category_id, categoryId) &&
            same(body.bonus_attribute_id, attributeId) && Object.keys(body).length === 3,
          'BONUS_MUTATION_SCOPE_REJECTED')
          mappingAttempted = true
        }
        report.createsAttempted += 1
        const result = await provider.create(collection, body)
        const id = idOf(first(result)?.id)
        const baseline = collection === ATTRIBUTE ? baselineAttributes : baselineMappings
        requireThat(id && !baseline.has(id), 'BONUS_CREATE_ID_UNCONFIRMED')
        if (collection === ATTRIBUTE) attributeId = id
        else mappingId = id
        return result
      },
      async get(collection, id) {
        requireThat((collection === ATTRIBUTE && same(id, attributeId)) ||
          (collection === MAPPING && same(id, mappingId)), 'BONUS_MUTATION_SCOPE_REJECTED')
        return provider.get(collection, id)
      },
      async remove() { requireThat(false, 'BONUS_AUTOMATIC_COMPENSATION_REJECTED') }
    }
    const stored = await persistBonusWithCategory({ userId, input, categoryId,
      existingAttributeIds: baselineAttributes, provider: guardedProvider })
    requireThat(attributeMatches(stored) && Number(stored.point_value) === 0.7, 'BONUS_PERSISTENCE_UNCONFIRMED')
    report.persistence = 'PASS'
    const [reloadedAttribute, reloadedMapping] = await Promise.all([
      provider.get(ATTRIBUTE, attributeId), provider.get(MAPPING, mappingId)
    ])
    requireThat(attributeMatches(reloadedAttribute) && Number(reloadedAttribute.point_value) === 0.7 &&
      mappingMatches(reloadedMapping), 'BONUS_RELOAD_UNCONFIRMED')
    report.reload = 'PASS'
    await verify()
  } catch (error) {
    primaryFailure = failureCode(error)
  }

  if (report.createsAttempted) {
    if (!attributeId || (mappingAttempted && !mappingId)) {
      report.cleanup = 'UNCONFIRMED'
      report.cleanupFailure = 'BONUS_CLEANUP_ID_UNCONFIRMED'
    } else await cleanupBonusTestFixture({ provider, userId, attributeId, mappingId, categoryId, description, report })
  }
  if (primaryFailure) report.failure = primaryFailure
  report.status = !primaryFailure && report.cleanup === 'PASS' ? 'PASS' : report.createsAttempted ? 'FAIL' : 'BLOCKED'
  return report
}
