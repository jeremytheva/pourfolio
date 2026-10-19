import { randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { runBonusWriteCertification } from './bonus-write-certification-lib.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'
import { sealBonusFixtureReceipt } from './bonus-fixture-receipt.js'

const required = ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']
const missing = required.filter((name) => !process.env[name]?.trim())
const sha = process.env.BONUS_CERTIFICATION_SHA || ''
const guarded = process.env.BONUS_CERTIFICATION_CONFIRMATION === 'RUN CURRENT INSTANCE BONUS TEST' &&
  /^[a-f0-9]{40}$/.test(sha)
let report
if (missing.length || !guarded) {
  report = { version: 1, status: 'BLOCKED', mode: 'current-instance-bounded-bonus-write',
    cleanup: 'NOT_RUN', failure: missing.length ? 'RUNTIME_CONFIGURATION_MISSING' : 'EXECUTION_GUARD_NOT_SATISFIED', missing }
} else {
  let owner
  try {
    owner = await resolveBonusCertificationOwner()
  } catch (error) {
    const allowed = ['RUNTIME_CONFIGURATION_MISSING', 'BONUS_TEST_OWNER_TARGET_UNVERIFIED',
      'BONUS_TEST_OWNER_AUTH_REJECTED', 'BONUS_TEST_OWNER_SESSION_UNCONFIRMED',
      'BONUS_TEST_OWNER_AUTH_UNAVAILABLE', 'BONUS_TEST_OWNER_SIGNOUT_UNCONFIRMED']
    report = { version: 1, status: 'BLOCKED', mode: 'current-instance-bounded-bonus-write',
      cleanup: 'NOT_RUN', createsAttempted: 0, deletesAttempted: 0,
      failure: allowed.includes(error?.code) ? error.code : 'BONUS_TEST_OWNER_UNCONFIRMED',
      ...(error?.missing ? { missing: error.missing } : {}),
      ...(error?.code === 'BONUS_TEST_OWNER_TARGET_UNVERIFIED' ? { targetStatus: error.targetStatus ?? null } : {}),
      ...(error?.sessionCleanup ? { sessionCleanup: error.sessionCleanup } : {}) }
  }
  if (owner) {
    let lastSnapshot
    const receiptPath = path.resolve('artifacts/bonus-write-certification/create-receipt.json')
    const checkpoint = async (snapshot) => {
      try {
        const encryptedReceipt = sealBonusFixtureReceipt({ ...snapshot, candidateCommit: sha,
          workflowRun: process.env.GITHUB_RUN_ID || null }, process.env.NOCODEBACKEND_SECRET_KEY)
        await mkdir(path.dirname(receiptPath), { recursive: true })
        await writeFile(`${receiptPath}.tmp`, JSON.stringify(encryptedReceipt, null, 2) + '\n')
        await rename(`${receiptPath}.tmp`, receiptPath)
        lastSnapshot = snapshot
      } catch {
        throw Object.assign(new Error('BONUS_RECEIPT_WRITE_UNCONFIRMED'), { code: 'BONUS_RECEIPT_WRITE_UNCONFIRMED' })
      }
    }
    report = await runBonusWriteCertification({ provider: dataProvider,
      userId: owner.id, runKey: `bonus-${randomUUID()}`, checkpoint })
    if (lastSnapshot) {
      try {
        await checkpoint({ ...lastSnapshot, stage: 'finished', resultStatus: report.status, cleanup: report.cleanup })
        report.recoveryReceipt = 'RETAINED_ENCRYPTED'
      } catch {
        report.recoveryReceipt = 'FINAL_CHECKPOINT_UNCONFIRMED'
        report.status = 'FAIL'
      }
    }
    report.ownerSource = owner.source
    if (owner.authCommit) report.authCommit = owner.authCommit
  }
}
report.candidateCommit = /^[a-f0-9]{40}$/.test(sha) ? sha : null
report.generatedAt = new Date().toISOString()
const target = path.resolve('artifacts/bonus-write-certification/report.json')
await mkdir(path.dirname(target), { recursive: true })
await writeFile(target, JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify(report) + '\n')
if (report.status !== 'PASS') process.exitCode = 2
