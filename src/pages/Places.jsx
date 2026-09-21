import React, { useEffect, useRef, useState } from 'react'
import { Link } from '../lib/router.jsx'
import { producerService } from '../services/producerService.js'

const tabs = [
  { id: 'breweries', label: 'Breweries' },
  { id: 'venues', label: 'Venues' }
]

const BREWERY_PAGE_SIZE = 24
const EMPTY_BREWERY_PAGE = Object.freeze({ items: [], page: 1, pageSize: BREWERY_PAGE_SIZE, total: 0, totalPages: 0 })

function Places() {
  const [activeTab, setActiveTab] = useState('breweries')
  const [breweryPage, setBreweryPage] = useState(EMPTY_BREWERY_PAGE)
  const [breweryStatus, setBreweryStatus] = useState('loading')
  const [breweryError, setBreweryError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const tabRefs = useRef({})
  const errorRef = useRef(null)
  const resultsHeadingRef = useRef(null)
  const focusResultsAfterPage = useRef(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [searchTerm])

  useEffect(() => {
    let active = true
    setBreweryStatus('loading')
    setBreweryError('')

    producerService.listVerifiedProducerPage({
      search: debouncedSearch,
      page,
      limit: BREWERY_PAGE_SIZE
    })
      .then((payload) => {
        if (!active) return
        setBreweryPage(payload)
        setBreweryStatus('ready')
      })
      .catch((error) => {
        if (!active) return
        focusResultsAfterPage.current = false
        setBreweryPage(EMPTY_BREWERY_PAGE)
        setBreweryError(error.message || 'Verified breweries could not be loaded.')
        setBreweryStatus('error')
      })

    return () => { active = false }
  }, [debouncedSearch, page, reloadKey])

  useEffect(() => {
    if (breweryStatus === 'error') errorRef.current?.focus()
    if (breweryStatus === 'ready' && focusResultsAfterPage.current) {
      focusResultsAfterPage.current = false
      resultsHeadingRef.current?.focus()
    }
  }, [breweryStatus])

  const activateTab = (tabId) => {
    setActiveTab(tabId)
    requestAnimationFrame(() => tabRefs.current[tabId]?.focus())
  }

  const handleTabKeyDown = (event, tabId) => {
    const index = tabs.findIndex((tab) => tab.id === tabId)
    let nextIndex = null

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1

    if (nextIndex === null) return
    event.preventDefault()
    activateTab(tabs[nextIndex].id)
  }

  const changePage = (nextPage) => {
    focusResultsAfterPage.current = true
    setPage(nextPage)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Places</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">Breweries & Venues</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Explore verified breweries now. Venue discovery will activate only when verified venue data and rating attribution are available.
        </p>
      </div>

      <div role="tablist" aria-label="Places" className="mb-6 flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              ref={(element) => { tabRefs.current[tab.id] = element }}
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
              className={`rounded-t-lg px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${
                selected
                  ? 'border-b-2 border-amber-600 text-amber-800'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'breweries' ? (
        <section
          id="breweries-panel"
          role="tabpanel"
          aria-labelledby="breweries-tab"
          tabIndex={0}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
        >
          <h2 className="text-xl font-bold text-gray-900">Breweries</h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Brewery profiles appear only when current catalogue products carry a verified producer relationship.
          </p>

          <div className="mt-5">
            <label htmlFor="brewery-search" className="block text-sm font-semibold text-gray-800">Search verified breweries</label>
            <input
              id="brewery-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="mt-2 w-full max-w-xl rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Search by brewery name or verified address"
              aria-describedby="brewery-search-status"
            />
          </div>

          <p id="brewery-search-status" className="mt-4 text-sm text-gray-600" role="status" aria-live="polite" aria-atomic="true">
            {breweryStatus === 'loading'
              ? debouncedSearch ? 'Searching verified breweries…' : 'Loading verified breweries…'
              : breweryStatus === 'error'
                ? 'Verified breweries could not be loaded.'
                : `${breweryPage.total} verified ${breweryPage.total === 1 ? 'brewery' : 'breweries'} found.`}
          </p>

          {breweryStatus === 'error' && (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 outline-none focus:ring-2 focus:ring-red-300"
              role="alert"
            >
              <p className="font-semibold text-red-900">Verified breweries could not be loaded.</p>
              <p className="mt-1 text-sm text-red-900">{breweryError}</p>
              <button
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {breweryStatus === 'ready' && breweryPage.total === 0 && (
            <p className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {debouncedSearch
                ? 'No verified breweries match this search.'
                : 'No verified brewery relationships are currently available.'}
            </p>
          )}

          {breweryStatus === 'ready' && breweryPage.items.length > 0 && (
            <>
              <h3 ref={resultsHeadingRef} tabIndex={-1} className="sr-only focus:outline-none">Verified brewery results</h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {breweryPage.items.map(({ producer, productCount }) => (
                  <li key={producer.id}>
                    <Link
                      to={`/breweries/${producer.id}`}
                      className="block h-full rounded-lg border border-gray-200 p-4 hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                    >
                      <span className="block font-semibold text-gray-900">{producer.producer_name}</span>
                      {producer.address ? <span className="mt-1 block text-sm text-gray-600">{producer.address}</span> : null}
                      <span className="mt-2 block text-sm text-gray-600">
                        {productCount} attributed {productCount === 1 ? 'beer' : 'beers'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {breweryPage.totalPages > 1 && (
                <nav className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4" aria-label="Brewery pages">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => changePage(Math.max(1, page - 1))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600" aria-current="page">Page {page} of {breweryPage.totalPages}</span>
                  <button
                    type="button"
                    disabled={page >= breweryPage.totalPages}
                    onClick={() => changePage(Math.min(breweryPage.totalPages, page + 1))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      ) : (
        <section
          id="venues-panel"
          role="tabpanel"
          aria-labelledby="venues-tab"
          tabIndex={0}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm outline-none focus:ring-2 focus:ring-amber-400"
        >
          <h2 className="text-xl font-bold text-gray-900">Venues</h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Verified venue data is not yet available in the launch schema, so Pourfolio does not infer or fabricate venue records.
          </p>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4" role="status">
            <p className="font-semibold text-amber-900">Venue discovery is awaiting verified data.</p>
            <p className="mt-1 text-sm text-amber-900">
              When a governed venue entity and rating-to-venue relationship are deployed and certified, this tab will show venue profiles and product-derived Pourfolio Venue Scores.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default Places
