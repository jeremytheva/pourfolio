import { enforceOrigin, enforceRateLimit, enforceRequestSize } from '../_lib/httpSecurity.js'
import { releaseProvenance } from '../_lib/releaseProvenance.js'
import { runUserAdminCertification } from '../_lib/userAdminCertification.js'

export const USER_ADMIN_CERTIFICATION_CONFIRMATION = 'RUN READ-ONLY USER ADMIN CERTIFICATION'

const isProtectedPreviewCandidate = (environment = process.env) => (
  environment.VERCEL === '1' && environment.VERCEL_ENV === 'preview'
)

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('X-Robots-Tag', 'noindex')

  if (!isProtectedPreviewCandidate()) {
    response.status(404).json({ error: 'Not found.' })
    return
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }

  if (!enforceRequestSize(request, response, 2 * 1024) ||
      !enforceOrigin(request, response) ||
      !enforceRateLimit(request, response, {
        key: 'user-admin-certification',
        limit: 3,
        windowMs: 5 * 60_000
      })) return

  if (request.body?.confirmation !== USER_ADMIN_CERTIFICATION_CONFIRMATION) {
    response.status(400).json({ error: 'Certification confirmation is invalid.' })
    return
  }

  const report = await runUserAdminCertification({ release: releaseProvenance() })
  const status = report.overall === 'FAIL' ? 502 : report.overall === 'SETUP_REQUIRED' ? 503 : 200
  response.status(status).json(report)
}

export const __testables = { isProtectedPreviewCandidate }
