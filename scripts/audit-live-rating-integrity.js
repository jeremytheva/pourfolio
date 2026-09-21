import assert from 'node:assert/strict'
import { COLLECTIONS } from '../src/data/contract.js'
import { completedRatingTotal } from '../src/lib/completedRatingContract.js'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { __testables as ratingWorkflow } from '../api/rating-data-proxy.js'
import { __testables as catalogue } from '../api/data-proxy.js'

const MAX_PAGES = 1000
const PAGE_SIZE = 100
const READ_RETRY_DELAYS_MS = [0, 250, 750]

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const readStage = async (stage, operation) => {
  let lastError
  for (const delay of READ_RETRY_DELAYS_MS) {
    if (delay) await sleep(delay)
    try {
      return await operation()
    } catch (error) {
      lastError = error
      const status = Number(error?.providerStatus ?? error?.status)
      const transient = error?.code === 'PROVIDER_ERROR' || status === 429 || status >= 500
      if (!transient) break
    }
  }

  const error = new Error(`Read-only rating audit failed during ${stage}.`)
  error.auditStage = stage
  error.providerStatus = Number(lastError?.providerStatus ?? lastError?.status) || null
  error.providerCode = lastError?.code || null
  throw error
}

const requireReadOnlyMode = () => {
  if (process.env.RUN_LIVE_RATING_INTEGRITY !== '1') {
    throw new Error('Set RUN_LIVE_RATING_INTEGRITY=1 to run the connected read-only rating audit.')
  }
  for (const name of ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']) {
    if (!String(process.env[name] || '').trim()) throw new Error(`${name} is required.`)
  }
}

const disableMutations = () => {
  const blocked = async () => {
    throw new Error('Live rating integrity audit is read-only; provider mutation was blocked.')
  }
  dataProvider.create = blocked
  dataProvider.update = blocked
  dataProvider.compareAndSet = blocked
  dataProvider.remove = blocked
}

const responseHarness = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code
    return this
  },
  json(body) {
    this.body = body
    return this
  },
  end() {
    return this
  }
})

const listAll = async (collection, filters = {}) => {
  const items = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await dataProvider.listPage(collection, {
      page,
      limit: PAGE_SIZE,
      orderBy: 'id',
      order: 'asc',
      filters
    })
    items.push(...result.items)
    if (result.totalPages === 0 || page >= result.totalPages || result.items.length < PAGE_SIZE) return items
  }
  throw new Error(`Connected rating audit exceeded ${MAX_PAGES} pages for ${collection}.`)
}

const stablePlan = (items) => (items || []).map((item) => ({
  ratingId: String(item.ratingId),
  currentState: item.currentState ?? null,
  legacyCandidate: Boolean(item.legacyCandidate),
  structurallyValid: Boolean(item.structurallyValid),
  scoreCount: Number(item.scoreCount),
  bonusCount: Number(item.bonusCount),
  proposed: item.proposed || null
})).sort((left, right) => left.ratingId.localeCompare(right.ratingId))

const roundedAverage = (values) => values.length
  ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))
  : null

const main = async () => {
  requireReadOnlyMode()
  disableMutations()

  const ratings = await readStage('ratings_inventory', () => listAll(COLLECTIONS.ratings))
  const userIds = [...new Set(ratings.map((rating) => String(rating.user_id || '').trim()).filter(Boolean))].sort()
  const completed = ratings.filter((rating) =>
    rating.submission_state === 'complete' && completedRatingTotal(rating.total_weighted) !== null
  )
  const completedByUser = new Map()
  const completedByProduct = new Map()

  for (const rating of completed) {
    const userId = String(rating.user_id)
    const productId = String(rating.product_id)
    if (!completedByUser.has(userId)) completedByUser.set(userId, [])
    if (!completedByProduct.has(productId)) completedByProduct.set(productId, [])
    completedByUser.get(userId).push(rating)
    completedByProduct.get(productId).push(rating)
  }

  let legacyEligible = 0
  let examinedByPlans = 0

  for (const userId of userIds) {
    const first = await readStage('historical_plan_first_pass', () => ratingWorkflow.historicalReconciliationPlan({ id: userId }))
    const second = await readStage('historical_plan_second_pass', () => ratingWorkflow.historicalReconciliationPlan({ id: userId }))
    assert.deepEqual(stablePlan(second), stablePlan(first), 'historical reconciliation dry-run must be idempotent')

    examinedByPlans += first.length
    legacyEligible += first.filter((item) => item.structurallyValid).length

    const response = responseHarness()
    await readStage('personal_history_projection', () => ratingWorkflow.listUserRatings(response, { id: userId }))
    assert.equal(response.statusCode, 200, 'personal completed-rating projection must succeed')

    const actualIds = (response.body?.items || []).map(({ id }) => String(id)).sort()
    const expectedIds = (completedByUser.get(userId) || []).map(({ id }) => String(id)).sort()
    assert.deepEqual(actualIds, expectedIds, 'personal history must equal the owner complete-rating set')

    const planById = new Map(first.map((item) => [String(item.ratingId), item]))
    for (const item of response.body?.items || []) {
      assert.equal(planById.get(String(item.id))?.currentState, 'complete', 'personal history must not expose incomplete rows')
    }
    for (const item of first) {
      if (item.currentState === 'pending' || item.currentState === 'failed') {
        assert.equal(actualIds.includes(String(item.ratingId)), false, 'pending/failed rows must not leak into personal history')
      }
    }
  }

  for (const [productId, productRatings] of completedByProduct) {
    const expectedTotals = productRatings
      .map((rating) => completedRatingTotal(rating.total_weighted))
      .filter((value) => value !== null)

    const actualSummary = await readStage(
      'product_aggregate_projection',
      () => catalogue.productRatingSummary(productId)
    )
    assert.deepEqual(actualSummary, {
      count: expectedTotals.length,
      average: roundedAverage(expectedTotals)
    }, 'product community aggregate must equal the complete 0-5 rating population')
  }

  const stateCounts = ratings.reduce((counts, rating) => {
    const state = String(rating.submission_state || 'legacy')
    counts[state] = (counts[state] || 0) + 1
    return counts
  }, {})

  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    mode: 'read-only',
    ratingsExamined: ratings.length,
    ownersExamined: userIds.length,
    plansExamined: examinedByPlans,
    legacyEligible,
    completedRatings: completed.length,
    productsWithCompletedRatings: completedByProduct.size,
    stateCounts
  })}\n`)
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    status: 'BLOCKED',
    mode: 'read-only',
    error: error?.message || 'Connected rating integrity audit failed.',
    stage: error?.auditStage || null,
    providerStatus: error?.providerStatus ?? null,
    providerCode: error?.providerCode || null
  })}\n`)
  process.exitCode = 1
})
