import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiStar, FiUser } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import { Link, useParams, useSearchParams } from '../lib/router.jsx'
import { profileService } from '../services/profileService.js'
import { formatDate } from '../utils/dateFormatting.js'
import RatingBreakdown from '../components/RatingBreakdown.jsx'

function PublicUserProfile() {
  const { publicProfileId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedRatingId = searchParams.get('rating')
  const requestedPage = searchParams.get('page') || '1'
  const [status, setStatus] = useState('loading')
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const selectedRef = useRef(null)
  const requestId = useRef(0)

  const loadProfile = useCallback(async () => {
    const current = ++requestId.current
    setStatus('loading')
    setPayload(null)
    setError('')
    try {
      const result = await profileService.getPublicUserProfile(publicProfileId, { page: requestedPage, ratingId: selectedRatingId })
      if (current !== requestId.current) return
      setPayload(result)
      setStatus('ready')
    } catch (requestError) {
      if (current !== requestId.current) return
      setPayload(null)
      setError(requestError.message || 'This profile could not be loaded.')
      setStatus('error')
    }
  }, [publicProfileId, requestedPage, selectedRatingId])

  useEffect(() => { loadProfile(); return () => { requestId.current += 1 } }, [loadProfile])
  useEffect(() => { if (status === 'error') errorRef.current?.focus() }, [status])
  useEffect(() => {
    if (status === 'ready' && selectedRatingId && selectedRef.current) {
      selectedRef.current.focus(); selectedRef.current.scrollIntoView?.({ block: 'center' })
    }
  }, [status, selectedRatingId, payload])

  const profile = payload?.profile
  const ratings = payload?.ratings || []
  const average = useMemo(() => payload?.summary?.average ?? null, [payload])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/home" className="text-sm font-medium text-amber-700 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">Back to products</Link>

      {status === 'loading' && <p className="py-16 text-center text-gray-600" role="status">Loading user profile…</p>}

      {status === 'error' && (
        <div ref={errorRef} tabIndex={-1} className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300" role="alert">
          <h1 className="text-xl font-semibold">User profile unavailable</h1>
          <p className="mt-2">{error}</p>
          <button type="button" onClick={loadProfile} className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">Retry</button>
          {selectedRatingId && <Link to={`/users/${publicProfileId}`} className="mt-3 block underline focus:outline-none focus:ring-2 focus:ring-red-300">View all shared ratings</Link>}
        </div>
      )}

      {status === 'ready' && profile && (
        <>
          <header className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800" aria-hidden="true"><SafeIcon icon={FiUser} className="h-8 w-8" /></div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Pourfolio user</p>
                <h1 className="mt-1 text-3xl font-bold text-gray-900">{profile.name}</h1>
                {profile.description && <p className="mt-3 max-w-2xl whitespace-pre-wrap text-gray-600">{profile.description}</p>}
              </div>
            </div>
          </header>

          <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="public-rating-history">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="public-rating-history" className="text-2xl font-semibold text-gray-900">Rated beers</h2><p className="mt-1 text-sm text-gray-600">Previous Full Tasting scores this user has chosen to share. Private price and PPP information is never included.</p></div>
              <div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-500">Average</p><p className="text-2xl font-bold text-amber-800">{average === null ? '—' : `${average} / 5`}</p></div>
            </div>

            {ratings.length === 0 ? (
              <div className="py-10 text-center"><SafeIcon icon={FiStar} className="mx-auto mb-3 h-9 w-9 text-gray-300" /><p className="font-medium text-gray-800">No shared ratings yet</p></div>
            ) : (
              <ul className="mt-5 divide-y divide-gray-200" aria-label="Shared rating history">
                {ratings.map((rating) => (
                  <li key={rating.id} id={`rating-${rating.id}`} ref={String(rating.id) === selectedRatingId ? selectedRef : null} tabIndex={-1} className={`py-4 outline-none focus:ring-2 focus:ring-amber-300 ${String(rating.id) === selectedRatingId ? 'rounded-lg bg-amber-50 px-3' : ''}`}>
                    <div className="flex items-start justify-between gap-4"><div><Link to={`/products/${rating.product_id}`} className="font-semibold text-gray-900 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">{rating.product?.product_name || 'Beer details unavailable'}</Link><p className="mt-1 text-sm text-gray-600">{rating.product?.producer?.producer_name || 'Producer not recorded'}</p><p className="mt-1 text-xs text-gray-500">{formatDate(rating.date_rated)}</p></div>
                    <span className="whitespace-nowrap text-lg font-semibold text-amber-800">{rating.total_weighted} / 5</span>
                    </div><RatingBreakdown rating={rating} publicProfileId={publicProfileId} />
                  </li>
                ))}
              </ul>
            )}
            {payload.totalPages > 1 && <nav className="mt-5 flex items-center justify-between gap-3" aria-label="Shared rating history pages"><button type="button" disabled={payload.page <= 1} onClick={() => setSearchParams({ page: String(payload.page - 1) })} className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50">Previous</button><p className="text-sm text-gray-600">Page {payload.page} of {payload.totalPages}</p><button type="button" disabled={payload.page >= payload.totalPages} onClick={() => setSearchParams({ page: String(payload.page + 1) })} className="rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50">Next</button></nav>}
          </section>
        </>
      )}
    </div>
  )
}

export default PublicUserProfile
