import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const readText = (rootDirectory, relativePath) => (
  fs.readFileSync(path.join(rootDirectory, relativePath), 'utf8')
)

const walkFiles = (directory) => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    return entry.isDirectory() ? walkFiles(filePath) : [filePath]
  })
}

const activeEnvironmentSetting = (source) => source.split(/\r?\n/).find((line) => (
  /^\s*BREW_DONE_IT_POLICY_ENABLED\s*=/.test(line)
))

const environmentValue = (line) => String(line ?? '')
  .split('=')
  .slice(1)
  .join('=')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .toLowerCase()

export const inspectBrewDoneItContainment = ({ rootDirectory, requireBuild = true }) => {
  const findings = []
  const routeSource = readText(rootDirectory, 'src/App.jsx')
  const navigationSource = readText(rootDirectory, 'src/components/MainLayout.jsx')
  const gatewaySource = readText(rootDirectory, 'api/_lib/brewDoneItEntryV3.js')

  if (routeSource.includes("./pages/BrewDoneIt.jsx")) {
    findings.push('src/App.jsx must not import the playable Brew Done It page while the feature is contained')
  }
  if (!routeSource.includes('path="/brew-done-it"') || !routeSource.includes('<ProductRoadmap focus="brew-done-it" />')) {
    findings.push('src/App.jsx must route /brew-done-it to the informational ProductRoadmap status placeholder')
  }
  if (navigationSource.includes("to: '/brew-done-it'")) {
    findings.push('src/components/MainLayout.jsx must not expose Brew Done It in primary navigation while contained')
  }
  if (!navigationSource.includes("to: '/features'")) {
    findings.push('src/components/MainLayout.jsx must expose the planned-features status surface')
  }
  if (!gatewaySource.includes('BREW_DONE_IT_POLICY_ENABLED') || !gatewaySource.includes("toLowerCase() === 'true'")) {
    findings.push('api/_lib/brewDoneItEntryV3.js must require explicit BREW_DONE_IT_POLICY_ENABLED=true')
  }

  const vercelConfiguration = readText(rootDirectory, 'vercel.json')
  if (/"BREW_DONE_IT_POLICY_ENABLED"\s*:\s*"true"/i.test(vercelConfiguration)) {
    findings.push('vercel.json must not enable BREW_DONE_IT_POLICY_ENABLED while the feature is contained')
  }

  const exampleEnvironment = readText(rootDirectory, '.env.example')
  const policySetting = activeEnvironmentSetting(exampleEnvironment)
  if (policySetting && environmentValue(policySetting) === 'true') {
    findings.push('.env.example must not actively enable BREW_DONE_IT_POLICY_ENABLED while the feature is contained')
  }

  const distDirectory = path.join(rootDirectory, 'dist')
  if (requireBuild && !fs.existsSync(distDirectory)) {
    findings.push('dist is missing; run the production build before checking Brew Done It containment')
  } else if (fs.existsSync(distDirectory)) {
    const playableSurfaceBundled = walkFiles(distDirectory).some((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8')
      return content.includes('Persistent two-player deduction game')
    })
    if (playableSurfaceBundled) {
      findings.push('dist contains the playable Brew Done It browser surface while the feature is contained')
    }
  }

  return findings
}

export const runCli = (rootDirectory = process.cwd()) => {
  const findings = inspectBrewDoneItContainment({ rootDirectory })
  if (findings.length) {
    process.stderr.write(`Brew Done It containment check failed:\n- ${findings.join('\n- ')}\n`)
    return 1
  }
  process.stdout.write('Brew Done It containment, placeholder routing and explicit backend policy gate check passed.\n')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv[2] ? path.resolve(process.argv[2]) : process.cwd())
}
