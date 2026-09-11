import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const byId = (records) => new Map(records.map((record) => [String(record.id), record]))
const numericOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
const booleanOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (value === true || value === 1 || value === '1') return true
  if (value === false || value === 0 || value === '0') return false
  return null
}

/**
 * Return only deduction options backed by the currently governed catalogue.
 * Producer geography is deliberately unavailable until Pourfolio has a certified
 * canonical geography source; producer.address/suburb_id must not be parsed or
 * inferred into state/country guesses.
 */
export const getDeductionOptions = async (response, user) => {
  const [producersRaw, categoriesRaw, productsRaw, ratingsRaw] = await Promise.all([
    dataProvider.list(COLLECTIONS.producers),
    dataProvider.list(COLLECTIONS.categories),
    dataProvider.list(COLLECTIONS.products),
    dataProvider.list(COLLECTIONS.ratings, { user_id: user.id })
  ])

  const products = list(productsRaw)
  const productsById = byId(products)
  const previouslyRatedProducerIds = new Set()
  for (const rating of list(ratingsRaw)) {
    const product = productsById.get(String(rating.product_id))
    if (product?.producer_id) previouslyRatedProducerIds.add(String(product.producer_id))
  }

  const breweries = list(producersRaw).map((producer) => ({
    id: producer.id,
    name: producer.producer_name,
    state: null,
    stateAcronym: null,
    country: null,
    previouslyRated: previouslyRatedProducerIds.has(String(producer.id))
  })).filter((producer) => producer.id && producer.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const styles = list(categoriesRaw).map((category) => ({ id: category.id, name: category.category_name }))
    .filter((category) => category.id && category.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const beers = products.map((product) => ({
    id: product.id,
    name: product.product_name,
    producerId: product.producer_id ?? null,
    categoryId: product.product_category_id ?? null,
    abv: numericOrNull(product.abv),
    ibu: numericOrNull(product.ibu),
    collaboration: booleanOrNull(product.collaboration)
  })).filter((product) => product.id && product.name)

  response.status(200).json({
    breweries,
    styles,
    beers,
    capabilities: {
      geography: false,
      previousRatingRelationship: true,
      style: true,
      abv: true,
      ibu: true,
      collaboration: true,
      structuredDarkTrait: false,
      structuredBarrelAgedTrait: false
    }
  })
}

export const __testables = { numericOrNull, booleanOrNull }
