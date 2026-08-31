import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { dataProvider } from '../api/_lib/dataProvider.js'
import {
  DEFAULT_NOCODEBACKEND_CERTIFICATION_TABLE,
  buildSchemaCapability,
  runNoCodeBackendConnectionCertification
} from './nocodebackend-connection-certification-lib.js'

const environment = process.env.NOCODEBACKEND_CERTIFICATION_ENVIRONMENT
const destructiveAllowed = process.env.NOCODEBACKEND_CERTIFICATION_ALLOW_DESTRUCTIVE === '1'
const table = process.env.NOCODEBACKEND_CERTIFICATION_TABLE?.trim() || DEFAULT_NOCODEBACKEND_CERTIFICATION_TABLE
const reportPath = process.env.NOCODEBACKEND_CERTIFICATION_REPORT_PATH || 'artifacts/nocodebackend-certification/report.json'
const summaryPath = process.env.NOCODEBACKEND_CERTIFICATION_SUMMARY_PATH || 'artifacts/nocodebackend-certification/summary.md'
const runKey = `chatgpt-cert-${Date.now()}-${randomUUID().slice(0, 8)}`

const requiredRuntimeConfiguration = [
  'NOCODEBACKEND_DATA_BASE_URL',
  'NOCODEBACKEND_SECRET_KEY',
  'NOCODEBACKEND_INSTANCE'
]

const missing = requiredRuntimeConfiguration.filter((name) => !process.env[name]?.trim())

const baseReport = {
  version: 1,
  provider: 'NoCodeBackend',
  table,
  run_key: runKey,
  generated_at: new Date().toISOString(),
  environment: environment || null,
  configuration: {
    data_base_url_configured: Boolean(process.env.NOCODEBACKEND_DATA_BASE_URL?.trim()),
    secret_configured: Boolean(process.env.NOCODEBACKEND_SECRET_KEY?.trim()),
    instance_configured: Boolean(process.env.NOCODEBACKEND_INSTANCE?.trim())
  },
  schema_plane: buildSchemaCapability()
}

const writeOutputs = async (report) => {
  const reportTarget = path.resolve(reportPath)
  const summaryTarget = path.resolve(summaryPath)
  await mkdir(path.dirname(reportTarget), { recursive: true })
  await mkdir(path.dirname(summaryTarget), { recursive: true })
  await writeFile(reportTarget, `${JSON.stringify(report, null, 2)}\n`)
  await writeFile(summaryTarget, renderSummary(report))
}

const renderCapabilities = (capabilities = {}) => Object.entries(capabilities)
  .map(([name, result]) => `- ${name}: **${result.status}**`)
  .join('\n')

const renderSummary = (report) => {
  const dataStatus = report.data_plane?.status || 'NOT_RUN'
  const cleanupStatus = report.cleanup?.status || 'NOT_RUN'
  const setup = report.setup_required
  const lines = [
    `### NoCodeBackend API certification — ${report.overall}`,
    '',
    `- Data plane: **${dataStatus}**`,
    `- Cleanup: **${cleanupStatus}**`,
    `- Schema plane: **${report.schema_plane?.status || 'UNAVAILABLE_NOT_CONFIGURED'}**`,
    `- Test table: \`${report.table}\``
  ]

  if (setup) {
    lines.push('', `Setup required: **${setup.code}**.`)
    if (setup.code === 'TEST_TABLE_MISSING') {
      lines.push(`Create the staging-only \`${setup.table}\` table with columns: ${setup.required_columns.map((name) => `\`${name}\``).join(', ')}.`)
    }
    if (setup.code === 'RUNTIME_CONFIGURATION_MISSING') lines.push(`Missing protected runtime configuration: ${setup.missing.join(', ')}.`)
    if (setup.code === 'EXECUTION_GUARD_NOT_SATISFIED') lines.push('The job must run with the isolated-staging destructive certification guard enabled.')
  }

  if (report.failure) {
    lines.push('', `Primary failure: \`${report.failure.capability}\` (${report.failure.code}${report.failure.status ? ` / HTTP ${report.failure.status}` : ''}).`)
  }

  if (report.data_plane?.capabilities) {
    lines.push('', 'Data-plane capability matrix:', renderCapabilities(report.data_plane.capabilities))
  }

  lines.push(
    '',
    'Schema table/column lifecycle is intentionally not invoked until NoCodeBackend exposes a documented supported schema-management API contract for this project.',
    '',
    'A redacted JSON report is retained with the workflow artifacts.'
  )

  return `${lines.join('\n')}\n`
}

let report

if (missing.length) {
  report = {
    ...baseReport,
    overall: 'SETUP_REQUIRED',
    data_plane: { status: 'NOT_RUN', capabilities: {} },
    cleanup: { status: 'NOT_RUN', attempted: 0, removed: 0, residual: 0, failures: [] },
    setup_required: { code: 'RUNTIME_CONFIGURATION_MISSING', missing }
  }
} else if (environment !== 'isolated-staging' || !destructiveAllowed) {
  report = {
    ...baseReport,
    overall: 'SETUP_REQUIRED',
    data_plane: { status: 'NOT_RUN', capabilities: {} },
    cleanup: { status: 'NOT_RUN', attempted: 0, removed: 0, residual: 0, failures: [] },
    setup_required: { code: 'EXECUTION_GUARD_NOT_SATISFIED' }
  }
} else {
  const certification = await runNoCodeBackendConnectionCertification({ provider: dataProvider, table, runKey })
  report = { ...baseReport, ...certification, generated_at: baseReport.generated_at, environment }
}

await writeOutputs(report)
process.stdout.write(renderSummary(report))
process.exitCode = report.overall === 'PASS' ? 0 : 1
