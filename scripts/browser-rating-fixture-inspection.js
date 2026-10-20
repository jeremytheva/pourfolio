import { createHash } from 'node:crypto'
import { DEPLOYED_COLLECTIONS as COLLECTIONS } from '../src/data/contract.js'
import { parsePublicProfileId } from '../api/_lib/profileStore.js'
import { completedRatingTotal } from '../src/lib/completedRatingContract.js'
import { readAllBonusCertificationRows } from './bonus-write-certification-lib.js'

const same = (left, right) => String(left ?? '') === String(right ?? '')
const idOf = (value) => ['string', 'number'].includes(typeof value) &&
  (typeof value !== 'number' || Number.isSafeInteger(value)) && /^[1-9]\d*$/.test(String(value))
  ? String(value) : null
const requireThat = (condition, code) => {
  if (!condition) throw Object.assign(new Error(code), { code })
}
const roundedTotal = (row) => {
  const value = completedRatingTotal(row?.total_weighted)
  return value === null ? null : Number(value.toFixed(2))
}
const terminalSignature = (row) => JSON.stringify(['id', 'user_id', 'product_id',
  'submission_state', 'submission_version', 'deleted_at', 'date_rated'].map((key) => String(row?.[key] ?? '')))

// The browser account need not be the configured release-test account. Bind
// its observed public profile link to one stored profile and a fresh direct
// read; keep the public identifier and private owner ID out of plain reports.
export const resolveBrowserRatingOwner = async ({ provider, publicProfileFingerprint }) => {
  requireThat(/^[a-f0-9]{64}$/.test(publicProfileFingerprint || ''), 'RATING_UI_PROFILE_BINDING_UNCONFIRMED')
  const profiles = await readAllBonusCertificationRows({ listPage: (collection, options) =>
    provider.listPage(collection, { ...options, fresh: true }) }, COLLECTIONS.profiles)
  const matches = profiles.filter((row) => typeof row.public_id === 'string' &&
    createHash('sha256').update(row.public_id).digest('hex') === publicProfileFingerprint)
  requireThat(matches.length === 1 && idOf(matches[0].id) &&
    parsePublicProfileId(matches[0].public_id) === matches[0].public_id &&
    typeof matches[0].user_id === 'string' && matches[0].user_id.trim() === matches[0].user_id && matches[0].user_id.length > 0,
  'RATING_UI_PROFILE_BINDING_UNCONFIRMED')
  const profile = matches[0]
  const direct = await provider.get(COLLECTIONS.profiles, profile.id, { fresh: true })
  requireThat(direct && same(direct.id, profile.id) && direct.public_id === profile.public_id &&
    direct.user_id === profile.user_id, 'RATING_UI_PROFILE_BINDING_UNCONFIRMED')
  return { id: profile.user_id, source: 'observed-browser-public-profile-link' }
}

// Read-only evidence for one browser-created fixture. This does not authorise
// cleanup, infer an unknown create acknowledgement, or repair historical data.
export const inspectBrowserRatingFixture = async ({ provider, userId, fixture }) => {
  const older = fixture?.olderRatings
  requireThat(typeof userId === 'string' && userId.trim() === userId && userId.length > 0 &&
    fixture?.kind === 'browser-created-and-deleted-rating' && idOf(fixture.ratingId) && idOf(fixture.productId) &&
    fixture.createsAttempted === 1 && fixture.deletesAttempted === 1 &&
    /^[a-f0-9]{40}$/.test(fixture.runtimeCommit || '') && /^\d{4}-\d{2}-\d{2}$/.test(fixture.dateRated || '') &&
    typeof fixture.expectedTotal === 'number' && completedRatingTotal(fixture.expectedTotal) !== null &&
    Array.isArray(older) && older.length > 0 && older.every((row) => idOf(row.id) &&
      typeof row.total === 'number' && completedRatingTotal(row.total) !== null) &&
    new Set(older.map((row) => String(row.id))).size === older.length &&
    !older.some((row) => same(row.id, fixture.ratingId)) &&
    fixture.expectedPersonalCount === older.length && Number.isSafeInteger(fixture.expectedCommunityCount) &&
    fixture.expectedCommunityCount >= older.length,
  'RATING_UI_INSPECTION_SCOPE_UNCONFIRMED')

  const fresh = { listPage: (collection, options) => provider.listPage(collection, { ...options, fresh: true }) }
  const [direct, ratings, scores, mappings, scopedScores, scopedMappings] = await Promise.all([
    provider.get(COLLECTIONS.ratings, fixture.ratingId, { fresh: true }),
    readAllBonusCertificationRows(fresh, COLLECTIONS.ratings),
    readAllBonusCertificationRows(fresh, COLLECTIONS.ratingScores),
    readAllBonusCertificationRows(fresh, COLLECTIONS.bonusRatingMappings),
    provider.list(COLLECTIONS.ratingScores, { rating_id: fixture.ratingId }, { fresh: true }),
    provider.list(COLLECTIONS.bonusRatingMappings, { rating_id: fixture.ratingId }, { fresh: true })
  ])
  requireThat(Array.isArray(scopedScores) && Array.isArray(scopedMappings) &&
    [...scores, ...mappings].every((row) => idOf(row.rating_id)), 'RATING_UI_CHILD_INVENTORY_UNCONFIRMED')
  const parents = ratings.filter((row) => same(row.id, fixture.ratingId))
  const scoreChildren = scores.filter((row) => same(row.rating_id, fixture.ratingId))
  const bonusChildren = mappings.filter((row) => same(row.rating_id, fixture.ratingId))
  const scopedScoreCount = scopedScores.filter((row) => same(row.rating_id, fixture.ratingId)).length
  const scopedBonusCount = scopedMappings.filter((row) => same(row.rating_id, fixture.ratingId)).length
  const completed = ratings.filter((row) => same(row.product_id, fixture.productId) &&
    row.submission_state === 'complete' && completedRatingTotal(row.total_weighted) !== null)
  const report = { version: 1, mode: 'read-only-browser-rating-fixture', status: 'FAIL',
    createsAttempted: 0, updatesAttempted: 0, deletesAttempted: 0,
    parentState: 'UNCONFIRMED', scoreChildren: scoreChildren.length, bonusMappings: bonusChildren.length,
    scopedScoreChildren: scopedScoreCount, scopedBonusMappings: scopedBonusCount,
    communityCompleteCount: completed.length,
    ownerCompleteCount: completed.filter((row) => same(row.user_id, userId)).length,
    olderRatingsPreserved: false }
  const fail = (code) => ({ ...report, failure: code })

  if (direct === null && parents.length === 0) {
    report.parentState = 'ABSENT'
  } else if (direct && parents.length === 1 && terminalSignature(direct) === terminalSignature(parents[0])) {
    if (!same(direct.id, fixture.ratingId) || !same(direct.user_id, userId) ||
        !same(direct.product_id, fixture.productId) || !String(direct.date_rated || '').startsWith(fixture.dateRated) ||
        roundedTotal(direct) !== Number(fixture.expectedTotal.toFixed(2)) ||
        roundedTotal(parents[0]) !== Number(fixture.expectedTotal.toFixed(2))) return fail('RATING_UI_PARENT_PROVENANCE_UNCONFIRMED')
    const version = String(direct.submission_version ?? '')
    if (direct.submission_state !== 'deleted' || !/^[1-9]\d*$/.test(version) ||
        !Number.isSafeInteger(Number(version)) || !direct.deleted_at || !Number.isFinite(Date.parse(direct.deleted_at))) {
      return fail('RATING_UI_PARENT_NOT_TERMINAL')
    }
    report.parentState = 'DELETED_TOMBSTONE'
  } else return fail('RATING_UI_PARENT_READS_DISAGREE')

  if (scoreChildren.length || bonusChildren.length || scopedScoreCount || scopedBonusCount) {
    return fail('RATING_UI_FIXTURE_CHILDREN_REMAIN')
  }
  report.olderRatingsPreserved = older.every((expected) => {
    const row = ratings.find((value) => same(value.id, expected.id))
    return row && same(row.user_id, userId) && same(row.product_id, fixture.productId) &&
      row.submission_state === 'complete' && !row.deleted_at && roundedTotal(row) === expected.total
  })
  if (!report.olderRatingsPreserved || report.communityCompleteCount !== fixture.expectedCommunityCount ||
      report.ownerCompleteCount !== fixture.expectedPersonalCount) return fail('RATING_UI_BASELINE_NOT_RESTORED')
  report.status = 'PASS'
  return report
}
