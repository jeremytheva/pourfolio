import React from 'react'

function AdvancedRatingScores({ scores, className = '' }) {
  if (!scores) return null
  const styleSampleSize = Number(scores.style_sample_size)
  const hasStyleSample = Number.isSafeInteger(styleSampleSize) && styleSampleSize > 0

  return (
    <dl className={`grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 sm:grid-cols-3 xl:grid-cols-5 ${className}`.trim()}>
      <div><dt>Score / 100</dt><dd className="font-semibold text-gray-900">{scores.score_out_of_100 ?? '—'}</dd></div>
      <div><dt>Overall Scaled Score</dt><dd className="font-semibold text-gray-900">{scores.scaled_score ?? '—'}</dd></div>
      <div>
        <dt>Style Scaled Score</dt>
        <dd className="font-semibold text-gray-900">
          {scores.style_scaled_score ?? '—'}
          {hasStyleSample && <span className="ml-1 font-normal text-gray-500">({styleSampleSize} style {styleSampleSize === 1 ? 'rating' : 'ratings'})</span>}
        </dd>
      </div>
      <div><dt>Retail PPP</dt><dd className="font-semibold text-gray-900">{scores.retail_ppp ?? '—'}</dd></div>
      <div><dt>Purchased PPP</dt><dd className="font-semibold text-gray-900">{scores.purchased_ppp ?? '—'}</dd></div>
    </dl>
  )
}

export default AdvancedRatingScores
