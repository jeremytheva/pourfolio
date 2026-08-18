import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  auditBaselineBundle,
  BASELINE_BUNDLE_PLAN_ID,
  BASELINE_COLLECTIONS
} from '../audit-baseline-bundle.js'
import { fingerprintBuffer } from '../audit-evidence-utils.js'

const csvFixtures = {
  products: 'id,producer_id,product_category_id\n1,1,1\n',
  producers: 'id\n1\n',
  categories: 'id\n1\n',
  ratings: 'id,product_id,user_id\n1,1,u1\n',
  rating_scores: 'id,rating_id,attribute_id\n1,1,1\n',
  rating_attributes: 'id\n1\n',
  bonus_attributes: 'id\n1\n',
  bonus_attribute_rating_mapping: 'id,rating_id,bonus_attributes_id\n1,1,1\n',
  profiles: 'user_id\nu1\n',
  cellar: 'id,product_id,user_id\n1,1,u1\n'
}

const buildFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-baseline-bundle-'))
  const manifestPath = path.join(directory, 'manifest.json')
  const schema = fs.readFileSync(path.resolve('exports/schema.sql'))
  fs.writeFileSync(path.join(directory, 'schema.sql'), schema)
  const snapshotId = 'snapshot-2026-08-15-001'
  const artifacts = [{
    collection: 'schema',
    file: 'schema.sql',
    rows: null,
    snapshot_id: snapshotId,
    ...fingerprintBuffer(schema)
  }]
  const pages = []

  for (const collection of BASELINE_COLLECTIONS) {
    const buffer = Buffer.from(csvFixtures[collection])
    const file = `${collection}.csv`
    fs.writeFileSync(path.join(directory, file), buffer)
    artifacts.push({
      collection,
      file,
      rows: 1,
      snapshot_id: snapshotId,
      ...fingerprintBuffer(buffer)
    })
    pages.push({
      collection,
      sequence: 1,
      page: 1,
      rows: 1,
      terminal: true,
      status: 'success',
      evidence_reference: `PRIVATE-PAGE-${collection}-001`,
      snapshot_id: snapshotId
    })
  }

  const manifest = {
    plan_id: BASELINE_BUNDLE_PLAN_ID,
    environment: 'isolated-staging',
    deployment_id: 'deployment-001',
    release_sha: 'a'.repeat(40),
    snapshot_id: snapshotId,
    evidence_reference: 'PRIVATE-PF-P1-BASELINE-001',
    consistency_control: 'provider-consistent',
    export_started_at: '2026-08-15T00:00:00Z',
    export_completed_at: '2026-08-15T00:05:00Z',
    operator: 'operator-1',
    reviewer: 'reviewer-1',
    reviewed_at: '2026-08-15T01:00:00Z',
    review_decision: 'approved',
    artifacts,
    pages
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return { directory, manifest, manifestPath }
}

test('same-state baseline bundle verifies bytes, rows, pagination, schema and relationships', () => {
  const fixture = buildFixture()
  try {
    const report = auditBaselineBundle(fixture.manifest, fixture.manifestPath)
    assert.equal(report.planId, BASELINE_BUNDLE_PLAN_ID)
    assert.equal(report.status, 'PASS', JSON.stringify(report.blockers))
    assert.equal(report.counts.requiredArtifacts, 11)
    assert.equal(report.counts.verifiedArtifacts, 11)
    assert.equal(report.counts.blockers, 0)
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true })
  }
})

test('baseline bundle blocks snapshot, checksum, pagination and relationship drift', () => {
  const fixture = buildFixture()
  try {
    fixture.manifest.artifacts.find((artifact) => artifact.collection === 'products').sha256 = '0'.repeat(64)
    fixture.manifest.pages.find((page) => page.collection === 'ratings').snapshot_id = 'different-snapshot'
    fixture.manifest.pages.find((page) => page.collection === 'cellar').terminal = false
    fs.writeFileSync(path.join(fixture.directory, 'ratings.csv'), 'id,product_id,user_id\n1,999,u1\n')

    const report = auditBaselineBundle(fixture.manifest, fixture.manifestPath)
    assert.equal(report.status, 'BLOCKED')
    assert.ok(report.countsByCode.ARTIFACT_SHA256_MISMATCH >= 1)
    assert.ok(report.countsByCode.PAGINATION_SNAPSHOT_MISMATCH >= 1)
    assert.ok(report.countsByCode.PAGINATION_TERMINAL_INVALID >= 1)
    assert.equal(report.countsByCode.RATING_PRODUCT_ORPHAN, 1)
  } finally {
    fs.rmSync(fixture.directory, { recursive: true, force: true })
  }
})