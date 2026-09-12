import crypto from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { OVERALL_BONUS_CATEGORY } from '../src/lib/bonusAttributes.js'
import { requireSessionUser } from './_lib/authSession.js'
import { ensureOverallCategory, loadBonusCatalogue } from './_lib/bonusAttributeCatalogue.js'
import { dataProvider } from './_lib/dataProvider.js'
import { projectBonus, sanitiseCustomBonusAttributeInput } from './_lib/dataPolicy.js'
import { enforceOrigin, enforceRateLimit, enforceRequestSize, safeErrorMessage } from './_lib/httpSecurity.js'
import { runtimeTelemetry, safeCorrelationId, writeTelemetryError } from './_lib/telemetry.js'

const first = (value) => (Array.isArray(value) ? value[0] || null : value || null)
const comparable = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()

export default async function handler(request, response) {
  const correlationId = safeCorrelationId(request.headers?.['x-request-id'], crypto.randomUUID)
  response.setHeader('X-Request-Id', correlationId)
  response.setHeader('Cache-Control', 'no-store')
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!enforceRequestSize(request, response) || !enforceOrigin(request, response)) return
  if (!enforceRateLimit(request, response, { key: 'data-write', limit: 60 })) return

  try {
    const user = await requireSessionUser(request)
    const input = sanitiseCustomBonusAttributeInput(request.body)
    const current = await loadBonusCatalogue(user.id)
    if (current.bonusAttributes.some((attribute) => comparable(attribute.description) === comparable(input.description))) {
      const error = new Error('That bonus attribute already exists.')
      error.status = 409
      throw error
    }

    const overall = await ensureOverallCategory(user.id)
    if (!overall?.id) throw new Error('The Overall bonus category could not be prepared.')

    const created = first(await dataProvider.create(COLLECTIONS.bonusAttributes, {
      user_id: user.id,
      description: input.description,
      point_value: input.point_value
    }))
    if (!created?.id) throw new Error('The bonus attribute service did not return an identifier.')

    try {
      const mapping = first(await dataProvider.create(COLLECTIONS.bonusAttributeCategoryMappings, {
        user_id: user.id,
        category_id: overall.id,
        bonus_attribute_id: created.id
      }))
      if (!mapping?.id) throw new Error('The bonus attribute category mapping was not created.')
    } catch (error) {
      try { await dataProvider.remove(COLLECTIONS.bonusAttributes, created.id) } catch { /* best effort compensation */ }
      throw error
    }

    response.status(201).json({
      bonusAttribute: {
        ...projectBonus(created),
        effective_point_value: input.point_value,
        category_keys: ['overall']
      },
      category: { key: 'overall', name: OVERALL_BONUS_CATEGORY }
    })
  } catch (error) {
    const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500
    if (status >= 500) writeTelemetryError(runtimeTelemetry({
      route_template: '/api/nocodebackend/bonus-attributes',
      method: request.method,
      status_class: `${Math.floor(status / 100)}xx`,
      event_name: error.name === 'AbortError' ? 'provider_timeout' : 'gateway_failure',
      correlation_id: correlationId
    }))
    response.status(status).json(error.payload || {
      error: status < 500 && error.message ? error.message : safeErrorMessage(status),
      code: error.code,
      requestId: correlationId
    })
  }
}
