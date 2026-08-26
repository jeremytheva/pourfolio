import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const requiredFiles = [
  'PROJECT.md',
  'STATUS.md',
  'ARCHITECTURE.md',
  'DATA_MODEL.md',
  'ROADMAP.md',
  'SYSTEM_MAP.md'
]

const canonicalGuidanceFiles = [
  'AGENTS.md',
  'README.md',
  'docs/CONTRIBUTING.md',
  '.github/pull_request_template.md'
]

const requiredDecisionDirectory = 'docs/DECISIONS'
const requiredStatusSections = [
  '## AI execution gate',
  '## Next dependency-correct work'
]

const findings = []

const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

for (const file of requiredFiles) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    findings.push({ code: 'PROJECT_DOCUMENT_MISSING', path: file })
    continue
  }
  if (!readText(file).trim()) findings.push({ code: 'PROJECT_DOCUMENT_EMPTY', path: file })
}

for (const file of canonicalGuidanceFiles) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    findings.push({ code: 'PROJECT_GUIDANCE_MISSING', path: file })
    continue
  }
  const content = readText(file)
  if (!content.includes('npm run platform:validate')) {
    findings.push({ code: 'CANONICAL_VALIDATION_GUIDANCE_MISSING', path: file })
  }
}

for (const file of ['AGENTS.md', 'README.md']) {
  const filePath = path.join(root, file)
  if (fs.existsSync(filePath) && /\bVite 7\b/.test(readText(file))) {
    findings.push({ code: 'STALE_VITE_MAJOR_GUIDANCE', path: file })
  }
}

const decisionsPath = path.join(root, requiredDecisionDirectory)
if (!fs.existsSync(decisionsPath) || !fs.statSync(decisionsPath).isDirectory()) {
  findings.push({ code: 'DECISIONS_DIRECTORY_MISSING', path: requiredDecisionDirectory })
} else {
  const decisionFiles = fs.readdirSync(decisionsPath)
    .filter((name) => name.toLowerCase().endsWith('.md') && name.toLowerCase() !== 'readme.md')
  if (decisionFiles.length === 0) findings.push({ code: 'DECISION_RECORD_MISSING', path: requiredDecisionDirectory })
}

const statusPath = path.join(root, 'STATUS.md')
if (fs.existsSync(statusPath)) {
  const status = readText('STATUS.md')
  for (const section of requiredStatusSections) {
    if (!status.includes(section)) findings.push({ code: 'STATUS_SECTION_MISSING', section })
  }
}

findings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

const result = { status: findings.length ? 'BLOCKED' : 'PASS', findings }
process.stdout.write(`${JSON.stringify(result)}\n`)
if (findings.length) process.exitCode = 1
