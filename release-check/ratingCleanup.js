import assert from 'node:assert/strict'

const canonicalId = (value) => {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) return null
  if (!['number', 'string'].includes(typeof value)) return null
  const text = String(value)
  return /^[1-9]\d*$/.test(text) ? text : null
}

export const newRatingCleanupId = (payload, { productId, beforeIds }) => {
  const id = canonicalId(payload?.rating?.id)
  const product = canonicalId(productId)
  if (!id || !product || canonicalId(payload?.rating?.product_id) !== product ||
      payload?.duplicate !== false || [...beforeIds].some((beforeId) => String(beforeId) === id)) return null
  return id
}

// Capture the acknowledged canonical ID before later assertions can fail.
// Never discover a deletion target by subtracting two whole-history snapshots.
export const withRatingCleanup = async ({ productId, beforeIds, submit, verify, remove, readHistory }) => {
  let createdId = null
  let verificationError = null
  try {
    const submitted = await submit()
    if (submitted.status === 201) createdId = newRatingCleanupId(submitted.body, { productId, beforeIds })
    assert.equal(submitted.status, 201, 'The controlled tasting must return HTTP 201.')
    assert.ok(createdId, 'A new owned tasting identity could not be verified; cleanup is unconfirmed.')
    await verify(submitted.body, createdId)
  } catch (error) {
    verificationError = error
    throw error
  } finally {
    if (createdId) {
      try {
        assert.equal(await remove(createdId), 204, 'The exact tasting delete must return HTTP 204.')
        assert.equal(await remove(createdId), 204, 'Repeated exact tasting deletion must remain HTTP 204.')
        const history = await readHistory()
        assert.equal(Array.isArray(history?.items), true, 'Cleanup history must be a successful owner read.')
        assert.equal(history.items.some((item) => String(item.id) === createdId), false, 'The test tasting remains in owner history.')
      } catch (cleanupError) {
        if (verificationError) throw new AggregateError([verificationError, cleanupError], 'Rating verification and cleanup both failed.')
        throw cleanupError
      }
    }
  }
}
