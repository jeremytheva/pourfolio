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

const requiredProjectInheritanceMarkers = [
  'AI-First Platform Development Framework v3.1',
  'AI Platform Development Standard v1.2',
  'PR Lifecycle Standard v1.0',
  'Testing, Validation & Release Standard v1.2',
  'Project Documentation Standard v1.2'
]

const requiredAgentLifecycleMarkers = [
  'Draft → Implementing → Validating → Ready → Mergeable → Merged',
  'GitHub must remain the independent enforcement layer',
  'preview/<pr-number>',
  'npm run platform:validate'
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

for (const file of ['AGENTS.md', 'README.md', 'PROJECT.md']) {
  const filePath = path.join(root, file)
  if (fs.existsSync(filePath) && /\bVite 7\b/.test(readText(file))) {
    findings.push({ code: 'STALE_VITE_MAJOR_GUIDANCE', path: file })
  }
}

const projectPath = path.join(root, 'PROJECT.md')
if (fs.existsSync(projectPath)) {
  const project = readText('PROJECT.md')
  for (const marker of requiredProjectInheritanceMarkers) {
    if (!project.includes(marker)) {
      findings.push({ code: 'MASTER_STANDARD_INHERITANCE_DRIFT', path: 'PROJECT.md', marker })
    }
  }
  if (!project.includes('| Build tooling | Vite 8 |')) {
    findings.push({ code: 'PROJECT_STACK_GUIDANCE_DRIFT', path: 'PROJECT.md', expected: 'Vite 8' })
  }
  if (!project.includes('| Runtime | Node.js 20 |')) {
    findings.push({ code: 'PROJECT_STACK_GUIDANCE_DRIFT', path: 'PROJECT.md', expected: 'Node.js 20' })
  }
}

const agentsPath = path.join(root, 'AGENTS.md')
if (fs.existsSync(agentsPath)) {
  const agents = readText('AGENTS.md')
  for (const marker of requiredAgentLifecycleMarkers) {
    if (!agents.includes(marker)) {
      findings.push({ code: 'PR_LIFECYCLE_GUIDANCE_DRIFT', path: 'AGENTS.md', marker })
    }
  }
}

const nvmPath = path.join(root, '.nvmrc')
const packagePath = path.join(root, 'package.json')
if (!fs.existsSync(nvmPath)) {
  findings.push({ code: 'NODE_RUNTIME_PIN_MISSING', path: '.nvmrc' })
} else if (readText('.nvmrc').trim() !== '20') {
  findings.push({ code: 'NODE_RUNTIME_PIN_DRIFT', path: '.nvmrc', expected: '20' })
}

if (!fs.existsSync(packagePath)) {
  findings.push({ code: 'PACKAGE_MANIFEST_MISSING', path: 'package.json' })
} else {
  try {
    const manifest = JSON.parse(readText('package.json'))
    if (manifest.engines?.node !== '20.x') {
      findings.push({ code: 'NODE_ENGINE_CONTRACT_DRIFT', path: 'package.json', expected: '20.x' })
    }
  } catch {
    findings.push({ code: 'PACKAGE_MANIFEST_INVALID', path: 'package.json' })
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
