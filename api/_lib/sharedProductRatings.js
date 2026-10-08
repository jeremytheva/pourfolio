import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { findOwnedProfile, profileHistoryIsPublic, projectPublicProfile } from './profileStore.js'
import { isCompletedRating, readRatingRows } from './ratingHistoryRecords.js'

export async function loadSharedProductRatings(productId, viewerId, { page = 1, limit = 20 } = {}) {
  const rows = (await readRatingRows(COLLECTIONS.ratings, { product_id: String(productId) }))
    .filter((row) => isCompletedRating(row) && String(row.date_rated ?? '').trim() &&
      String(row.user_id ?? '').trim() && String(row.user_id) !== String(viewerId))
  const profiles = new Map()
  const deadline = Date.now() + 5_000
  const unavailable = () => Object.assign(new Error('Shared tastings are temporarily unavailable. Please retry.'), { status: 503 })
  const owners = [...new Set(rows.map((row) => String(row.user_id)))]
  for (let index = 0; index < owners.length; index += 4) {
    await Promise.all(owners.slice(index, index + 4).map(async (owner) => {
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw unavailable()
      let timer
      try {
        const record = await Promise.race([
          findOwnedProfile(owner),
          new Promise((resolve, reject) => { timer = setTimeout(() => reject(unavailable()), remaining) })
        ])
        profiles.set(owner, record)
      } finally { clearTimeout(timer) }
    }))
  }
  const items = []
  for (const row of rows) {
    const owner = String(row.user_id)
    const record = profiles.get(owner)
    if (!record || !profileHistoryIsPublic(record.rating_history_public)) continue
    const author = projectPublicProfile(record)
    items.push({ id: row.id, product_id: row.product_id, date_rated: String(row.date_rated).trim().slice(0, 64),
      total_weighted: Number(row.total_weighted),
      author: { public_id: author.public_id, name: author.name } })
  }
  items.sort((a, b) => String(b.date_rated).localeCompare(String(a.date_rated)) || Number(b.id) - Number(a.id))
  page = Math.min(page, Math.max(1, Math.ceil(items.length / limit)))
  return { items: items.slice((page - 1) * limit, page * limit), page, pageSize: limit,
    total: items.length, totalPages: Math.ceil(items.length / limit) }
}
