import data from '../../data/style-guidelines.json' with { type: 'json' }
import mappingData from '../../data/style-guideline-mappings.json' with { type: 'json' }
import { STYLE_METRICS, validStyleMetric } from '../../src/lib/styleComparison.js'

const idPattern = /^[a-zA-Z0-9:-]{1,100}$/
const validId = (value) => typeof value === 'string' && idPattern.test(value)
const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 300
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
export const isStyleSourceUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password &&
      ['www.bjcp.org', 'styles.bjcp.org', 'www.brewersassociation.org'].includes(url.hostname)
  } catch { return false }
}

export const auditStyleGuidelines = (dataset = data, mappings = mappingData) => {
  const fail = () => { throw new Error('The reviewed style-reference data is invalid.') }
  if (dataset?.version !== 1 || mappings?.version !== 1 || !Array.isArray(dataset.guides) || !Array.isArray(dataset.styles) || !Array.isArray(mappings.mappings)) fail()
  const guideIds = new Set(), styleIds = new Set(), categoryIds = new Set()
  for (const guide of dataset.guides) {
    if (!exactKeys(guide, ['id', 'label', 'edition', 'sourceUrl', 'attribution']) ||
        !validId(guide.id) || guideIds.has(guide.id) || !text(guide.label) || typeof guide.edition !== 'string' || !/^\d{4}$/.test(guide.edition) ||
        !isStyleSourceUrl(guide.sourceUrl) || !text(guide.attribution)) fail()
    guideIds.add(guide.id)
  }
  for (const style of dataset.styles) {
    if (!exactKeys(style, ['id', 'guideId', 'code', 'name', 'sourceUrl', 'verifiedAt', 'metrics']) ||
        !validId(style.id) || styleIds.has(style.id) || !guideIds.has(style.guideId) ||
        !text(style.name) || (style.code !== null && !text(style.code)) || !isStyleSourceUrl(style.sourceUrl) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(style.verifiedAt) || !style.metrics || Object.keys(style.metrics).length !== STYLE_METRICS.length ||
        STYLE_METRICS.some(({ key, unit, max }) => !validStyleMetric(style.metrics[key], unit, max))) fail()
    styleIds.add(style.id)
  }
  const byId = new Map(dataset.styles.map((style) => [style.id, style]))
  for (const mapping of mappings.mappings) {
    if (!Number.isSafeInteger(mapping.categoryId) || mapping.categoryId < 1 || categoryIds.has(mapping.categoryId) ||
        !text(mapping.categoryName) || !Array.isArray(mapping.referenceIds) || !mapping.referenceIds.length ||
        new Set(mapping.referenceIds).size !== mapping.referenceIds.length || mapping.referenceIds.some((id) => !styleIds.has(id))) fail()
    const guides = mapping.referenceIds.map((id) => byId.get(id).guideId)
    if (new Set(guides).size !== guides.length) fail()
    categoryIds.add(mapping.categoryId)
  }
  return { status: 'PASS', references: styleIds.size, mappings: categoryIds.size }
}

auditStyleGuidelines()

export const styleReferencesForCategory = (category) => {
  const mapping = mappingData.mappings.find((item) => String(item.categoryId) === String(category.id))
  const matched = Boolean(mapping && mapping.categoryName === category.category_name)
  return {
    version: 1,
    category: { id: category.id, category_name: category.category_name },
    status: matched ? 'mapped' : 'unmapped',
    references: matched ? mapping.referenceIds.map((id) => {
      const style = data.styles.find((item) => item.id === id)
      return { ...style, guide: data.guides.find((item) => item.id === style.guideId) }
    }) : []
  }
}
