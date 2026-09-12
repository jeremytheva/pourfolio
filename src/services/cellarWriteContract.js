import { CELLAR_EDITABLE_FIELDS, CELLAR_GATED_RELATIONSHIP_FIELDS } from '../data/contract.js'

const gatedRelationshipFields = new Set(CELLAR_GATED_RELATIONSHIP_FIELDS)

const requirePlainObject = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Cellar write data is invalid.')
  }
  return input
}

export const projectCellarWrite = (input, { requireProduct = false, requireAtLeastOne = false } = {}) => {
  const source = requirePlainObject(input)
  const projected = {}

  for (const field of CELLAR_GATED_RELATIONSHIP_FIELDS) {
    const value = source[field]
    if (value !== undefined && value !== null && value !== '') {
      throw new Error(`Cellar relationship ${field} is unavailable until its verified lookup capability is enabled.`)
    }
  }

  for (const field of CELLAR_EDITABLE_FIELDS) {
    if (gatedRelationshipFields.has(field)) continue
    if (source[field] !== undefined) projected[field] = source[field]
  }

  if (requireProduct && projected.product_id === undefined) {
    throw new Error('A product is required for a cellar item.')
  }
  if (requireAtLeastOne && Object.keys(projected).length === 0) {
    throw new Error('A cellar update must include at least one supported field.')
  }

  return projected
}
