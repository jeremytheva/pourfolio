import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { inspectBrewDoneItContainment } from '../check-brew-done-it-containment.js'

const createFixture = () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pourfolio-containment-'))
  const files = {
    'src/App.jsx': 'export default function App() { return null }',
    'src/components/MainLayout.jsx': "const navigation = [{ to: '/home', label: 'Discover' }]",
    'vercel.json': '{"rewrites":[]}',
    '.env.example': '# BREW_DONE_IT_POLICY_ENABLED=false\n',
    'dist/index.html': '<main>Pourfolio</main>'
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(rootDirectory, relativePath)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content)
  }
  return rootDirectory
}

test('contained route, navigation, environment and production bundle pass', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [])
})

test('reachable browser references and an active normal-environment flag fail containment', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.writeFileSync(path.join(rootDirectory, 'src/App.jsx'), "import BrewDoneIt from './pages/BrewDoneIt.jsx'; const path = '/brew-done-it'")
  fs.writeFileSync(path.join(rootDirectory, 'src/components/MainLayout.jsx'), "const navigation = [{ label: 'Brew Done It', to: '/brew-done-it' }]")
  fs.writeFileSync(path.join(rootDirectory, '.env.example'), 'BREW_DONE_IT_POLICY_ENABLED=true\n')
  fs.writeFileSync(path.join(rootDirectory, 'vercel.json'), '{"env":{"BREW_DONE_IT_POLICY_ENABLED":"true"}}')
  fs.writeFileSync(path.join(rootDirectory, 'dist/index.html'), '<main>Brew Done It</main>')

  const findings = inspectBrewDoneItContainment({ rootDirectory })
  assert.ok(findings.some((finding) => finding.includes('src/App.jsx')))
  assert.ok(findings.some((finding) => finding.includes('src/components/MainLayout.jsx')))
  assert.ok(findings.some((finding) => finding.includes('.env.example')))
  assert.ok(findings.some((finding) => finding.includes('vercel.json')))
  assert.ok(findings.some((finding) => finding.includes('dist/index.html')))
})

test('a missing production build cannot be reported as a bundle pass', (context) => {
  const rootDirectory = createFixture()
  context.after(() => fs.rmSync(rootDirectory, { recursive: true, force: true }))
  fs.rmSync(path.join(rootDirectory, 'dist'), { recursive: true })
  assert.deepEqual(inspectBrewDoneItContainment({ rootDirectory }), [
    'dist is missing; run the production build before checking containment'
  ])
})