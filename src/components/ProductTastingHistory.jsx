import React from 'react'
import AdvancedRatingScores from './AdvancedRatingScores.jsx'
import { formatDate } from '../utils/dateFormatting.js'

function ProductTastingHistory({ ratings = [], status = 'idle', error = '', onRetry }) {
  if (status === 'idle') return null

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="your-tasting-history-heading" aria-busy={status === 'loading' ? 'true' : 'false'}>
      <div>
        <h2 id="your-tasting-history-heading" className="text-2xl font-semibold text-gray-900">Your tasting history</h2>
        <p className="mt-1 text-sm text-gray-600">Your completed Full Tastings of this beer, newest first.</p>
      </div>

      {status === 'loading' && <p className="py-8 text-center text-gray-600" role="status">Loading your tasting history…</p>}

      {status === 'error' && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{error || 'Your tasting history is unavailable.'}</p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">Retry tasting history</button>}
        </div>
      )}

      {status === 'ready' && ratings.length === 0 && (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-gray-600">You have not completed a Full Tasting for this beer yet.</p>
      )}

      {status === 'ready' && ratings.length > 0 && (
        <ol className="mt-5 divide-y divide-gray-200" aria-label="Your tasting history">
          {ratings.map((rating) => (
            <li key={rating.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{formatDate(rating.date_rated)}</p>
                  <p className="mt-1 text-xs text-gray-500">Full Tasting</p>
                </div>
                <strong className="whitespace-nowrap text-xl text-amber-800">{rating.total_weighted} / 5</strong>
              </div>
              <AdvancedRatingScores scores={rating.advanced_scores} className="mt-3" />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default ProductTastingHistory
