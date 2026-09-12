export const BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE = 0.2
export const BONUS_ATTRIBUTE_MIN_POINT_VALUE = 0.1
export const BONUS_ATTRIBUTE_MAX_POINT_VALUE = 0.8
export const BONUS_ATTRIBUTE_POINT_STEP = 0.1
export const OVERALL_BONUS_CATEGORY = 'Overall'

const finiteNumber = (value) => {
  if (value === undefined || value === null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export const normaliseBonusCategoryKey = (value) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')

export const normaliseBonusPointValue = (value, { fallback = BONUS_ATTRIBUTE_DEFAULT_POINT_VALUE } = {}) => {
  const number = finiteNumber(value)
  if (number === null) return fallback
  return Number(number.toFixed(2))
}

export const validateCustomBonusPointValue = (value) => {
  const number = finiteNumber(value)
  if (number === null || number < BONUS_ATTRIBUTE_MIN_POINT_VALUE || number > BONUS_ATTRIBUTE_MAX_POINT_VALUE) {
    throw new Error(`Bonus attribute value must be between ${BONUS_ATTRIBUTE_MIN_POINT_VALUE} and ${BONUS_ATTRIBUTE_MAX_POINT_VALUE}.`)
  }
  const stepUnits = Math.round(number / BONUS_ATTRIBUTE_POINT_STEP)
  const stepped = Number((stepUnits * BONUS_ATTRIBUTE_POINT_STEP).toFixed(1))
  if (Math.abs(stepped - number) > 1e-9) {
    throw new Error(`Bonus attribute value must use ${BONUS_ATTRIBUTE_POINT_STEP.toFixed(1)} increments.`)
  }
  return stepped
}

export const bonusScoreFromPoints = (points) => {
  const total = finiteNumber(points) ?? 0
  if (total <= 0) return 0
  if (total < 2) return 1
  return 2
}

export const selectedBonusPointTotal = (bonusAttributes, selectedIds) => {
  const selected = new Set((selectedIds || []).map(String))
  return Number((bonusAttributes || [])
    .filter((attribute) => selected.has(String(attribute.id)))
    .reduce((sum, attribute) => sum + normaliseBonusPointValue(attribute.point_value), 0)
    .toFixed(2))
}

export const effectiveBonusPointValue = (attribute) => normaliseBonusPointValue(attribute?.point_value)

export const categoryMatchesRatingKey = (categoryName, ratingKey) => {
  const categoryKey = normaliseBonusCategoryKey(categoryName)
  const target = normaliseBonusCategoryKey(ratingKey)
  if (!categoryKey || !target) return false
  if (categoryKey === target) return true
  if (target === 'appearance' && categoryKey === 'appearence') return true
  if (target === 'follow' && ['finish', 'followfinish'].includes(categoryKey)) return true
  return false
}
