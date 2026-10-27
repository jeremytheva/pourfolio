import assert from 'node:assert/strict'
import test from 'node:test'
import { STYLE_METRICS, exactMeasurement, compareStyleMetric, styleComparisonScale } from './styleComparison.js'

const abv = STYLE_METRICS[0], ibu = STYLE_METRICS[1]
const range = { kind: 'range', min: 5.5, max: 7.5, unit: '% ABV' }

test('style measurements preserve zero and numeric strings without coercing missing, boolean or qualified values', () => {
  for (const value of [null, undefined, '', ' ', false, true, [], [5], {}, NaN, Infinity, '50+', '>50', '40–70', '6.5%', '1e2', -1]) {
    assert.equal(exactMeasurement(value), null, String(value))
  }
  assert.equal(exactMeasurement(0), 0)
  assert.equal(exactMeasurement(' 6.50 '), 6.5)
  assert.equal(exactMeasurement(81, 80), null)
})

test('range endpoints are inclusive and ABV differences are percentage points from the nearest boundary', () => {
  for (const value of [5.5, 6.5, 7.5]) assert.equal(compareStyleMetric(value, range, abv).status, 'within')
  assert.deepEqual(compareStyleMetric(7.8, range, abv), { value: 7.8, status: 'above', difference: 0.3 })
  assert.deepEqual(compareStyleMetric(5.2, range, abv), { value: 5.2, status: 'below', difference: 0.3 })
  assert.equal(compareStyleMetric(null, range, abv).status, 'not_recorded')
  assert.equal(compareStyleMetric(0, range, abv).status, 'below')
})

test('IBU comparisons accept zero and variable references never fabricate a range', () => {
  assert.deepEqual(compareStyleMetric(85, { kind: 'range', min: 40, max: 70, unit: 'IBU' }, ibu), { value: 85, status: 'above', difference: 15 })
  assert.equal(compareStyleMetric(0, { kind: 'range', min: 0, max: 10, unit: 'IBU' }, ibu).status, 'within')
  assert.equal(compareStyleMetric(85, { kind: 'variable', unit: 'IBU' }, ibu).status, 'variable')
  for (const invalid of [null, { ...range, min: 8 }, { ...range, unit: 'ABW' }, { ...range, max: Infinity }]) {
    assert.equal(compareStyleMetric(6, invalid, abv).status, 'reference_unavailable')
  }
})

test('chart scales include low and high outliers and remain common across guideline switches', () => {
  const references = [{ metrics: { abv: range } }, { metrics: { abv: { ...range, min: 6.3 } } }]
  for (const value of [0, 15]) {
    const scale = styleComparisonScale(value, references, 'abv')
    assert.ok(scale.position(value) >= 0 && scale.position(value) < 100)
    assert.ok(scale.position(5.5) >= 0 && scale.position(7.5) < 100)
  }
  assert.equal(styleComparisonScale(null, [{ metrics: { abv: { kind: 'variable' } } }], 'abv'), null)
})
