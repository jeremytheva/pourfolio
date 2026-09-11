import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiExternalLink, FiStar, FiTrash2, FiUser } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { profileService } from '../services/profileService.js'
import { ratingService } from '../services/ratingService.js'
import { formatDate } from '../utils/dateFormatting.js'

const AdvancedScores = ({ scores }) => {
  if (!scores) return null
  return <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 sm:grid-cols-4"><div><dt>Score / 100</dt><dd className="font-semibold text-gray-900">{scores.score_out_of_100 ?? '—'}</dd></div><div><dt>Scaled score</dt><dd className="font-semibold text-gray-900">{scores.scaled_score ?? '—'}</dd></div><div><dt>Retail PPP</dt><dd className="font-semibold text-gray-900">{scores.retail_ppp ?? '—'}</dd></div><div><dt>Purchased PPP</dt><dd className="font-semibold text-gray-900">{scores.purchased_ppp ?? '—'}</dd></div></dl>
}

function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ name: '', description: '', avatar_url: '', rating_history_public: false })
  const [profileStatus, setProfileStatus] = useState('loading')
  const [profileError, setProfileError] = useState('')
  const [profileSaved, setProfileSaved] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [ratings, setRatings] = useState([])
  const [ratingsStatus, setRatingsStatus] = useState('loading')
  const [ratingsError, setRatingsError] = useState('')
  const [deletingRatingId, setDeletingRatingId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const profileErrorRef = useRef(null)
  const ratingsErrorRef = useRef(null)
  const deleteErrorRef = useRef(null)
  const ratingHistoryHeadingRef = useRef(null)
  const ratingLinkRefs = useRef(new Map())
  const pendingRatingFocusRef = useRef(null)
  const ratingsRequestIdRef = useRef(0)

  const loadProfile = useCallback(async () => {
    setProfileStatus('loading')
    setProfileError('')
    try {
      const payload = await profileService.getCurrentUserProfile()
      const next = payload?.profile
      setProfile(next)
      setProfileForm({ name: next?.name || user?.name || '', description: next?.description || '', avatar_url: next?.avatar_url || '', rating_history_public: Boolean(next?.rating_history_public) })
      setProfileStatus('ready')
    } catch (error) {
      setProfileError(error.message || 'Your profile could not be loaded.')
      setProfileStatus('error')
    }
  }, [user?.name])

  const loadRatings = useCallback(async () => {
    const requestId = ++ratingsRequestIdRef.current
    setRatingsError('')
    setRatingsStatus('loading')
    try {
      const payload = await ratingService.getUserRatings()
      if (ratingsRequestIdRef.current !== requestId) return
      setRatings(payload.items || [])
      setRatingsStatus('ready')
    } catch (error) {
      if (ratingsRequestIdRef.current !== requestId) return
      setRatingsError(error.message || 'Rating history could not be loaded.')
      setRatingsStatus('error')
    }
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => { loadRatings(); return () => { ratingsRequestIdRef.current += 1 } }, [loadRatings])
  useEffect(() => { if (profileError) profileErrorRef.current?.focus() }, [profileError])
  useEffect(() => { if (ratingsError) ratingsErrorRef.current?.focus() }, [ratingsError])
  useEffect(() => { if (deleteError) deleteErrorRef.current?.focus() }, [deleteError])
  useEffect(() => {
    const target = pendingRatingFocusRef.current
    if (target === null) return
    pendingRatingFocusRef.current = null
    if (target === 'heading') ratingHistoryHeadingRef.current?.focus()
    else ratingLinkRefs.current.get(target)?.focus()
  }, [ratings])

  const average = useMemo(() => {
    const values = ratings.map((rating) => Number(rating.total_weighted)).filter((value) => Number.isFinite(value) && value >= 0 && value <= 5)
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2) : null
  }, [ratings])

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileError('')
    setProfileSaved('')
    setSavingProfile(true)
    try {
      const payload = await profileService.updateCurrentUserProfile(profileForm)
      const next = payload?.profile
      setProfile(next)
      setProfileForm({ name: next?.name || '', description: next?.description || '', avatar_url: next?.avatar_url || '', rating_history_public: Boolean(next?.rating_history_public) })
      setProfileSaved('Profile saved.')
    } catch (error) {
      setProfileError(error.message || 'Your profile could not be saved.')
    } finally {
      setSavingProfile(false)
    }
  }

  const deleteRating = async (rating) => {
    if (!window.confirm(`Delete your rating for ${rating.product?.product_name || 'this product'}?`)) return
    setDeleteError('')
    setDeletingRatingId(rating.id)
    try {
      await ratingService.deleteRating(rating.id)
      const index = ratings.findIndex((item) => item.id === rating.id)
      const remaining = ratings.filter((item) => item.id !== rating.id)
      pendingRatingFocusRef.current = remaining[Math.min(index, remaining.length - 1)]?.id ?? 'heading'
      setRatings(remaining)
    } catch (error) {
      setDeleteError(error.message || 'The rating could not be deleted.')
    } finally {
      setDeletingRatingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8"><p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Account</p><h1 className="mt-2 text-3xl font-bold text-gray-900">Profile and rating history</h1></header>
      <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="profile-details" aria-busy={profileStatus === 'loading' || savingProfile ? 'true' : 'false'}>
          <div className="mb-5 flex items-center gap-3">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800"><SafeIcon icon={FiUser} className="h-6 w-6" /></div>}<div className="min-w-0"><h2 id="profile-details" className="truncate font-semibold text-gray-900">{profile?.name || user?.name || 'Pourfolio user'}</h2><p className="truncate text-sm text-gray-500">{user?.email || 'Email unavailable'}</p></div></div>
          {profileStatus === 'loading' && <p className="py-6 text-sm text-gray-600" role="status">Loading profile…</p>}
          {profileError && <div ref={profileErrorRef} tabIndex={-1} className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300" role="alert">{profileError}</div>}
          {profileStatus === 'ready' && <form onSubmit={saveProfile} className="space-y-4"><div><label htmlFor="profile-name" className="text-sm font-medium text-gray-800">Display name</label><input id="profile-name" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} required className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><div><label htmlFor="profile-description" className="text-sm font-medium text-gray-800">About</label><textarea id="profile-description" value={profileForm.description} onChange={(event) => setProfileForm((current) => ({ ...current, description: event.target.value }))} maxLength={1000} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><div><label htmlFor="profile-avatar" className="text-sm font-medium text-gray-800">Avatar URL</label><input id="profile-avatar" type="url" value={profileForm.avatar_url} onChange={(event) => setProfileForm((current) => ({ ...current, avatar_url: event.target.value }))} maxLength={2048} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></div><label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700"><input type="checkbox" checked={profileForm.rating_history_public} onChange={(event) => setProfileForm((current) => ({ ...current, rating_history_public: event.target.checked }))} className="mt-1" /><span><span className="font-medium text-gray-900">Share my rating history</span><span className="mt-1 block text-gray-600">Other signed-in users can see beers and overall scores. Private price and PPP information is never shared.</span></span></label><button type="submit" disabled={savingProfile} className="w-full rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{savingProfile ? 'Saving profile…' : 'Save profile'}</button>{profileSaved && <p className="text-sm font-medium text-green-700" role="status">{profileSaved}</p>}</form>}
          {profileStatus === 'error' && <button type="button" onClick={loadProfile} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium">Retry profile</button>}
          {profile?.public_id && <Link to={`/users/${profile.public_id}`} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:underline"><SafeIcon icon={FiExternalLink} className="h-4 w-4" />View my public profile</Link>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="rating-history" aria-busy={ratingsStatus === 'loading' ? 'true' : 'false'}>
          {deleteError && <div ref={deleteErrorRef} tabIndex={-1} className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{deleteError}</div>}
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 ref={ratingHistoryHeadingRef} id="rating-history" tabIndex={-1} className="text-2xl font-semibold text-gray-900">My ratings</h2><p className="mt-1 text-sm text-gray-600">Advanced scores are calculated from current rating and price data when available.</p></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-gray-500">Average</p><p className="text-2xl font-bold text-amber-800">{average ? `${average} / 5` : '—'}</p></div></div>
          {ratingsStatus === 'loading' && <p className="py-10 text-center text-gray-600" role="status">Loading rating history…</p>}
          {ratingsStatus === 'error' && <div ref={ratingsErrorRef} tabIndex={-1} className="my-8 rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800" role="alert"><p>{ratingsError}</p><button type="button" onClick={loadRatings} className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-medium">Retry rating history</button></div>}
          {ratingsStatus === 'ready' && ratings.length === 0 && <div className="py-10 text-center"><SafeIcon icon={FiStar} className="mx-auto mb-3 h-9 w-9 text-gray-300" /><p className="font-medium text-gray-800">No ratings yet</p><Link to="/home" className="mt-2 inline-block text-sm font-medium text-amber-700 hover:underline">Browse products</Link></div>}
          {ratingsStatus === 'ready' && ratings.length > 0 && <ul className="mt-5 divide-y divide-gray-200" aria-label="Rating history">{ratings.map((rating) => { const deleting = deletingRatingId === rating.id; return <li key={rating.id} className="py-5" aria-busy={deleting ? 'true' : undefined}><div className="flex items-start justify-between gap-4"><div><Link ref={(node) => { if (node) ratingLinkRefs.current.set(rating.id, node); else ratingLinkRefs.current.delete(rating.id) }} to={`/products/${rating.product_id}`} className="font-semibold text-gray-900 hover:text-amber-800">{rating.product?.product_name || `Product ${rating.product_id}`}</Link><p className="mt-1 text-sm text-gray-600">{rating.product?.producer?.producer_name || 'Producer not recorded'}</p><p className="mt-1 text-xs text-gray-500">{formatDate(rating.date_rated)}</p></div><div className="flex items-center gap-3"><span className="whitespace-nowrap text-lg font-semibold text-amber-800">{rating.total_weighted} / 5</span><button type="button" onClick={() => deleteRating(rating)} disabled={deleting} className="rounded-lg p-2 text-red-700 hover:bg-red-50 disabled:opacity-60" aria-label={`${deleting ? 'Deleting rating for' : 'Delete rating for'} ${rating.product?.product_name || 'product'}`}><SafeIcon icon={FiTrash2} className="h-4 w-4" /></button></div></div><AdvancedScores scores={rating.advanced_scores} /></li> })}</ul>}
        </section>
      </div>
    </div>
  )
}

export default Profile
