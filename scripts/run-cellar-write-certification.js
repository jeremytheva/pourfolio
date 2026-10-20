import fs from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { sealBonusFixtureReceipt } from './bonus-fixture-receipt.js'
import { cellarCertificationScope, runCellarWriteCertification } from './cellar-write-certification-lib.js'

const environment = process.env
const directory = 'artifacts/cellar-write-certification'
await fs.mkdir(directory, { recursive: true })
let report = { version: 1, mode: 'current-instance-candidate-cellar-gateway', status: 'BLOCKED',
  createsAttempted: 0, updatesAttempted: 0, deletesAttempted: 0, cleanup: 'NOT_RUN' }
const configured = {
  ownerEmail: Boolean(environment.RELEASE_OWNER_EMAIL?.trim()),
  ownerPassword: Boolean(environment.RELEASE_OWNER_PASSWORD?.trim()),
  otherEmail: Boolean(environment.RELEASE_OTHER_EMAIL?.trim()),
  otherPassword: Boolean(environment.RELEASE_OTHER_PASSWORD?.trim())
}
try {
  const scope = cellarCertificationScope(environment)
  const missing = ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE',
    'BONUS_CERTIFICATION_BASE_URL', 'BONUS_CERTIFICATION_AUTH_SHA',
    'RELEASE_OWNER_EMAIL', 'RELEASE_OWNER_PASSWORD'].filter((name) => !environment[name]?.trim())
  if (missing.length) throw Object.assign(new Error(), { code: 'RUNTIME_CONFIGURATION_MISSING', missing })
  // Reuse the verified same-origin sign-in/session/sign-out implementation.
  // A configured database contract ID must not replace account authentication.
  const accountEnvironment = { ...environment, NOCODEBACKEND_CONTRACT_USER_ID: '' }
  const owner = await resolveBonusCertificationOwner({ environment: accountEnvironment })
  let other = null
  if (scope === 'owner-and-isolation') {
    other = await resolveBonusCertificationOwner({ environment: { ...accountEnvironment,
      RELEASE_OWNER_EMAIL: environment.RELEASE_OTHER_EMAIL,
      RELEASE_OWNER_PASSWORD: environment.RELEASE_OTHER_PASSWORD } })
    if (other.id === owner.id) throw Object.assign(new Error(), { code: 'CELLAR_TEST_ACCOUNTS_NOT_DISTINCT' })
  }
  const runKey = `cellar-${randomUUID()}`
  const checkpoint = async (payload) => {
    const receipt = sealBonusFixtureReceipt({ ...payload, candidateCommit: environment.CELLAR_CERTIFICATION_SHA },
      environment.NOCODEBACKEND_SECRET_KEY)
    const path = `${directory}/create-receipt.json`
    await fs.writeFile(`${path}.tmp`, `${JSON.stringify(receipt)}\n`, { mode: 0o600 })
    await fs.rename(`${path}.tmp`, path)
  }
  report = await runCellarWriteCertification({ provider: dataProvider, userId: owner.id,
    otherUserId: other?.id || null, runKey, checkpoint })
  report.ownerSource = owner.source
  report.scope = scope
  report.otherOwnerSource = other?.source || 'NOT_CONFIGURED'
  report.authCommit = owner.authCommit
} catch (error) {
  report.failure = /^[A-Z][A-Z0-9_]{0,79}$/.test(error?.code || '') ? error.code : 'CELLAR_CERTIFICATION_BLOCKED'
  if (error.missing) report.missing = error.missing
  if (Number.isInteger(error.targetStatus)) report.targetStatus = error.targetStatus
}
report.accountConfiguration = configured
report.candidateCommit = /^[a-f0-9]{40}$/.test(environment.CELLAR_CERTIFICATION_SHA || '')
  ? environment.CELLAR_CERTIFICATION_SHA : null
report.observedAt = new Date().toISOString()
await fs.writeFile(`${directory}/summary.json`, `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`${JSON.stringify(report)}\n`)
if (report.status !== 'PASS') process.exitCode = 2
