import assert from 'node:assert/strict'

const canonicalId = (value) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null
  if (!['number', 'string'].includes(typeof value)) return null
  const id = String(value)
  return /^[1-9]\d*$/.test(id) ? id : null
}

const validMarker = (value) => typeof value === 'string' &&
  /^Pourfolio release QA cellar-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)

export const newCellarCleanupId = (payload, { productId, beforeIds, marker }) => {
  const itemId = canonicalId(payload?.item?.id)
  const expectedProduct = canonicalId(productId)
  if (!itemId || !expectedProduct || !validMarker(marker) || payload?.item?.notes !== marker ||
      canonicalId(payload?.item?.product_id) !== expectedProduct ||
      [...beforeIds].some((id) => String(id) === itemId)) return null
  return itemId
}

// Never discover a cleanup target by comparing histories after a failed
// create. The returned ID must be new, have the intended product and
// carry this run's random marker on fresh owner reads, including immediately
// before DELETE. A stale/incomplete baseline alone cannot prove provenance.
export const withCellarCleanup = async ({ productId, marker, submit, verify, remove, readOwnerCellar }) => {
  assert.ok(validMarker(marker), 'Cellar cleanup requires a unique run marker before writing.')
  const baseline = await readOwnerCellar()
  assert.equal(baseline?.status, 200, 'Cellar owner baseline must load before writing.')
  assert.ok(Array.isArray(baseline?.body?.items), 'Cellar owner baseline must contain items.')
  assert.ok(!baseline.body.items.some((item) => item?.notes === marker), 'Cellar run marker already exists before writing.')
  const beforeIds = baseline.body.items.map(({ id }) => String(id))
  const confirmsFixture = (items, id) => {
    const matches = items.filter((item) => String(item?.id) === id)
    return matches.length === 1 && canonicalId(matches[0]?.product_id) === canonicalId(productId) &&
      matches[0]?.notes === marker
  }

  let createdId = null
  let verifiedOwned = false
  let verificationError = null
  try {
    const receipt = await submit()
    if (receipt?.status === 201) {
      createdId = newCellarCleanupId(receipt.body, { productId, beforeIds, marker })
    }
    assert.equal(receipt?.status, 201, 'The controlled cellar create must return HTTP 201.')
    assert.ok(createdId, 'New cellar fixture identity is unconfirmed; automatic cleanup is unsafe.')

    const ownerAfterCreate = await readOwnerCellar()
    assert.equal(ownerAfterCreate?.status, 200, 'New cellar ownership could not be verified.')
    assert.ok(Array.isArray(ownerAfterCreate?.body?.items), 'New cellar ownership read did not return items.')
    assert.ok(confirmsFixture(ownerAfterCreate.body.items, createdId),
      'Created cellar ID and run marker are not uniquely confirmed on the owner account.')
    verifiedOwned = true

    await verify(receipt.body, createdId)
  } catch (error) {
    verificationError = error
  }

  let cleanupError = null
  if (createdId && verifiedOwned) {
    try {
      const ownerBeforeDelete = await readOwnerCellar()
      assert.ok(ownerBeforeDelete?.status === 200 && Array.isArray(ownerBeforeDelete?.body?.items) &&
        confirmsFixture(ownerBeforeDelete.body.items, createdId),
      'Cellar fixture provenance changed or could not be confirmed before deletion.')
      assert.equal(await remove(createdId), 204, 'Exact cellar fixture deletion must return HTTP 204.')
      const ownerAfterDelete = await readOwnerCellar()
      assert.equal(ownerAfterDelete?.status, 200, 'Cellar cleanup owner read must succeed.')
      assert.ok(Array.isArray(ownerAfterDelete?.body?.items), 'Cellar cleanup owner read must contain items.')
      assert.equal(
        ownerAfterDelete.body.items.some(({ id }) => String(id) === createdId),
        false,
        'The exact cellar fixture remains in owner history after deletion.'
      )
    } catch (error) {
      cleanupError = error
    }
  }

  if (verificationError && cleanupError) {
    throw new AggregateError([verificationError, cleanupError],
      'Cellar verification and exact-ID cleanup both failed.', { cause: verificationError })
  }
  if (verificationError) throw verificationError
  if (cleanupError) throw cleanupError
}

