import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dataProvider, __testables as providerConfiguration } from '../api/_lib/dataProvider.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { openBonusFixtureReceipt, sealBonusFixtureReceipt } from './bonus-fixture-receipt.js'
import { inspectCellarCreateAttempt } from './cellar-write-certification-lib.js'

const sourceSha = '1ed487f57ca0c8da03c5e2dc343637579fa2299b'
const sourceRun = '39336434126'
const normalise = (payload) => {
  for (const key of ['data', 'records', 'items', 'results', 'record']) {
    if (payload?.[key] !== undefined) return payload[key]
  }
  return payload
}
const uncachedRequest = async (suffix, filters = {}) => {
  const { baseUrl, secret, instance } = providerConfiguration.getConfiguration()
  const url = new URL(`${baseUrl}/read/cellar${suffix}`)
  url.searchParams.set('Instance', instance)
  for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, String(value))
  const response = await fetch(url, { method: 'GET', redirect: 'error', cache: 'no-store',
    headers: { ...providerConfiguration.buildProviderHeaders({ secret }), 'cache-control': 'no-cache', pragma: 'no-cache' },
    signal: AbortSignal.timeout(15_000) })
  if (response.status === 404 && suffix) return null
  const payload = await response.json()
  if (!response.ok || payload?.error || payload?.success === false || payload?.status === 'error') {
    throw new Error('CELLAR_INSPECTION_READ_UNCONFIRMED')
  }
  return payload
}
const freshProvider = {
  async listPage(_collection, { page, limit, filters }) {
    const payload = await uncachedRequest('', { ...filters, page, limit, sort: 'id', order: 'asc' })
    return providerConfiguration.normalisePage(payload, page, limit)
  },
  async get(_collection, id) {
    const payload = normalise(await uncachedRequest(`/${encodeURIComponent(id)}`))
    return Array.isArray(payload) ? payload[0] || null : payload
  }
}
let report = { version: 1, mode: 'read-only-original-cellar-create-inspection', status: 'BLOCKED',
  createsAttempted: 0, updatesAttempted: 0, deletesAttempted: 0 }
try {
  if (process.env.CELLAR_INSPECTION_CONFIRMATION !== 'INSPECT THE ORIGINAL CELLAR CREATE ATTEMPT' ||
      !process.env.CELLAR_SOURCE_DIRECTORY) throw new Error('CELLAR_INSPECTION_GUARD_MISSING')
  for (const action of ['create', 'update', 'compareAndSet', 'remove']) {
    dataProvider[action] = async () => { throw new Error('CELLAR_INSPECTION_WRITE_REJECTED') }
  }
  const owner = await resolveBonusCertificationOwner({ environment: { ...process.env, NOCODEBACKEND_CONTRACT_USER_ID: '' } })
  const directory = process.env.CELLAR_SOURCE_DIRECTORY
  const summary = JSON.parse(await readFile(path.join(directory, 'summary.json'), 'utf8'))
  const encrypted = JSON.parse(await readFile(path.join(directory, 'create-receipt.json'), 'utf8'))
  const receipt = openBonusFixtureReceipt(encrypted, process.env.NOCODEBACKEND_SECRET_KEY)
  const inspected = await inspectCellarCreateAttempt({ provider: dataProvider, freshProvider,
    userId: owner.id, receipt, summary, sourceSha })
  report = { ...inspected.report, sourceRun, sourceSha, ownerSource: owner.source, authCommit: owner.authCommit,
    recoverySnapshot: sealBonusFixtureReceipt(inspected.snapshot, process.env.NOCODEBACKEND_SECRET_KEY) }
} catch (error) {
  report.failure = /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code || error?.message || '')
    ? error.code || error.message : 'CELLAR_INSPECTION_UNCONFIRMED'
}
report.candidateCommit = process.env.CELLAR_CERTIFICATION_SHA
report.observedAt = new Date().toISOString()
await mkdir('artifacts/cellar-write-certification', { recursive: true })
await writeFile('artifacts/cellar-write-certification/inspection.json', `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(report)}\n`)
if (report.status !== 'INSPECTED') process.exitCode = 2
