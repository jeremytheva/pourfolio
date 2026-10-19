import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dataProvider } from '../api/_lib/dataProvider.js'
import { runBonusWriteCertification } from './bonus-write-certification-lib.js'

const required = ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE', 'NOCODEBACKEND_CONTRACT_USER_ID']
const missing = required.filter((name) => !process.env[name]?.trim())
const sha = process.env.BONUS_CERTIFICATION_SHA || ''
const guarded = process.env.BONUS_CERTIFICATION_CONFIRMATION === 'RUN CURRENT INSTANCE BONUS TEST' &&
  /^[a-f0-9]{40}$/.test(sha)
let report
if (missing.length || !guarded) {
  report = { version: 1, status: 'BLOCKED', mode: 'current-instance-bounded-bonus-write',
    cleanup: 'NOT_RUN', failure: missing.length ? 'RUNTIME_CONFIGURATION_MISSING' : 'EXECUTION_GUARD_NOT_SATISFIED', missing }
} else {
  report = await runBonusWriteCertification({ provider: dataProvider,
    userId: process.env.NOCODEBACKEND_CONTRACT_USER_ID.trim(), runKey: `bonus-${randomUUID()}` })
}
report.candidateCommit = /^[a-f0-9]{40}$/.test(sha) ? sha : null
report.generatedAt = new Date().toISOString()
const target = path.resolve('artifacts/bonus-write-certification/report.json')
await mkdir(path.dirname(target), { recursive: true })
await writeFile(target, JSON.stringify(report, null, 2) + '\n')
process.stdout.write(JSON.stringify(report) + '\n')
if (report.status !== 'PASS') process.exitCode = 2
