import currentSchemaHandler from './current-data-proxy.js'
import legacyHandler from './data-proxy.js'

const CURRENT_SCHEMA_RESOURCES = new Set(['catalog', 'rating-form', 'ratings', 'cellar'])

export const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  if (!raw) return []
  return String(raw).split('/').filter(Boolean)
}

export default async function handler(request, response) {
  const [resource] = pathSegments(request)
  if (CURRENT_SCHEMA_RESOURCES.has(resource)) {
    return currentSchemaHandler(request, response)
  }
  return legacyHandler(request, response)
}

export const __testables = { CURRENT_SCHEMA_RESOURCES }
