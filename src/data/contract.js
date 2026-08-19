export const COLLECTIONS = Object.freeze({
  profiles: 'profiles',
  products: 'products',
  producers: 'producers',
  productProducers: 'product_producers',
  categories: 'categories',
  ratings: 'ratings',
  ratingScores: 'rating_scores',
  ratingAttributes: 'rating_attributes',
  bonusAttributes: 'bonus_attributes',
  bonusRatingMappings: 'bonus_attribute_rating_mapping',
  cellar: 'cellar',
  brewDoneItGames: 'brew_done_it_games',
  brewDoneItRounds: 'brew_done_it_rounds',
  brewDoneItGuesses: 'brew_done_it_guesses',
  brewDoneItHistoryQuestions: 'brew_done_it_history_questions',
  blockedRelationships: 'blocked_relationships'
})

export const SCORE_RANGE = Object.freeze({ min: 1, max: 7 })

export const NULLABLE_CELLAR_RELATIONSHIPS = Object.freeze([
  'sharing_series_id',
  'series_version_id'
])

export const PROFILE_EDITABLE_FIELDS = Object.freeze([
  'name',
  'description',
  'avatar_url'
])

export const CELLAR_EDITABLE_FIELDS = Object.freeze([
  'product_id',
  'location_id',
  'quantity',
  'mls',
  'container',
  'purchase_price',
  'retail_price',
  'date_received',
  'sharing_series_id',
  'series_version_id',
  'purchase_location_id',
  'purchased_by_id',
  'gift',
  'gift_from',
  'bet_id',
  'notes',
  'status',
  'quantity_acquired',
  'date_consumed',
  'acquisition_type',
  'historical_import'
])

export const normaliseNullableId = (value) => {
  if (value === undefined || value === null || value === '') return null
  if (value === 0 || value === '0') {
    throw new Error('Optional relationship identifiers must be null when not applicable.')
  }
  return value
}

export const pickFields = (record, fields) => {
  if (!record || typeof record !== 'object') return null

  return fields.reduce((result, field) => {
    if (record[field] !== undefined) result[field] = record[field]
    return result
  }, {})
}