import { requireSessionReviewContext } from './authSession.js'
import { createAdminAuthorizer } from './adminPolicy.js'

export const catalogueReviewCapabilities = async (request, { signal } = {}) => {
  const context = await requireSessionReviewContext(request, { signal })
  const authorize = createAdminAuthorizer({
    resolveSession: async () => context.user,
    readRole: async () => context.roleRecord
  })
  let allowed = false
  try {
    await authorize(request, { capability: 'catalogue.review', signal })
    allowed = true
  } catch (error) {
    if (error.status !== 403) throw error
  }
  return {
    version: 1, subjectId: context.user.id, capabilities: allowed ? ['catalogue.review'] : [],
    mode: 'read_only', moderationAvailable: false
  }
}
