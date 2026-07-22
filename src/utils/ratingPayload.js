const ATTRIBUTE_SCORE_FIELDS = ['appearance', 'aroma', 'taste', 'mouthfeel', 'overall']

const toFiniteNumber = (value) => {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

export const getRatingAttributeScores = (mainAttributes = {}) => ATTRIBUTE_SCORE_FIELDS.reduce((scores, field) => {
  const score = toFiniteNumber(mainAttributes[field]?.score)

  if (score !== null) {
    scores[field] = score
  }

  return scores
}, {})

export const buildRatingPayload = ({
  userId,
  beverageId,
  rating,
  notes = '',
  mainAttributes = {},
  timestamp = new Date().toISOString()
}) => {
  const numericRating = toFiniteNumber(rating)

  if (!userId) {
    throw new Error('A signed-in user is required to submit a rating.')
  }

  if (!beverageId) {
    throw new Error('A beverage is required to submit a rating.')
  }

  if (numericRating === null) {
    throw new Error('A valid rating score is required.')
  }

  return {
    user_id: userId,
    beverage_id: beverageId,
    rating: numericRating,
    notes: notes.trim(),
    ...getRatingAttributeScores(mainAttributes),
    created_at: timestamp,
    updated_at: timestamp
  }
}
