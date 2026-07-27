import {
  CELLAR_EDITABLE_FIELDS,
  NULLABLE_CELLAR_RELATIONSHIPS,
  PROFILE_EDITABLE_FIELDS,
  normaliseNullableId,
  pickFields
} from '../../src/data/contract.js'

export const PRODUCT_FIELDS = Object.freeze([
  'id',
  'product_name',
  'product_category_id',
  'producer_id',
  'abv',
  'ibu',
  'declared_category',
  'edition',
  'collaboration',
  'product_image'
])

export const PRODUCER_FIELDS = Object.freeze(['id', 'producer_name', 'address', 'suburb_id'])
export const CATEGORY_FIELDS = Object.freeze(['id', 'category_name', 'parent_id'])
export const RATING_FIELDS = Object.freeze(['id', 'rating_id', 'product_id', 'cellar_id', 'date_rated', 'total_unweighted', 'total_weighted'])
export const ATTRIBUTE_FIELDS = Object.freeze(['id', 'category_id', 'attribute_name', 'is_scored', 'weighting'])
export const BONUS_FIELDS = Object.freeze(['id', 'description', 'point_value'])
export const PROFILE_FIELDS = Object.freeze(['id', 'name', 'description', 'avatar_url'])

const asOptionalNumber = (value, { integer = false, min, max } = {}) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || (integer && !Number.isInteger(number))) {
    throw new Error('A numeric field is invalid.')
  }
  if (min !== undefined && number < min) throw new Error('A numeric field is below its allowed minimum.')
  if (max !== undefined && number > max) throw new Error('A numeric field is above its allowed maximum.')
  return number
}

export const sanitiseProfileUpdates = (input) => {
  const updates = pickFields(input, PROFILE_EDITABLE_FIELDS) || {}

  if (updates.name !== undefined) {
    updates.name = String(updates.name).trim().slice(0, 120)
    if (!updates.name) throw new Error('Profile name is required.')
  }
  if (updates.description !== undefined) updates.description = String(updates.description).trim().slice(0, 1000)
  if (updates.avatar_url !== undefined) updates.avatar_url = String(updates.avatar_url).trim().slice(0, 2048)

  return updates
}

export const sanitiseCellarInput = (input, { partial = false } = {}) => {
  const result = pickFields(input, CELLAR_EDITABLE_FIELDS) || {}

  if (!partial && !result.product_id) throw new Error('A product is required.')
  if (result.product_id !== undefined) result.product_id = normaliseNullableId(result.product_id)
  if (result.location_id !== undefined) result.location_id = normaliseNullableId(result.location_id)
  if (result.purchase_location_id !== undefined) result.purchase_location_id = normaliseNullableId(result.purchase_location_id)
  if (result.bet_id !== undefined) result.bet_id = normaliseNullableId(result.bet_id)
  for (const field of NULLABLE_CELLAR_RELATIONSHIPS) {
    if (result[field] !== undefined) result[field] = normaliseNullableId(result[field])
  }

  if (result.quantity !== undefined) result.quantity = asOptionalNumber(result.quantity, { integer: true, min: 0, max: 10000 })
  if (result.mls !== undefined) result.mls = asOptionalNumber(result.mls, { integer: true, min: 0, max: 100000 })
  if (result.purchase_price !== undefined) result.purchase_price = asOptionalNumber(result.purchase_price, { min: 0, max: 1000000 })
  if (result.retail_price !== undefined) result.retail_price = asOptionalNumber(result.retail_price, { min: 0, max: 1000000 })
  if (result.gift !== undefined) result.gift = result.gift ? 1 : 0

  for (const field of ['container', 'gift_from', 'notes', 'purchased_by_id']) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = String(result[field]).trim().slice(0, field === 'notes' ? 255 : 120)
    }
  }

  if (result.date_received !== undefined && result.date_received !== null && result.date_received !== '') {
    const date = new Date(result.date_received)
    if (Number.isNaN(date.getTime())) throw new Error('Date received is invalid.')
    result.date_received = date.toISOString().slice(0, 10)
  }

  return result
}

export const projectProduct = (record, producer = null, category = null) => ({
  ...pickFields(record, PRODUCT_FIELDS),
  producer: pickFields(producer, PRODUCER_FIELDS),
  category: pickFields(category, CATEGORY_FIELDS)
})

export const projectRating = (record) => pickFields(record, RATING_FIELDS)
export const projectAttribute = (record) => pickFields(record, ATTRIBUTE_FIELDS)
export const projectBonus = (record) => pickFields(record, BONUS_FIELDS)
export const projectProfile = (record) => pickFields(record, PROFILE_FIELDS)

export const isOwnedBy = (record, userId) => Boolean(record && String(record.user_id) === String(userId))
