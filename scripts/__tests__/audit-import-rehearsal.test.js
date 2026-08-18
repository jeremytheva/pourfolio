import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  auditImportRehearsal,
  DUPLICATE_CHECKS,
  IMPORT_REHEARSAL_COLLECTIONS,
  IMPORT_REHEARSAL_PLAN_ID,
  ORPHAN_CHECKS
} from '../audit-import-rehearsal.js'
import { fingerprintBuffer } from '../audit-evidence-utils.js'

const zeroMap = (fields) => Object.fromEntries(fields.map((field) => [field, 0]))
const mutationMap = () => zeroMap(IMPORT_REHEARSAL_COLLECTIONS)

const csvForCollection = (collection, count, suffix = '') => {
  const rows = []
  if (collection === 'products') rows.push('id,producer_id,product_category_id', '1,1,1')
  else if (collection === 'producers' || collection === 'categories') rows.push('id', '1')
  else if (collection === 'rating_attributes') {
    rows.push('id')
    for (let index = 1; index <= count; index += 1) rows.push(String(index))
  } else if (collection === 'bonus_attributes') {
    rows.push('id')
    for (let index = 1; index <= count; index += 1) rows.push(String(index))
  } else if (collection === 'profiles') rows.push('user_id', 'u1')
  else if (collection === 'ratings') {
    rows.push('id,rating_id,user_id,product_id,submission_key')
    for (let index = 1; index <= count; index += 1) rows.push(`${index}${suffix},${index}${suffix},u1,1,submission-${index}${suffix}`)
  } else if (collection === 'rating_scores') {
    rows.push('id,rating_id,attribute_id,uniqueness_key')
    for (let index = 1; index <= count; index += 1) {
      const ratingId = ((index - 1) % 593) + 1
      const attributeId = Math.floor((index - 1) / 593) + 1
      rows.push(`${index}${suffix},${ratingId}${suffix},${attributeId},score-${index}${suffix}`)
    }
  } else if (collection === 'bonus_attribute_rating_mapping') {
    rows.push('id,rating_id,bonus_attributes_id,uniqueness_key')
    for (let index = 1; index <= count; index += 1) {
      const ratingId = ((index - 1) % 593) + 1
      const bonusId = Math.floor((index - 1) / 593) + 1
      rows.push(`${index}${suffix},${ratingId}${suffix},${bonusId},bonus-${index}${suffix}`)
    }
  } else if (collection === 'cellar') {
    rows.push('id,product_id,user_id')
    for (let index = 1; index <= count; index += 1) rows.push(`${index}${suffix},1,u1`)
  }
  return `${rows.join('\n')}\n`
}

const buildFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-import-rehearsal-'))
  const manifestPath = path.join(directory, 'manifest.json')
  const expected = {
    source_ratings: 604,
    accepted_ratings: 593,
    rejected_ratings: 11,
    source_scores: 4192,
    accepted_scores: 4177,
    rejected_scores: 15,
    source_bonus_selections: 1785,
    accepted_bonus_selections: 1716,
    rejected_bonus_selections: 69,
    source_cellar_rows: 399,
    accepted_cellar_rows: 399,
    rejected_cellar_rows: 0,
    source_rating_cellar_relationships: 593,
    linked_rating_cellar_relationships: 592,
    intentional_null_rating_cellar_relationships: 1
  }
  const targetCounts = {
    ratings: expected.accepted_ratings,
    rating_scores: expected.accepted_scores,
    bonus_attribute_rating_mapping: expected.accepted_bonus_selections,
    cellar: expected.accepted_cellar_rows
  }
  const nonTargetCounts = {
    products: 1,
    producers: 1,
    categories: 1,
    rating_attributes: 8,
    bonus_attributes: 3,
    profiles: 1
  }

  const runs = {}
  for (const runName of ['before', 'first', 'rerun']) {
    const collections = {}
    for (const collection of IMPORT_REHEARSAL_COLLECTIONS) {
      const target = Object.hasOwn(targetCounts, collection)
      const rows = target ? (runName === 'before' ? 0 : targetCounts[collection]) : nonTargetCounts[collection]
      const sourceRun = runName === 'rerun' ? 'first' : runName
      const file = `${sourceRun}-${collection}.csv`
      const filePath = path.join(directory, file)
      if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, csvForCollection(collection, rows))
      const buffer = fs.readFileSync(filePath)
      collections[collection] = { file, rows, ...fingerprintBuffer(buffer) }
    }
    runs[runName] = {
      run_id: `${runName}-run-001`,
      started_at: `2026-08-15T0${runName === 'before' ? 0 : runName === 'first' ? 1 : 2}:00:00Z`,
      completed_at: `2026-08-15T0${runName === 'before' ? 0 : runName === 'first' ? 1 : 2}:05:00Z`,
      provider_log_reference: `PRIVATE-${runName.toUpperCase()}-LOG-001`,
      collections
    }
  }

  const firstCreated = mutationMap()
  for (const [collection, count] of Object.entries(targetCounts)) firstCreated[collection] = count
  runs.first.mutations = { created: firstCreated, updated: mutationMap(), deleted: mutationMap() }
  runs.rerun.mutations = { created: mutationMap(), updated: mutationMap(), deleted: mutationMap() }
  for (const runName of ['first', 'rerun']) {
    runs[runName].orphan_checks = zeroMap(ORPHAN_CHECKS)
    runs[runName].duplicate_checks = zeroMap(DUPLICATE_CHECKS)
  }

  const rejectedRows = ['Collection,Source record key,Source count,Rejection reason,Evidence reference']
  for (let index = 1; index <= 11; index += 1) rejectedRows.push(`ratings,rating-${index},1,Reviewed exclusion,PRIVATE-RATING-${index}`)
  for (let index = 1; index <= 15; index += 1) rejectedRows.push(`rating_scores,score-${index},1,Reviewed exclusion,PRIVATE-SCORE-${index}`)
  rejectedRows.push('bonus_attribute_rating_mapping,bonus-variant-1,69,Reviewed bonus rejection,PRIVATE-BONUS-1')
  const rejectedFile = 'rejected-ledger.csv'
  fs.writeFileSync(path.join(directory, rejectedFile), `${rejectedRows.join('\n')}\n`)
  const rejectedBuffer = fs.readFileSync(path.join(directory, rejectedFile))

  const manifest = {
    plan_id: IMPORT_REHEARSAL_PLAN_ID,
    environment: 'isolated-staging',
    deployment_id: 'deployment-001',
    release_sha: 'b'.repeat(40),
    source_bundle_sha256: 'c'.repeat(64),
    evidence_reference: 'PRIVATE-PF-P1-IMPORT-001',
    operator: 'operator-1',
    reviewer: 'reviewer-1',
    reviewed_at: '2026-08-15T03:00:00Z',
    review_decision: 'approved',
    expected,
    rejected_ledger: {
      file: rejectedFile,
      rows: 27,
      ...fingerprintBuffer(rejectedBuffer),
      counts: {
        ratings: 11,
        rating_scores: 15,
        bonus_attribute_rating_mapping: 69,
        cellar: 0
      }
    },
    runs
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return { directory, manifest, manifestPath }
}

test('historical import rehearsal verifies reconciliation, idempotency and unchanged non-targets', () => {
  const fixture = buildFixture()
  try {
    const report = auditImportRehearsal(fixture.manifest, fixture.manifestPath)
    assert.equal(report.planId, IMPORT_REHEARSAL_PLAN_ID)
    assert.equal(report.status, 'PASS')
    assert.equal(report.counts.verifiedRunCollections, 30)
    assert.equal(report.counts.blockers, 0)
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true })
  }
})

test('historical import rehearsal blocks rerun mutation, content drift and rejected-record gaps', () => {
  const fixture = buildFixture()
  try {
    const rerunFile = 'rerun-ratings.csv'
    const rerunPath = path.join(fixture.directory, rerunFile)
    fs.writeFileSync(rerunPath, csvForCollection('ratings', 593, '-changed'))
    const buffer = fs.readFileSync(rerunPath)
    fixture.manifest.runs.rerun.collections.ratings = { file: rerunFile, rows: 593, ...fingerprintBuffer(buffer) }
    fixture.manifest.runs.rerun.mutations.updated.ratings = 1
    fixture.manifest.rejected_ledger.counts.rating_scores = 14
    fixture.manifest.runs.rerun.orphan_checks.scores_without_rating = 1

    const report = auditImportRehearsal(fixture.manifest, fixture.manifestPath)
    assert.equal(report.status, 'BLOCKED')
    assert.equal(report.countsByCode.RERUN_CONTENT_HASH_CHANGED, 1)
    assert.ok(report.countsByCode.RERUN_MUTATION_NON_ZERO >= 1)
    assert.equal(report.countsByCode.REJECTED_LEDGER_COUNT_MISMATCH, 1)
    assert.equal(report.countsByCode.RUN_CHECK_NON_ZERO, 1)
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true })
  }
})
