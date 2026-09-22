import React, { useEffect, useRef, useState } from 'react'
import { FiClock, FiRefreshCw, FiSearch, FiX } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import AdvancedRatingScores from '../components/AdvancedRatingScores.jsx'
import { Link } from '../lib/router.jsx'
import { ratingService } from '../services/ratingService.js'
import { formatDate } from '../utils/dateFormatting.js'

const PAGE_SIZE = 20

const emptyPage = { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 }

function History() {
  const [draft, setDraft] = useState({ q: '', from: '', to: '' })
  const [filters, setFilters] = useState({ q: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(emptyPage)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const focusResultsAfterLoad = useRef(false)
  const resultsHeadingRef = useRef(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')

    ratingService.getHistory({ page, limit: PAGE_SIZE, ...filters })
      .then((payload) => {
        if (!active) return
        const items = Array.isArray(payload?.items) ? payload.items : []
        const next = {
          items,
          page: Number(payload?.page) || page,
          pageSize: Number(payload?.pageSize) || PAGE_SIZE,
          total: Number(payload?.total) || 0,
          totalPages: Number(payload?.totalPages) || 0
        }
        setResult(next)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setResult(emptyPage)
        setError(requestError.message || 'Your Historical Feed could not be loaded.')
        setStatus('error')
      })

    return () => { active = false }
  }, [filters, page, reloadKey])

  useEffect(() => {
    if (status === 'ready' && focusResultsAfterLoad.current) {
      focusResultsAfterLoad.current = false
      resultsHeadingRef.current?.focus()
    }
  }, [status])

  const applyFilters = (event) => {
    event.preventDefault()
    focusResultsAfterLoad.current = true
    setPage(1)
    setFilters({ q: draft.q.trim(), from: draft.from, to: draft.to })
  }

  const resetFilters = () => {
    const cleared = { q: '', from: '', to: '' }
    focusResultsAfterLoad.current = true
    setDraft(cleared)
    setFilters(cleared)
    setPage(1)
  }

  const changePage = (nextPage) => {
    if (nextPage < 1 || (result.totalPages && nextPage > result.totalPages) || nextPage === page) return
    focusResultsAfterLoad.current = true
    setPage(nextPage)
  }

  const hasFilters = Boolean(filters.q || filters.from || filters.to)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-7">
        <div className="flex items-center gap-3">
          <SafeIcon icon={FiClock} className="h-7 w-7 text-amber-700" />
          <h1 className="text-3xl font-bold text-gray-900">Historical Feed</h1>
        </div>
        <p className="mt-2 max-w-3xl text-gray-600">
          Your private timeline of completed tastings. Repeat tastings stay as separate historical events.
        </p>
      </header>

      <form onSubmit={applyFilters} className="mb-7 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Filter tasting history">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="block text-sm font-medium text-gray-700">
            Search beer or brewery
            <span className="relative mt-1 block">
              <SafeIcon icon={FiSearch} className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="search"
                value={draft.q}
                maxLength={100}
                onChange={(event) => setDraft((value) => ({ ...value, q: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            From date
            <input type="date" value={draft.from} onChange={(event) => setDraft((value) => ({ ...value, from: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            To date
            <input type="date" value={draft.to} onChange={(event) => setDraft((value) => ({ ...value, to: event.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
            Apply filters
          </button>
          <button type="button" onClick={resetFilters} disabled={!draft.q && !draft.from && !draft.to && !hasFilters} className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
            <SafeIcon icon={FiX} className="mr-2 h-4 w-4" />Clear
          </button>
        </div>
      </form>

      <section aria-labelledby="historical-feed-results-heading" aria-busy={status === 'loading' ? 'true' : 'false'}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 ref={resultsHeadingRef} tabIndex={-1} id="historical-feed-results-heading" className="text-2xl font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-300">
              Tasting events
            </h2>
            {status === 'ready' && <p className="mt-1 text-sm text-gray-600" role="status" aria-live="polite">{result.total} {result.total === 1 ? 'tasting' : 'tastings'} found</p>}
          </div>
          {status === 'ready' && result.totalPages > 0 && <p className="text-sm text-gray-600" aria-current="page">Page {result.page} of {result.totalPages}</p>}
        </div>

        {status === 'loading' && <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600" role="status">Loading your Historical Feed…</p>}

        {status === 'error' && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
            <p>{error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
              <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />Retry Historical Feed
            </button>
          </div>
        )}

        {status === 'ready' && result.items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <h3 className="font-semibold text-gray-900">{hasFilters ? 'No tastings match these filters' : 'No tasting history yet'}</h3>
            <p className="mt-1 text-sm text-gray-600">{hasFilters ? 'Clear or change the filters to see more of your history.' : 'Completed Full Tastings will appear here.'}</p>
          </div>
        )}

        {status === 'ready' && result.items.length > 0 && (
          <ol className="space-y-4" aria-label="Historical tasting events">
            {result.items.map((rating) => {
              const product = rating.product
              const producer = product?.producer
              return (
                <li key={rating.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Full Tasting</p>
                      {product?.id ? (
                        <h3 className="mt-1 text-xl font-semibold text-gray-900">
                          <Link to={`/products/${product.id}`} className="rounded-sm hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300">{product.product_name || 'Beer'}</Link>
                        </h3>
                      ) : <h3 className="mt-1 text-xl font-semibold text-gray-900">Beer details unavailable</h3>}
                      {producer?.id && producer?.producer_name ? (
                        <p className="mt-1 text-sm text-gray-600">
                          <Link to={`/breweries/${producer.id}`} className="rounded-sm hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300">{producer.producer_name}</Link>
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-gray-500">{formatDate(rating.date_rated)}</p>
                    </div>
                    <strong className="whitespace-nowrap text-2xl text-amber-800">{rating.total_weighted} / 5</strong>
                  </div>
                  <AdvancedRatingScores scores={rating.advanced_scores} className="mt-4" />
                </li>
              )
            })}
          </ol>
        )}

        {status === 'ready' && result.totalPages > 1 && (
          <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Historical Feed pages">
            <button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1} aria-label={`Previous history page, page ${Math.max(1, page - 1)}`} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">Previous</button>
            <span className="text-sm text-gray-600" aria-current="page">Page {result.page} of {result.totalPages}</span>
            <button type="button" onClick={() => changePage(page + 1)} disabled={page >= result.totalPages} aria-label={`Next history page, page ${Math.min(result.totalPages, page + 1)}`} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">Next</button>
          </nav>
        )}
      </section>
    </div>
  )
}

export default History
