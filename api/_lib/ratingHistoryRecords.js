import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { completedRatingTotal } from '../../src/lib/completedRatingContract.js'
import { dataProvider } from './dataProvider.js'
import { isOwnedBy } from './dataPolicy.js'

export const isCompletedRating = (rating) => rating?.submission_state === 'complete' &&
  completedRatingTotal(rating?.total_weighted) !== null && !rating?.deleted_at

export async function readRatingRows(collection, filters) {
  const rows = []
  const seen = new Set()
  for (let page = 1; page <= 1000; page += 1) {
    const result = await dataProvider.listPage(collection, { page, limit: 100, orderBy: 'id', order: 'asc', filters })
    for (const row of result.items || []) {
      if (!row || !/^[1-9]\d*$/.test(String(row.id ?? '')) || seen.has(String(row.id))) {
        throw Object.assign(new Error('The rating service returned invalid records.'), { status: 502 })
      }
      seen.add(String(row.id))
      if (Object.entries(filters).every(([key, value]) => String(row[key] ?? '') === String(value))) rows.push(row)
    }
    if (!result.totalPages || page >= result.totalPages) return rows
  }
  throw Object.assign(new Error('The rating service exceeded its pagination limit.'), { status: 502 })
}

export async function ownerCompletedRatings(userId, productId = null) {
  const rows = await readRatingRows(COLLECTIONS.ratings, { user_id: userId })
  return rows.filter((row) => isOwnedBy(row, userId) && isCompletedRating(row) &&
    (!productId || String(row.product_id) === String(productId)))
    .sort((a, b) => String(b.date_rated || '').localeCompare(String(a.date_rated || '')) || Number(b.id) - Number(a.id))
}

export async function ratingChildren(collection, rating) {
  const rows = await readRatingRows(collection, { rating_id: String(rating.id) })
  if (rows.some((row) => String(row.user_id ?? '').trim() && !isOwnedBy(row, rating.user_id))) {
    throw Object.assign(new Error('The rating details could not be verified.'), { status: 409, code: 'RATING_CHILD_OWNERSHIP_CONFLICT' })
  }
  return rows
}
