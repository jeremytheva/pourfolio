import {
  DEFAULT_RATING_WEIGHTS,
  calculateRatingTotals as calculateFormulaTotals,
  canonicalRatingKey,
  normaliseRatingDimension,
  sanitiseRatingWeights
} from '../lib/ratingFormulaV1.js'

const round = (value) => Number(value.toFixed(2))

export const createSubmissionId = (now = Date.now(), random = Math.random()) => {
  const timestampPart = Math.max(0, Math.floor(now)) * 1000
  const randomPart = Math.floor(Math.max(0, Math.min(0.999999, random)) * 1000)
  const id = timestampPart + randomPart

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Could not create a safe rating submission identifier.')
  }

  return id
}

const providerAttributeMap = (attributes) => {
  const byId = new Map()
  const byKey = new Map()

  for (const attribute of attributes) {
    const id = String(attribute?.id ?? '').trim()
    const key = canonicalRatingKey(attribute?.attribute_name)
    if (!id || !key) continue
    if (byKey.has(key)) throw new Error('The rating form contains a duplicate rating attribute.')
    const entry = { ...attribute, key }
    byId.set(id, entry)
    byKey.set(key, entry)
  }

  return { byId, byKey }
}

export const validateRatingScores = (scores, attributes, weights = DEFAULT_RATING_WEIGHTS) => {
  if (!Array.isArray(scores) || !Array.isArray(attributes)) {
    throw new Error('Rating scores and attributes are required.')
  }

  const personalisedWeights = sanitiseRatingWeights(weights)
  const { byId, byKey } = providerAttributeMap(attributes)
  const seen = new Set()
  const normalisedScores = []
  const scoreValues = {}

  for (const score of scores) {
    const attributeId = String(score?.attributeId ?? score?.attribute_id ?? '').trim()
    const attribute = byId.get(attributeId)
    if (!attribute) throw new Error('A rating score references an attribute that is not applicable.')
    if (seen.has(attributeId)) throw new Error('Each rating attribute may be scored only once.')
    seen.add(attributeId)

    const rawValue = score?.score ?? score?.attribute_score
    if (rawValue === undefined || rawValue === null || rawValue === '') continue
    const value = Number(rawValue)
    if (normaliseRatingDimension(attribute.key, value) === null) {
      const range = attribute.key === 'bonus' ? '0 to 2' : attribute.key === 'burp' ? '0 or 1' : '1 to 7'
      throw new Error(`${attribute.attribute_name || attribute.key} must be an integer from ${range}.`)
    }

    scoreValues[attribute.key] = value
    normalisedScores.push({
      attribute_id: attribute.id,
      attribute_score: value
    })
  }

  for (const [key, weight] of Object.entries(personalisedWeights)) {
    if (weight <= 0) continue
    if (!byKey.has(key)) throw new Error('A required rating attribute is unavailable.')
    if (scoreValues[key] === undefined) {
      throw new Error('Every positively weighted rating attribute must have a score.')
    }
  }

  return { scores: normalisedScores, scoreValues, weights: personalisedWeights }
}

export const calculateRatingTotals = (scores, attributes, weights = DEFAULT_RATING_WEIGHTS) => {
  const validated = validateRatingScores(scores, attributes, weights)
  const totals = calculateFormulaTotals(validated.scoreValues, validated.weights)
  if (!totals) throw new Error('The rating total could not be calculated.')

  return {
    scores: validated.scores,
    total_unweighted: Number.isFinite(totals.standard) ? round(totals.standard) : null,
    total_weighted: round(totals.weighted),
    score_out_of_100: round(totals.scoreOutOf100),
    weights: validated.weights
  }
}
