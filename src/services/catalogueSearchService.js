import { beverageService } from './beverageService.js'
import { producerService } from './producerService.js'
import { styleService } from './styleService.js'

const DIRECTORY_CACHE_TTL_MS = 60_000

const producerDirectoryCache = { value: null, expiresAt: 0, pending: null }
const styleDirectoryCache = { value: null, expiresAt: 0, pending: null }

const normaliseSearchText = (value) => String(value ?? '')
  .trim()
  .toLocaleLowerCase()
  .replace(/\s+/gu, ' ')

const readCachedDirectory = async (cache, loader) => {
  const now = Date.now()
  if (cache.value !== null && now < cache.expiresAt) return cache.value
  if (cache.pending) return cache.pending

  cache.pending = loader()
    .then((value) => {
      cache.value = value
      cache.expiresAt = Date.now() + DIRECTORY_CACHE_TTL_MS
      return value
    })
    .finally(() => {
      cache.pending = null
    })

  return cache.pending
}

const loadVerifiedBreweries = () => readCachedDirectory(
  producerDirectoryCache,
  () => producerService.listVerifiedProducers()
)

const loadVerifiedStyles = () => readCachedDirectory(
  styleDirectoryCache,
  () => styleService.listVerifiedStyles()
)

export const filterVerifiedBreweries = (breweries, query) => {
  const needle = normaliseSearchText(query)
  if (!needle) return []
  return breweries.filter(({ producer }) => normaliseSearchText([
    producer?.producer_name,
    producer?.address
  ].filter(Boolean).join(' ')).includes(needle))
}

export const filterVerifiedStyles = (styles, query) => {
  const needle = normaliseSearchText(query)
  if (!needle) return []
  return styles.filter(({ style }) => normaliseSearchText(style?.category_name).includes(needle))
}

export const catalogueSearchService = {
  async search({ query = '', page = 1, limit = 24 } = {}) {
    const search = String(query ?? '').trim()
    if (!search) {
      return {
        products: await beverageService.getProducts({ page, limit }),
        breweries: [],
        styles: [],
        availability: Object.freeze({ beers: true, breweries: true, styles: true })
      }
    }

    const [productsResult, breweriesResult, stylesResult] = await Promise.allSettled([
      beverageService.getProducts({ search, page, limit }),
      loadVerifiedBreweries(),
      loadVerifiedStyles()
    ])

    return {
      products: productsResult.status === 'fulfilled' ? productsResult.value : null,
      breweries: breweriesResult.status === 'fulfilled'
        ? filterVerifiedBreweries(breweriesResult.value, search)
        : [],
      styles: stylesResult.status === 'fulfilled'
        ? filterVerifiedStyles(stylesResult.value, search)
        : [],
      availability: Object.freeze({
        beers: productsResult.status === 'fulfilled',
        breweries: breweriesResult.status === 'fulfilled',
        styles: stylesResult.status === 'fulfilled'
      })
    }
  }
}

export const __testables = {
  normaliseSearchText,
  DIRECTORY_CACHE_TTL_MS
}
