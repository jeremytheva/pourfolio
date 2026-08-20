import catalogueHandler from './catalog-data-proxy.js'
import cellarHandler from './cellar-data-proxy.js'
import currentSchemaHandler from './current-data-proxy.js'
import legacyHandler from './data-proxy.js'
import { runWithDataRequestContext } from './_lib/dataRequestContext.js'

const CURRENT_SCHEMA_RESOURCES = new Set(['catalog', 'rating-form', 'ratings', 'cellar'])

export const pathSegments = (request) => {
  const raw = request.query?.path
  if (Array.isArray(raw)) return raw.map(String)
  if (!raw) return []
  return String(raw).split('/').filter(Boolean)
}

const routeRequest = async (request, response) => {
  const [resource] = pathSegments(request)
  if (resource === 'catalog' || resource === 'rating-form') {
    return catalogueHandler(request, response)
  }
  if (resource === 'cellar') return cellarHandler(request, response)
  if (CURRENT_SCHEMA_RESOURCES.has(resource)) {
    return currentSchemaHandler(request, response)
  }
  return legacyHandler(request, response)
}

export default async function handler(request, response) {
  return runWithDataRequestContext(request, () => routeRequest(request, response))
}

export const __testables = { CURRENT_SCHEMA_RESOURCES }
