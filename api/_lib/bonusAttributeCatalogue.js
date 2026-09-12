import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import {
  BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE,
  OVERALL_BONUS_CATEGORY,
  effectiveBonusPointValue,
  normaliseBonusCategoryKey
} from '../../src/lib/bonusAttributes.js'
import { dataProvider } from './dataProvider.js'
import { projectBonus } from './dataPolicy.js'

const records = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .filter((item) => item && typeof item === 'object')

const visibleToUser = (record, userId) => {
  const owner = String(record?.user_id ?? '').trim()
  return !owner || owner === String(userId)
}

const categoryOrder = new Map([
  ['design', 0],
  ['appearance', 1],
  ['appearence', 1],
  ['aroma', 2],
  ['mouthfeel', 3],
  ['flavour', 4],
  ['follow', 5],
  ['finish', 5],
  ['bonus', 6],
  ['burp', 7],
  ['overall', 100]
])

const compareCategories = (left, right) => {
  const leftOrder = categoryOrder.get(left.key) ?? 50
  const rightOrder = categoryOrder.get(right.key) ?? 50
  return leftOrder - rightOrder || left.name.localeCompare(right.name)
}

export const loadBonusCatalogue = async (userId) => {
  const [attributeRows, categoryRows, mappingRows] = await Promise.all([
    dataProvider.list(COLLECTIONS.bonusAttributes),
    dataProvider.list(COLLECTIONS.bonusAttributeCategories),
    dataProvider.list(COLLECTIONS.bonusAttributeCategoryMappings)
  ])

  const attributes = records(attributeRows).filter((record) => visibleToUser(record, userId))
  const categories = records(categoryRows).filter((record) => visibleToUser(record, userId))
  const mappings = records(mappingRows).filter((record) => visibleToUser(record, userId))

  const visibleAttributeIds = new Set(attributes.map((record) => String(record.id)))
  const categoryById = new Map(categories.map((record) => [String(record.id), record]))
  const categoryNamesByAttribute = new Map()

  for (const mapping of mappings) {
    const attributeId = String(mapping.bonus_attribute_id ?? '')
    const category = categoryById.get(String(mapping.category_id ?? ''))
    if (!visibleAttributeIds.has(attributeId) || !category) continue
    const name = String(category.category ?? '').trim()
    if (!name) continue
    const names = categoryNamesByAttribute.get(attributeId) || []
    if (!names.some((candidate) => normaliseBonusCategoryKey(candidate) === normaliseBonusCategoryKey(name))) {
      names.push(name)
    }
    categoryNamesByAttribute.set(attributeId, names)
  }

  const categoryMap = new Map()
  const bonusAttributes = attributes.map((record) => {
    const projected = projectBonus(record)
    const names = categoryNamesByAttribute.get(String(record.id)) || [OVERALL_BONUS_CATEGORY]
    const categoryKeys = []
    for (const name of names) {
      const key = normaliseBonusCategoryKey(name) || 'overall'
      if (!categoryKeys.includes(key)) categoryKeys.push(key)
      if (!categoryMap.has(key)) categoryMap.set(key, { key, name: name || OVERALL_BONUS_CATEGORY })
    }
    return {
      ...projected,
      effective_point_value: effectiveBonusPointValue(projected),
      category_keys: categoryKeys
    }
  }).sort((left, right) => String(left.description || '').localeCompare(String(right.description || '')))

  if (bonusAttributes.length && !categoryMap.has('overall') && bonusAttributes.some((attribute) => attribute.category_keys.includes('overall'))) {
    categoryMap.set('overall', { key: 'overall', name: OVERALL_BONUS_CATEGORY })
  }

  return {
    bonusAttributes,
    bonusCategories: [...categoryMap.values()].sort(compareCategories),
    defaultPointValue: BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE
  }
}

export const findOverallCategory = async (userId) => {
  const categories = records(await dataProvider.list(COLLECTIONS.bonusAttributeCategories))
    .filter((record) => visibleToUser(record, userId))
  return categories.find((record) => normaliseBonusCategoryKey(record.category) === 'overall') || null
}

export const ensureOverallCategory = async (userId) => {
  const existing = await findOverallCategory(userId)
  if (existing) return existing
  const created = await dataProvider.create(COLLECTIONS.bonusAttributeCategories, {
    user_id: userId,
    category: OVERALL_BONUS_CATEGORY
  })
  return Array.isArray(created) ? created[0] || null : created || null
}

export const __testables = { visibleToUser, compareCategories }
