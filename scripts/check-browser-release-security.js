import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const upstreamAuthDomain = /https?:\/\/[^\s"'`]*nocodebackend\.com\/api\/user-auth/gi
const credentialAssignment = /(?:NOCODEBACKEND_SECRET_KEY|NOCODEBACKEND_DATA_BASE_URL)\s*[=:]\s*["']?([^\s"',}]+)/g
const placeholderValue = /^(?:example|placeholder|replace[-_]?me|your[-_]|<|\$\{|https?:\/\/example\.)/i
const serverFileAllowlist = [
  'api/auth-proxy.js',
  'api/data-proxy.js',
  'api/_lib/'
]

const isAllowlistedServerFile = (relativePath) => serverFileAllowlist.some((allowlistedPath) => (
  allowlistedPath.endsWith('/')
    ? relativePath.startsWith(allowlistedPath)
    : relativePath === allowlistedPath
))

const walkFiles = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    return entry.isDirectory() ? walkFiles(filePath) : [filePath]
  })
}

export const inspectBrowserRelease = ({
  rootDirectory,
  browserDirectories = ['src', 'dist'],
  dataUpstream = process.env.NOCODEBACKEND_DATA_BASE_URL
}) => {
  const findings = []
  for (const relativeDirectory of browserDirectories) {
    const directory = path.resolve(rootDirectory, relativeDirectory)
    for (const filePath of walkFiles(directory)) {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(rootDirectory, filePath).split(path.sep).join('/')
      if (isAllowlistedServerFile(relativePath)) continue
      if (content.includes('NOCODEBACKEND_SECRET_KEY')) {
        findings.push(`${relativePath}: exposes the server-only secret variable name`)
      }
      if (dataUpstream && !placeholderValue.test(dataUpstream) && content.includes(dataUpstream)) {
        findings.push(`${relativePath}: exposes the configured data upstream`)
      }
      if (upstreamAuthDomain.test(content)) {
        findings.push(`${relativePath}: requests the upstream authentication domain directly`)
      }
      upstreamAuthDomain.lastIndex = 0

      for (const match of content.matchAll(credentialAssignment)) {
        if (!placeholderValue.test(match[1])) findings.push(`${relativePath}: contains a credential-like value`)
      }
    }
  }
  return findings
}

export const runCli = (rootDirectory = process.cwd()) => {
  const findings = inspectBrowserRelease({ rootDirectory })
  if (findings.length) {
    process.stderr.write(`Browser release security check failed:\n- ${findings.join('\n- ')}\n`)
    return 1
  }
  process.stdout.write('Browser release security check passed.\n')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv[2] ? path.resolve(process.argv[2]) : process.cwd())
}
