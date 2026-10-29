import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAdminReviewCapabilities } from '../adminReviewService.js'
import { producerService } from '../producerService.js'

const valid = () => ({ version: 1, subjectId: 'user-1', capabilities: ['catalogue.review'], mode: 'read_only', moderationAvailable: false })
test('capability projection is immutable, subject bound and cannot advertise mutable privileges', () => {
  assert.deepEqual(validateAdminReviewCapabilities(valid(), 'user-1'), { subjectId: 'user-1', canReview: true })
  assert.equal(Object.isFrozen(validateAdminReviewCapabilities(valid(), 'user-1')), true)
  for (const change of [(p) => { p.subjectId = 'other' }, (p) => { p.role = 'Admin' }, (p) => { p.moderationAvailable = true },
    (p) => { p.capabilities.push('catalogue.moderate') }, (p) => { p.mode = 'full' }, (p) => { p.version = 2 }]) {
    const payload = valid(); change(payload)
    assert.throws(() => validateAdminReviewCapabilities(payload, 'user-1'), (error) => error.code === 'invalid_admin_capabilities')
  }
  assert.equal(validateAdminReviewCapabilities({ ...valid(), capabilities: [] }, 'user-1').canReview, false)
})

test('Admin producer review uses the canonical paginated list including producers without products', async (context) => {
  const previousWindow = globalThis.window
  globalThis.window = { setTimeout, clearTimeout }
  context.after(() => { globalThis.window = previousWindow })
  context.mock.method(globalThis, 'fetch', async (input) => {
    const url = new URL(input, 'https://app.example.invalid')
    assert.equal(url.pathname, '/api/nocodebackend/catalog/producers')
    assert.equal(url.searchParams.has('hasProducts'), false)
    assert.equal(url.searchParams.get('q'), 'New brewery')
    assert.equal(url.searchParams.get('page'), '1')
    return new Response(JSON.stringify({ items: [{ id: 21, producer_name: 'New brewery', address: null }], page: 1, pageSize: 24, total: 1, totalPages: 1 }), { headers: { 'content-type': 'application/json' } })
  })
  const data = await producerService.listCanonicalProducerPage({ search: 'New brewery', page: 1, limit: 24 })
  assert.equal(data.items[0].producer_name, 'New brewery')
})
