import { ApiError } from '../lib/nocodeBackend.js'
import { normalisePublicProfileId } from './publicProfileResponse.js'

const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const only = (value, keys) => Object.keys(value).every((key) => keys.includes(key))
const positive = (value) => /^[1-9]\d*$/.test(String(value ?? ''))
const invalid = () => { throw new ApiError('Shared rating data could not be read. Please retry.', { code: 'invalid_shared_ratings' }) }
export function validateSharedRatings(payload, productId) {
  if (!object(payload) || !only(payload, ['items', 'page', 'pageSize', 'total', 'totalPages']) || !Array.isArray(payload.items)) invalid()
  const { page, pageSize, total, totalPages } = payload
  if (![page, pageSize, total, totalPages].every(Number.isSafeInteger) || page < 1 || pageSize < 1 || pageSize > 50 || total < 0 ||
      totalPages !== Math.ceil(total / pageSize) || page > Math.max(1, totalPages) ||
      payload.items.length !== Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize))) invalid()
  const seen = new Set()
  for (const item of payload.items) {
    if (!object(item) || !only(item, ['id', 'product_id', 'date_rated', 'total_weighted', 'author']) ||
        !positive(item.id) || seen.has(String(item.id)) || String(item.product_id) !== String(productId) ||
        typeof item.date_rated !== 'string' || !item.date_rated.trim() || item.date_rated.length > 64 ||
        !Number.isFinite(item.total_weighted) || item.total_weighted <= 0 || item.total_weighted > 5 ||
        !object(item.author) || !only(item.author, ['public_id', 'name']) || typeof item.author.public_id !== 'string' ||
        typeof item.author.name !== 'string' || !item.author.name.trim() || item.author.name.length > 120) invalid()
    normalisePublicProfileId(item.author.public_id)
    seen.add(String(item.id))
  }
  return payload
}
