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

const explicitlyDisabled = (value) => String(value ?? '')
  .split('=')
  .slice(1)
  .join('=')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .toLowerCase() === 'false'

// Historical function name retained because package/release tooling already imports it.
// Brew Done It is now intentionally reachable for authenticated testing, so this check
// verifies the enabled surface and its emergency kill switch rather than containment.
export const inspectBrewDoneItContainment = ({ rootDirectory, requireBuild = true }) => {
  const findings = []
  const routeSource = readText(rootDirectory, 'src/App.jsx')
  const navigationSource = readText(rootDirectory, 'src/components/MainLayout.jsx')
  const gatewaySource = readText(rootDirectory, 'api/_lib/brewDoneItEntryV3.js')

  if (!routeSource.includes("./pages/BrewDoneIt.jsx")) {
    findings.push('src/App.jsx is missing the Brew Done It page import')
  }
  if (!routeSource.includes('path="/brew-done-it"')) {
    findings.push('src/App.jsx is missing the protected /brew-done-it route')
  }
  if (!navigationSource.includes("to: '/brew-done-it'")) {
    findings.push('src/components/MainLayout.jsx is missing Brew Done It primary navigation')
  }
  if (!gatewaySource.includes('BREW_DONE_IT_POLICY_ENABLED') || !gatewaySource.includes("toLowerCase() !== 'false'")) {
    findings.push('api/_lib/brewDoneItEntryV3.js is missing the default-on backend policy with explicit false kill switch')
  }

  const vercelConfiguration = readText(rootDirectory, 'vercel.json')
  if (/"BREW_DONE_IT_POLICY_ENABLED"\s*:\s*"false"/i.test(vercelConfiguration)) {
    findings.push('vercel.json explicitly disables BREW_DONE_IT_POLICY_ENABLED')
  }

  const exampleEnvironment = readText(rootDirectory, '.env.example')
  const policySetting = activeEnvironmentSetting(exampleEnvironment)
  if (policySetting && explicitlyDisabled(policySetting)) {
    findings.push('.env.example explicitly disables BREW_DONE_IT_POLICY_ENABLED')
  }

  const distDirectory = path.join(rootDirectory, 'dist')
  if (requireBuild && !fs.existsSync(distDirectory)) {
    findings.push('dist is missing; run the production build before checking Brew Done It enablement')
  } else if (fs.existsSync(distDirectory)) {
    const enabledBundlePresent = walkFiles(distDirectory).some((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8')
      return content.includes('/brew-done-it') || content.includes('Brew Done It')
    })
    if (!enabledBundlePresent) findings.push('dist does not contain the enabled Brew Done It browser surface')
  }

  return findings
}

export const runCli = (rootDirectory = process.cwd()) => {
  const findings = inspectBrewDoneItContainment({ rootDirectory })
  if (findings.length) {
    process.stderr.write(`Brew Done It enablement check failed:\n- ${findings.join('\n- ')}\n`)
    return 1
  }
  process.stdout.write('Brew Done It route, navigation, production bundle and emergency kill-switch check passed.\n')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv[2] ? path.resolve(process.argv[2]) : process.cwd())
}
