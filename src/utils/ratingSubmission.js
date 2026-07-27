import { SCORE_RANGE } from '../data/contract.js'

const asFiniteNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const createSubmissionId = (now = Date.now(), random = Math.random()) => {
  const timestampPart = Math.max(0, Math.floor(now)) * 1000
  const randomPart = Math.floor(Math.max(0, Math.min(0.999999, random)) * 1000)
  const id = timestampPart + randomPart

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Could not create a safe rating submission identifier.')
  }

  return id
}

export const validateRatingScores = (scores, attributes) => {
  if (!Array.isArray(scores) || !Array.isArray(attributes)) {
    throw new Error('Rating scores and attributes are required.')
  }

  const applicable = attributes.filter((attribute) => Boolean(Number(attribute.is_scored)))
  const attributeById = new Map(applicable.map((attribute) => [String(attribute.id), attribute]))
  const seen = new Set()

  const normalisedScores = scores.map((score) => {
    const attributeId = String(score?.attributeId ?? score?.attribute_id ?? '')
    const value = asFiniteNumber(score?.score ?? score?.attribute_score)

    if (!attributeById.has(attributeId)) {
      throw new Error('A rating score references an attribute that is not applicable.')
    }
    if (seen.has(attributeId)) {
      throw new Error('Each applicable rating attribute may be scored only once.')
    }
    if (!Number.isInteger(value) || value < SCORE_RANGE.min || value > SCORE_RANGE.max) {
      throw new Error(`Every applicable rating score must be an integer from ${SCORE_RANGE.min} to ${SCORE_RANGE.max}.`)
    }

    seen.add(attributeId)
    return {
      attribute_id: attributeById.get(attributeId).id,
      attribute_score: value
    }
  })

  if (seen.size !== applicable.length) {
    throw new Error('Every applicable rating attribute must have a score.')
  }

  return normalisedScores
}

export const calculateRatingTotals = (scores, attributes) => {
  const normalisedScores = validateRatingScores(scores, attributes)
  const attributeById = new Map(attributes.map((attribute) => [String(attribute.id), attribute]))
  const unweighted = normalisedScores.reduce((sum, score) => sum + score.attribute_score, 0) / normalisedScores.length
  const totalWeight = normalisedScores.reduce((sum, score) => {
    const weight = asFiniteNumber(attributeById.get(String(score.attribute_id))?.weighting)
    return sum + (weight === null ? 0 : weight)
  }, 0)

  const weighted = totalWeight > 0
    ? normalisedScores.reduce((sum, score) => {
        const weight = asFiniteNumber(attributeById.get(String(score.attribute_id))?.weighting) || 0
        return sum + score.attribute_score * weight
      }, 0) / totalWeight
    : unweighted

  return {
    scores: normalisedScores,
    total_unweighted: Number(unweighted.toFixed(2)),
    total_weighted: Number(weighted.toFixed(2))
  }
}
