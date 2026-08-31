import { COLLECTIONS } from '../src/data/contract.js'
import { dataProvider } from './_lib/dataProvider.js'
import { releaseProvenance } from './_lib/releaseProvenance.js'

const providerState = (error) => {
  if (['DATA_CONFIGURATION_MISSING', 'DATA_CONFIGURATION_INVALID', 'DATA_CREDENTIAL_MISSING', 'DATA_INSTANCE_MISSING'].includes(error?.code)) return 'misconfigured'
  if (error?.code === 'DATA_PROVIDER_UNAUTHENTICATED') return 'unauthenticated'
  if (error?.code === 'DATA_PROVIDER_FORBIDDEN') return 'forbidden'
  if (error?.status === 404) return 'contract-mismatch'
  return 'unavailable'
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ status: 'error', error: 'Method not allowed.' })
    return
  }

  const release = releaseProvenance()

  try {
    await dataProvider.listPage(COLLECTIONS.products, {
      page: 1,
      limit: 1,
      orderBy: 'id',
      order: 'asc'
    })
    response.status(200).json({
      status: 'ready',
      release,
      checks: { dataProvider: 'ok' }
    })
  } catch (error) {
    response.status(503).json({
      status: 'degraded',
      release,
      checks: { dataProvider: providerState(error) }
    })
  }
}

export const __testables = { providerState }
