import catalogueHandler from './catalog-data-proxy.js'
import cellarHandler from './cellar-data-proxy.js'
import currentSchemaHandler from './current-data-proxy.js'
import profileHandler from './profile-data-proxy.js'
import ratingHandler from './rating-data-proxy.js'
import brewDoneItHandler from './_lib/brewDoneItEntry.js'

const CURRENT_SCHEMA_RESOURCES = new Set(['catalog', 'rating-form', 'ratings', 'cellar'])
const DEFERRED_CAPABILITY_RESOURCES = new Set(['brew-done-it'])
// Compatibility export for existing structural tests; Brew Done It no longer
// enters api/data-proxy.js and is handled by its dedicated deferred gateway.
const LEGACY_RESOURCES = DEFERRED_CAPABILITY_RESOURCES

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
  if (resource === 'profile' || resource === 'profiles') return profileHandler(request, response)
  if (resource === 'ratings') return ratingHandler(request, response)
  if (CURRENT_SCHEMA_RESOURCES.has(resource)) return currentSchemaHandler(request, response)
  if (DEFERRED_CAPABILITY_RESOURCES.has(resource)) return brewDoneItHandler(request, response)

  response.status(404).json({ error: 'Application data route not found.' })
}

export default async function handler(request, response) {
  return routeRequest(request, response)
}

export const __testables = {
  CURRENT_SCHEMA_RESOURCES,
  DEFERRED_CAPABILITY_RESOURCES,
  LEGACY_RESOURCES,
  routeRequest
}
