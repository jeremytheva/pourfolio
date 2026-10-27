import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { STYLE_METRICS, validStyleMetric } from '../lib/styleComparison.js'
import { normaliseCatalogueStyleId } from './styleService.js'

const text = (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 300
const sourceUrl = (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && ['www.bjcp.org', 'styles.bjcp.org', 'www.brewersassociation.org'].includes(url.hostname)
  } catch { return false }
}
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
const invalid = () => { throw new ApiError('Style references could not be verified. Please try again.', { status: 502, code: 'invalid_style_references' }) }
const deepFreeze = (value) => { if (value && typeof value === 'object') { Object.values(value).forEach(deepFreeze); Object.freeze(value) }; return value }

export const validateStyleReferences = (payload, categoryId, categoryName) => {
  if (!exactKeys(payload, ['version', 'category', 'status', 'references']) || payload.version !== 1 ||
      !exactKeys(payload.category, ['id', 'category_name']) || String(payload.category.id) !== String(categoryId) ||
      payload.category.category_name !== categoryName || !['mapped', 'unmapped'].includes(payload.status) ||
      !Array.isArray(payload.references) || payload.references.length > 10 || (payload.status === 'mapped') !== (payload.references.length > 0)) invalid()
  const ids = new Set(), guides = new Set()
  for (const reference of payload.references) {
    if (!exactKeys(reference, ['id', 'guideId', 'code', 'name', 'sourceUrl', 'verifiedAt', 'metrics', 'guide']) ||
        !text(reference.id) || ids.has(reference.id) || (reference.code !== null && !text(reference.code)) || !text(reference.name) ||
        !sourceUrl(reference.sourceUrl) || !/^\d{4}-\d{2}-\d{2}$/.test(reference.verifiedAt) ||
        !exactKeys(reference.guide, ['id', 'label', 'edition', 'sourceUrl', 'attribution']) ||
        reference.guideId !== reference.guide.id || guides.has(reference.guideId) || !text(reference.guide.id) ||
        !text(reference.guide.label) || typeof reference.guide.edition !== 'string' || !/^\d{4}$/.test(reference.guide.edition) || !sourceUrl(reference.guide.sourceUrl) || !text(reference.guide.attribution) ||
        !exactKeys(reference.metrics, ['abv', 'ibu']) || STYLE_METRICS.some(({ key, unit, max }) => !validStyleMetric(reference.metrics[key], unit, max))) invalid()
    ids.add(reference.id); guides.add(reference.guideId)
  }
  return deepFreeze(structuredClone(payload))
}

export const styleReferenceService = {
  async getForCategory(categoryId, categoryName) {
    const id = normaliseCatalogueStyleId(categoryId)
    return validateStyleReferences(await apiRequest(`/catalog/style-references/${id}`), id, categoryName)
  }
}
