import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { canonicalRatingKey } from '../src/lib/ratingFormulaV1.js'
import { requireSessionUser } from './_lib/authSession.js'
import { dataProvider } from './_lib/dataProvider.js'
import { projectAttribute, projectBonus } from './_lib/dataPolicy.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const records = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')

const positiveId = (value) => {
  const id = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(id)) {
    const error = new Error('Product identifier is invalid.')
    error.status = 400
    throw error
  }
  return id
}

const productProjection = async (product) => {
  let producer = null
  if (product.producer_id && String(product.producer_id) !== '0') {
    producer = await dataProvider.get(COLLECTIONS.producers, product.producer_id)
  }
  return {
    id: product.id,
    product_name: product.product_name,
    producer: producer ? { id: producer.id, producer_name: producer.producer_name } : null
  }
}

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, { key: 'data-read', limit: 240 })) return

  try {
    await requireSessionUser(request)
    const productId = positiveId(request.query?.product_id)
    const [product, attributes, bonuses] = await Promise.all([
      dataProvider.get(COLLECTIONS.products, productId),
      dataProvider.list(COLLECTIONS.ratingAttributes),
      dataProvider.list(COLLECTIONS.bonusAttributes)
    ])
    if (!product) {
      response.status(404).json({ error: 'Product not found.' })
      return
    }

    response.status(200).json({
      product: await productProjection(product),
      attributes: records(attributes)
        .filter((attribute) => canonicalRatingKey(attribute.attribute_name))
        .map(projectAttribute),
      bonusAttributes: records(bonuses).map(projectBonus)
    })
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/rating-form', method: request.method,
      status_class: `${Math.floor(status / 100)}xx`, event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure',
      correlation_id: correlationId
    }))
    response.status(status).json(error.payload || {
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code,
      requestId: correlationId
    })
  }
}
