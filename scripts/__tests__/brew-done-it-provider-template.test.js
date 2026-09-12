import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { auditBrewDoneItProviderEvidence } from '../audit-brew-done-it-provider-evidence.js'

const templatePath = fileURLToPath(new URL('../../docs/nocodebackend/brew-done-it-provider-evidence.template.json', import.meta.url))

test('checked-in Brew provider evidence template is deliberately blocked', () => {
  const manifest = JSON.parse(fs.readFileSync(templatePath, 'utf8'))
  const result = auditBrewDoneItProviderEvidence(manifest)
  assert.equal(result.status, 'BLOCKED')
  assert.ok(result.blockers.some(({ code }) => code === 'EVIDENCE_NOT_PASS'))
  assert.ok(result.blockers.some(({ code }) => code === 'PROVIDER_MUTATION_NOT_APPROVED'))
})
