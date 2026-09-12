import assert from 'node:assert/strict'
import test from 'node:test'

import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../_lib/dataProvider.js'
import { __testables } from '../rating-data-proxy.js'

const complete = (rating) => ({ submission_state: 'complete', ...rating })

const withProviderList = async (replacement, callback) => {
  const original = dataProvider.list
  dataProvider.list = replacement
  try { await callback() } finally { dataProvider.list = original }
}

test('gateway builds overall and verified-style populations from the same completed rating set', async () => {
  const calls = []
  await withProviderList(async (collection, filters = {}) => {
    calls.push({ collection, filters })
    if (collection === COLLECTIONS.ratings) return [
      complete({ id: 1, product_id: 4, total_weighted: 4 }),
      complete({ id: 2, product_id: 5, total_weighted: 5 }),
      complete({ id: 3, product_id: 6, total_weighted: 5 }),
      { id: 4, product_id: 4, total_weighted: 5, submission_state: 'pending' }
    ]
    if (collection === COLLECTIONS.products) return [
      { id: 4, product_category_id: 10 },
      { id: 5, product_category_id: 10 },
      { id: 6, product_category_id: 11 },
      { id: 999, product_category_id: 10 }
    ]
    if (collection === COLLECTIONS.categories) return [
      { id: 10, category_name: 'Pale Ale' },
      { id: 11, category_name: 'Stout' },
      { id: 999, category_name: 'Leaked category' }
    ]
    return []
  }, async () => {
    const populations = await __testables.scorePopulations()

    assert.deepEqual(populations.overall, [4, 5, 5])
    assert.deepEqual(populations.styleIndex.styleScores.get('10'), [4, 5])
    assert.deepEqual(populations.styleIndex.styleScores.get('11'), [5])
    assert.equal(populations.styleIndex.productStyleIds.has('999'), false)

    const productFilters = calls.find(({ collection }) => collection === COLLECTIONS.products)?.filters
    const categoryFilters = calls.find(({ collection }) => collection === COLLECTIONS.categories)?.filters
    assert.equal(productFilters['id[in]'], '4,5,6')
    assert.equal(categoryFilters['id[in]'], '10,11')

    const pale = __testables.advancedFor(complete({ product_id: 4, total_weighted: 4 }), populations)
    assert.equal(pale.scaled_score, 0)
    assert.equal(pale.style_scaled_score, 0)
    assert.equal(pale.style_sample_size, 2)
    assert.equal(pale.style_id, '10')
    assert.equal(pale.style_rank_text_eligible, false)

    const stout = __testables.advancedFor(complete({ product_id: 6, total_weighted: 5 }), populations)
    assert.equal(stout.style_scaled_score, 50)
    assert.equal(stout.style_sample_size, 1)
  })
})

test('gateway leaves style score unavailable when canonical category evidence is absent', async () => {
  await withProviderList(async (collection) => {
    if (collection === COLLECTIONS.ratings) return [complete({ id: 1, product_id: 4, total_weighted: 4 })]
    if (collection === COLLECTIONS.products) return [{ id: 4, product_category_id: 10 }]
    if (collection === COLLECTIONS.categories) return []
    return []
  }, async () => {
    const populations = await __testables.scorePopulations()
    const advanced = __testables.advancedFor(complete({ product_id: 4, total_weighted: 4 }), populations)

    assert.equal(advanced.scaled_score, 50)
    assert.equal(advanced.style_scaled_score, null)
    assert.equal(advanced.style_sample_size, 0)
    assert.equal(advanced.style_id, null)
  })
})
