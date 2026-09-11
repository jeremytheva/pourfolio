const canonicalPositiveId = (value) => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? String(value) : null
  if (typeof value !== 'string' || value.length > 128 || !/^[1-9]\d*$/u.test(value)) return null
  return value
}

const exactProduct = (rating) => {
  const ratingProductId = canonicalPositiveId(rating?.product_id)
  const productId = canonicalPositiveId(rating?.product?.id)
  if (!ratingProductId || !productId || ratingProductId !== productId) return null
  if (typeof rating.product.product_name !== 'string' || rating.product.product_name.trim() === '') return null
  return rating.product
}

const exactStyle = (product) => {
  const foreignKey = canonicalPositiveId(product?.product_category_id)
  const categoryId = canonicalPositiveId(product?.category?.id)
  if (!foreignKey || !categoryId || foreignKey !== categoryId) return null
  if (typeof product.category.category_name !== 'string' || product.category.category_name.trim() === '') return null
  return { id: categoryId, name: product.category.category_name.trim() }
}

const exactProducer = (product) => {
  const foreignKey = canonicalPositiveId(product?.producer_id)
  const producerId = canonicalPositiveId(product?.producer?.id)
  if (!foreignKey || !producerId || foreignKey !== producerId) return null
  if (typeof product.producer.producer_name !== 'string' || product.producer.producer_name.trim() === '') return null
  return { id: producerId, name: product.producer.producer_name.trim() }
}

const incrementBreakdown = (map, entity, productId) => {
  const current = map.get(entity.id) || {
    id: entity.id,
    name: entity.name,
    tastingCount: 0,
    productIds: new Set()
  }
  if (current.name !== entity.name) return false
  current.tastingCount += 1
  current.productIds.add(productId)
  map.set(entity.id, current)
  return true
}

const finishBreakdown = (map) => Object.freeze([...map.values()]
  .map(({ id, name, tastingCount, productIds }) => Object.freeze({
    id,
    name,
    tastingCount,
    uniqueProductCount: productIds.size
  }))
  .sort((left, right) => {
    const byCount = right.uniqueProductCount - left.uniqueProductCount
    if (byCount) return byCount
    const byName = left.name.localeCompare(right.name)
    return byName || Number(left.id) - Number(right.id)
  }))

export const buildTasteMapSummary = (payload) => {
  const ratings = Array.isArray(payload?.items) ? payload.items : []
  const productIds = new Set()
  const styleMap = new Map()
  const producerMap = new Map()
  const unknownStyleProducts = new Set()
  const unknownProducerProducts = new Set()
  let tastingCount = 0
  let unknownStyleTastingCount = 0
  let unknownProducerTastingCount = 0

  for (const rating of ratings) {
    const product = exactProduct(rating)
    if (!product) continue
    const productId = canonicalPositiveId(product.id)
    tastingCount += 1
    productIds.add(productId)

    const style = exactStyle(product)
    if (style) {
      if (!incrementBreakdown(styleMap, style, productId)) {
        unknownStyleTastingCount += 1
        unknownStyleProducts.add(productId)
      }
    } else {
      unknownStyleTastingCount += 1
      unknownStyleProducts.add(productId)
    }

    const producer = exactProducer(product)
    if (producer) {
      if (!incrementBreakdown(producerMap, producer, productId)) {
        unknownProducerTastingCount += 1
        unknownProducerProducts.add(productId)
      }
    } else {
      unknownProducerTastingCount += 1
      unknownProducerProducts.add(productId)
    }
  }

  const styles = finishBreakdown(styleMap)
  const breweries = finishBreakdown(producerMap)

  return Object.freeze({
    tastingCount,
    uniqueProductCount: productIds.size,
    styleCount: styles.length,
    breweryCount: breweries.length,
    unknownStyleTastingCount,
    unknownStyleProductCount: unknownStyleProducts.size,
    unknownProducerTastingCount,
    unknownProducerProductCount: unknownProducerProducts.size,
    styles,
    breweries
  })
}

export const __testables = { canonicalPositiveId, exactProduct, exactStyle, exactProducer }
