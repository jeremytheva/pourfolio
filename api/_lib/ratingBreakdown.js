import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { canonicalRatingKey } from '../../src/lib/ratingFormulaV1.js'
import { sortRatingAttributes } from '../../src/utils/ratingAttributeOrder.js'
import { dataProvider } from './dataProvider.js'
import { ratingChildren } from './ratingHistoryRecords.js'

const visibleDefinition = (record, owner) => record &&
  (!String(record.user_id ?? '').trim() || String(record.user_id) === String(owner))
const named = (name) => ({ appearance: 'Appearance', aroma: 'Aroma', mouthfeel: 'Mouthfeel',
  flavour: 'Flavour', follow: 'Follow', bonus: 'Bonus', design: 'Design', burp: 'Burp' })[canonicalRatingKey(name)] || String(name).trim()

export async function loadRatingBreakdown(rating) {
  const [scores, mappings] = await Promise.all([
    ratingChildren(COLLECTIONS.ratingScores, rating), ratingChildren(COLLECTIONS.bonusRatingMappings, rating)
  ])
  const reads = new Map()
  const definition = (collection, id) => {
    if (!/^[1-9]\d*$/.test(String(id ?? ''))) return Promise.resolve(null)
    const key = `${collection}:${id}`
    if (!reads.has(key)) reads.set(key, dataProvider.get(collection, id))
    return reads.get(key)
  }
  const projected = []
  const attributes = new Set()
  let incomplete = false
  for (const row of scores) {
    const attribute = await definition(COLLECTIONS.ratingAttributes, row.attribute_id)
    const score = row.attribute_score === null || row.attribute_score === '' ? NaN : Number(row.attribute_score)
    if (!visibleDefinition(attribute, rating.user_id) || String(attribute.id) !== String(row.attribute_id) ||
        !String(attribute.attribute_name || '').trim() || attributes.has(String(row.attribute_id))) { incomplete = true; continue }
    const key = canonicalRatingKey(attribute.attribute_name)
    const scale = key === 'bonus' ? 2 : key === 'burp' ? 1 : 7
    if (!Number.isFinite(score) || score < (['bonus', 'burp'].includes(key) ? 0 : 1) || score > scale) { incomplete = true; continue }
    attributes.add(String(row.attribute_id))
    projected.push({ name: named(attribute.attribute_name).slice(0, 255), score, scale,
      scored: !['design', 'burp'].includes(key) && ![false, 0, '0'].includes(attribute.is_scored) })
  }
  const selections = []
  const selected = new Set()
  for (const mapping of mappings) {
    const bonus = await definition(COLLECTIONS.bonusAttributes, mapping.bonus_attribute_id)
    if (!visibleDefinition(bonus, rating.user_id) || String(bonus.id) !== String(mapping.bonus_attribute_id) ||
        !String(bonus.description || '').trim() || selected.has(String(bonus.id))) { incomplete = true; continue }
    selected.add(String(bonus.id))
    selections.push({ description: String(bonus.description).trim().slice(0, 255) })
  }
  return { scores: sortRatingAttributes(projected), selected_attributes: selections, incomplete }
}
