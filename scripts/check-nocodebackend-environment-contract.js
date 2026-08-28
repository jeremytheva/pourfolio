import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'coverage', 'playwright-report', 'test-results'])
const ignoredFiles = new Set(['package-lock.json'])
const environmentPrefix = 'NC' + 'B_'
const forbiddenDataUrl = ['https://app.nocodebackend.com', '/api/data'].join('')
const requiredDataUrl = 'https://api.nocodebackend.com/'
const requiredAuthUrl = 'https://app.nocodebackend.com/api/user-auth'
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.env', '.example'])

const violations = []

const inspect = (filePath) => {
  const relative = path.relative(root, filePath).replaceAll('\\', '/')
  if (ignoredFiles.has(path.basename(filePath))) return
  const extension = path.extname(filePath)
  if (!textExtensions.has(extension) && path.basename(filePath) !== '.env.example') return

  const content = fs.readFileSync(filePath, 'utf8')
  if (content.includes(environmentPrefix)) violations.push(`${relative}: contains retired ${environmentPrefix} variable prefix`)
  if (content.includes(forbiddenDataUrl)) violations.push(`${relative}: contains retired data URL ${forbiddenDataUrl}`)

  if (relative === '.env.example') {
    for (const variable of [
      'NOCODEBACKEND_AUTH_BASE_URL',
      'NOCODEBACKEND_DATA_BASE_URL',
      'NOCODEBACKEND_SECRET_KEY',
      'NOCODEBACKEND_INSTANCE'
    ]) {
      if (!content.includes(variable)) violations.push(`${relative}: missing ${variable}`)
    }
    if (!content.includes(`NOCODEBACKEND_DATA_BASE_URL=${requiredDataUrl}`)) violations.push(`${relative}: missing canonical data URL ${requiredDataUrl}`)
    if (!content.includes(`NOCODEBACKEND_AUTH_BASE_URL=${requiredAuthUrl}`)) violations.push(`${relative}: missing canonical auth URL ${requiredAuthUrl}`)
    for (const runtimeOnlyVariable of ['NOCODEBACKEND_SECRET_KEY', 'NOCODEBACKEND_INSTANCE']) {
      const emptyAssignment = new RegExp(`^${runtimeOnlyVariable}=\\s*$`, 'm')
      if (!emptyAssignment.test(content)) violations.push(`${relative}: ${runtimeOnlyVariable} must not contain a repository value`)
    }
  }
}

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(filePath)
    else if (entry.isFile()) inspect(filePath)
  }
}

walk(root)

if (violations.length) {
  process.stderr.write(`NoCodeBackend environment contract violations:\n${violations.map((item) => `- ${item}`).join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write('NoCodeBackend environment contract: PASS\n')
}
