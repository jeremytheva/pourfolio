import { pathToFileURL } from 'node:url'
import { COLLECTIONS } from '../src/data/contract.js'
import { completedRatingTotal } from '../src/lib/completedRatingContract.js'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { isOwnedBy } from '../api/_lib/dataPolicy.js'
import { __testables as ratingWorkflow } from '../api/rating-data-proxy.js'

export const LIVE_RATING_RECONCILIATION_CONFIRMATION = 'APPLY LIVE RATING RECONCILIATION'
const PAGE_SIZE = 100
const MAX_PAGES = 1000
const VERIFY_DELAYS_MS = [0, 100, 250, 500, 1000]

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const asArray = (value) => Array.isArray(value) ? value : value ? [value] : []
const first = (value) => Array.isArray(value) ? value[0] || null : value || null
const legacyIdentity = (rating, userId) => Boolean(
  isOwnedBy(rating, userId) &&
  rating.submission_state !== 'deleted' &&
  !String(rating.submission_key ?? '').trim() &&
  !String(rating.submission_fingerprint ?? '').trim()
)

const listAllRatings = async () => {
  const ratings = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await dataProvider.listPage(COLLECTIONS.ratings, {
      page,
      limit: PAGE_SIZE,
      orderBy: 'id',
      order: 'asc',
      filters: {}
    })
    const items = asArray(payload.items)
    ratings.push(...items)

    if (payload.totalPages === 0 || page >= payload.totalPages || items.length < PAGE_SIZE) return ratings
  }
  throw new Error('Live rating reconciliation exceeded the safe ratings pagination limit.')
}

const stateCountsFor = (ratings) => ratings.reduce((counts, rating) => {
  const state = String(rating.submission_state || 'legacy')
  counts[state] = (counts[state] || 0) + 1
  return counts
}, {})

const completedCount = (ratings) => ratings.filter((rating) =>
  rating.submission_state === 'complete' && completedRatingTotal(rating.total_weighted) !== null
).length

export const buildLiveRatingReconciliationPlan = async () => {
  const ratings = await listAllRatings()
  const userIds = [...new Set(ratings
    .map((rating) => String(rating.user_id || '').trim())
    .filter(Boolean))].sort()

  const plans = []
  for (const userId of userIds) {
    const items = await ratingWorkflow.historicalReconciliationPlan({ id: userId })
    plans.push(...items.map((item) => ({ ...item, userId })))
  }

  const eligible = plans.filter((item) => item.structurallyValid && item.proposed)
  return {
    ratings,
    plans,
    eligible,
    summary: {
      mode: 'dry-run',
      ratingsExamined: ratings.length,
      ownersExamined: userIds.length,
      plansExamined: plans.length,
      eligible: eligible.length,
      completedRatings: completedCount(ratings),
      ownerlessRatings: ratings.filter((rating) => !String(rating.user_id || '').trim()).length,
      stateCounts: stateCountsFor(ratings)
    }
  }
}

const verifyAppliedRating = async ({ ratingId, userId, proposed, version }) => {
  for (const delay of VERIFY_DELAYS_MS) {
    if (delay) await sleep(delay)
    const persisted = await dataProvider.get(COLLECTIONS.ratings, ratingId)
    if (!isOwnedBy(persisted, userId)) continue
    if (
      persisted.submission_key === proposed.submission_key &&
      persisted.submission_fingerprint === proposed.submission_fingerprint &&
      persisted.submission_state === 'complete' &&
      Number(persisted.submission_version) === version &&
      Number(persisted.expected_score_count) === Number(proposed.expected_score_count) &&
      Number(persisted.expected_bonus_count) === Number(proposed.expected_bonus_count)
    ) return persisted
  }
  throw new Error('A reconciled rating could not be durably verified.')
}

const applyPlannedRating = async (item) => {
  const current = await dataProvider.get(COLLECTIONS.ratings, item.ratingId)
  if (!legacyIdentity(current, item.userId)) {
    throw new Error('A planned legacy rating changed before reconciliation could be applied.')
  }
  if (completedRatingTotal(current.total_weighted) === null) {
    throw new Error('A planned legacy rating no longer has a valid completed total.')
  }

  const currentVersion = Number(current.submission_version)
  const nextVersion = Number.isSafeInteger(currentVersion) && currentVersion >= 0 ? currentVersion + 1 : 1
  const body = {
    ...item.proposed,
    submission_version: nextVersion
  }

  const acknowledgement = first(await dataProvider.update(COLLECTIONS.ratings, current.id, body))
  if (
    acknowledgement &&
    String(acknowledgement.id ?? current.id) === String(current.id) &&
    acknowledgement.submission_key === body.submission_key &&
    acknowledgement.submission_fingerprint === body.submission_fingerprint &&
    acknowledgement.submission_state === 'complete' &&
    Number(acknowledgement.submission_version) === nextVersion &&
    Number(acknowledgement.expected_score_count) === Number(body.expected_score_count) &&
    Number(acknowledgement.expected_bonus_count) === Number(body.expected_bonus_count)
  ) return acknowledgement

  return verifyAppliedRating({
    ratingId: current.id,
    userId: item.userId,
    proposed: body,
    version: nextVersion
  })
}

export const runLiveRatingReconciliation = async ({
  apply = false,
  confirmation = '',
  expectedEligible = null
} = {}) => {
  const before = await buildLiveRatingReconciliationPlan()

  if (!apply) return { status: 'PASS', ...before.summary }

  if (confirmation !== LIVE_RATING_RECONCILIATION_CONFIRMATION) {
    throw new Error('Exact live rating reconciliation confirmation is required.')
  }
  if (!Number.isSafeInteger(expectedEligible) || expectedEligible < 0) {
    throw new Error('The expected eligible rating count is required for live reconciliation.')
  }
  if (before.eligible.length !== expectedEligible) {
    throw new Error('The live eligible rating count changed after preflight.')
  }

  const newlyCompleted = before.eligible.filter((item) => item.currentState !== 'complete').length
  let applied = 0
  for (const item of before.eligible) {
    await applyPlannedRating(item)
    applied += 1
  }

  const after = await buildLiveRatingReconciliationPlan()
  if (after.eligible.length !== 0) {
    throw new Error('Eligible legacy ratings remain after reconciliation.')
  }
  if (after.summary.completedRatings < before.summary.completedRatings + newlyCompleted) {
    throw new Error('Completed rating count did not increase by the reconciled population.')
  }

  return {
    status: 'PASS',
    mode: 'apply',
    preflightEligible: before.eligible.length,
    applied,
    remainingEligible: after.eligible.length,
    ratingsExaminedBefore: before.summary.ratingsExamined,
    ratingsExaminedAfter: after.summary.ratingsExamined,
    completedRatingsBefore: before.summary.completedRatings,
    completedRatingsAfter: after.summary.completedRatings,
    stateCountsBefore: before.summary.stateCounts,
    stateCountsAfter: after.summary.stateCounts
  }
}

const requireRuntime = () => {
  if (process.env.RUN_LIVE_RATING_RECONCILIATION !== '1') {
    throw new Error('Set RUN_LIVE_RATING_RECONCILIATION=1 to run the live rating reconciliation command.')
  }
  for (const name of ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']) {
    if (!String(process.env[name] || '').trim()) throw new Error(`${name} is required.`)
  }
}

export const runCli = async (args = process.argv.slice(2)) => {
  requireRuntime()
  const apply = args.includes('--apply')
  const unknown = args.filter((arg) => arg !== '--apply')
  if (unknown.length) throw new Error('Only --apply is supported.')

  const expectedRaw = process.env.EXPECTED_LIVE_RATING_ELIGIBLE
  const expectedEligible = expectedRaw === undefined || expectedRaw === ''
    ? null
    : Number(expectedRaw)

  const result = await runLiveRatingReconciliation({
    apply,
    confirmation: process.env.LIVE_RATING_RECONCILIATION_CONFIRMATION || '',
    expectedEligible
  })
  process.stdout.write(`${JSON.stringify(result)}\n`)
  return result
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      status: 'BLOCKED',
      mode: process.argv.includes('--apply') ? 'apply' : 'dry-run',
      error: error?.message || 'Live rating reconciliation failed.'
    })}\n`)
    process.exitCode = 1
  })
}
