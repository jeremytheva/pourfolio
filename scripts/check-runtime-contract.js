import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const expectedMajor = '24'
const expectedEngine = `${expectedMajor}.x`
const findings = []

const readText = (relativePath) => {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8')
  } catch {
    findings.push({ code: 'RUNTIME_CONTRACT_FILE_MISSING', path: relativePath })
    return null
  }
}

const nvmrc = readText('.nvmrc')
if (nvmrc !== null && nvmrc.trim() !== expectedMajor) {
  findings.push({
    code: 'NVMRC_RUNTIME_MISMATCH',
    expected: expectedMajor,
    actual: nvmrc.trim()
  })
}

let packageManifest = null
try {
  packageManifest = JSON.parse(readText('package.json') ?? '')
} catch {
  findings.push({ code: 'PACKAGE_MANIFEST_INVALID' })
}

if (packageManifest && packageManifest.engines?.node !== expectedEngine) {
  findings.push({
    code: 'PACKAGE_NODE_ENGINE_MISMATCH',
    expected: expectedEngine,
    actual: packageManifest.engines?.node ?? null
  })
}

const activeGuidance = [
  'README.md',
  'PROJECT.md',
  'AGENTS.md',
  'docs/DELIVERY_SYSTEM_IMPLEMENTATION.md'
]

for (const relativePath of activeGuidance) {
  const content = readText(relativePath)
  if (content !== null && !content.includes(`Node.js ${expectedMajor}`)) {
    findings.push({
      code: 'RUNTIME_GUIDANCE_MISMATCH',
      path: relativePath,
      expected: `Node.js ${expectedMajor}`
    })
  }
}

const validationWorkflowPath = '.github/workflows/pull-request-validation.yml'
const validationWorkflow = readText(validationWorkflowPath)
if (validationWorkflow !== null) {
  const setupNodeReferences = validationWorkflow.match(/node-version-file:\s*\.nvmrc/g) ?? []
  if (setupNodeReferences.length < 2) {
    findings.push({
      code: 'CI_RUNTIME_CONTRACT_DIVERGED',
      path: validationWorkflowPath,
      expected: 'both source validation and browser validation use .nvmrc'
    })
  }
}

findings.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))

const result = {
  status: findings.length === 0 ? 'PASS' : 'BLOCKED',
  runtime: `node-${expectedMajor}`,
  findings
}

process.stdout.write(`${JSON.stringify(result)}\n`)
if (findings.length) process.exitCode = 1
