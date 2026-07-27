import React, { useEffect, useMemo, useState } from 'react'
import { FiSave, FiStar, FiTrash2, FiUser } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { ratingService } from '../services/ratingService.js'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value))
  : 'Date not recorded'

function Profile() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    description: user?.description || '',
    avatar_url: user?.avatar_url || ''
  })
  const [ratings, setRatings] = useState([])
  const [ratingsStatus, setRatingsStatus] = useState('loading')
  const [saveStatus, setSaveStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    ratingService.getUserRatings()
      .then((payload) => {
        if (!active) return
        setRatings(payload.items || [])
        setRatingsStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Rating history could not be loaded.')
        setRatingsStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

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
    try {
      await ratingService.deleteRating(rating.id)
      setRatings((current) => current.filter((item) => item.id !== rating.id))
    } catch (requestError) {
      setError(requestError.message || 'The rating could not be deleted.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Account</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Profile and rating history</h1>
      </header>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{error}</div>}

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

          <form onSubmit={saveProfile} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Display name
              <input required maxLength={120} value={form.name} onChange={(event) => { setForm((current) => ({ ...current, name: event.target.value })); setSaveStatus('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Description
              <textarea maxLength={1000} rows={4} value={form.description} onChange={(event) => { setForm((current) => ({ ...current, description: event.target.value })); setSaveStatus('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-gray-700">Avatar URL
              <input type="url" maxLength={2048} value={form.avatar_url} onChange={(event) => { setForm((current) => ({ ...current, avatar_url: event.target.value })); setSaveStatus('') }} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <p className="text-xs text-gray-500">Account identity and role are not editable from the browser.</p>
            <button type="submit" disabled={saveStatus === 'saving'} className="inline-flex w-full items-center justify-center rounded-lg bg-amber-700 px-4 py-2.5 font-medium text-white hover:bg-amber-800 disabled:bg-gray-500">
              <SafeIcon icon={FiSave} className="mr-2 h-4 w-4" />
              {saveStatus === 'saving' ? 'Saving…' : 'Save profile'}
            </button>
            {saveStatus === 'saved' && <p className="text-center text-sm text-green-700" role="status">Profile saved.</p>}
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="rating-history">
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
          {ratingsStatus === 'ready' && ratings.length === 0 && (
            <div className="py-10 text-center">
              <SafeIcon icon={FiStar} className="mx-auto mb-3 h-9 w-9 text-gray-300" />
              <p className="font-medium text-gray-800">No ratings yet</p>
              <Link to="/home" className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline">Browse products</Link>
            </div>
          )}
          {ratings.length > 0 && (
            <ul className="mt-5 divide-y divide-gray-200">
              {ratings.map((rating) => (
                <li key={rating.id} className="flex items-start justify-between gap-4 py-4">
                  <div>
                    <Link to={`/products/${rating.product_id}`} className="font-semibold text-gray-900 hover:text-amber-800">
                      {rating.product?.product_name || `Product ${rating.product_id}`}
                    </Link>
                    <p className="mt-1 text-sm text-gray-600">{rating.product?.producer?.producer_name || 'Producer not recorded'}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDate(rating.date_rated)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap text-lg font-semibold text-amber-800">{rating.total_weighted} / 7</span>
                    <button type="button" onClick={() => deleteRating(rating)} className="rounded-lg p-2 text-red-700 hover:bg-red-50" aria-label={`Delete rating for ${rating.product?.product_name || 'product'}`}>
                      <SafeIcon icon={FiTrash2} className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

export default Profile
