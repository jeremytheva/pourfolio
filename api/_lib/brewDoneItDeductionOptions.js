import { COLLECTIONS } from '../../src/data/contract.js'
import { listAllBrewDoneItRecords } from './brewDoneItData.js'

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
const canonicalIdOrNull = (value) => {
  const text = String(value ?? '').trim()
  return /^[1-9]\d*$/.test(text) ? text : null
}

const ratedProducerKnowledge = (ratings, productsById) => {
  const producerIds = new Set()
  let complete = true
  for (const rating of list(ratings)) {
    const product = productsById.get(String(rating.product_id))
    const producerId = canonicalIdOrNull(product?.producer_id)
    if (!product || producerId === null) {
      complete = false
      continue
    }
    producerIds.add(producerId)
  }
  return { producerIds, complete }
}

/**
 * Return only deduction options backed by the currently governed catalogue.
 * Producer geography is deliberately unavailable until Pourfolio has a certified
 * canonical geography source; producer.address/suburb_id must not be parsed or
 * inferred into state/country guesses.
 */
export const getDeductionOptions = async (response, user) => {
  const [producersRaw, categoriesRaw, productsRaw, ratingsRaw] = await Promise.all([
    listAllBrewDoneItRecords(COLLECTIONS.producers),
    listAllBrewDoneItRecords(COLLECTIONS.categories),
    listAllBrewDoneItRecords(COLLECTIONS.products),
    listAllBrewDoneItRecords(COLLECTIONS.ratings, { user_id: user.id })
  ])

  const products = list(productsRaw)
  const productsById = byId(products)
  const ratingKnowledge = ratedProducerKnowledge(ratingsRaw, productsById)

  const breweries = list(producersRaw).map((producer) => {
    const producerId = canonicalIdOrNull(producer.id)
    const definitelyRated = producerId !== null && ratingKnowledge.producerIds.has(producerId)
    return {
      id: producerId,
      name: producer.producer_name,
      state: null,
      stateAcronym: null,
      country: null,
      previouslyRated: definitelyRated ? true : ratingKnowledge.complete ? false : null
    }
  }).filter((producer) => producer.id && producer.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const styles = list(categoriesRaw).map((category) => ({
    id: canonicalIdOrNull(category.id),
    name: category.category_name
  })).filter((category) => category.id && category.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const beers = products.map((product) => ({
    id: canonicalIdOrNull(product.id),
    name: product.product_name,
    producerId: canonicalIdOrNull(product.producer_id),
    categoryId: canonicalIdOrNull(product.product_category_id),
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
      previousRatingRelationshipComplete: ratingKnowledge.complete,
      style: true,
      abv: true,
      ibu: true,
      collaboration: true,
      structuredDarkTrait: false,
      structuredBarrelAgedTrait: false
    }
  })
}

export const __testables = { numericOrNull, booleanOrNull, canonicalIdOrNull, ratedProducerKnowledge }
