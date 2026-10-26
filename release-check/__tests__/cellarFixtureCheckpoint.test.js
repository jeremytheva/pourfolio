import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { openBonusFixtureReceipt } from '../../scripts/bonus-fixture-receipt.js'
import { createCellarCheckpointWriter, summariseCellarCheckpoint } from '../cellarFixtureCheckpoint.js'

const candidateCommit = 'a'.repeat(40)
const secret = 'synthetic-test-cipher-key'
const ownerId = 'private-owner-never-publish'
const directory = 'unit-only-cellar-artifacts'
const marker = 'Pourfolio release QA cellar-12345678-1234-1234-1234-123456789abc'
const payload = () => ({
  version: 1, kind: 'cellar-http-fixture-checkpoint-v1', stage: 'create-acknowledged',
  productId: '4', marker, beforeIds: ['1', '2'], createdId: '99',
  receiptBody: { item: { id: 99, product_id: 4, notes: marker, privateValue: 'original-private-body' } },
  createStatus: 201, deleteStatus: null,
  createsAttempted: 1, ownerUpdatesAttempted: 0, deletesAttempted: 0, denialMutationRequests: 0,
  verification: 'NOT_RUN', cleanup: 'NOT_RUN', checkpoint: 'PASS', status: 'RUNNING',
  events: [{ phase: 'create-intent', httpStatus: null }, { phase: 'create-response', httpStatus: 201 }]
})
const fakeFileSystem = () => {
  const files = new Map(), calls = []
  return {
    files, calls,
    async mkdir(destination, options) { calls.push({ method: 'mkdir', destination, options }) },
    async writeFile(file, value, options) { calls.push({ method: 'writeFile', file, options }); files.set(file, value) },
    async rename(source, destination) {
      calls.push({ method: 'rename', source, destination })
      assert.ok(files.has(source))
      files.set(destination, files.get(source))
      files.delete(source)
    }
  }
}
const configuration = (fileSystem) => ({ directory, secret, candidateCommit, ownerId, fileSystem })

test('atomic writer encrypts original recovery identity before publishing only a redacted phase summary', async () => {
  const fileSystem = fakeFileSystem()
  await createCellarCheckpointWriter(configuration(fileSystem))(payload())
  const receiptPath = path.join(path.resolve(directory), 'fixture-receipt.json')
  const summaryPath = path.join(path.resolve(directory), 'summary.json')
  const encoded = fileSystem.files.get(receiptPath)
  for (const privateValue of [ownerId, marker, 'original-private-body', secret]) assert.ok(!encoded.includes(privateValue))
  const opened = openBonusFixtureReceipt(JSON.parse(encoded), secret)
  assert.equal(opened.ownerId, ownerId)
  assert.equal(opened.candidateCommit, candidateCommit)
  assert.equal(opened.createdId, '99')
  assert.deepEqual(opened.receiptBody, payload().receiptBody)
  const summary = JSON.parse(fileSystem.files.get(summaryPath))
  assert.equal(summary.createHttpStatus, 201)
  assert.equal(summary.stage, 'create-acknowledged')
  for (const privateValue of [ownerId, marker, 'original-private-body', 'beforeIds', 'receiptBody', 'productId', 'createdId', secret]) {
    assert.ok(!JSON.stringify(summary).includes(privateValue))
  }
  assert.deepEqual(fileSystem.calls.map(({ method }) => method), ['mkdir', 'writeFile', 'rename', 'writeFile', 'rename'])
  assert.equal(fileSystem.calls[1].options.mode, 0o600)
  assert.equal(fileSystem.calls[2].destination, receiptPath)
  assert.equal(fileSystem.calls[4].destination, summaryPath)
})

test('writer configuration is required before any file operation', () => {
  for (const patch of [
    { directory: '' }, { secret: '' }, { candidateCommit: 'a'.repeat(39) }, { ownerId: '' }, { ownerId: 12 }
  ]) {
    const fileSystem = fakeFileSystem()
    assert.throws(() => createCellarCheckpointWriter({ ...configuration(fileSystem), ...patch }),
      (error) => error.code === 'CELLAR_CHECKPOINT_CONFIGURATION_MISSING')
    assert.deepEqual(fileSystem.calls, [])
  }
})

test('private phase strings, invalid statuses and malformed counters never enter summary artefacts', async () => {
  for (const patch of [
    { stage: ownerId }, { events: [{ phase: marker, httpStatus: 200 }] },
    { events: [{ phase: 'create-response', httpStatus: ownerId }] },
    { createStatus: 0 }, { createsAttempted: 2 }, { deletesAttempted: -1 },
    { denialMutationRequests: 3 }, { cleanup: marker }, { status: 'PASS\n' }
  ]) {
    const fileSystem = fakeFileSystem()
    const writer = createCellarCheckpointWriter(configuration(fileSystem))
    await assert.rejects(writer({ ...payload(), ...patch }),
      (error) => error.code === 'CELLAR_CHECKPOINT_PAYLOAD_INVALID')
    assert.deepEqual(fileSystem.calls, [])
  }
})

test('receipt persistence failure propagates and never publishes a misleading successful summary', async () => {
  const fileSystem = fakeFileSystem()
  fileSystem.rename = async () => { throw new Error('Disk rename failed') }
  await assert.rejects(createCellarCheckpointWriter(configuration(fileSystem))(payload()), /Disk rename failed/)
  assert.ok(!fileSystem.files.has(path.join(path.resolve(directory), 'summary.json')))
})

test('summary does not copy arbitrary payload or event fields', () => {
  const value = payload()
  value.ownerId = ownerId
  value.error = new Error('private-error-never-publish')
  value.events[0].privateValue = ownerId
  const summary = summariseCellarCheckpoint(value, candidateCommit)
  assert.ok(!JSON.stringify(summary).includes(ownerId))
  assert.ok(!JSON.stringify(summary).includes('private-error-never-publish'))
  assert.deepEqual(summary.phases[0], { phase: 'create-intent', httpStatus: null })
})
