import { COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'

const list = (value) => (Array.isArray(value) ? value : value ? [value] : []).filter((item) => item && typeof item === 'object')
const byId = (records) => new Map(records.map((record) => [String(record.id), record]))

export const getDeductionOptions = async (response, user) => {
  const [producersRaw, categoriesRaw, productsRaw, ratingsRaw, suburbsRaw, postcodesRaw, statesRaw, countriesRaw] = await Promise.all([
    dataProvider.list(COLLECTIONS.producers),
    dataProvider.list(COLLECTIONS.categories),
    dataProvider.list(COLLECTIONS.products),
    dataProvider.list(COLLECTIONS.ratings, { user_id: user.id }),
    dataProvider.list(COLLECTIONS.suburbs),
    dataProvider.list(COLLECTIONS.postcode),
    dataProvider.list(COLLECTIONS.states),
    dataProvider.list(COLLECTIONS.countries)
  ])

  const products = list(productsRaw)
  const productsById = byId(products)
  const suburbs = byId(list(suburbsRaw))
  const postcodes = byId(list(postcodesRaw))
  const states = byId(list(statesRaw))
  const countries = byId(list(countriesRaw))
  const previouslyRatedProducerIds = new Set()
  for (const rating of list(ratingsRaw)) {
    const product = productsById.get(String(rating.product_id))
    if (product?.producer_id) previouslyRatedProducerIds.add(String(product.producer_id))
  }

  const breweries = list(producersRaw).map((producer) => {
    const suburb = suburbs.get(String(producer.suburb_id))
    const postcode = postcodes.get(String(suburb?.postcode_id))
    const state = states.get(String(postcode?.state_id))
    const country = countries.get(String(state?.country_id))
    return {
      id: producer.id,
      name: producer.producer_name,
      state: state?.state || null,
      stateAcronym: state?.state_acronym || null,
      country: country?.country_name || null,
      previouslyRated: previouslyRatedProducerIds.has(String(producer.id))
    }
  }).filter((producer) => producer.id && producer.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const styles = list(categoriesRaw).map((category) => ({ id: category.id, name: category.category_name }))
    .filter((category) => category.id && category.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  const beers = products.map((product) => ({
    id: product.id,
    name: product.product_name,
    producerId: product.producer_id ?? null,
    categoryId: product.product_category_id ?? null,
    abv: Number.isFinite(Number(product.abv)) ? Number(product.abv) : null,
    ibu: Number.isFinite(Number(product.ibu)) ? Number(product.ibu) : null,
    collaboration: product.collaboration === true || Number(product.collaboration) === 1
  })).filter((product) => product.id && product.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  response.status(200).json({ breweries, styles, beers })
}
