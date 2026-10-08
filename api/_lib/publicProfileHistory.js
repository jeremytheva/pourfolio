import { DEPLOYED_COLLECTIONS } from '../../src/data/contract.js'
import { completedRatingTotal } from '../../src/lib/completedRatingContract.js'
import { dataProvider } from './dataProvider.js'
import { isOwnedBy } from './dataPolicy.js'
import { ownerCompletedRatings } from './ratingHistoryRecords.js'

const isId = (value) => /^[1-9]\d*$/.test(String(value ?? ''))

export async function loadPublicRatingHistory(userId, { page = 1, limit = 20, ratingId = null } = {}) {
  const rows = (await ownerCompletedRatings(userId)).filter((row) => isOwnedBy(row, userId) &&
    isId(row.id) && isId(row.product_id) && String(row.date_rated || '').trim())
  if (ratingId !== null) {
    const index = rows.findIndex((row) => String(row.id) === String(ratingId))
    if (index < 0) throw Object.assign(new Error('That shared rating is unavailable.'), { status: 404, code: 'rating_not_found' })
    page = Math.floor(index / limit) + 1
  }
  const totalPages = Math.ceil(rows.length / limit)
  page = Math.min(page, Math.max(1, totalPages))

  const deadline = Date.now() + 5_000
  const reads = new Map()
  const readOnce = (collection, id) => {
    const key = `${collection}:${id}`
    if (!reads.has(key)) {
      const remaining = deadline - Date.now()
      let timer
      reads.set(key, remaining <= 0 ? Promise.resolve(null) : Promise.race([
        dataProvider.get(collection, id).catch(() => null),
        new Promise((resolve) => { timer = setTimeout(() => resolve(null), remaining) })
      ]).finally(() => clearTimeout(timer)))
    }
    return reads.get(key)
  }
  const project = async (row) => {
    const product = await readOnce(DEPLOYED_COLLECTIONS.products, row.product_id)
    let projectedProduct = null
    if (product && String(product.id) === String(row.product_id) && String(product.product_name || '').trim()) {
      let producer = null
      if (isId(product.producer_id)) {
        const record = await readOnce(DEPLOYED_COLLECTIONS.producers, product.producer_id)
        if (record && String(record.id) === String(product.producer_id) && String(record.producer_name || '').trim()) {
          producer = { id: record.id, producer_name: String(record.producer_name).trim().slice(0, 255) }
        }
      }
      projectedProduct = { id: product.id, product_name: String(product.product_name).trim().slice(0, 255), producer }
    }
    const projected = { id: row.id, product_id: row.product_id,
      date_rated: String(row.date_rated).trim().slice(0, 64), total_weighted: Number(row.total_weighted), product: projectedProduct }
    const unweighted = completedRatingTotal(row.total_unweighted)
    if (unweighted !== null) projected.total_unweighted = unweighted
    return projected
  }
  const ratings = []
  const selected = rows.slice((page - 1) * limit, page * limit)
  for (let index = 0; index < selected.length; index += 4) {
    ratings.push(...await Promise.all(selected.slice(index, index + 4).map(project)))
  }

  ratings.sort((a, b) => String(b.date_rated).localeCompare(String(a.date_rated)))
  const average = rows.length
    ? Number((rows.reduce((sum, row) => sum + Number(row.total_weighted), 0) / rows.length).toFixed(2))
    : null
  return { ratings, summary: { count: rows.length, average }, page, pageSize: limit, totalPages }
}
