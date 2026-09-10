import React from 'react'

const scoreLabel = (score) => `${score} out of 7`

function ProductRatingInsights({ summary, insights, userSummary = null }) {
  const distribution = Array.isArray(insights?.distribution) ? insights.distribution : []
  const attributes = Array.isArray(insights?.attributes) ? insights.attributes : []
  const total = Number.isSafeInteger(summary?.count) ? summary.count : 0
  const maxBucket = Math.max(1, ...distribution.map((bucket) => bucket.count))
  const comparison = userSummary && Number.isFinite(summary?.average)
    ? Number((userSummary.average - summary.average).toFixed(2))
    : null
  const comparisonLabel = comparison === null
    ? null
    : comparison === 0
      ? 'Same as the community average'
      : `${Math.abs(comparison)} ${comparison > 0 ? 'above' : 'below'} the community average`

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="community-rating-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="community-rating-heading" className="text-2xl font-semibold text-gray-900">Community rating</h2><p className="mt-1 text-sm text-gray-600">Aggregate results only. Individual community ratings are not exposed.</p></div>
        <p className="text-right"><span className="block text-3xl font-bold text-amber-800">{summary?.average === null ? 'Not rated' : `${summary?.average} / 7`}</span><span className="text-sm text-gray-500">{total} {total === 1 ? 'rating' : 'ratings'}</span></p>
      </div>

      {userSummary && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4" aria-labelledby="your-rating-comparison-heading">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="your-rating-comparison-heading" className="font-semibold text-gray-900">Your rating comparison</h3><p className="mt-1 text-sm text-gray-600">Based only on ratings in your signed-in rating history.</p></div><p className="text-right"><strong className="block text-2xl text-amber-900">{userSummary.average} / 7</strong><span className="text-sm text-gray-600">{userSummary.count} {userSummary.count === 1 ? 'personal rating' : 'personal ratings'}</span></p></div>
          {comparisonLabel && <p className="mt-3 text-sm font-medium text-amber-950">{comparisonLabel}.</p>}
        </div>
      )}

      {total === 0 ? <p className="mt-6 rounded-xl bg-gray-50 p-4 text-gray-600">No community rating data yet. Be the first to rate this beer.</p> : <>
        <div className="mt-8" aria-labelledby="rating-distribution-heading"><h3 id="rating-distribution-heading" className="font-semibold text-gray-900">Rating distribution</h3><div className="mt-4 space-y-2">{distribution.map((bucket) => { const percentage = total ? Math.round((bucket.count / total) * 100) : 0; return <div key={bucket.score} className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3"><span className="text-sm font-medium text-gray-700">{bucket.score} / 7</span><div className="h-3 overflow-hidden rounded-full bg-gray-100" aria-hidden="true"><div className="h-full rounded-full bg-amber-600" style={{ width: `${(bucket.count / maxBucket) * 100}%` }} /></div><span className="text-right text-sm text-gray-600" aria-label={`${scoreLabel(bucket.score)}: ${bucket.count} ratings, ${percentage} percent`}>{bucket.count} · {percentage}%</span></div>})}</div></div>
        {attributes.length > 0 && <div className="mt-8" aria-labelledby="attribute-breakdown-heading"><h3 id="attribute-breakdown-heading" className="font-semibold text-gray-900">Attribute breakdown</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{attributes.map((attribute) => <div key={attribute.attributeId} className="rounded-xl border border-gray-200 bg-gray-50 p-4"><div className="flex items-baseline justify-between gap-3"><span className="font-medium text-gray-900">{attribute.name}</span><strong className="text-lg text-amber-800">{attribute.average} / 7</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden="true"><div className="h-full rounded-full bg-amber-600" style={{ width: `${(attribute.average / 7) * 100}%` }} /></div><p className="mt-2 text-xs text-gray-500">Based on {attribute.count} {attribute.count === 1 ? 'score' : 'scores'}</p></div>)}</div></div>}
      </>}
    </section>
  )
}

export default ProductRatingInsights
