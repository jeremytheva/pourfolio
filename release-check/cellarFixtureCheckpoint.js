import fs from 'node:fs/promises'
import path from 'node:path'
import { sealBonusFixtureReceipt } from '../scripts/bonus-fixture-receipt.js'
import { CELLAR_HTTP_PHASES } from './cellarCleanup.js'

const phases = new Set(CELLAR_HTTP_PHASES)
const requireThat = (condition, code) => {
  if (!condition) throw Object.assign(new Error(code), { code })
}
const status = (value) => value === null || Number.isInteger(value) && value >= 100 && value <= 599
const count = (value, maximum) => Number.isInteger(value) && value >= 0 && value <= maximum

export const summariseCellarCheckpoint = (payload, candidateCommit) => {
  requireThat(payload?.version === 1 && payload.kind === 'cellar-http-fixture-checkpoint-v1' &&
    phases.has(payload.stage) && /^[a-f0-9]{40}$/.test(candidateCommit || '') &&
    ['RUNNING', 'PASS', 'FAIL', 'BLOCKED'].includes(payload.status) &&
    ['NOT_RUN', 'PASS', 'FAIL'].includes(payload.verification) &&
    ['NOT_RUN', 'UNCONFIRMED', 'PASS'].includes(payload.cleanup) &&
    ['PASS', 'FAIL'].includes(payload.checkpoint) &&
    count(payload.createsAttempted, 1) && count(payload.ownerUpdatesAttempted, 1) &&
    count(payload.deletesAttempted, 1) && count(payload.denialMutationRequests, 2) &&
    status(payload.createStatus) && status(payload.deleteStatus) &&
    Array.isArray(payload.events) && payload.events.length <= 64 &&
    payload.events.every((event) => event && phases.has(event.phase) && status(event.httpStatus)),
  'CELLAR_CHECKPOINT_PAYLOAD_INVALID')
  return {
    version: 1, qualification: 'CONNECTED_HTTP_CELLAR_FIXTURE',
    candidateCommit, stage: payload.stage, status: payload.status,
    createsAttempted: payload.createsAttempted, ownerUpdatesAttempted: payload.ownerUpdatesAttempted,
    deletesAttempted: payload.deletesAttempted, denialMutationRequests: payload.denialMutationRequests,
    createHttpStatus: payload.createStatus, deleteHttpStatus: payload.deleteStatus,
    verification: payload.verification, cleanup: payload.cleanup, checkpoint: payload.checkpoint,
    phases: payload.events.map((event) => ({ phase: event.phase, httpStatus: event.httpStatus }))
  }
}

// This is an atomic local receipt, retained by the workflow's always-run
// artifact step. It does not guarantee recovery after loss of the whole runner.
export const createCellarCheckpointWriter = ({
  directory, secret, candidateCommit, ownerId, fileSystem = fs
}) => {
  requireThat(typeof directory === 'string' && directory.trim() !== '' &&
    typeof secret === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(secret) &&
    Buffer.from(secret, 'base64').length === 32 && Buffer.from(secret, 'base64').toString('base64') === secret &&
    /^[a-f0-9]{40}$/.test(candidateCommit || '') &&
    typeof ownerId === 'string' && ownerId.trim() === ownerId && ownerId.length > 0 && ownerId.length <= 256,
  'CELLAR_CHECKPOINT_CONFIGURATION_MISSING')
  const destination = path.resolve(directory)
  const atomicWrite = async (name, value) => {
    const file = path.join(destination, name)
    await fileSystem.writeFile(file + '.tmp', JSON.stringify(value, null, 2) + '\n', { mode: 0o600 })
    await fileSystem.rename(file + '.tmp', file)
  }
  return async (payload) => {
    const summary = summariseCellarCheckpoint(payload, candidateCommit)
    const receipt = sealBonusFixtureReceipt({
      ...payload, candidateCommit, ownerId, capturedAt: new Date().toISOString()
    }, secret)
    await fileSystem.mkdir(destination, { recursive: true, mode: 0o700 })
    await atomicWrite('fixture-receipt.json', receipt)
    await atomicWrite('summary.json', summary)
  }
}
