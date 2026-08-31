import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiSave, FiStar, FiTrash2, FiUser } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { ratingService } from '../services/ratingService.js'
import { formatDate } from '../utils/dateFormatting.js'

function Profile() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    description: user?.description || '',
    avatar_url: user?.avatar_url || ''
  })
  const [ratings, setRatings] = useState([])
  const [ratingsStatus, setRatingsStatus] = useState('loading')
  const [ratingsError, setRatingsError] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [deletingRatingId, setDeletingRatingId] = useState(null)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const ratingsErrorRef = useRef(null)
  const ratingsRequestIdRef = useRef(0)

  const loadRatings = useCallback(async () => {
    const requestId = ratingsRequestIdRef.current + 1
    ratingsRequestIdRef.current = requestId
    setRatingsError('')
    setRatingsStatus('loading')

    try {
      const payload = await ratingService.getUserRatings()
      if (ratingsRequestIdRef.current !== requestId) return
      setRatings(payload.items || [])
      setRatingsStatus('ready')
    } catch (requestError) {
      if (ratingsRequestIdRef.current !== requestId) return
      setRatingsError(requestError.message || 'Rating history could not be loaded.')
      setRatingsStatus('error')
    }
  }, [])

  useEffect(() => {
    loadRatings()
    return () => {
      ratingsRequestIdRef.current += 1
    }
  }, [loadRatings])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (ratingsError) ratingsErrorRef.current?.focus()
  }, [ratingsError])

  const average = useMemo(() => {
    const values = ratings.map((rating) => Number(rating.total_weighted)).filter(Number.isFinite)
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : null
  }, [ratings])

  const saveProfile = async (event) => {
    event.preventDefault()
    setError('')
    setSaveStatus('saving')
    const result = await updateProfile(form)
    if (result.error) {
      setError(result.error.message || 'Your profile could not be saved.')
      setSaveStatus('')
      return
    }
    setSaveStatus('saved')
  }

  const deleteRating = async (rating) => {
    if (!window.confirm(`Delete your rating for ${rating.product?.product_name || 'this product'}?`)) return
    setError('')
    setDeletingRatingId(rating.id)
    try {
      await ratingService.deleteRating(rating.id)
      setRatings((current) => current.filter((item) => item.id !== rating.id))
    } catch (requestError) {
      setError(requestError.message || 'The rating could not be deleted.')
    } finally {
      setDeletingRatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Account</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Profile and rating history</h1>
      </header>

      {error && (
        <div ref={errorRef} tabIndex={-1} className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 outline-none focus:ring-2 focus:ring-red-300" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="profile-details">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <SafeIcon icon={FiUser} className="h-6 w-6" />
            </div>
            <div>
              <h2 id="profile-details" className="font-semibold text-gray-900">{user?.name}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={saveProfile} aria-busy={saveStatus === 'saving' ? 'true' : 'false'} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Display name
              <input required maxLength={120} value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaveStatus('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Description
              <textarea maxLength={1000} rows={4} value={form.description} onChange={(event) => { setForm((current) => ({ ...current, description: event.target.value })); setSaveStatus('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Avatar URL
              <input type="url" maxLength={2048} value={form.avatar_url} onChange={(event) => { setForm((current) => ({ ...current, avatar_url: event.target.value })); setSaveStatus('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
            </label>
            <p className="text-xs text-gray-500">Account identity and role are not editable from the browser.</p>
            <button type="submit" disabled={saveStatus === 'saving'} aria-busy={saveStatus === 'saving' ? 'true' : undefined} className="inline-flex w-full items-center justify-center rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 disabled:cursor-wait disabled:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
              <SafeIcon icon={FiSave} className="mr-2 h-4 w-4" />
              {saveStatus === 'saving' ? 'Saving…' : 'Save profile'}
            </button>
            {saveStatus === 'saved' && <p className="text-center text-sm text-green-700" role="status" aria-live="polite" aria-atomic="true">Profile saved.</p>}
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="rating-history" aria-busy={ratingsStatus === 'loading' ? 'true' : 'false'}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="rating-history" className="text-2xl font-semibold text-gray-900">My ratings</h2>
              <p className="mt-1 text-sm text-gray-600">Only ratings owned by your authenticated account are returned.</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-gray-500">Average</p>
              <p className="text-2xl font-bold text-amber-800">{average ? `${average} / 7` : '—'}</p>
            </div>
          </div>

          {ratingsStatus === 'loading' && <p className="py-10 text-center text-gray-600" role="status">Loading rating history…</p>}
          {ratingsStatus === 'error' && (
            <div ref={ratingsErrorRef} tabIndex={-1} className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300" role="alert">
              <p>{ratingsError || 'Rating history is unavailable.'}</p>
              <button type="button" onClick={loadRatings} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
                Retry rating history
              </button>
            </div>
          )}
          {ratingsStatus === 'ready' && ratings.length === 0 && (
            <div className="py-10 text-center">
              <SafeIcon icon={FiStar} className="mx-auto mb-3 h-9 w-9 text-gray-300" />
              <p className="font-medium text-gray-800">No ratings yet</p>
              <Link to="/home" className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">Browse products</Link>
            </div>
          )}
          {ratingsStatus === 'ready' && ratings.length > 0 && (
            <ul className="mt-5 divide-y divide-gray-200" aria-label="Rating history">
              {ratings.map((rating) => {
                const isDeleting = deletingRatingId === rating.id
                return (
                  <li key={rating.id} className="flex items-start justify-between gap-4 py-4" aria-busy={isDeleting ? 'true' : undefined}>
                    <div>
                      <Link to={`/products/${rating.product_id}`} className="font-semibold text-gray-900 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                        {rating.product?.product_name || `Product ${rating.product_id}`}
                      </Link>
                      <p className="mt-1 text-sm text-gray-600">{rating.product?.producer?.producer_name || 'Producer not recorded'}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatDate(rating.date_rated)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="whitespace-nowrap text-lg font-semibold text-amber-800">{rating.total_weighted} / 7</span>
                      <button type="button" onClick={() => deleteRating(rating)} disabled={isDeleting} className="rounded-lg p-2 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2" aria-label={`${isDeleting ? 'Deleting rating for' : 'Delete rating for'} ${rating.product?.product_name || 'product'}`}>
                        <SafeIcon icon={FiTrash2} className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Profile