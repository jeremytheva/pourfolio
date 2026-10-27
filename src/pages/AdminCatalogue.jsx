import React, { useContext, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from '../lib/router.jsx'
import { AdminReviewContext } from '../hooks/useAdminReviewAccess.js'
import { beverageService } from '../services/beverageService.js'
import { producerService } from '../services/producerService.js'

const missing = (value) => value === null || value === undefined
const gaps = (product) => [
  missing(product.abv) && 'ABV', missing(product.ibu) && 'IBU',
  !product.category && missing(product.product_category_id) && 'Style',
  !product.producer && missing(product.producer_id) && 'Producer'
].filter(Boolean)
const producerLabel = (product) => product.producer?.producer_name || (missing(product.producer_id) ? 'Producer not recorded' : 'Producer details unavailable')
const styleLabel = (product) => product.category?.category_name || (missing(product.product_category_id) ? 'Style not recorded' : 'Style details unavailable')

export default function AdminCatalogue() {
  const access = useContext(AdminReviewContext)
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const tab = params.get('type') === 'producers' ? 'producers' : 'products'
  const query = (params.get('q') || '').slice(0, 120)
  const pageValue = params.get('page') || '1'
  const page = /^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(Number(pageValue)) ? Number(pageValue) : 1
  const [draft, setDraft] = useState(query)
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ key: null, status: 'loading', data: null })
  const requestKey = JSON.stringify([access?.subjectId, tab, query, page])
  useEffect(() => setDraft(query), [query, tab])
  useEffect(() => {
    let active = true
    setState({ key: requestKey, status: 'loading', data: null })
    if (access?.canReview) {
      const load = tab === 'products' ? beverageService.getProducts : producerService.listCanonicalProducerPage
      load({ search: query, page, limit: 24 })
        .then((data) => { if (active) setState({ key: requestKey, status: 'ready', data }) })
        .catch(() => { if (active) setState({ key: requestKey, status: 'error', data: null }) })
    }
    return () => { active = false }
  }, [access?.canReview, requestKey, revision])

  if (!access || access.status === 'loading') return <div className="mx-auto max-w-6xl px-4 py-12" role="status">Checking Admin access…</div>
  if (!access.canReview) return <section className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="text-3xl font-bold text-gray-900">{access.status === 'denied' ? 'Admin access required' : 'Admin access unavailable'}</h1>
    <p className="mt-4 text-gray-700">{access.status === 'denied' ? 'Your account does not have catalogue review access.' : 'Access could not be verified. Please try again.'}</p>
    {access.status === 'unavailable' && <button type="button" onClick={access.retry} className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400">Retry Admin access</button>}
    <Link to="/home" className="mt-5 block w-fit rounded font-medium text-amber-800 underline focus:outline-none focus:ring-2 focus:ring-amber-400">Return to Discover</Link>
  </section>

  const data = state.key === requestKey ? state.data : null
  const status = state.key === requestKey ? state.status : 'loading'
  const setView = (updates) => {
    const next = { tab, query, page, ...updates }
    const search = new URLSearchParams()
    if (next.tab === 'producers') search.set('type', 'producers')
    if (next.query) search.set('q', next.query)
    if (next.page > 1) search.set('page', String(next.page))
    navigate(`/admin${search.size ? `?${search}` : ''}`)
  }
  const selectTab = (value) => setView({ tab: value, page: 1, query: '' })
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <header className="rounded-2xl border border-gray-200 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-800">Admin</p>
      <h1 className="mt-2 text-3xl font-bold text-gray-900">Catalogue review</h1>
      <p className="mt-3 text-gray-600">Find products and producers, inspect catalogue details and identify missing information.</p>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Submission approvals are not available yet. This workspace provides catalogue review; it does not change verification status.</p>
      <Link to="/products/propose" className="mt-4 inline-block rounded-lg bg-amber-700 px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">Add beer</Link>
    </header>
    <section aria-label="Catalogue records" className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div role="group" className="flex flex-wrap gap-2" aria-label="Record type">
        {['products', 'producers'].map((value) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => selectTab(value)} className={`rounded-lg px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 ${tab === value ? 'bg-amber-100 text-amber-950' : 'bg-gray-100 text-gray-800'}`}>{value === 'products' ? 'Products' : 'Producers'}</button>)}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setView({ page: 1, query: draft.trim() }); setRevision((value) => value + 1) }} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 text-sm font-medium text-gray-800">Search {tab}<input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={120} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" /></label>
        <button type="submit" className="rounded-lg border border-gray-300 px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-400">Search catalogue</button>
      </form>
      <div className="mt-5" aria-busy={status === 'loading'}>
        {status === 'loading' && <p role="status" className="text-gray-600">Loading {tab}…</p>}
        {status === 'error' && <div role="alert"><p>Catalogue records could not be loaded.</p><button type="button" onClick={() => setRevision((v) => v + 1)} className="mt-3 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400">Retry catalogue</button>{page > 1 && <button type="button" onClick={() => setView({ page: 1 })} className="ml-3 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400">Return to first page</button>}</div>}
        {data && <>
          <p role="status" className="text-sm text-gray-600">Showing {data.items.length} {data.items.length === 1 ? tab.slice(0, -1) : tab} · Page {data.page}</p>
          {!data.items.length && <p className="mt-5 text-gray-700">No {tab} match this search.</p>}
          <ul className="mt-4 divide-y divide-gray-200">
            {data.items.map((record) => <li key={String(record.id)} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1 break-words"><h2 className="font-semibold text-gray-900">{tab === 'products' ? record.product_name : record.producer_name}</h2>
                {tab === 'products' ? <><p className="mt-1 text-sm text-gray-600">{producerLabel(record)} · {styleLabel(record)}</p><p className="mt-1 text-sm text-gray-700">ABV: {missing(record.abv) ? 'Not recorded' : `${record.abv}%`} · IBU: {record.ibu ?? 'Not recorded'}</p>{gaps(record).length > 0 && <p className="mt-2 text-sm text-amber-900">Missing information: {gaps(record).join(', ')}</p>}</> : <p className="mt-1 text-sm text-gray-600">{record.address || 'Address not recorded'}</p>}
              </div>
              <Link to={tab === 'products' ? `/products/${record.id}` : `/breweries/${record.id}`} aria-label={`Review details for ${tab === 'products' ? record.product_name : record.producer_name}`} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400">Review details</Link>
            </li>)}
          </ul>
          <nav aria-label="Catalogue pagination" className="mt-5 flex gap-3"><button type="button" disabled={page <= 1} onClick={() => setView({ page: page - 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-400">Previous</button><button type="button" disabled={page >= data.totalPages} onClick={() => setView({ page: page + 1 })} className="rounded-lg border px-4 py-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-400">Next</button></nav>
        </>}
      </div>
    </section>
  </div>
}
