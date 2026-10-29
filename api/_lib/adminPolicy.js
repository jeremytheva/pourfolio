import { requireSessionUser } from './authSession.js'

// Catalogue authority only. Account access, private history and scoring are
// deliberately absent. Keep this module behind the server boundary.
export const ADMIN_CAPABILITIES = Object.freeze([
  'catalogue.review',
  'catalogue.moderate',
  'catalogue.correct',
  'catalogue.audit'
])

const policyError = (status, code, message) => Object.assign(new Error(message), { status, code })
const unavailable = () => policyError(503, 'ADMIN_AUTHORITY_UNAVAILABLE', 'Administrator authority could not be verified.')
const denied = () => policyError(403, 'ADMIN_CAPABILITY_DENIED', 'Administrator permission is required.')
const unauthenticated = () => policyError(401, 'AUTH_SESSION_REQUIRED', 'Authentication is required.')
const validIdentity = (id) => typeof id === 'string' && id.length > 0 && id.length <= 200 && !/\s/.test(id)

// readRole is a server-owned adapter, not a request field. It must be certified
// to read an authoritative role by exact immutable ID before any route uses it.
// There is intentionally no default provider lookup, email allowlist or env-role
// fallback. Without an adapter, even an authenticated Admin is denied access.
export const createAdminAuthorizer = ({ resolveSession = requireSessionUser, readRole } = {}) => {
  return async (request, { capability = 'catalogue.review', signal } = {}) => {
    if (!ADMIN_CAPABILITIES.includes(capability)) throw denied()
    if (signal?.aborted) throw unavailable()

    let user
    try {
      user = await resolveSession(request, { signal })
    } catch (error) {
      if (error?.status === 401) throw unauthenticated()
      throw unavailable()
    }
    if (!user || !validIdentity(user.id)) throw unauthenticated()
    if (signal?.aborted) throw unavailable()
    if (typeof readRole !== 'function') throw unavailable()

    let record
    try {
      record = await readRole(user.id, { signal })
    } catch {
      // Adapter messages/payloads can contain credentials or private records.
      throw unavailable()
    }
    if (signal?.aborted) throw unavailable()
    if (!record || typeof record !== 'object' || Array.isArray(record) ||
        Object.keys(record).length !== 2 || !Object.hasOwn(record, 'userId') || !Object.hasOwn(record, 'role') ||
        record.userId !== user.id || typeof record.role !== 'string' || !record.role.trim() || record.role.length > 50) {
      throw unavailable()
    }
    // Exact contract value only. Normalising unverified role names could grant
    // authority to a provider value whose permission semantics differ.
    if (record.role !== 'Admin') throw denied()

    return Object.freeze({ userId: user.id, capabilities: ADMIN_CAPABILITIES })
  }
}
