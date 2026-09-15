import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { inspectBrewDoneItContainment } from '../check-brew-done-it-containment.js'

const createFixture = () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-brew-enablement-'))
  const files = {
    'src/App.jsx': "const BrewDoneIt = lazy(() => import('./pages/BrewDoneIt.jsx')); <Route path=\"/brew-done-it\" element={protect(<BrewDoneItRoute user={user} />)} />",
    'src/components/MainLayout.jsx': "const navigation = [{ to: '/brew-done-it', label: 'Brew Done It' }]",
    'api/_lib/brewDoneItEntryV3.js': "const enabled = String(env.BREW_DONE_IT_POLICY_ENABLED ?? '').trim().toLowerCase() !== 'false'",
    'vercel.json': '{"rewrites":[]}',
    '.env.example': '# BREW_DONE_IT_POLICY_ENABLED=false\n',
    'dist/assets/app.js': "const path='/brew-done-it'; const label='Brew Done It'"
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDirectory, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content)
  }
  return rootDirectory
}

test('enabled route, navigation, backend kill switch and production bundle pass', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [])
})

test('missing enabled surface and backend kill switch fail the release gate', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.writeFileSync(path.join(rootDirectory, 'src/App.jsx'), 'export default function App() { return null }')
  fs.writeFileSync(path.join(rootDirectory, 'src/components/MainLayout.jsx'), "const navigation = [{ to: '/home' }]")
  fs.writeFileSync(path.join(rootDirectory, 'api/_lib/brewDoneItEntryV3.js'), 'export default function handler() {}')
  fs.writeFileSync(path.join(rootDirectory, 'dist/assets/app.js'), 'const app = "Pourfolio"')

  const findings = inspectBrewDoneItContainment({ rootDirectory })
  assert.ok(findings.some((finding) => finding.includes('page import')))
  assert.ok(findings.some((finding) => finding.includes('protected /brew-done-it route')))
  assert.ok(findings.some((finding) => finding.includes('primary navigation')))
  assert.ok(findings.some((finding) => finding.includes('explicit false kill switch')))
  assert.ok(findings.some((finding) => finding.includes('dist does not contain')))
})

test('an explicit false environment setting is detected as disabled test surface', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.writeFileSync(path.join(rootDirectory, '.env.example'), 'BREW_DONE_IT_POLICY_ENABLED=false\n')
  fs.writeFileSync(path.join(rootDirectory, 'vercel.json'), '{"env":{"BREW_DONE_IT_POLICY_ENABLED":"false"}}')

  const findings = inspectBrewDoneItContainment({ rootDirectory })
  assert.ok(findings.some((finding) => finding.includes('.env.example explicitly disables')))
  assert.ok(findings.some((finding) => finding.includes('vercel.json explicitly disables')))
})

test('a missing production build cannot be reported as an enablement pass', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.rmSync(path.join(rootDirectory, 'dist'), { recursive: true })
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [
    'dist is missing; run the production build before checking Brew Done It enablement'
  ])
})
