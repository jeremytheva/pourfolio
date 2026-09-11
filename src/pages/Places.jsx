import React, { useState } from 'react'
import { Link } from '../lib/router.jsx'

const tabs = [
  { id: 'breweries', label: 'Breweries' },
  { id: 'venues', label: 'Venues' }
]

function Places() {
  const [activeTab, setActiveTab] = useState('breweries')

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
              id={`${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
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
            Brewery profiles are shown only where Pourfolio has a verified producer relationship for catalogue products.
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Open a beer from Discover or Search and follow its verified brewery link to view the brewery profile and attributed products.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/home"
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              Discover beers
            </Link>
            <Link
              to="/search"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            >
              Search catalogue
            </Link>
          </div>
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
