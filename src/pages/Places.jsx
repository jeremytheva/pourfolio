import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../lib/router.jsx'
import { producerService } from '../services/producerService.js'

const tabs = [
  { id: 'breweries', label: 'Breweries' },
  { id: 'venues', label: 'Venues' }
]

function Places() {
  const [activeTab, setActiveTab] = useState('breweries')
  const [breweries, setBreweries] = useState([])
  const [breweryStatus, setBreweryStatus] = useState('loading')
  const [searchTerm, setSearchTerm] = useState('')
  const tabRefs = useRef({})

  const loadBreweries = async () => {
    setBreweryStatus('loading')
    try {
      setBreweries(await producerService.listVerifiedProducers())
      setBreweryStatus('ready')
    } catch {
      setBreweries([])
      setBreweryStatus('error')
    }
  }

  useEffect(() => {
    loadBreweries()
  }, [])

  const filteredBreweries = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase()
    if (!query) return breweries
    return breweries.filter(({ producer }) => {
      const searchable = [producer.producer_name, producer.address]
        .filter((value) => typeof value === 'string')
        .join(' ')
        .toLocaleLowerCase()
      return searchable.includes(query)
    })
  }, [breweries, searchTerm])

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

          {breweryStatus === 'loading' && (
            <p className="mt-5 text-sm text-gray-600" role="status">Loading verified breweries…</p>
          )}

          {breweryStatus === 'error' && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
              <p className="font-semibold text-red-900">Verified breweries could not be loaded.</p>
              <button
                type="button"
                onClick={loadBreweries}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {breweryStatus === 'ready' && breweries.length === 0 && (
            <p className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700" role="status">
              No verified brewery relationships are currently available.
            </p>
          )}

          {breweryStatus === 'ready' && breweries.length > 0 && (
            <>
              <div className="mt-5">
                <label htmlFor="brewery-search" className="block text-sm font-semibold text-gray-800">Search verified breweries</label>
                <input
                  id="brewery-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="mt-2 w-full max-w-xl rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="Search by brewery name or address"
                />
              </div>

              <p className="mt-4 text-sm text-gray-600" role="status" aria-live="polite">
                {filteredBreweries.length} verified {filteredBreweries.length === 1 ? 'brewery' : 'breweries'} shown.
              </p>

              {filteredBreweries.length ? (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBreweries.map(({ producer, productCount }) => (
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
              ) : (
                <p className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  No verified breweries match this search.
                </p>
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
