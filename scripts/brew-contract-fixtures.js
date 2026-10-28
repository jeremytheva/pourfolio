import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { sealBonusFixtureReceipt } from './bonus-fixture-receipt.js'
import { resolveDataBaseUrl } from '../api/_lib/nocodeBackendConfig.js'

const collections = new Set(['brew_done_it_games', 'brew_done_it_rounds', 'brew_done_it_guesses', 'brew_done_it_deductions'])
const requireThat = (condition) => { if (!condition) throw new Error('BREW_FIXTURE_UNCONFIRMED') }
const first = value => Array.isArray(value) ? value.length === 1 ? value[0] : null : value
const canonicalId = value => /^[1-9]\d*$/.test(String(value ?? ''))

// Intent and acknowledgement are encrypted before any subsequent mutation.
// An unknown create outcome is retained for operator recovery, never retried.
export const createBrewFixtureTracker = ({ provider, checkpoint, ownerId, namespace }) => {
  requireThat(typeof checkpoint === 'function' && typeof ownerId === 'string' && ownerId.length > 0 &&
    typeof namespace === 'string' && namespace.length >= 16)
  const state = { version: 1, kind: 'brew-contract-fixtures-v1', namespace, ownerId, stage: 'initial', fixtures: [] }
  let stopped = false
  const save = async stage => {
    state.stage = stage
    try { await checkpoint(structuredClone(state)) } catch { stopped = true; throw new Error('BREW_FIXTURE_CHECKPOINT_FAILED') }
  }
  const read = async (collection, id) => {
    try {
      const record = await provider.get(collection, id, { fresh: true })
      requireThat(record === null || record && String(record.id) === String(id))
      return record
    } catch (error) { if (error?.status === 404) return null; throw new Error('BREW_FIXTURE_READ_UNCONFIRMED', { cause: error }) }
  }
  const matches = (record, payload) => record && Object.entries(payload).filter(([key]) =>
    key === 'user_id' || key.endsWith('_participant_id') || key.endsWith('idempotency_key') ||
    ['game_id', 'round_id', 'round_number', 'selected_product_id', 'guessed_product_id', 'guessed_producer_id', 'guessed_category_id'].includes(key)).every(([key, value]) =>
    value === null ? record[key] === null : String(record[key]) === String(value))
  return {
    async create(collection, payload) {
      requireThat(!stopped && collections.has(collection) && state.fixtures.length < 16 && payload?.user_id === ownerId)
      const key = collection === 'brew_done_it_games' ? payload.creation_idempotency_key
        : collection === 'brew_done_it_rounds' ? payload.round_creation_idempotency_key : payload.idempotency_key
      const hasRunKey = typeof key === 'string' && key.startsWith(`${ownerId}:${namespace}:`)
      const parentCollection = collection === 'brew_done_it_rounds' ? 'brew_done_it_games' : 'brew_done_it_rounds'
      const parentId = collection === 'brew_done_it_rounds' ? payload.game_id : payload.round_id
      const parent = state.fixtures.find(f => f.collection === parentCollection &&
        f.create === 'ACKNOWLEDGED' && f.cleanup === 'NOT_RUN' && f.id === String(parentId))
      if (collection === 'brew_done_it_games') {
        requireThat(hasRunKey && payload.creator_participant_id === ownerId)
      } else {
        // Every child must belong to an acknowledged fixture from this run.
        // Opening rounds inherit the game identity without a separate retry key.
        requireThat(parent && (hasRunKey || collection === 'brew_done_it_rounds' &&
          Number(payload.round_number) === 1 && (key === null || key === undefined)))
      }
      const fixture = { collection, payload: structuredClone(payload), id: null, create: 'INTENT', cleanup: 'NOT_RUN' }
      state.fixtures.push(fixture)
      await save('create-intent')
      let record
      try { record = first(await provider.create(collection, payload)) } catch {
        stopped = true; fixture.create = 'UNKNOWN'; await save('create-unknown'); throw new Error('BREW_FIXTURE_CREATE_UNCONFIRMED')
      }
      fixture.response = record
      if (!canonicalId(record?.id)) {
        stopped = true; fixture.create = 'UNKNOWN'; await save('create-unknown'); throw new Error('BREW_FIXTURE_CREATE_UNCONFIRMED')
      }
      fixture.id = String(record.id); fixture.create = 'ACKNOWLEDGED'
      await save('create-acknowledged')
      try { requireThat(matches(await read(collection, fixture.id), payload)) } catch {
        stopped = true; await save('readback-unconfirmed'); throw new Error('BREW_FIXTURE_READ_UNCONFIRMED')
      }
      return record
    },
    async cleanup() {
      requireThat(!stopped)
      try {
        for (const fixture of [...state.fixtures].reverse()) {
          requireThat(fixture.create === 'ACKNOWLEDGED' && canonicalId(fixture.id))
          const current = await read(fixture.collection, fixture.id)
          if (current) {
            requireThat(matches(current, fixture.payload))
            await save('delete-intent')
            // One delete only. An ambiguous response is resolved by exact readback.
            try { await provider.remove(fixture.collection, fixture.id) } catch { /* readback decides */ }
            requireThat(await read(fixture.collection, fixture.id) === null)
          }
          fixture.cleanup = 'ABSENT'
          await save('delete-verified')
        }
        await save('finished')
        stopped = true
      } catch (cause) {
        // Do not retry an uncertain delete or allow another create in this run.
        stopped = true
        throw new Error('BREW_FIXTURE_CLEANUP_UNCONFIRMED', { cause })
      }
    }
  }
}

export const createBrewFixtureCheckpoint = ({ directory, secret, candidateCommit, namespace, baseUrl, instance, fileSystem = fs }) => {
  requireThat(typeof directory === 'string' && directory.trim() && /^[a-f0-9]{40}$/.test(candidateCommit || '') &&
    typeof namespace === 'string' && /^[a-zA-Z0-9-]{16,200}$/.test(namespace) &&
    typeof instance === 'string' && instance.trim() &&
    typeof secret === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(secret) &&
    Buffer.from(secret, 'base64').length === 32 && Buffer.from(secret, 'base64').toString('base64') === secret)
  const destination = path.resolve(directory, namespace)
  // Same canonical endpoint/instance digest used by the read-only inventory.
  // Keep raw provider configuration out of summaries and recovery artifacts.
  const providerRef = `sha256:${createHash('sha256')
    .update(JSON.stringify([resolveDataBaseUrl(baseUrl), instance.trim()])).digest('hex')}`
  const atomic = async (name, data) => {
    const file = path.join(destination, name)
    await fileSystem.writeFile(file + '.tmp', JSON.stringify(data) + '\n', { mode: 0o600 })
    await fileSystem.rename(file + '.tmp', file)
  }
  return async payload => {
    await fileSystem.mkdir(destination, { recursive: true, mode: 0o700 })
    const capturedAt = new Date().toISOString()
    await atomic('receipt.json', sealBonusFixtureReceipt({ ...payload, candidateCommit, providerRef, capturedAt }, secret))
    await atomic('summary.json', { version: 1, candidateCommit, providerRef, capturedAt, stage: payload.stage,
      intended: payload.fixtures.length, acknowledged: payload.fixtures.filter(f => f.id).length,
      absent: payload.fixtures.filter(f => f.cleanup === 'ABSENT').length })
  }
}
