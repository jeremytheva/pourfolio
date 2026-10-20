import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { DEPLOYED_COLLECTIONS as C } from '../src/data/contract.js'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { openBonusFixtureReceipt } from './bonus-fixture-receipt.js'
import { cleanupBonusTestFixture, readAllBonusCertificationRows } from './bonus-write-certification-lib.js'

const requireThat = (condition, code) => { if (!condition) throw Object.assign(new Error(code), { code }) }
const same = (a, b) => String(a ?? '') === String(b ?? '')
const report = { version: 1, mode: 'reviewed-bonus-test-fixture-cleanup', status: 'BLOCKED',
  createsAttempted: 0, deletesAttempted: 0, removed: 0, cleanup: 'NOT_RUN' }
try {
  requireThat(process.env.BONUS_RECOVERY_CONFIRMATION === 'CLEAN UP THE VERIFIED BONUS TEST FIXTURE', 'BONUS_RECOVERY_GUARD_MISSING')
  const plan = JSON.parse(await readFile('docs/evidence/bonus-fixture-recovery-39329607548.json', 'utf8'))
  requireThat(plan.version === 1 && plan.originalCreateRun === '39329607548' &&
    plan.inspectionRun === '39330415649' && plan.review === 'exact-test-fixture-reviewed', 'BONUS_RECOVERY_PLAN_UNCONFIRMED')
  const receipt = openBonusFixtureReceipt(plan.encryptedReceipt, process.env.NOCODEBACKEND_SECRET_KEY)
  requireThat(receipt.provenance === 'read-only-inspection' && receipt.sourceRun === plan.originalCreateRun &&
    Array.isArray(receipt.mappings) && receipt.mappings.length === 1, 'BONUS_RECOVERY_RECEIPT_UNCONFIRMED')
  const owner = await resolveBonusCertificationOwner()
  const attribute = receipt.attribute
  const mapping = receipt.mappings[0]
  requireThat(same(owner.id, receipt.userId) && same(attribute?.user_id, owner.id) &&
    /^[1-9][0-9]*$/.test(String(attribute?.id ?? '')) && /^[1-9][0-9]*$/.test(String(mapping.id ?? '')) &&
    /^Pourfolio release QA bonus-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(attribute?.description || '') &&
    Number(attribute.point_value) === 0.7 && same(mapping.user_id, owner.id) &&
    same(mapping.bonus_attribute_id, attribute.id), 'BONUS_RECOVERY_OWNER_UNCONFIRMED')
  const [currentAttribute, currentMapping] = await Promise.all([
    dataProvider.get(C.bonusAttributes, attribute.id), dataProvider.get(C.bonusAttributeCategoryMappings, mapping.id)
  ])
  requireThat(['id', 'user_id', 'description', 'point_value'].every((key) => same(attribute[key], currentAttribute?.[key])) &&
    currentMapping === null,
  'BONUS_RECOVERY_RECORD_CHANGED')
  const categories = await readAllBonusCertificationRows(dataProvider, C.bonusAttributeCategories)
  requireThat(categories.some((row) => same(row.id, mapping.category_id) &&
    String(row.category || '').trim().toLowerCase() === 'overall' &&
    (!String(row.user_id ?? '').trim() || same(row.user_id, owner.id))), 'BONUS_RECOVERY_CATEGORY_UNCONFIRMED')
  for (const action of ['create', 'update', 'compareAndSet']) dataProvider[action] = async () => { throw new Error('BONUS_RECOVERY_WRITE_REJECTED') }
  const remove = dataProvider.remove.bind(dataProvider)
  const allowed = new Set([`${C.bonusAttributes}:${attribute.id}`])
  dataProvider.remove = async (collection, id) => {
    const key = `${collection}:${id}`
    requireThat(allowed.delete(key), 'BONUS_RECOVERY_SCOPE_REJECTED')
    return remove(collection, id)
  }
  await cleanupBonusTestFixture({ provider: dataProvider, userId: owner.id,
    attributeId: attribute.id, mappingId: mapping.id, categoryId: mapping.category_id,
    description: attribute.description, report, allowAbsentMapping: true, settleAttempts: 6 })
  report.status = report.cleanup === 'PASS' ? 'PASS' : report.deletesAttempted ? 'FAIL' : 'BLOCKED'
  report.ownerSource = owner.source
  report.authCommit = owner.authCommit
} catch (error) {
  report.failure = /^[A-Z][A-Z0-9_]+$/.test(error?.code || '') ? error.code : 'BONUS_RECOVERY_UNCONFIRMED'
}
report.candidateCommit = process.env.BONUS_CERTIFICATION_SHA
report.generatedAt = new Date().toISOString()
await mkdir('artifacts/bonus-write-certification', { recursive: true })
await writeFile('artifacts/bonus-write-certification/recovery.json', JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify(report) + '\n')
if (report.status !== 'PASS') process.exitCode = 2
