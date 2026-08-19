import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const upstreamAuthDomain = /https?:\/\/[^\s"'`]*nocodebackend\.com\/api\/user-auth/gi
const upstreamDataDomain = /https?:\/\/[^\s"'`]*nocodebackend\.com\/(?:api\/)?(?:database|data|collections)(?:[/:?#"'`)]|$)/gi
const sourceMapReference = /(?:sourceMappingURL=|"sourcesContent"\s*:|"mappings"\s*:)/g
const secretBearingHeader = /(?:authorization|x-api-key|api-key|x-nocodebackend-secret|upstash-redis-rest-token)\s*[:=]\s*[`"']?(?:Bearer\s+)?[^`"'\s,}]+/gi
const credentialAssignment = /(?:NOCODEBACKEND_SECRET_KEY|NOCODEBACKEND_DATA_BASE_URL|NOCODEBACKEND_AUTH_BASE_URL|ALLOWED_ORIGINS|UPSTASH_REDIS_REST_TOKEN|RATE_LIMIT_KEY_SECRET|UPSTASH_REDIS_REST_URL|pourfolio_KV_REST_API_TOKEN|pourfolio_KV_REST_API_URL|pourfolio_KV_REST_API_READ_ONLY_TOKEN|pourfolio_KV_URL|pourfolio_REDIS_URL)\s*[=:]\s*["']?([^\s"',}]+)/g
const placeholderValue = /^(?:example|placeholder|replace[-_]?me|your[-_]|<|\$\{|https?:\/\/example\.)/i
const upstashBrowserImport = /(?:from\s*|import\s*\(|require\s*\()\s*["']@upstash\/redis(?:[/'"])/
const directUpstashRestRequest = /(?:fetch|axios(?:\.(?:get|post|put|patch|delete))?)\s*\([^)]*https?:\/\/[^\s"'`)]*\.upstash\.io(?:[/:?"'`)])/gis
const serverOnlyVariableNames = [
  ['NOCODEBACKEND_SECRET_KEY', 'NoCodeBackend secret'],
  ['NOCODEBACKEND_DATA_BASE_URL', 'NoCodeBackend data upstream'],
  ['NOCODEBACKEND_AUTH_BASE_URL', 'NoCodeBackend auth upstream'],
  ['ALLOWED_ORIGINS', 'allowed origins configuration'],
  ['pourfolio_KV_REST_API_TOKEN', 'Vercel KV REST token'],
  ['pourfolio_KV_REST_API_URL', 'Vercel KV REST URL'],
  ['pourfolio_KV_REST_API_READ_ONLY_TOKEN', 'Vercel KV read-only token'],
  ['pourfolio_KV_URL', 'Vercel KV connection URL'],
  ['pourfolio_REDIS_URL', 'Vercel Redis URL'],
  ['UPSTASH_REDIS_REST_TOKEN', 'Upstash token'],
  ['UPSTASH_REDIS_REST_URL', 'Upstash URL'],
  ['RATE_LIMIT_KEY_SECRET', 'rate-limit secret']
]
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
  nocodeBackendSecret = process.env.NOCODEBACKEND_SECRET_KEY,
  dataUpstream = process.env.NOCODEBACKEND_DATA_BASE_URL,
  upstashToken = process.env.pourfolio_KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
  rateLimitSecret = process.env.RATE_LIMIT_KEY_SECRET,
  upstashUrl = process.env.pourfolio_KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  kvReadOnlyToken = process.env.pourfolio_KV_REST_API_READ_ONLY_TOKEN,
  kvUrl = process.env.pourfolio_KV_URL,
  redisUrl = process.env.pourfolio_REDIS_URL,
  authUpstream = process.env.NOCODEBACKEND_AUTH_BASE_URL,
  allowedOrigins = process.env.ALLOWED_ORIGINS
}) => {
  const findings = []
  for (const relativeDirectory of browserDirectories) {
    const directory = path.resolve(rootDirectory, relativeDirectory)
    for (const filePath of walkFiles(directory)) {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(rootDirectory, filePath).split(path.sep).join('/')
      if (isAllowlistedServerFile(relativePath)) continue
      for (const [variableName, description] of serverOnlyVariableNames) {
        if (content.includes(variableName)) {
          findings.push(`${relativePath}: exposes the server-only ${description} variable name`)
        }
      }
      if (nocodeBackendSecret && !placeholderValue.test(nocodeBackendSecret) && content.includes(nocodeBackendSecret)) {
        findings.push(`${relativePath}: exposes the configured NoCodeBackend secret`)
      }
      if (dataUpstream && !placeholderValue.test(dataUpstream) && content.includes(dataUpstream)) {
        findings.push(`${relativePath}: exposes the configured data upstream`)
      }
      if (upstashToken && !placeholderValue.test(upstashToken) && content.includes(upstashToken)) {
        findings.push(`${relativePath}: exposes the configured Upstash token`)
      }
      if (rateLimitSecret && !placeholderValue.test(rateLimitSecret) && content.includes(rateLimitSecret)) {
        findings.push(`${relativePath}: exposes the configured rate-limit secret`)
      }
      if (upstashUrl && !placeholderValue.test(upstashUrl) && content.includes(upstashUrl)) {
        findings.push(`${relativePath}: exposes the configured Upstash URL`)
      }
      if (kvReadOnlyToken && !placeholderValue.test(kvReadOnlyToken) && content.includes(kvReadOnlyToken)) {
        findings.push(`${relativePath}: exposes the configured Vercel KV read-only token`)
      }
      if (kvUrl && !placeholderValue.test(kvUrl) && content.includes(kvUrl)) {
        findings.push(`${relativePath}: exposes the configured Vercel KV URL`)
      }
      if (redisUrl && !placeholderValue.test(redisUrl) && content.includes(redisUrl)) {
        findings.push(`${relativePath}: exposes the configured Vercel Redis URL`)
      }
      if (authUpstream && !placeholderValue.test(authUpstream) && content.includes(authUpstream)) {
        findings.push(`${relativePath}: exposes the configured NoCodeBackend auth upstream`)
      }
      if (allowedOrigins && !placeholderValue.test(allowedOrigins) && content.includes(allowedOrigins)) {
        findings.push(`${relativePath}: exposes the configured allowed origins`)
      }
      if (upstashBrowserImport.test(content)) {
        findings.push(`${relativePath}: imports @upstash/redis in browser code`)
      }
      if (directUpstashRestRequest.test(content)) {
        findings.push(`${relativePath}: makes a direct Upstash REST request`)
      }
      directUpstashRestRequest.lastIndex = 0
      if (upstreamAuthDomain.test(content)) {
        findings.push(`${relativePath}: requests the upstream authentication domain directly`)
      }
      upstreamAuthDomain.lastIndex = 0
      if (upstreamDataDomain.test(content)) {
        findings.push(`${relativePath}: requests a privileged NoCodeBackend data endpoint directly`)
      }
      upstreamDataDomain.lastIndex = 0
      if (sourceMapReference.test(content) || relativePath.endsWith('.map')) {
        findings.push(`${relativePath}: exposes source map content or references`)
      }
      sourceMapReference.lastIndex = 0
      if (secretBearingHeader.test(content)) {
        findings.push(`${relativePath}: contains a secret-bearing header pattern`)
      }
      secretBearingHeader.lastIndex = 0

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
