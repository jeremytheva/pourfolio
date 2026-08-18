import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const sensitiveEnvironment = [
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NCB_CONTRACT_USER_ID',
  'NCB_CONTRACT_PRODUCT_ID',
  'NCB_CONTRACT_ATTRIBUTE_ID'
]

export const checkProviderContractTranscript = (transcript, sensitiveValues = []) => {
  const blockers = []
  if (!transcript || typeof transcript !== 'object') blockers.push({ code: 'TRANSCRIPT_INVALID' })
  if (!Array.isArray(transcript?.entries) || transcript.entries.length === 0) {
    blockers.push({ code: 'TRANSCRIPT_ENTRIES_MISSING' })
  }
  if (!Number.isInteger(transcript?.cleanup?.attempted) || transcript.cleanup.attempted < 1) {
    blockers.push({ code: 'CLEANUP_ATTEMPTS_MISSING' })
  }
  if (transcript?.cleanup?.status !== 'PASS' || transcript?.cleanup?.failures !== 0) {
    blockers.push({ code: 'CLEANUP_NOT_PROVEN' })
  }

  const rendered = JSON.stringify(transcript)
  for (const value of sensitiveValues.filter(Boolean)) {
    if (rendered.includes(String(value))) blockers.push({ code: 'SENSITIVE_VALUE_PRESENT' })
  }

  return {
    planId: 'PF-P1-CONNECTED-PROVIDER-CONTRACT-V1',
    status: blockers.length ? 'BLOCKED' : 'PASS',
    entries: Array.isArray(transcript?.entries) ? transcript.entries.length : 0,
    cleanupAttempts: Number.isInteger(transcript?.cleanup?.attempted) ? transcript.cleanup.attempted : 0,
    blockerCount: blockers.length,
    blockers
  }
}

const parseArguments = (arguments_) => {
  if (arguments_.length !== 2 || arguments_[0] !== '--transcript' || !arguments_[1]) {
    throw new Error('Use --transcript <path>.')
  }
  return path.resolve(arguments_[1])
}

export const runCli = (arguments_) => {
  const transcriptPath = parseArguments(arguments_)
  const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf8'))
  const sensitiveValues = sensitiveEnvironment.map((name) => process.env[name]).filter(Boolean)
  const report = checkProviderContractTranscript(transcript, sensitiveValues)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  return report.status === 'PASS' ? 0 : 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}