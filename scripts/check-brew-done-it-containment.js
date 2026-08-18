import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const forbiddenBrowserReferences = [
  ['/brew-done-it', 'Brew Done It route'],
  ['./pages/BrewDoneIt', 'Brew Done It page import'],
  ['brewDoneItService', 'Brew Done It browser service import']
]

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

export const inspectBrewDoneItContainment = ({ rootDirectory, requireBuild = true }) => {
  const findings = []
  const routeSource = readText(rootDirectory, 'src/App.jsx')
  const navigationSource = readText(rootDirectory, 'src/components/MainLayout.jsx')

  for (const [reference, description] of forbiddenBrowserReferences) {
    if (routeSource.includes(reference)) findings.push(`src/App.jsx contains a ${description}`)
    if (navigationSource.includes(reference)) findings.push(`src/components/MainLayout.jsx contains a ${description}`)
  }

  const vercelConfiguration = readText(rootDirectory, 'vercel.json')
  if (vercelConfiguration.includes('BREW_DONE_IT_POLICY_ENABLED')) {
    findings.push('vercel.json configures BREW_DONE_IT_POLICY_ENABLED')
  }

  const exampleEnvironment = readText(rootDirectory, '.env.example')
  const activePolicySetting = exampleEnvironment.split(/\r?\n/).find((line) => (
    /^\s*BREW_DONE_IT_POLICY_ENABLED\s*=/.test(line)
  ))
  if (activePolicySetting) findings.push('.env.example sets BREW_DONE_IT_POLICY_ENABLED instead of leaving it unset')

  const distDirectory = path.join(rootDirectory, 'dist')
  if (requireBuild && !fs.existsSync(distDirectory)) {
    findings.push('dist is missing; run the production build before checking containment')
  } else {
    for (const filePath of walkFiles(distDirectory)) {
      const content = fs.readFileSync(filePath, 'utf8')
      if (content.includes('/brew-done-it') || content.includes('Brew Done It')) {
        findings.push(`${path.relative(rootDirectory, filePath)} contains Brew Done It browser content`)
      }
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
  process.stdout.write('Brew Done It route, navigation, bundle and normal-environment containment check passed.\n')
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runCli(process.argv[2] ? path.resolve(process.argv[2]) : process.cwd())
}