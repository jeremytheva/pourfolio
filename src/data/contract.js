export const DEPLOYED_COLLECTIONS = Object.freeze({
  products: 'products',
  producers: 'producers',
  categories: 'categories',
  ratings: 'ratings',
  ratingScores: 'rating_scores',
  ratingAttributes: 'rating_attributes',
  bonusAttributes: 'bonus_attributes',
  bonusAttributeCategories: 'bonus_attribute_categories',
  bonusAttributeCategoryMappings: 'bonus_attribute_category_mapping',
  bonusRatingMappings: 'bonus_attribute_rating_mapping',
  cellar: 'cellar',
  profiles: 'profiles'
})

// These names describe approved target/prototype capabilities only. They are not
// part of the provider-evidenced launch schema and active launch routes must not
// depend on them until a governed migration/capability verification promotes them.
export const DEFERRED_COLLECTIONS = Object.freeze({
  productProducers: 'product_producers',
  brewDoneItGames: 'brew_done_it_games',
  brewDoneItRounds: 'brew_done_it_rounds',
  brewDoneItGuesses: 'brew_done_it_guesses',
  brewDoneItDeductions: 'brew_done_it_deductions',
  // Legacy v2 collection retained only for backwards compatibility while the
  // contained deduction-board model is developed. New v3 gameplay does not
  // persist natural-language/conversational questions as scored actions.
  brewDoneItQuestions: 'brew_done_it_questions',
  // Retained only for the unreachable pre-ADR-0002 prototype.
  brewDoneItHistoryQuestions: 'brew_done_it_history_questions',
  blockedRelationships: 'blocked_relationships'
})

// Compatibility map for explicitly deferred/legacy code. Launch-facing code should
// import DEPLOYED_COLLECTIONS so undeployed targets cannot be used by accident.
export const COLLECTIONS = Object.freeze({
  ...DEPLOYED_COLLECTIONS,
  ...DEFERRED_COLLECTIONS
})

export const SCORE_RANGE = Object.freeze({ min: 1, max: 7 })

export const NULLABLE_CELLAR_RELATIONSHIPS = Object.freeze([
  'sharing_series_id',
  'series_version_id'
])

export const PROFILE_EDITABLE_FIELDS = Object.freeze([
  'name',
  'description',
  'avatar_url',
  'rating_history_public'
])

// Exact browser-writable subset of the supplied 54026_rating `cellar` table.
// Provider/server-owned id, secret_key and user_id are intentionally excluded.
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
  'notes'
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
