import { DEPLOYED_COLLECTIONS } from '../../src/data/contract.js'
import { completedRatingTotal } from '../../src/lib/completedRatingContract.js'
import { dataProvider } from './dataProvider.js'
import { isOwnedBy } from './dataPolicy.js'

const isId = (value) => /^[1-9]\d*$/.test(String(value ?? ''))

export async function loadPublicRatingHistory(userId) {
  const raw = await dataProvider.list(DEPLOYED_COLLECTIONS.ratings, {
    user_id: userId,
    submission_state: 'complete'
  })
  const rows = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .filter((row) => isOwnedBy(row, userId))
    .filter((row) => row.submission_state === 'complete')

  const ratings = []
  for (const row of rows) {
    const weighted = completedRatingTotal(row.total_weighted)
    if (!isId(row.id) || !isId(row.product_id) || !row.date_rated || weighted === null) continue
    const product = await dataProvider.get(DEPLOYED_COLLECTIONS.products, row.product_id)
    if (!product || !isId(product.id) || !String(product.product_name || '').trim()) continue
    let producer = null
    if (isId(product.producer_id)) {
      const record = await dataProvider.get(DEPLOYED_COLLECTIONS.producers, product.producer_id)
      if (record && isId(record.id) && String(record.producer_name || '').trim()) {
        producer = { id: record.id, producer_name: String(record.producer_name).trim().slice(0, 255) }
      }
    }
    const projected = {
      id: row.id,
      product_id: row.product_id,
      date_rated: String(row.date_rated).trim().slice(0, 64),
      total_weighted: weighted,
      product: { id: product.id, product_name: String(product.product_name).trim().slice(0, 255), producer }
    }
    const unweighted = completedRatingTotal(row.total_unweighted)
    if (unweighted !== null) projected.total_unweighted = unweighted
    ratings.push(projected)
  }

  ratings.sort((a, b) => String(b.date_rated).localeCompare(String(a.date_rated)))
  const average = ratings.length
    ? Number((ratings.reduce((sum, row) => sum + row.total_weighted, 0) / ratings.length).toFixed(2))
    : null
  return { ratings, summary: { count: ratings.length, average } }
}
