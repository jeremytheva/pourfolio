export const POURFOLIO_RATING_FORMULA_VERSION = 'v1'

export const RATING_DIMENSIONS = Object.freeze([
  { key: 'design', label: 'Design', max: 7, weight: 0.10 },
  { key: 'appearance', label: 'Appearance', max: 7, weight: 0.10 },
  { key: 'aroma', label: 'Aroma', max: 7, weight: 0.15 },
  { key: 'mouthfeel', label: 'Mouthfeel', max: 7, weight: 0.15 },
  { key: 'flavour', label: 'Flavour', max: 7, weight: 0.30 },
  { key: 'follow', label: 'Follow', max: 7, weight: 0.10 },
  { key: 'bonus', label: 'Bonus', max: 2, weight: 0.07, min: 0 },
  { key: 'burp', label: 'Burp', max: 1, weight: 0.03, min: 0 }
])

const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

export function normaliseRatingDimension(key, value) {
  const dimension = RATING_DIMENSIONS.find((item) => item.key === key)
  if (!dimension || !finiteNumber(value)) return null

  const min = dimension.min ?? 1
  if (value < min || value > dimension.max) return null
  if (key === 'burp' && value !== 0 && value !== 1) return null

  return value / dimension.max
}

export function calculateRatingTotals(scores) {
  if (!scores || typeof scores !== 'object') return null

  const normalised = {}
  for (const dimension of RATING_DIMENSIONS) {
    const value = normaliseRatingDimension(dimension.key, scores[dimension.key])
    if (value === null) return null
    normalised[dimension.key] = value
  }

  const unweighted = 5 * (
    RATING_DIMENSIONS.reduce((sum, dimension) => sum + normalised[dimension.key], 0) /
    RATING_DIMENSIONS.length
  )

  const weighted = 5 * RATING_DIMENSIONS.reduce(
    (sum, dimension) => sum + normalised[dimension.key] * dimension.weight,
    0
  )

  return { weighted, unweighted, normalised }
}

export function formatRatingTotal(value) {
  return finiteNumber(value) ? value.toFixed(2) : '—'
}
