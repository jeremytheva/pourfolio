import React, { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiSearch } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import OptimizedBeerCard from '../components/OptimizedBeerCard.jsx'
import { Link } from '../lib/router.jsx'
import { catalogueSearchService } from '../services/catalogueSearchService.js'

const EMPTY_RESULT = Object.freeze({ items: [], total: 0, totalPages: 0 })
const FULL_AVAILABILITY = Object.freeze({ beers: true, breweries: true, styles: true })

const formatCount = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`

function HomePage({ searchMode = false }) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(EMPTY_RESULT)
  const [entityResults, setEntityResults] = useState({ breweries: [], breweryTotal: 0, styles: [] })
  const [availability, setAvailability] = useState(FULL_AVAILABILITY)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const searchInput = useRef(null)
  const loadError = useRef(null)
  const resultsHeading = useRef(null)
  const focusResultsAfterPagination = useRef(false)
  const focusResultsAfterRetry = useRef(false)
  const searchStatusId = 'catalogue-search-status'
  const resultsHeadingId = debouncedQuery ? 'search-results-heading' : 'product-results-heading'

  useEffect(() => {
    if (searchMode) searchInput.current?.focus()
  }, [searchMode])

  useEffect(() => {
    if (status === 'error') loadError.current?.focus()
  }, [status])

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

    catalogueSearchService.search({ query: debouncedQuery, page, limit: 24 })
      .then((payload) => {
        if (!active) return

        if (debouncedQuery && !Object.values(payload.availability).some(Boolean)) {
          throw new Error('Search results could not be loaded.')
        }

        setResult(payload.products
          ? {
              items: payload.products.items,
              total: payload.products.total,
              totalPages: payload.products.totalPages
            }
          : EMPTY_RESULT)
        setEntityResults({
          breweries: payload.breweries,
          breweryTotal: payload.breweryTotal,
          styles: payload.styles
        })
        setAvailability(payload.availability)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        focusResultsAfterRetry.current = false
        setEntityResults({ breweries: [], breweryTotal: 0, styles: [] })
        setAvailability(FULL_AVAILABILITY)
        setError(requestError.message || (debouncedQuery
          ? 'Search results could not be loaded.'
          : 'Products could not be loaded.'))
        setStatus('error')
      })

    return () => {
      active = false
    }
  }, [debouncedQuery, page, reloadKey])

  useEffect(() => {
    if (status !== 'ready' || (!focusResultsAfterPagination.current && !focusResultsAfterRetry.current)) return
    focusResultsAfterPagination.current = false
    focusResultsAfterRetry.current = false
    resultsHeading.current?.focus()
  }, [status, page])

  const changePage = (nextPage) => {
    focusResultsAfterPagination.current = true
    setPage(nextPage)
  }

  const retryLoad = () => {
    focusResultsAfterRetry.current = true
    setReloadKey((value) => value + 1)
  }

  const searchSummary = debouncedQuery
    ? [
        availability.beers ? formatCount(result.total, 'beer') : 'Beer results unavailable',
        availability.breweries
          ? formatCount(entityResults.breweryTotal, 'brewery', 'breweries')
          : 'Brewery results unavailable',
        availability.styles ? formatCount(entityResults.styles.length, 'style') : 'Style results unavailable'
      ].join(', ')
    : `${formatCount(result.total, 'product')} in catalogue`

  const unavailableSearchSources = debouncedQuery
    ? [
        !availability.beers ? 'Beer results are temporarily unavailable.' : null,
        !availability.breweries ? 'Brewery results are temporarily unavailable.' : null,
        !availability.styles ? 'Style results are temporarily unavailable.' : null
      ].filter(Boolean)
    : []

  const allSearchSourcesAvailable = Object.values(availability).every(Boolean)
  const hasSearchResults = Boolean(
    (availability.beers && result.total > 0) ||
    (availability.breweries && entityResults.breweryTotal > 0) ||
    (availability.styles && entityResults.styles.length > 0)
  )

  const renderPagination = (label) => result.totalPages > 1 && (
    <nav className="mt-8 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3" aria-label={`${label} pages`}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => changePage(Math.max(1, page - 1))}
        aria-label={`Previous ${label.toLowerCase()} page, page ${Math.max(1, page - 1)}`}
        className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SafeIcon icon={FiChevronLeft} className="mr-1 h-4 w-4" />
        Previous
      </button>
      <span className="text-sm text-gray-600" aria-current="page">Page {page} of {result.totalPages}</span>
      <button
        type="button"
        disabled={page >= result.totalPages}
        onClick={() => changePage(Math.min(result.totalPages, page + 1))}
        aria-label={`Next ${label.toLowerCase()} page, page ${Math.min(result.totalPages, page + 1)}`}
        className="inline-flex items-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
        <SafeIcon icon={FiChevronRight} className="ml-1 h-4 w-4" />
      </button>
    </nav>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-700">Beer-first launch collection</p>
        <h1 className="text-3xl font-bold text-gray-900">{searchMode ? 'Search Pourfolio' : 'Discover beer worth remembering'}</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Browse the verified beer catalogue, breweries and beer styles, then open each entity by its stable catalogue identity.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-label="Catalogue search">
        <label htmlFor="catalogue-search" className="mb-2 block text-sm font-medium text-gray-700">Search beers, breweries or styles</label>
        <div className="relative">
          <SafeIcon icon={FiSearch} className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <input
            ref={searchInput}
            id="catalogue-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby={searchStatusId}
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="For example: stout, Rocky Ridge or pale ale"
          />
        </div>
        <p id={searchStatusId} className="mt-3 text-sm text-gray-600" role="status" aria-live="polite" aria-atomic="true">
          {status === 'loading'
            ? debouncedQuery ? 'Searching beers, breweries and styles…' : 'Loading products…'
            : status === 'error'
              ? debouncedQuery ? 'Search results could not be loaded.' : 'Products could not be loaded.'
              : searchSummary}
        </p>
      </section>

      <section aria-labelledby={resultsHeadingId} aria-busy={status === 'loading'}>
        <h2 ref={resultsHeading} id={resultsHeadingId} tabIndex={-1} className="sr-only focus:outline-none">
          {debouncedQuery ? 'Search results' : 'Product results'}
        </h2>

        {status === 'loading' && (
          <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600" role="status">
            {debouncedQuery ? 'Searching catalogue…' : 'Loading product results…'}
          </p>
        )}

        {status === 'error' && (
          <div
            ref={loadError}
            tabIndex={-1}
            className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
            role="alert"
          >
            <p className="font-semibold">{debouncedQuery ? 'Search is unavailable' : 'Products are unavailable'}</p>
            <p className="mt-1 text-sm">{error}</p>
            <button type="button" onClick={retryLoad} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2">
              <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
              Try again
            </button>
          </div>
        )}

        {status === 'ready' && unavailableSearchSources.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="status" aria-live="polite">
            <p className="font-semibold">Some search results could not be loaded.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {unavailableSearchSources.map((message) => <li key={message}>{message}</li>)}
            </ul>
          </div>
        )}

        {status === 'ready' && debouncedQuery && !hasSearchResults && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <SafeIcon icon={FiSearch} className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">
              {allSearchSourcesAvailable ? 'No matches found' : 'No available matches'}
            </h3>
            <p className="mt-1 text-gray-500">
              {allSearchSourcesAvailable
                ? 'Try a shorter beer, brewery or style name.'
                : 'One or more catalogue result types are unavailable. Try again before assuming the catalogue has no match.'}
            </p>
            {allSearchSourcesAvailable && (
              <Link
                to={`/products/propose?name=${encodeURIComponent(debouncedQuery)}`}
                className="mt-4 inline-flex rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
              >
                Propose this missing beer
              </Link>
            )}
          </div>
        )}

        {status === 'ready' && debouncedQuery && hasSearchResults && (
          <div className="space-y-10">
            {availability.beers && result.items.length > 0 && (
              <section aria-labelledby="beer-search-results-heading">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h3 id="beer-search-results-heading" className="text-2xl font-semibold text-gray-900">Beers</h3>
                  <p className="text-sm text-gray-600">{formatCount(result.total, 'match', 'matches')}</p>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Beer search results">
                  {result.items.map((product) => <OptimizedBeerCard key={product.id} product={product} />)}
                </div>
                {renderPagination('Beer result')}
              </section>
            )}

            {availability.breweries && entityResults.breweries.length > 0 && (
              <section aria-labelledby="brewery-search-results-heading">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h3 id="brewery-search-results-heading" className="text-2xl font-semibold text-gray-900">Breweries</h3>
                  <p className="text-sm text-gray-600">{formatCount(entityResults.breweryTotal, 'match', 'matches')}</p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {entityResults.breweries.map(({ producer, productCount }) => (
                    <li key={producer.id}>
                      <Link
                        to={`/breweries/${producer.id}`}
                        className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Brewery</p>
                        <h4 className="mt-2 text-lg font-semibold text-gray-900">{producer.producer_name}</h4>
                        {producer.address ? <p className="mt-2 text-sm text-gray-600">{producer.address}</p> : null}
                        <p className="mt-3 text-sm text-gray-600">{formatCount(productCount, 'attributed beer')}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {availability.styles && entityResults.styles.length > 0 && (
              <section aria-labelledby="style-search-results-heading">
                <div className="mb-4 flex items-baseline justify-between gap-4">
                  <h3 id="style-search-results-heading" className="text-2xl font-semibold text-gray-900">Styles</h3>
                  <p className="text-sm text-gray-600">{formatCount(entityResults.styles.length, 'match', 'matches')}</p>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {entityResults.styles.map(({ style, productCount, breweryCount }) => (
                    <li key={style.id}>
                      <Link
                        to={`/styles/${style.id}`}
                        className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Beer style</p>
                        <h4 className="mt-2 text-lg font-semibold text-gray-900">{style.category_name}</h4>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div><dt className="text-gray-500">Beers</dt><dd className="mt-1 font-semibold text-gray-900">{productCount}</dd></div>
                          <div><dt className="text-gray-500">Breweries</dt><dd className="mt-1 font-semibold text-gray-900">{breweryCount}</dd></div>
                        </dl>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {status === 'ready' && !debouncedQuery && result.items.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <SafeIcon icon={FiSearch} className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">No products available</h3>
            <p className="mt-1 text-gray-500">The verified catalogue currently has no products to browse.</p>
          </div>
        )}

        {status === 'ready' && !debouncedQuery && result.items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Products">
              {result.items.map((product) => <OptimizedBeerCard key={product.id} product={product} />)}
            </div>
            {renderPagination('Product')}
          </>
        )}
      </section>
    </div>
  )
}

export default HomePage
