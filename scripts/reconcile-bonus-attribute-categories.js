import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { normaliseBonusCategoryKey } from '../src/lib/bonusAttributes.js'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { parseCsv } from './audit-import-references.js'

export const LIVE_BONUS_CATEGORY_CONFIRMATION = 'APPLY LIVE BONUS ATTRIBUTE CATEGORY PLAN'
export const BONUS_CATEGORY_PLAN_PATH = new URL('../data/bonus_attribute_category_plan.csv', import.meta.url)
export const CANONICAL_BONUS_CATEGORIES = Object.freeze([
  'Design',
  'Appearance',
  'Aroma',
  'Mouthfeel',
  'Flavour',
  'Follow',
  'Burp',
  'Overall'
])

const canonicalCategoryKeys = new Set(CANONICAL_BONUS_CATEGORIES.map(normaliseBonusCategoryKey))
const textValue = (value) => String(value ?? '').trim()
const comparable = (value) => textValue(value).normalize('NFKC').replace(/\s+/g, ' ').toLocaleLowerCase()
const asArray = (value) => Array.isArray(value) ? value : value ? [value] : []
const first = (value) => Array.isArray(value) ? value[0] || null : value || null
const globalRecord = (record) => !textValue(record?.user_id)

export const loadBonusCategoryPlan = (fileUrl = BONUS_CATEGORY_PLAN_PATH) => {
  const rows = parseCsv(fs.readFileSync(fileUrl, 'utf8'))
  const seenIds = new Set()
  return rows.map((row) => {
    const id = textValue(row.bonus_attribute_id)
    const description = textValue(row.description)
    const categories = textValue(row.categories).split(';').map((value) => value.trim()).filter(Boolean)
    if (!/^[1-9]\d*$/.test(id)) throw new Error(`Invalid bonus attribute ID on plan row ${row.__row}.`)
    if (seenIds.has(id)) throw new Error(`Duplicate bonus attribute ID ${id} in category plan.`)
    if (!description) throw new Error(`Missing bonus attribute description on plan row ${row.__row}.`)
    if (!categories.length) throw new Error(`Bonus attribute ${id} has no planned category.`)
    for (const category of categories) {
      if (!canonicalCategoryKeys.has(normaliseBonusCategoryKey(category))) {
        throw new Error(`Bonus attribute ${id} uses unsupported category ${category}.`)
      }
    }
    seenIds.add(id)
    return { id, description, categories: [...new Set(categories)] }
  })
}

export const buildBonusCategoryReconciliationPlan = async (planRows = loadBonusCategoryPlan()) => {
  const [attributeRows, categoryRows, mappingRows] = await Promise.all([
    dataProvider.list(COLLECTIONS.bonusAttributes),
    dataProvider.list(COLLECTIONS.bonusAttributeCategories),
    dataProvider.list(COLLECTIONS.bonusAttributeCategoryMappings)
  ])

  const attributes = asArray(attributeRows)
  const categories = asArray(categoryRows)
  const mappings = asArray(mappingRows)
  const blockers = []

  const globalAttributesById = new Map()
  for (const attribute of attributes.filter(globalRecord)) {
    const id = textValue(attribute.id)
    if (globalAttributesById.has(id)) blockers.push({ code: 'DUPLICATE_GLOBAL_BONUS_ATTRIBUTE_ID', id })
    else globalAttributesById.set(id, attribute)
  }

  const globalCategoriesByKey = new Map()
  for (const category of categories.filter(globalRecord)) {
    const key = normaliseBonusCategoryKey(category.category)
    if (!key) continue
    if (globalCategoriesByKey.has(key)) blockers.push({ code: 'DUPLICATE_GLOBAL_BONUS_CATEGORY', key })
    else globalCategoriesByKey.set(key, category)
  }

  for (const item of planRows) {
    const providerAttribute = globalAttributesById.get(item.id)
    if (!providerAttribute) {
      blockers.push({ code: 'PLANNED_BONUS_ATTRIBUTE_MISSING', id: item.id, description: item.description })
      continue
    }
    if (comparable(providerAttribute.description) !== comparable(item.description)) {
      blockers.push({
        code: 'PLANNED_BONUS_DESCRIPTION_MISMATCH',
        id: item.id,
        expected: item.description,
        actual: providerAttribute.description
      })
    }
  }

  const requiredCategories = [...new Set(planRows.flatMap((item) => item.categories))]
  const missingCategories = requiredCategories
    .filter((name) => !globalCategoriesByKey.has(normaliseBonusCategoryKey(name)))
    .map((name) => ({ name, key: normaliseBonusCategoryKey(name) }))

  const mappingKeys = new Set(mappings.filter(globalRecord).map((mapping) =>
    `${textValue(mapping.category_id)}:${textValue(mapping.bonus_attribute_id)}`
  ))
  const missingMappings = []

  for (const item of planRows) {
    if (!globalAttributesById.has(item.id)) continue
    for (const categoryName of item.categories) {
      const category = globalCategoriesByKey.get(normaliseBonusCategoryKey(categoryName))
      if (!category?.id) {
        missingMappings.push({ bonusAttributeId: item.id, categoryName, categoryId: null })
        continue
      }
      const key = `${textValue(category.id)}:${item.id}`
      if (!mappingKeys.has(key)) {
        missingMappings.push({
          bonusAttributeId: item.id,
          categoryName,
          categoryId: textValue(category.id)
        })
      }
    }
  }

  return {
    status: blockers.length ? 'BLOCKED' : 'PASS',
    planRows,
    blockers,
    missingCategories,
    missingMappings,
    mutationCount: missingCategories.length + missingMappings.length,
    providerCounts: {
      globalAttributes: globalAttributesById.size,
      globalCategories: globalCategoriesByKey.size,
      globalMappings: mappings.filter(globalRecord).length
    }
  }
}

const createMissingCategories = async (plan) => {
  for (const category of plan.missingCategories) {
    const created = first(await dataProvider.create(COLLECTIONS.bonusAttributeCategories, {
      category: category.name
    }))
    if (!created?.id) throw new Error(`Provider did not return an ID for category ${category.name}.`)
  }
}

const createMissingMappings = async (plan) => {
  for (const mapping of plan.missingMappings) {
    if (!mapping.categoryId) throw new Error(`Category ${mapping.categoryName} must exist before mapping creation.`)
    const created = first(await dataProvider.create(COLLECTIONS.bonusAttributeCategoryMappings, {
      category_id: mapping.categoryId,
      bonus_attribute_id: mapping.bonusAttributeId
    }))
    if (!created?.id) throw new Error(`Provider did not return an ID for bonus mapping ${mapping.bonusAttributeId}/${mapping.categoryName}.`)
  }
}

export const runBonusCategoryReconciliation = async ({
  apply = false,
  confirmation = '',
  expectedMutations = null,
  planRows = loadBonusCategoryPlan()
} = {}) => {
  const before = await buildBonusCategoryReconciliationPlan(planRows)
  if (before.status !== 'PASS') {
    const error = new Error('Bonus category plan does not match the provider catalogue.')
    error.plan = before
    throw error
  }

  if (!apply) {
    return {
      status: 'PASS',
      mode: 'dry-run',
      plannedAttributes: before.planRows.length,
      missingCategories: before.missingCategories.length,
      missingMappings: before.missingMappings.length,
      mutationCount: before.mutationCount,
      providerCounts: before.providerCounts
    }
  }

  if (confirmation !== LIVE_BONUS_CATEGORY_CONFIRMATION) {
    throw new Error('Exact live bonus category reconciliation confirmation is required.')
  }
  if (!Number.isSafeInteger(expectedMutations) || expectedMutations < 0) {
    throw new Error('Expected live bonus category mutation count is required.')
  }
  if (before.mutationCount !== expectedMutations) {
    throw new Error('The live bonus category mutation count changed after preflight.')
  }

  await createMissingCategories(before)
  const afterCategories = await buildBonusCategoryReconciliationPlan(planRows)
  if (afterCategories.status !== 'PASS') throw new Error('Provider catalogue changed while bonus categories were being prepared.')
  await createMissingMappings(afterCategories)

  const after = await buildBonusCategoryReconciliationPlan(planRows)
  if (after.status !== 'PASS' || after.mutationCount !== 0) {
    throw new Error('Bonus category reconciliation could not be durably verified.')
  }

  return {
    status: 'PASS',
    mode: 'apply',
    plannedAttributes: after.planRows.length,
    appliedMutations: expectedMutations,
    remainingMutations: after.mutationCount,
    providerCounts: after.providerCounts
  }
}

const requireRuntime = () => {
  if (process.env.RUN_LIVE_BONUS_CATEGORY_RECONCILIATION !== '1') {
    throw new Error('Set RUN_LIVE_BONUS_CATEGORY_RECONCILIATION=1 to run the live bonus category reconciliation command.')
  }
  for (const name of ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']) {
    if (!textValue(process.env[name])) throw new Error(`${name} is required.`)
  }
}

export const runCli = async (args = process.argv.slice(2)) => {
  requireRuntime()
  const apply = args.includes('--apply')
  const unknown = args.filter((arg) => arg !== '--apply')
  if (unknown.length) throw new Error('Only --apply is supported.')

  const expectedRaw = process.env.EXPECTED_LIVE_BONUS_CATEGORY_MUTATIONS
  const expectedMutations = expectedRaw === undefined || expectedRaw === '' ? null : Number(expectedRaw)

  const result = await runBonusCategoryReconciliation({
    apply,
    confirmation: process.env.LIVE_BONUS_CATEGORY_RECONCILIATION_CONFIRMATION || '',
    expectedMutations
  })
  process.stdout.write(`${JSON.stringify(result)}\n`)
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      status: 'BLOCKED',
      mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
      error: error?.message || 'Live bonus category reconciliation failed.',
      plan: error?.plan || undefined
    })}\n`)
    process.exitCode = 1
  })
}
