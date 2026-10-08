import React from 'react'
import { Link } from '../lib/router.jsx'
import AdvancedRatingScores from './AdvancedRatingScores.jsx'
import { formatDate } from '../utils/dateFormatting.js'
import RatingBreakdown from './RatingBreakdown.jsx'

function ProductTastingHistory({ ratings = [], status = 'idle', error = '', onRetry, shared = false, pagination = null, onPageChange }) {
  if (status === 'idle') return null
  const headingId = shared ? 'shared-tasting-history-heading' : 'your-tasting-history-heading'

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby={headingId} aria-busy={status === 'loading' ? 'true' : 'false'}>
      <div>
        <h2 id={headingId} className="text-2xl font-semibold text-gray-900">{shared ? 'Shared tasting history' : 'Your tasting history'}</h2>
        <p className="mt-1 text-sm text-gray-600">{shared ? 'Tastings other users have chosen to share, newest first.' : 'Your completed Full Tastings of this beer, newest first.'}</p>
      </div>

      {status === 'loading' && <p className="py-8 text-center text-gray-600" role="status">Loading {shared ? 'shared' : 'your'} tasting history…</p>}

      {status === 'error' && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <p>{error || 'Tasting history is unavailable.'}</p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">{shared ? 'Retry shared tasting history' : 'Retry tasting history'}</button>}
        </div>
      )}

      {status === 'ready' && ratings.length === 0 && (
        <p className="mt-5 rounded-xl bg-gray-50 p-4 text-gray-600">{shared ? 'No other users have shared tastings of this beer yet.' : 'You have not completed a Full Tasting for this beer yet.'}</p>
      )}

      {status === 'ready' && ratings.length > 0 && (
        <ol className="mt-5 divide-y divide-gray-200" aria-label={shared ? 'Shared tasting history' : 'Your tasting history'}>
          {ratings.map((rating) => (
            <li key={rating.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {shared && <p className="font-semibold text-gray-900">{rating.author.name}</p>}
                  <p className="font-medium text-gray-900">{formatDate(rating.date_rated)}</p>
                  <p className="mt-1 text-xs text-gray-500">Full Tasting</p>
                </div>
                <Link to={shared ? `/users/${encodeURIComponent(rating.author.public_id)}?rating=${encodeURIComponent(rating.id)}` : `/profile?rating=${encodeURIComponent(rating.id)}`} aria-label={`View ${shared ? `${rating.author.name}'s` : 'my'} rating from ${formatDate(rating.date_rated)} in profile`} className="text-right text-amber-800 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                  <strong className="block whitespace-nowrap text-xl">{rating.total_weighted} / 5</strong>
                  <span className="mt-1 block text-sm">View in profile</span>
                </Link>
              </div>
              {!shared && <AdvancedRatingScores scores={rating.advanced_scores} className="mt-3" />}
              <RatingBreakdown rating={rating} publicProfileId={shared ? rating.author.public_id : null} />
            </li>
          ))}
        </ol>
      )}
      {status === 'ready' && pagination && pagination.totalPages > 1 && <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Shared tasting history pages"><button type="button" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50">Previous</button><p className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</p><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50">Next</button></nav>}
    </section>
  )
}

export default ProductTastingHistory
