import assert from 'node:assert/strict'
import test from 'node:test'
import { styleReferencesForCategory } from '../../../api/_lib/styleGuidelines.js'
import { validateStyleReferences } from '../styleReferenceService.js'

const valid = () => structuredClone(styleReferencesForCategory({ id: 31, category_name: 'American IPA' }))
test('client accepts only references for the requested canonical style and freezes an independent copy', () => {
  const source = valid()
  const result = validateStyleReferences(source, '31', 'American IPA')
  assert.notEqual(result, source)
  assert.ok(Object.isFrozen(result.references[0].metrics.abv))
  assert.equal(Object.isFrozen(source), false)
})

test('client rejects inconsistent, untrusted, malformed and private-field-bearing successful responses', () => {
  const changes = [
    (p) => { p.category.id = 32 },
    (p) => { p.category.category_name = 'IPA' },
    (p) => { p.status = 'unmapped' },
    (p) => { p.references[0].sourceUrl = 'javascript:alert(1)' },
    (p) => { p.references[0].guide.edition = null },
    (p) => { p.references[0].guide.edition = 2021 },
    (p) => { p.references[0].guideId = 'another-guide' },
    (p) => { p.references[0].metrics.abv.min = '5.5' },
    (p) => { p.references[0].metrics.ibu.max = -1 },
    (p) => { p.references.push(p.references[0]) },
    (p) => { p.category.user_id = 'private' },
    (p) => { p.references[0].secret_key = 'private' }
  ]
  for (const change of changes) {
    const payload = valid(); change(payload)
    assert.throws(() => validateStyleReferences(payload, '31', 'American IPA'), (error) => error.code === 'invalid_style_references' && !error.message.includes('private'))
  }
})
