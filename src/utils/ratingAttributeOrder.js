export const RATING_ATTRIBUTE_DISPLAY_ORDER = Object.freeze([
  'Design',
  'Appearance',
  'Aroma',
  'Mouthfeel',
  'Flavour',
  'Follow',
  'Bonus',
  'Burp'
])

const NORMALISED_ATTRIBUTE_RANK = new Map([
  ['design', 0],
  ['packagedesign', 0],
  ['appearance', 1],
  ['appearence', 1],
  ['aroma', 2],
  ['mouthfeel', 3],
  ['mouthwash', 3],
  ['flavour', 4],
  ['flavor', 4],
  ['follow', 5],
  ['followfinish', 5],
  ['bonus', 6],
  ['burp', 7]
])

const normaliseAttributeName = (attribute) => String(
  attribute?.attribute_name ?? attribute?.name ?? ''
)
  .trim()
  .toLowerCase()
  .replace(/[^a-z]/g, '')

const attributeRank = (attribute) => NORMALISED_ATTRIBUTE_RANK.get(normaliseAttributeName(attribute))
  ?? Number.MAX_SAFE_INTEGER

export const sortRatingAttributes = (attributes) => {
  if (!Array.isArray(attributes)) return []

  return attributes
    .map((attribute, index) => ({ attribute, index }))
    .sort((left, right) => {
      const rankDifference = attributeRank(left.attribute) - attributeRank(right.attribute)
      return rankDifference || left.index - right.index
    })
    .map(({ attribute }) => attribute)
}
