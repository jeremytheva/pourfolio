import { DEPLOYED_COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from './dataProvider.js'
import { isOwnedBy } from './dataPolicy.js'

const isId = (value) => /^[1-9]\d*$/.test(String(value ?? ''))
const isScore = (value) => Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 7

export async function loadPublicRatingHistory(userId) {
  const raw = await dataProvider.list(DEPLOYED_COLLECTIONS.ratings, { user_id: userId })
  const rows = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .filter((row) => isOwnedBy(row, userId))
    .filter((row) => !row.submission_state || row.submission_state === 'complete')

  const ratings = []
  for (const row of rows) {
    if (!isId(row.id) || !isId(row.product_id) || !row.date_rated || !isScore(row.total_unweighted) || !isScore(row.total_weighted)) continue
    const product = await dataProvider.get(DEPLOYED_COLLECTIONS.products, row.product_id)
    if (!product || !isId(product.id) || !String(product.product_name || '').trim()) continue
    let producer = null
    if (isId(product.producer_id)) {
      const record = await dataProvider.get(DEPLOYED_COLLECTIONS.producers, product.producer_id)
      if (record && isId(record.id) && String(record.producer_name || '').trim()) {
        producer = { id: record.id, producer_name: String(record.producer_name).trim().slice(0, 255) }
      }
    }
    ratings.push({
      id: row.id,
      product_id: row.product_id,
      date_rated: String(row.date_rated).trim().slice(0, 64),
      total_unweighted: Number(row.total_unweighted),
      total_weighted: Number(row.total_weighted),
      product: { id: product.id, product_name: String(product.product_name).trim().slice(0, 255), producer }
    })
  }

  ratings.sort((a, b) => String(b.date_rated).localeCompare(String(a.date_rated)))
  const average = ratings.length ? Number((ratings.reduce((sum, row) => sum + row.total_weighted, 0) / ratings.length).toFixed(2)) : null
  return { ratings, summary: { count: ratings.length, average } }
}
