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

// Only acknowledge the requested value once the provider can read back the
// persisted row. A create response containing an ID is not proof that the
// provider saved point_value (or the intended owner).
export const persistBonusWithCategory = async ({ userId, input, categoryId, provider = dataProvider }) => {
  const created = first(await provider.create(COLLECTIONS.bonusAttributes, {
    user_id: userId,
    description: input.description,
    point_value: input.point_value
  }))
  if (!created?.id) throw new Error('The bonus attribute service did not return an identifier.')

  try {
    const stored = await provider.get(COLLECTIONS.bonusAttributes, created.id)
    if (
      !stored ||
      String(stored.id) !== String(created.id) ||
      String(stored.user_id) !== String(userId) ||
      comparable(stored.description) !== comparable(input.description) ||
      stored.point_value === null ||
      stored.point_value === undefined ||
      stored.point_value === '' ||
      Number(stored.point_value) !== input.point_value
    ) {
      const error = new Error('The saved bonus attribute could not be verified.')
      error.status = 502
      error.code = 'BONUS_ATTRIBUTE_PERSISTENCE_MISMATCH'
      throw error
    }

    const mapping = first(await provider.create(COLLECTIONS.bonusAttributeCategoryMappings, {
      user_id: userId,
      category_id: categoryId,
      bonus_attribute_id: created.id
    }))
    if (!mapping?.id) throw new Error('The bonus attribute category mapping was not created.')
    return stored
  } catch (error) {
    try { await provider.remove(COLLECTIONS.bonusAttributes, created.id) } catch { /* best effort compensation */ }
    throw error
  }
}

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

    const stored = await persistBonusWithCategory({
      userId: user.id,
      input,
      categoryId: overall.id
    })

    response.status(201).json({
      bonusAttribute: {
        ...projectBonus(stored),
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
