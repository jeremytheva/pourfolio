import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DATE_NOT_RECORDED, formatDate } from '../dateFormatting.js'

describe('formatDate', () => {
  it('formats a valid ISO date for Australian readers', () => {
    assert.equal(formatDate('2026-08-14T12:00:00.000Z'), '14 Aug 2026')
  })

  it('returns the safe fallback for null and empty strings', () => {
    assert.equal(formatDate(null), DATE_NOT_RECORDED)
    assert.equal(formatDate(''), DATE_NOT_RECORDED)
    assert.equal(formatDate('   '), DATE_NOT_RECORDED)
  })

  it('returns the safe fallback for impossible values', () => {
    assert.equal(formatDate('not-a-date'), DATE_NOT_RECORDED)
    assert.equal(formatDate('2026-02-30'), DATE_NOT_RECORDED)
    assert.equal(formatDate({ date: '2026-08-14' }), DATE_NOT_RECORDED)
  })

  it('returns the safe fallback for invalid timestamps', () => {
    assert.equal(formatDate(Number.NaN), DATE_NOT_RECORDED)
    assert.equal(formatDate(Number.POSITIVE_INFINITY), DATE_NOT_RECORDED)
    assert.equal(formatDate(new Date(Number.NaN)), DATE_NOT_RECORDED)
  })
})