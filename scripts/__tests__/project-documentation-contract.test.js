import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { auditBlockerIssueStates, auditDocumentationContracts } from '../project-documentation-contract.js'

const files = ['ARCHITECTURE.md', 'AGENTS.md', '.env.example', 'src/App.jsx', 'src/data/publicDocuments.js', 'SYSTEM_MAP.md', 'STATUS.md', 'api/rating-data-proxy.js', 'DATA_MODEL.md', 'docs/DATA_MODEL.md', 'docs/nocodebackend/schema-mapping.md', 'docs/nocodebackend/launch-schema-contract.md']
const fixture = () => ({
  contract: JSON.parse(fs.readFileSync(new URL('../../contracts/pourfolio-data-contract.json', import.meta.url), 'utf8')),
  issueEvidence: JSON.parse(fs.readFileSync(new URL('../../docs/evidence/github-issue-state.json', import.meta.url), 'utf8')),
  texts: Object.fromEntries(files.map((file) => [file, fs.readFileSync(new URL(`../../${file}`, import.meta.url), 'utf8')]))
})

test('current source contracts and retained issue evidence agree', () => {
  assert.deepEqual(auditDocumentationContracts(fixture()), [])
})

test('removing a documented environment variable is detected', () => {
  const input = fixture()
  input.texts['ARCHITECTURE.md'] = input.texts['ARCHITECTURE.md'].replaceAll('NOCODEBACKEND_ADMIN_SECRET_KEY', 'REMOVED_VARIABLE')
  assert.ok(auditDocumentationContracts(input).some((finding) => finding.code === 'PROVIDER_ENVIRONMENT_DOCUMENTATION_DRIFT'))
})

test('new routes and deleted routes both invalidate the current map', () => {
  const input = fixture()
  input.texts['src/App.jsx'] += '<Route path="/new-route" />'
  input.texts['src/App.jsx'] = input.texts['src/App.jsx'].replace('path="/history"', 'path="/renamed-history"')
  const findings = auditDocumentationContracts(input)
  assert.ok(findings.some((finding) => finding.code === 'BROWSER_ROUTE_UNDOCUMENTED' && finding.route === '/new-route'))
  assert.ok(findings.some((finding) => finding.code === 'BROWSER_ROUTE_STALE' && finding.route === '/history'))
})

test('singular rating regression fails while the category field remains valid elsewhere', () => {
  const input = fixture()
  input.texts['api/rating-data-proxy.js'] = input.texts['api/rating-data-proxy.js'].replaceAll('bonus_attributes_id', 'bonus_attribute_id')
  const findings = auditDocumentationContracts(input)
  assert.ok(findings.some((finding) => finding.code === 'RATING_BONUS_FIELD_CONTRACT_DRIFT'))
  assert.ok(findings.some((finding) => finding.code === 'RATING_BONUS_FIELD_UNSUPPORTED'))
})

test('contract field changes require matching code and documentation', () => {
  const input = fixture()
  input.contract.collections.bonus_attribute_rating_mapping.provider_fields = ['id', 'user_id', 'rating_id', 'different_bonus_id']
  assert.ok(auditDocumentationContracts(input).some((finding) => finding.code === 'RATING_BONUS_FIELD_CONTRACT_DRIFT' && finding.field === 'different_bonus_id'))
})

test('closed and unknown blockers fail without pretending evidence is fresh', () => {
  assert.deepEqual(auditBlockerIssueStates([224, 165, 999], { 224: 'closed', 165: 'open' }), [
    { code: 'CURRENT_BLOCKER_ISSUE_CLOSED', issue: 224 },
    { code: 'CURRENT_BLOCKER_ISSUE_UNVERIFIED', issue: 999 }
  ])
})
