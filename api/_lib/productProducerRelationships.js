import { sanitiseProducerCreateInput } from './dataPolicy.js'

const MAX_PRODUCT_PRODUCERS = 20
const ALLOWED_SELECTION_KEYS = new Set(['producer_id', 'new_producer'])

const inputError = (message) => {
  const error = new Error(message)
  error.status = 400
  error.code = 'CATALOGUE_INPUT_INVALID'
  return error
}

const positiveId = (value) => {
  const id = String(value ?? '').trim()
  if (!/^[1-9]\d*$/.test(id)) throw inputError('Producer identifier is invalid.')
  return id
}

const normaliseName = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/gu, ' ')

const sanitiseSelection = (value, index) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw inputError(`Producer ${index + 1} is invalid.`)
  }
  for (const key of Object.keys(value)) {
    if (!ALLOWED_SELECTION_KEYS.has(key)) throw inputError(`Producer ${index + 1} contains unsupported fields.`)
  }
  const producerId = value.producer_id === undefined || value.producer_id === null || value.producer_id === ''
    ? null
    : positiveId(value.producer_id)
  const newProducer = value.new_producer === undefined || value.new_producer === null
    ? null
    : sanitiseProducerCreateInput(value.new_producer)
  if (Boolean(producerId) === Boolean(newProducer)) {
    throw inputError(`Producer ${index + 1} must choose one existing producer or provide one new producer.`)
  }
  return producerId ? { producer_id: producerId } : { new_producer: newProducer }
}

const selectionKey = (selection) => selection.producer_id
  ? `id:${selection.producer_id}`
  : `name:${normaliseName(selection.new_producer.producer_name)}`

const primaryMatchesLegacy = (primary, legacyInput) => {
  if (primary.producer_id) return legacyInput.producer_id === primary.producer_id
  return Boolean(legacyInput.new_producer) &&
    normaliseName(legacyInput.new_producer.producer_name) === normaliseName(primary.new_producer.producer_name)
}

export const sanitiseProductProducerInputs = (body, legacyInput) => {
  if (body?.producers === undefined) return null
  if (!Array.isArray(body.producers) || body.producers.length < 1 || body.producers.length > MAX_PRODUCT_PRODUCERS) {
    throw inputError(`Products must have between 1 and ${MAX_PRODUCT_PRODUCERS} producers.`)
  }
  const selections = body.producers.map(sanitiseSelection)
  const keys = selections.map(selectionKey)
  if (new Set(keys).size !== keys.length) throw inputError('The same producer cannot be selected more than once.')
  if (!primaryMatchesLegacy(selections[0], legacyInput)) {
    throw inputError('The primary producer must match the product producer relationship list.')
  }
  return selections
}

export const buildProductProducerRows = (productId, producerIds) => producerIds.map((producerId, index) => ({
  product_id: String(productId),
  producer_id: String(producerId),
  is_primary: index === 0 ? 1 : 0,
  sort_order: index + 1
}))

export const PRODUCT_PRODUCER_LIMIT = MAX_PRODUCT_PRODUCERS
