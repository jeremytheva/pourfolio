import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { DEPLOYED_COLLECTIONS as C } from '../src/data/contract.js'
import { dataProvider, __testables as providerConfiguration } from '../api/_lib/dataProvider.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { openBonusFixtureReceipt, sealBonusFixtureReceipt } from './bonus-fixture-receipt.js'

const same = (a, b) => String(a ?? '') === String(b ?? '')
const uncachedRead = async (collection, id) => {
  const { baseUrl, secret, instance } = providerConfiguration.getConfiguration()
  const url = new URL(`${baseUrl}/read/${collection}/${encodeURIComponent(id)}`)
  url.searchParams.set('Instance', instance)
  const response = await fetch(url, { method: 'GET', redirect: 'error', cache: 'no-store',
    headers: { ...providerConfiguration.buildProviderHeaders({ secret }), 'cache-control': 'no-cache', pragma: 'no-cache' },
    signal: AbortSignal.timeout(15_000) })
  const payload = await response.json().catch(() => undefined)
  const raw = payload?.data !== undefined ? payload.data : payload?.records !== undefined ? payload.records
    : payload?.items !== undefined ? payload.items : payload?.results !== undefined ? payload.results
      : payload?.record !== undefined ? payload.record : payload
  const record = Array.isArray(raw) ? raw[0] ?? null : raw
  const state = response.status === 404 ? 'ABSENT' : response.ok && record === null ? 'ABSENT'
    : response.ok && record && same(record.id, id) ? 'PRESENT' : 'UNCONFIRMED'
  const age = Number(response.headers.get('age'))
  return { status: response.status, recordState: state,
    ageSeconds: response.headers.has('age') && Number.isSafeInteger(age) && age >= 0 ? age : null,
    responseNoStore: /no-store/i.test(response.headers.get('cache-control') || ''),
    cacheHit: /\bhit\b/i.test([response.headers.get('x-cache'), response.headers.get('cf-cache-status')].join(' ')) }
}
const all = async (collection) => {
  const rows = []
  const seen = new Set()
  for (let page = 1; page <= 1000; page += 1) {
    const result = await dataProvider.listPage(collection, { page, limit: 100, orderBy: 'id', order: 'asc', filters: {} })
    if (!Array.isArray(result.items) || !Number.isSafeInteger(result.totalPages) || result.totalPages < 0) throw new Error('BONUS_INSPECTION_READ_UNCONFIRMED')
    for (const row of result.items) {
      if (!/^[1-9][0-9]*$/.test(String(row?.id ?? '')) || seen.has(String(row.id))) throw new Error('BONUS_INSPECTION_READ_UNCONFIRMED')
      seen.add(String(row.id))
      rows.push(row)
    }
    if (page >= result.totalPages) return rows
  }
  throw new Error('BONUS_INSPECTION_PAGE_LIMIT')
}
let report = { version: 1, mode: 'read-only-bonus-fixture-inspection', status: 'BLOCKED', createsAttempted: 0, deletesAttempted: 0 }
try {
  if (process.env.BONUS_INSPECTION_CONFIRMATION !== 'INSPECT CURRENT INSTANCE BONUS FIXTURE') throw new Error('BONUS_INSPECTION_GUARD_MISSING')
  // Make mutation impossible even if an imported helper changes later.
  for (const action of ['create', 'update', 'compareAndSet', 'remove']) dataProvider[action] = async () => { throw new Error('BONUS_INSPECTION_WRITE_REJECTED') }
  const owner = await resolveBonusCertificationOwner()
  const [attributes, mappings, ratingMappings, categories] = await Promise.all([
    all(C.bonusAttributes), all(C.bonusAttributeCategoryMappings), all(C.bonusRatingMappings), all(C.bonusAttributeCategories)
  ])
  const candidates = attributes.filter((row) => same(row.user_id, owner.id) &&
    /^Pourfolio release QA bonus-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(row.description || ''))
  report.fixtureCandidates = candidates.length
  if (candidates.length !== 1) throw new Error('BONUS_INSPECTION_SCOPE_AMBIGUOUS')
  const attribute = candidates[0]
  const stored = await dataProvider.get(C.bonusAttributes, attribute.id)
  const linked = mappings.filter((row) => same(row.bonus_attribute_id, attribute.id))
  const details = []
  for (const row of linked) {
    const direct = await dataProvider.get(C.bonusAttributeCategoryMappings, row.id)
    details.push({ ownerMatches: same(row.user_id, owner.id),
      categoryExists: categories.some((category) => same(category.id, row.category_id)),
      directMatchesList: ['id', 'user_id', 'category_id', 'bonus_attribute_id'].every((key) => same(row[key], direct?.[key])),
      fieldNames: Object.keys(row).sort() })
  }
  const plan = JSON.parse(await readFile('docs/evidence/bonus-fixture-recovery-39329607548.json', 'utf8'))
  const reviewed = openBonusFixtureReceipt(plan.encryptedReceipt, process.env.NOCODEBACKEND_SECRET_KEY)
  if (!same(reviewed.userId, owner.id) || !same(reviewed.attribute?.id, attribute.id) || reviewed.mappings?.length !== 1) {
    throw new Error('BONUS_INSPECTION_RECEIPT_MISMATCH')
  }
  const expectedMappingId = reviewed.mappings[0].id
  const [expectedMapping, uncachedMapping, uncachedAttribute] = await Promise.all([
    dataProvider.get(C.bonusAttributeCategoryMappings, expectedMappingId),
    uncachedRead(C.bonusAttributeCategoryMappings, expectedMappingId), uncachedRead(C.bonusAttributes, attribute.id)
  ])
  report = { ...report, status: 'INSPECTED', attributeFields: Object.keys(attribute).sort(),
    attributeReadbackMatches: ['id', 'user_id', 'description', 'point_value'].every((key) => same(attribute[key], stored?.[key])),
    pointValueMatches: Number(attribute.point_value) === 0.7,
    categoryMappings: details, categoryMappingCount: linked.length,
    ratingReferenceCount: ratingMappings.filter((row) => same(row.bonus_attribute_id, attribute.id) || same(row.bonus_attributes_id, attribute.id)).length,
    referenceFieldsComplete: ratingMappings.every((row) => /^[1-9][0-9]*$/.test(String(row.bonus_attribute_id ?? row.bonus_attributes_id ?? ''))),
    reviewedMappingInList: linked.some((row) => same(row.id, expectedMappingId)),
    reviewedMappingDirect: expectedMapping === null ? 'ABSENT' : 'PRESENT',
    reviewedMappingUncached: uncachedMapping, reviewedAttributeUncached: uncachedAttribute,
    ownerSource: owner.source, authCommit: owner.authCommit,
    // This is an inspection candidate, never an automatic deletion authority.
    recoveryCandidate: sealBonusFixtureReceipt({ provenance: 'read-only-inspection', sourceRun: '39329607548',
      userId: owner.id, attribute, mappings: linked }, process.env.NOCODEBACKEND_SECRET_KEY) }
} catch (error) {
  report.failure = /^[A-Z][A-Z0-9_]+$/.test(error.message || '') ? error.message : 'BONUS_INSPECTION_UNCONFIRMED'
}
report.candidateCommit = process.env.BONUS_CERTIFICATION_SHA
report.generatedAt = new Date().toISOString()
await mkdir('artifacts/bonus-write-certification', { recursive: true })
await writeFile('artifacts/bonus-write-certification/inspection.json', JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify(report) + '\n')
if (report.status !== 'INSPECTED') process.exitCode = 2
