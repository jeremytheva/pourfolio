import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { inspectBrewDoneItContainment } from '../check-brew-done-it-containment.js'

const createFixture = () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-brew-containment-'))
  const files = {
    'src/App.jsx': "const ProductRoadmap = lazy(() => import('./pages/ProductRoadmap.jsx')); <Route path=\"/brew-done-it\" element={protect(<ProductRoadmap focus=\"brew-done-it\" />)} />",
    'src/components/MainLayout.jsx': "const navigation = [{ to: '/features', label: 'Coming soon' }]",
    'api/_lib/brewDoneItEntryV3.js': "const enabled = String(env.BREW_DONE_IT_POLICY_ENABLED ?? '').trim().toLowerCase() === 'true'",
    'vercel.json': '{"rewrites":[]}',
    '.env.example': '# BREW_DONE_IT_POLICY_ENABLED=false\n',
    'dist/assets/app.js': "const path='/brew-done-it'; const label='Brew Done It is not active yet'"
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDirectory, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content)
  }
  return rootDirectory
}

test('contained status surface and explicit backend opt-in contract pass', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [])
})

test('playable browser exposure fails the containment gate', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.writeFileSync(
    path.join(rootDirectory, 'src/App.jsx'),
    "const BrewDoneIt = lazy(() => import('./pages/BrewDoneIt.jsx')); <Route path=\"/brew-done-it\" element={protect(<BrewDoneIt />)} />"
  )
  fs.writeFileSync(
    path.join(rootDirectory, 'src/components/MainLayout.jsx'),
    "const navigation = [{ to: '/brew-done-it', label: 'Brew Done It' }]"
  )
  fs.writeFileSync(
    path.join(rootDirectory, 'dist/assets/app.js'),
    "const copy='Persistent two-player deduction game'"
  )

  const findings = inspectBrewDoneItContainment({ rootDirectory })
  assert.ok(findings.some((finding) => finding.includes('must not import the playable')))
  assert.ok(findings.some((finding) => finding.includes('informational ProductRoadmap status placeholder')))
  assert.ok(findings.some((finding) => finding.includes('must not expose Brew Done It in primary navigation')))
  assert.ok(findings.some((finding) => finding.includes('planned-features status surface')))
  assert.ok(findings.some((finding) => finding.includes('playable Brew Done It browser surface')))
})

test('legacy default-on backend policy fails the containment gate', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.writeFileSync(
    path.join(rootDirectory, 'api/_lib/brewDoneItEntryV3.js'),
    "const enabled = String(env.BREW_DONE_IT_POLICY_ENABLED ?? '').trim().toLowerCase() !== 'false'"
  )
  assert.ok(inspectBrewDoneItContainment({ rootDirectory }).some((finding) => finding.includes('must require explicit')))
})

test('explicit repository enablement fails while explicit false remains safe', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))

  fs.writeFileSync(path.join(rootDirectory, '.env.example'), 'BREW_DONE_IT_POLICY_ENABLED=false\n')
  fs.writeFileSync(path.join(rootDirectory, 'vercel.json'), '{"env":{"BREW_DONE_IT_POLICY_ENABLED":"false"}}')
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [])

  fs.writeFileSync(path.join(rootDirectory, '.env.example'), 'BREW_DONE_IT_POLICY_ENABLED=true\n')
  fs.writeFileSync(path.join(rootDirectory, 'vercel.json'), '{"env":{"BREW_DONE_IT_POLICY_ENABLED":"true"}}')
  const findings = inspectBrewDoneItContainment({ rootDirectory })
  assert.ok(findings.some((finding) => finding.includes('.env.example must not actively enable')))
  assert.ok(findings.some((finding) => finding.includes('vercel.json must not enable')))
})

test('a missing production build cannot be reported as a containment pass', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.rmSync(path.join(rootDirectory, 'dist'), { recursive: true })
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [
    'dist is missing; run the production build before checking Brew Done It containment'
  ])
})
