const BUCKET_WIDTH = 0.5
const BUCKET_COUNT = 10

const roundBoundary = (value) => Number(value.toFixed(1))

export const COMPLETED_RATING_MIN_EXCLUSIVE = 0
export const COMPLETED_RATING_MAX_INCLUSIVE = 5

export const RATING_DISTRIBUTION_BUCKETS = Object.freeze(
  Array.from({ length: BUCKET_COUNT }, (_, index) => {
    const minExclusive = roundBoundary(index * BUCKET_WIDTH)
    const maxInclusive = roundBoundary((index + 1) * BUCKET_WIDTH)
    return Object.freeze({
      key: `${minExclusive.toFixed(1)}-${maxInclusive.toFixed(1)}`,
      label: `${minExclusive === 0 ? '>0' : minExclusive.toFixed(1)}–${maxInclusive.toFixed(1)}`,
      minExclusive,
      maxInclusive
    })
  })
)

export const completedRatingTotal = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number > COMPLETED_RATING_MIN_EXCLUSIVE && number <= COMPLETED_RATING_MAX_INCLUSIVE
    ? number
    : null
}

export const isCompletedRatingTotal = (value) => completedRatingTotal(value) !== null

export const distributionBucketForRating = (value) => {
  const total = completedRatingTotal(value)
  if (total === null) return null
  return RATING_DISTRIBUTION_BUCKETS.find((bucket) => total > bucket.minExclusive && total <= bucket.maxInclusive) || null
}

export const buildCompletedRatingDistribution = (values) => {
  const counts = new Map(RATING_DISTRIBUTION_BUCKETS.map((bucket) => [bucket.key, 0]))
  for (const value of Array.isArray(values) ? values : []) {
    const bucket = distributionBucketForRating(value)
    if (bucket) counts.set(bucket.key, counts.get(bucket.key) + 1)
  }
  return RATING_DISTRIBUTION_BUCKETS.map((bucket) => ({ ...bucket, count: counts.get(bucket.key) }))
}
