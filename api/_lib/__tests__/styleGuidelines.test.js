import assert from 'node:assert/strict'
import test from 'node:test'
import data from '../../../data/style-guidelines.json' with { type: 'json' }
import mappingData from '../../../data/style-guideline-mappings.json' with { type: 'json' }
import { auditStyleGuidelines, styleReferencesForCategory } from '../styleGuidelines.js'

test('reviewed source dataset has 20 numeric references and 18 guarded category mappings', () => {
  assert.deepEqual(auditStyleGuidelines(), { status: 'PASS', references: 20, mappings: 18 })
  const result = styleReferencesForCategory({ id: 31, category_name: 'American IPA', user_id: 'private-owner', secret_key: 'private-key' })
  assert.equal(result.references.length, 2)
  assert.deepEqual(result.category, { id: 31, category_name: 'American IPA' })
  assert.equal(JSON.stringify(result).includes('private'), false)
  assert.deepEqual(result.references[0].metrics.abv, { kind: 'range', min: 5.5, max: 7.5, unit: '% ABV' })
})

test('names, canonical IDs and broad categories cannot silently select a nearby style', () => {
  for (const category of [{ id: 31, category_name: 'IPA' }, { id: 999, category_name: 'American IPA' }, { id: 248, category_name: 'Pale Ale' }]) {
    const result = styleReferencesForCategory(category)
    assert.equal(result.status, 'unmapped')
    assert.deepEqual(result.references, [])
  }
})

test('source audit retains variable statistics and corrects outdated prototype BA ranges', () => {
  const variable = styleReferencesForCategory({ id: 229, category_name: 'Mixed-Fermentation Sour Beer' }).references[0]
  assert.deepEqual(variable.metrics.ibu, { kind: 'variable', unit: 'IBU' })
  const porter = styleReferencesForCategory({ id: 27, category_name: 'American Imperial Porter' }).references[0]
  assert.equal(porter.guide.edition, '2026')
  assert.equal(porter.code, null)
  assert.deepEqual(porter.metrics.ibu, { kind: 'range', min: 35, max: 50, unit: 'IBU' })
  const koelsch = data.styles.find((r) => r.id === 'ba-2026:koelsch')
  assert.equal(koelsch.metrics.ibu.min, 22)
})

test('reference audit rejects duplicate, conflicting, malformed and unproven mappings', () => {
  const mutations = [
    (d) => d.styles.push(d.styles[0]),
    (d) => { d.styles[0].secret_key = 'unexpected-field' },
    (d) => { d.guides[0].id = undefined },
    (d) => { d.guides[0].edition = 2021 },
    (d) => { d.styles[0].metrics.abv.min = 99 },
    (d) => { d.styles[0].metrics.ibu.unit = 'percent' },
    (d) => { d.styles[0].sourceUrl = 'https://untrusted.example/reference' },
    (d) => { d.styles[0].guideId = 'unknown' },
    (_d, m) => { m.mappings[0].referenceIds.push('missing-reference') },
    (_d, m) => { m.mappings[0].referenceIds.push('bjcp-2021:21A') },
    (_d, m) => { m.mappings.push(m.mappings[0]) }
  ]
  for (const mutate of mutations) {
    const d = structuredClone(data), m = structuredClone(mappingData)
    mutate(d, m)
    assert.throws(() => auditStyleGuidelines(d, m), /reference data is invalid/)
  }
})
