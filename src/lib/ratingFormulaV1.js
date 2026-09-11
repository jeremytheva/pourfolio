export const POURFOLIO_RATING_FORMULA_VERSION = 'v2'

export const DEFAULT_RATING_WEIGHTS = Object.freeze({
  appearance: 0.10,
  aroma: 0.10,
  mouthfeel: 0.20,
  flavour: 0.25,
  follow: 0.25,
  bonus: 0.10
})

export const RATING_DIMENSIONS = Object.freeze([
  { key: 'appearance', aliases: ['appearence'], label: 'Appearance', max: 7, weight: DEFAULT_RATING_WEIGHTS.appearance, scored: true },
  { key: 'aroma', label: 'Aroma', max: 7, weight: DEFAULT_RATING_WEIGHTS.aroma, scored: true },
  { key: 'mouthfeel', label: 'Mouthfeel', max: 7, weight: DEFAULT_RATING_WEIGHTS.mouthfeel, scored: true },
  { key: 'flavour', label: 'Flavour', max: 7, weight: DEFAULT_RATING_WEIGHTS.flavour, scored: true },
  { key: 'follow', aliases: ['followfinish', 'finish'], label: 'Follow', max: 7, weight: DEFAULT_RATING_WEIGHTS.follow, scored: true },
  { key: 'bonus', label: 'Bonus', min: 0, max: 2, weight: DEFAULT_RATING_WEIGHTS.bonus, scored: true },
  { key: 'design', aliases: ['packagedesign'], label: 'Design', max: 7, weight: 0, scored: false },
  { key: 'burp', label: 'Burp', min: 0, max: 1, weight: 0, scored: false }
])

export const SCORING_DIMENSIONS = Object.freeze(RATING_DIMENSIONS.filter((dimension) => dimension.scored))
export const FUN_DIMENSIONS = Object.freeze(RATING_DIMENSIONS.filter((dimension) => !dimension.scored))

const finiteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const round = (value, places = 2) => Number(value.toFixed(places))

const compactKey = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

export function canonicalRatingKey(value) {
  const candidate = compactKey(value)
  const dimension = RATING_DIMENSIONS.find((item) => item.key === candidate || item.aliases?.includes(candidate))
  return dimension?.key ?? null
}

export function ratingDimension(value) {
  const key = canonicalRatingKey(value)
  return key ? RATING_DIMENSIONS.find((dimension) => dimension.key === key) || null : null
}

export function normaliseRatingDimension(key, value) {
  const dimension = ratingDimension(key)
  const number = Number(value)
  if (!dimension || !Number.isFinite(number) || !Number.isInteger(number)) return null
  const min = dimension.min ?? 1
  if (number < min || number > dimension.max) return null
  return number / dimension.max
}

export function sanitiseRatingWeights(weights = DEFAULT_RATING_WEIGHTS) {
  const source = weights && typeof weights === 'object' && !Array.isArray(weights) ? weights : {}
  const result = {}

  for (const dimension of SCORING_DIMENSIONS) {
    const raw = source[dimension.key] ?? dimension.weight
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error('Rating weights must be numbers from 0 to 1.')
    }
    result[dimension.key] = value
  }

  if (Object.values(result).every((weight) => weight === 0)) {
    throw new Error('At least one rating attribute must have a positive weight.')
  }
  return result
}

const calculateWeightedTotal = (normalised, weights) => {
  const positiveWeightTotal = SCORING_DIMENSIONS.reduce((sum, dimension) => sum + weights[dimension.key], 0)
  if (positiveWeightTotal <= 0) return null

  let weightedSum = 0
  for (const dimension of SCORING_DIMENSIONS) {
    const weight = weights[dimension.key]
    if (weight <= 0) continue
    const value = normalised[dimension.key]
    if (!finiteNumber(value)) return null
    weightedSum += value * weight
  }
  return 5 * weightedSum / positiveWeightTotal
}

export function calculateRatingTotals(scores, weights = DEFAULT_RATING_WEIGHTS) {
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) return null

  let personalisedWeights
  try {
    personalisedWeights = sanitiseRatingWeights(weights)
  } catch {
    return null
  }

  const normalised = {}
  for (const dimension of RATING_DIMENSIONS) {
    const raw = scores[dimension.key]
    if (raw === undefined || raw === null || raw === '') continue
    const value = normaliseRatingDimension(dimension.key, raw)
    if (value === null) return null
    normalised[dimension.key] = value
  }

  const weighted = calculateWeightedTotal(normalised, personalisedWeights)
  if (!finiteNumber(weighted)) return null
  const standard = calculateWeightedTotal(normalised, DEFAULT_RATING_WEIGHTS)

  return {
    weighted,
    standard,
    unweighted: standard,
    scoreOutOf100: weighted * 20,
    normalised,
    weights: personalisedWeights
  }
}

export function scoreOutOf100(score) {
  const value = Number(score)
  return Number.isFinite(value) && value >= 0 && value <= 5 ? round(value * 20, 2) : null
}

export function normalisePriceTo375(price, volumeMl) {
  const amount = Number(price)
  const volume = Number(volumeMl)
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(volume) || volume <= 0) return null
  return amount * 375 / volume
}

export function adjustableDollarScore(price375) {
  const price = Number(price375)
  if (!Number.isFinite(price) || price <= 0) return null
  if (price < 6) return 10
  if (price < 8) return 10.33
  if (price < 10) return 10.66
  if (price < 15) return 11
  if (price < 20) return 12
  if (price < 25) return 13
  if (price < 30) return 14
  return 15 + Math.floor((price - 30) / 2.5)
}

export function calculatePPP(score, price, volumeMl) {
  const rating = Number(score)
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) return null
  const price375 = normalisePriceTo375(price, volumeMl)
  const dollarScore = adjustableDollarScore(price375)
  if (dollarScore === null) return null
  return round((rating / dollarScore) * 375, 2)
}

export function calculateScaledScore(score, population) {
  const value = Number(score)
  if (!Number.isFinite(value) || value < 0 || value > 5 || !Array.isArray(population)) return null
  const values = population.map(Number).filter((item) => Number.isFinite(item) && item >= 0 && item <= 5)
  if (!values.length) return null
  if (values.length === 1 || values.every((item) => item === values[0])) return 50

  const lower = values.filter((item) => item < value).length
  const equal = values.filter((item) => item === value).length
  const averageRank = lower + (equal > 0 ? (equal + 1) / 2 : 1)
  return round(100 * (averageRank - 1) / (values.length - 1), 2)
}

export function buildAdvancedScore({ score, population = [], retailPrice, purchasePrice, volumeMl } = {}) {
  return {
    score_out_of_100: scoreOutOf100(score),
    scaled_score: calculateScaledScore(score, population),
    retail_ppp: calculatePPP(score, retailPrice, volumeMl),
    purchased_ppp: calculatePPP(score, purchasePrice, volumeMl)
  }
}

export function formatRatingTotal(value) {
  return finiteNumber(value) ? value.toFixed(2) : '—'
}
