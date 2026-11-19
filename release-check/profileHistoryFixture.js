const pageSize = 20

const validatePage = (result, requestedPage) => {
  if (!result || result.page !== requestedPage || result.pageSize !== pageSize ||
      !Array.isArray(result.items) || result.items.length > pageSize ||
      result.items.some((item) => !item || typeof item !== 'object' || Array.isArray(item)) ||
      !Number.isSafeInteger(result.total) || result.total < 0 ||
      result.totalPages !== Math.ceil(result.total / pageSize) ||
      result.items.length !== Math.max(0, Math.min(pageSize, result.total - (requestedPage - 1) * pageSize)) ||
      result.summary?.count !== result.total) {
    throw new Error('The owner history fixture response is invalid.')
  }
  return result
}

const verifiedBeerRating = (items) => items.find((item) =>
  /^[1-9]\d*$/.test(String(item.id)) &&
  String(item.product?.id) === String(item.product_id) && item.product?.product_name)

// Prefer an older-page fixture without discarding an eligible first-page one.
// Two reads are a discovery bound, not evidence that later pages have no fixture.
export async function findProfileHistoryFixture(readPage) {
  const first = validatePage(await readPage(1), 1)
  const firstRating = verifiedBeerRating(first.items)
  let fixture = firstRating ? { rating: firstRating, source: first } : null
  if (first.totalPages > 1) {
    const older = validatePage(await readPage(2), 2)
    const olderRating = verifiedBeerRating(older.items)
    if (olderRating) fixture = { rating: olderRating, source: older }
  }
  return fixture
}
