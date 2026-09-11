import { ApiError, apiRequest } from '../lib/nocodeBackend.js'
import { validateCataloguePage } from './catalogueResponse.js'

const INVALID_STYLE_ID_MESSAGE = 'Style identifier is invalid.'
const INVALID_STYLE_ID_CODE = 'invalid_style_identifier'
const INVALID_STYLE_DATA_MESSAGE = 'The server returned inconsistent style data. Please try again.'
const INVALID_STYLE_DATA_CODE = 'invalid_style_catalogue'
const STYLE_NOT_FOUND_MESSAGE = 'Style not found.'
const STYLE_NOT_FOUND_CODE = 'style_not_found'
const VERIFIED_STYLE_PAGE_SIZE = 50

export const normaliseCatalogueStyleId = (value) => {
  const identifier = typeof value === 'number'
    ? Number.isSafeInteger(value) && value > 0 ? String(value) : ''
    : value
  if (typeof identifier !== 'string' || identifier.length > 128 || !/^[1-9]\d*$/u.test(identifier)) {
    throw new ApiError(INVALID_STYLE_ID_MESSAGE, { status: 400, code: INVALID_STYLE_ID_CODE })
  }
  return identifier
}

const styleDataError = () => new ApiError(INVALID_STYLE_DATA_MESSAGE, {
  status: 502,
  code: INVALID_STYLE_DATA_CODE
})

const sameNullableId = (left, right) => {
  if ((left === null || left === undefined) && (right === null || right === undefined)) return true
  return String(left) === String(right)
}

const sameStyle = (left, right) => (
  String(left.id) === String(right.id) &&
  left.category_name === right.category_name &&
  sameNullableId(left.parent_id, right.parent_id)
)

const verifiedStyleRelationship = (product) => {
  if (!product?.category || product.product_category_id === null || product.product_category_id === undefined) return null
  if (String(product.category.id) !== String(product.product_category_id)) return null
  return product.category
}

const verifiedProducerRelationship = (product) => {
  if (!product?.producer || product.producer_id === null || product.producer_id === undefined) return null
  if (String(product.producer.id) !== String(product.producer_id)) return null
  return product.producer
}

const readAllVerifiedProducts = async () => {
  const products = []
  let page = 1
  while (true) {
    const catalogue = validateCataloguePage(
      await apiRequest(`/catalog/products?page=${page}&limit=${VERIFIED_STYLE_PAGE_SIZE}`),
      { expectedPage: page, expectedPageSize: VERIFIED_STYLE_PAGE_SIZE }
    )
    products.push(...catalogue.items)
    if (page >= catalogue.totalPages) break
    page += 1
  }
  return products
}

const verifiedStyleIndexFromProducts = (products) => {
  const styles = new Map()
  for (const product of products) {
    const style = verifiedStyleRelationship(product)
    if (!style) continue
    const key = String(style.id)
    const current = styles.get(key)
    const producer = verifiedProducerRelationship(product)

    if (current && !sameStyle(current.style, style)) throw styleDataError()

    if (current) {
      const breweryIds = new Set(current.breweryIds)
      if (producer) breweryIds.add(String(producer.id))
      styles.set(key, { ...current, productCount: current.productCount + 1, breweryIds })
      continue
    }

    styles.set(key, {
      style: Object.freeze({ ...style }),
      productCount: 1,
      breweryIds: new Set(producer ? [String(producer.id)] : [])
    })
  }

  return Object.freeze([...styles.values()]
    .map(({ style, productCount, breweryIds }) => Object.freeze({
      style,
      productCount,
      breweryCount: breweryIds.size
    }))
    .sort((left, right) => {
      const byName = left.style.category_name.localeCompare(right.style.category_name)
      return byName || Number(left.style.id) - Number(right.style.id)
    }))
}

const verifiedStyleDetailFromProducts = (products, styleId) => {
  const identifier = normaliseCatalogueStyleId(styleId)
  let canonicalStyle = null
  const relatedProducts = []
  const breweries = new Map()

  for (const product of products) {
    const style = verifiedStyleRelationship(product)
    if (!style || String(style.id) !== identifier) continue
    if (canonicalStyle && !sameStyle(canonicalStyle, style)) throw styleDataError()
    canonicalStyle ||= Object.freeze({ ...style })
    relatedProducts.push(product)

    const producer = verifiedProducerRelationship(product)
    if (producer) breweries.set(String(producer.id), producer)
  }

  if (!canonicalStyle) return null

  relatedProducts.sort((left, right) => {
    const byName = left.product_name.localeCompare(right.product_name)
    return byName || Number(left.id) - Number(right.id)
  })

  const breweryList = [...breweries.values()].sort((left, right) => {
    const byName = left.producer_name.localeCompare(right.producer_name)
    return byName || Number(left.id) - Number(right.id)
  })

  return Object.freeze({
    style: canonicalStyle,
    products: Object.freeze(relatedProducts),
    breweries: Object.freeze(breweryList)
  })
}

export const styleService = {
  async listVerifiedStyles() {
    return verifiedStyleIndexFromProducts(await readAllVerifiedProducts())
  },

  async getStyle(styleId) {
    const identifier = normaliseCatalogueStyleId(styleId)
    const detail = verifiedStyleDetailFromProducts(await readAllVerifiedProducts(), identifier)
    if (!detail) throw new ApiError(STYLE_NOT_FOUND_MESSAGE, { status: 404, code: STYLE_NOT_FOUND_CODE })
    return detail
  }
}

export const CATALOGUE_STYLE_ID_ERROR = Object.freeze({
  message: INVALID_STYLE_ID_MESSAGE,
  code: INVALID_STYLE_ID_CODE
})

export const STYLE_CATALOGUE_ERROR = Object.freeze({
  message: INVALID_STYLE_DATA_MESSAGE,
  code: INVALID_STYLE_DATA_CODE
})

export const __testables = {
  verifiedStyleIndexFromProducts,
  verifiedStyleDetailFromProducts,
  verifiedStyleRelationship,
  VERIFIED_STYLE_PAGE_SIZE
}
