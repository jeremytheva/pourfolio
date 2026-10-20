import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { dataProvider, __testables as providerConfiguration } from '../api/_lib/dataProvider.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { openBonusFixtureReceipt, sealBonusFixtureReceipt } from './bonus-fixture-receipt.js'
import { inspectCellarCreateAttempt } from './cellar-write-certification-lib.js'

const sourceSha = 'b2a8324e69e0dcfd9eb7aebae01bba7c08916752'
const sourceRun = '39370740463'
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
const diagnosticRead = async (receipt, { fresh, bust, scoped = false }) => {
  const { baseUrl, secret, instance } = providerConfiguration.getConfiguration()
  const url = new URL(`${baseUrl}/read/cellar${scoped ? '' : `/${encodeURIComponent(receipt.createdId)}`}`)
  url.searchParams.set('Instance', instance)
  if (scoped) {
    url.searchParams.set('notes', receipt.marker)
    url.searchParams.set('page', '1')
    url.searchParams.set('limit', '100')
    url.searchParams.set('sort', 'id')
    url.searchParams.set('order', 'asc')
  }
  if (bust) url.searchParams.set('_', randomUUID())
  const response = await fetch(url, { method: 'GET', redirect: 'error',
    ...(fresh ? { cache: 'no-store' } : {}),
    headers: { ...providerConfiguration.buildProviderHeaders({ secret }),
      ...(fresh ? { 'cache-control': 'no-cache', pragma: 'no-cache' } : {}) },
    signal: AbortSignal.timeout(15_000) })
  const payload = await response.json().catch(() => undefined)
  const value = normalise(payload)
  const rows = Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : []
  const matches = rows.filter((row) => String(row?.id) === String(receipt.createdId))
  const valid = response.ok && !payload?.error && payload?.success !== false && payload?.status !== 'error'
  const age = Number(response.headers.get('age'))
  return { fresh, bust, scoped, status: response.status,
    recordState: response.status === 404 || valid && (value === null || scoped && matches.length === 0)
      ? 'ABSENT' : valid && matches.length === 1 ? 'PRESENT' : 'UNCONFIRMED',
    ageSeconds: response.headers.has('age') && Number.isSafeInteger(age) && age >= 0 ? age : null,
    cacheHit: /\bhit\b/i.test([response.headers.get('x-cache'), response.headers.get('cf-cache-status')].join(' ')),
    responseNoStore: /no-store/i.test(response.headers.get('cache-control') || ''),
    cacheParameterRejected: typeof payload?.error === 'string' && /unknown column\s+['"`]_(?:['"`]|\b)/i.test(payload.error) }
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
  const sourceCheckpoint = {
    stage: ['create-intent', 'create-acknowledged', 'update-intent', 'delete-intent', 'finished'].includes(receipt?.stage)
      ? receipt.stage : 'UNRECOGNISED',
    candidateMatches: receipt?.candidateCommit === sourceSha,
    ownerMatches: receipt?.userId === owner.id,
    acknowledgedIdPresent: receipt?.createdId !== null && receipt?.createdId !== undefined,
    createsAttempted: Number.isSafeInteger(receipt?.createsAttempted) ? receipt.createsAttempted : null,
    updatesAttempted: Number.isSafeInteger(receipt?.updatesAttempted) ? receipt.updatesAttempted : null,
    deletesAttempted: Number.isSafeInteger(receipt?.deletesAttempted) ? receipt.deletesAttempted : null
  }
  report.sourceCheckpoint = sourceCheckpoint
  const inspected = await inspectCellarCreateAttempt({ provider: dataProvider, freshProvider,
    userId: owner.id, receipt, summary, sourceSha })
  const readDiagnostics = receipt.createdId ? await Promise.all([
    diagnosticRead(receipt, { fresh: false, bust: false }),
    diagnosticRead(receipt, { fresh: true, bust: false }),
    diagnosticRead(receipt, { fresh: true, bust: true }),
    diagnosticRead(receipt, { fresh: true, bust: false, scoped: true }),
    diagnosticRead(receipt, { fresh: true, bust: true, scoped: true })
  ]) : []
  report = { ...inspected.report, sourceCheckpoint, sourceRun, sourceSha, ownerSource: owner.source, authCommit: owner.authCommit,
    readDiagnostics,
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
