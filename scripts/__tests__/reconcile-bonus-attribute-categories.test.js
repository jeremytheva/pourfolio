import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../../src/data/contract.js'
import { dataProvider } from '../../api/_lib/dataProvider.js'
import {
  LIVE_BONUS_CATEGORY_CONFIRMATION,
  buildBonusCategoryReconciliationPlan,
  runBonusCategoryReconciliation
} from '../reconcile-bonus-attribute-categories.js'

const originalProviderMethods = { ...dataProvider }

afterEach(() => {
  Object.assign(dataProvider, originalProviderMethods)
})

const planRows = [
  { id: '10', description: 'Aroma pop', categories: ['Aroma'] },
  { id: '11', description: 'Long finish', categories: ['Follow'] },
  { id: '12', description: 'Style wow', categories: ['Overall'] },
  { id: '13', description: 'Resin layers', categories: ['Aroma', 'Follow'] }
]

const fixture = () => ({
  attributes: [
    { id: 10, user_id: null, description: 'Aroma pop' },
    { id: 11, user_id: null, description: 'Long finish' },
    { id: 12, user_id: null, description: 'Style wow' },
    { id: 13, user_id: null, description: 'Resin layers' },
    { id: 99, user_id: 'owner-1', description: 'Personal wow' }
  ],
  categories: [
    { id: 20, user_id: null, category: 'Aroma' },
    { id: 21, user_id: null, category: 'Overall' }
  ],
  mappings: [
    { id: 30, user_id: null, category_id: 20, bonus_attribute_id: 10 },
    { id: 31, user_id: null, category_id: 21, bonus_attribute_id: 12 }
  ],
  nextId: 100
})

const installProvider = (state) => {
  const creates = []
  dataProvider.list = async (collection) => {
    if (collection === COLLECTIONS.bonusAttributes) return state.attributes
    if (collection === COLLECTIONS.bonusAttributeCategories) return state.categories
    if (collection === COLLECTIONS.bonusAttributeCategoryMappings) return state.mappings
    assert.fail(`Unexpected collection: ${collection}`)
  }
  dataProvider.create = async (collection, body) => {
    const record = { id: state.nextId++, user_id: null, ...body }
    creates.push({ collection, body: { ...body } })
    if (collection === COLLECTIONS.bonusAttributeCategories) state.categories.push(record)
    else if (collection === COLLECTIONS.bonusAttributeCategoryMappings) state.mappings.push(record)
    else assert.fail(`Unexpected create collection: ${collection}`)
    return record
  }
  return creates
}

test('bonus category reconciliation dry-run reports missing canonical categories and mappings without writes', async () => {
  const state = fixture()
  const creates = installProvider(state)

  const plan = await buildBonusCategoryReconciliationPlan(planRows)
  const result = await runBonusCategoryReconciliation({ planRows })

  assert.equal(plan.status, 'PASS')
  assert.deepEqual(plan.missingCategories.map((category) => category.name), ['Follow'])
  assert.equal(plan.missingMappings.length, 3)
  assert.equal(result.mode, 'dry-run')
  assert.equal(result.mutationCount, 4)
  assert.equal(creates.length, 0)
})

test('bonus category reconciliation apply adds only missing categories/mappings and verifies idempotently', async () => {
  const state = fixture()
  const creates = installProvider(state)

  const result = await runBonusCategoryReconciliation({
    apply: true,
    confirmation: LIVE_BONUS_CATEGORY_CONFIRMATION,
    expectedMutations: 4,
    planRows
  })

  assert.equal(result.status, 'PASS')
  assert.equal(result.appliedMutations, 4)
  assert.equal(result.remainingMutations, 0)
  assert.equal(creates.filter((entry) => entry.collection === COLLECTIONS.bonusAttributeCategories).length, 1)
  assert.equal(creates.filter((entry) => entry.collection === COLLECTIONS.bonusAttributeCategoryMappings).length, 3)

  const rerun = await runBonusCategoryReconciliation({ planRows })
  assert.equal(rerun.mutationCount, 0)
})

test('bonus category reconciliation blocks provider catalogue drift before mutation', async () => {
  const state = fixture()
  state.attributes[0] = { ...state.attributes[0], description: 'Changed descriptor' }
  const creates = installProvider(state)

  await assert.rejects(
    runBonusCategoryReconciliation({
      apply: true,
      confirmation: LIVE_BONUS_CATEGORY_CONFIRMATION,
      expectedMutations: 4,
      planRows
    }),
    /does not match the provider catalogue/
  )
  assert.equal(creates.length, 0)
})

test('bonus category reconciliation requires exact apply confirmation and mutation preflight', async () => {
  const state = fixture()
  const creates = installProvider(state)

  await assert.rejects(
    runBonusCategoryReconciliation({
      apply: true,
      confirmation: 'yes',
      expectedMutations: 4,
      planRows
    }),
    /Exact live bonus category reconciliation confirmation/
  )

  await assert.rejects(
    runBonusCategoryReconciliation({
      apply: true,
      confirmation: LIVE_BONUS_CATEGORY_CONFIRMATION,
      expectedMutations: 3,
      planRows
    }),
    /mutation count changed/
  )
  assert.equal(creates.length, 0)
})
