import React, { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import OptimizedBeerCard from '../components/OptimizedBeerCard.jsx'
import { beverageService } from '../services/beverageService.js'

function HomePage({ searchMode = false }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 0 })
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const searchInput = useRef(null)
  const resultsHeading = useRef(null)
  const focusResultsAfterPagination = useRef(false)
  const searchStatusId = 'product-search-status'
  const resultsHeadingId = 'product-results-heading'

  useEffect(() => {
    if (searchMode) searchInput.current?.focus()
  }, [searchMode])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')

    beverageService.getProducts({ search: debouncedQuery, page, limit: 24 })
      .then((payload) => {
        if (!active) return
        setResult({ items: payload.items, total: payload.total, totalPages: payload.totalPages })
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Products could not be loaded.')
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [debouncedQuery, page, reloadKey])

  useEffect(() => {
    if (status !== 'ready' || !focusResultsAfterPagination.current) return
    focusResultsAfterPagination.current = false
    resultsHeading.current?.focus()
  }, [status, page])

  const changePage = (nextPage) => {
    focusResultsAfterPagination.current = true
    setPage(nextPage)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-700">Beer-first launch collection</p>
        <h1 className="text-3xl font-bold text-gray-900">{searchMode ? 'Search Pourfolio' : 'Discover beer worth remembering'}</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Browse the live product catalogue, open a product by its stable ID, and record a structured 1–7 rating.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Product search">
        <label htmlFor="product-search" className="mb-2 block text-sm font-medium text-gray-700">Search products, producers or styles</label>
        <div className="relative">
          <SafeIcon icon={FiSearch} className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <input
            ref={searchInput}
            id="product-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby={searchStatusId}
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="For example: stout, IPA or producer name"
          />
        </div>
        <p id={searchStatusId} className="mt-3 text-sm text-gray-600" role="status" aria-live="polite" aria-atomic="true">
          {status === 'loading'
            ? 'Loading products…'
            : status === 'error'
              ? 'Products could not be loaded.'
              : `${result.total} product${result.total === 1 ? '' : 's'} found`}
        </p>
      </section>

      <section aria-labelledby={resultsHeadingId} aria-busy={status === 'loading'}>
        <h2 ref={resultsHeading} id={resultsHeadingId} tabIndex={-1} className="sr-only focus:outline-none">Product results</h2>

        {status === 'loading' && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600" role="status">Loading product results…</p>
        )}

        {status === 'error' && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
            <p className="font-semibold">Products are unavailable</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2">
              <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && result.items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <SafeIcon icon={FiSearch} className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">No matching products</h3>
            <p className="mt-1 text-gray-500">Try a shorter product, producer or style name.</p>
          </div>
        )}

        {status === 'ready' && result.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Products">
              {result.items.map((product) => <OptimizedBeerCard key={product.id} product={product} />)}
            </div>

            {result.totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3" aria-label="Product pages">
                <button type="button" disabled={page <= 1} onClick={() => changePage(Math.max(1, page - 1))} aria-label={`Previous product page, page ${Math.max(1, page - 1)}`} className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <SafeIcon icon={FiChevronLeft} className="mr-1 h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-600" aria-current="page">Page {page} of {result.totalPages}</span>
                <button type="button" disabled={page >= result.totalPages} onClick={() => changePage(Math.min(result.totalPages, page + 1))} aria-label={`Next product page, page ${Math.min(result.totalPages, page + 1)}`} className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  Next
                  <SafeIcon icon={FiChevronRight} className="ml-1 h-4 w-4" />
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default HomePage