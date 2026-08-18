import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ACCOUNT_EXPORT_ARTIFACT_FILENAME,
  ACCOUNT_EXPORT_ARTIFACT_HEADERS,
  ACCOUNT_EXPORT_ARTIFACT_MEDIA_TYPE,
  buildAccountExportArtifact
} from '../accountExportArtifact.js'
import {
  ACCOUNT_EXPORT_COLLECTIONS,
  buildAccountExportManifest
} from '../accountExport.js'

const generatedAt = '2026-08-15T07:45:00.000Z'
const account = {
  id: 'owner-é',
  email: 'jérémy@example.test',
  name: 'Jeremy 🍺'
}
const inertText = '</script><script>ordinary JSON 🍺</script>'

const emptySnapshot = () => Object.fromEntries(
  ACCOUNT_EXPORT_COLLECTIONS.map((collection) => [collection, []])
)

const snapshotWithProfile = () => {
  const snapshot = emptySnapshot()
  snapshot.profiles.push({
    id: 'profile-é',
    user_id: account.id,
    name: 'Jérémy',
    description: inertText,
    avatar_url: null,
    secret_key: 'must-not-export'
  })
  return snapshot
}

const build = (overrides = {}) => buildAccountExportArtifact({
  account,
  snapshot: snapshotWithProfile(),
  generatedAt,
  ...overrides
})

test('builds a deterministic immutable UTF-8 JSON artifact envelope', () => {
  const artifact = build()
  const manifest = buildAccountExportManifest({
    account,
    snapshot: snapshotWithProfile(),
    generatedAt
  })
  const expectedBody = `${JSON.stringify(manifest, null, 2)}\n`

  assert.equal(artifact.filename, ACCOUNT_EXPORT_ARTIFACT_FILENAME)
  assert.equal(artifact.media_type, ACCOUNT_EXPORT_ARTIFACT_MEDIA_TYPE)
  assert.equal(artifact.body, expectedBody)
  assert.equal(artifact.body.endsWith('\n'), true)
  assert.equal(artifact.body.endsWith('\n\n'), false)
  assert.equal(artifact.byte_length, 2101)
  assert.equal(artifact.byte_length, Buffer.byteLength(artifact.body, 'utf8'))
  assert.ok(artifact.byte_length > artifact.body.length, 'Unicode must be counted as UTF-8 bytes')
  assert.deepEqual(artifact.checksum, {
    algorithm: 'sha256',
    value: '80aed311aed5b0ba493a58e4679ab7ed722f51d55d9280ccfb7fcef648c03b78'
  })
  assert.deepEqual(artifact.headers, {
    'Cache-Control': 'no-store',
    'Content-Disposition': 'attachment; filename="pourfolio-account-data.json"',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  })
  assert.equal(artifact.headers, ACCOUNT_EXPORT_ARTIFACT_HEADERS)
  assert.equal(Object.isFrozen(artifact), true)
  assert.equal(Object.isFrozen(artifact.checksum), true)
  assert.equal(Object.isFrozen(artifact.headers), true)
  assert.deepEqual(JSON.parse(artifact.body), manifest)
})

test('uses the same complete envelope for an account with no owner records', () => {
  const artifact = build({ snapshot: emptySnapshot() })
  const parsed = JSON.parse(artifact.body)

  assert.deepEqual(Object.values(parsed.record_counts), Array(10).fill(0))
  assert.equal(parsed.data.profiles.length, 0)
  assert.match(artifact.checksum.value, /^[a-f0-9]{64}$/)
  assert.equal(artifact.byte_length, Buffer.byteLength(artifact.body, 'utf8'))
})

test('ignores caller filenames and keeps malicious exported text out of response metadata', () => {
  const maliciousFilename = 'private"\r\nSet-Cookie: stolen=1.html'
  const artifact = build({ filename: maliciousFilename })
  const headerValues = Object.values(artifact.headers)

  assert.equal(artifact.filename, 'pourfolio-account-data.json')
  assert.equal(headerValues.some((value) => value.includes(maliciousFilename)), false)
  assert.equal(headerValues.some((value) => /[\r\n]/.test(value)), false)
  assert.equal(JSON.stringify(artifact.headers).includes(inertText), false)
  assert.equal(JSON.parse(artifact.body).data.profiles[0].description, inertText)
  assert.equal(artifact.headers['Content-Type'], 'application/json; charset=utf-8')
  assert.equal(artifact.headers['X-Content-Type-Options'], 'nosniff')
})

test('fails before returning an artifact when manifest validation fails', () => {
  const incompleteSnapshot = emptySnapshot()
  delete incompleteSnapshot.cellar

  assert.throws(
    () => build({ snapshot: incompleteSnapshot }),
    /snapshot collection cellar is missing or invalid/
  )
  assert.throws(
    () => build({ account: { id: '' } }),
    /Authenticated account identifier is missing/
  )
})

test('is byte-for-byte stable and changes its checksum when content changes', () => {
  const first = build()
  const retry = build()
  const later = build({ generatedAt: '2026-08-15T07:45:01.000Z' })
  const renamedAccount = build({ account: { ...account, name: 'Changed name' } })

  assert.deepEqual(retry, first)
  assert.notEqual(later.body, first.body)
  assert.notEqual(later.checksum.value, first.checksum.value)
  assert.notEqual(renamedAccount.body, first.body)
  assert.notEqual(renamedAccount.checksum.value, first.checksum.value)
})

test('keeps artifact preparation server-only and unreachable from HTTP and browser code', async () => {
  const [artifactSource, manifestSource, dataProxySource, clientSource, appSource] = await Promise.all([
    readFile(new URL('../accountExportArtifact.js', import.meta.url), 'utf8'),
    readFile(new URL('../accountExport.js', import.meta.url), 'utf8'),
    readFile(new URL('../../data-proxy.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/lib/nocodeBackend.js', import.meta.url), 'utf8'),
    readFile(new URL('../../../src/App.jsx', import.meta.url), 'utf8')
  ])

  assert.match(artifactSource, /buildAccountExportManifest/)
  for (const pattern of [/\bfetch\s*\(/, /dataProvider/, /process\.env/, /console\./]) {
    assert.doesNotMatch(artifactSource, pattern)
  }
  assert.doesNotMatch(manifestSource, /accountExportArtifact/)
  for (const reachableSource of [dataProxySource, clientSource, appSource]) {
    assert.doesNotMatch(reachableSource, /accountExportArtifact|account-export-artifact/)
  }
})