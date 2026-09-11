import React, { useEffect, useRef, useState } from 'react'
import { FiCompass, FiMap, FiRefreshCw } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { ratingService } from '../services/ratingService.js'
import { buildTasteMapSummary } from '../services/tasteMapSummary.js'

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <dt className="text-sm text-gray-500">{label}</dt>
    <dd className="mt-1 text-3xl font-bold text-gray-900">{value}</dd>
  </div>
)

function TasteMap() {
  const [summary, setSummary] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const errorRef = useRef(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    ratingService.getUserRatings()
      .then((payload) => {
        if (!active) return
        setSummary(buildTasteMapSummary(payload))
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Your tasting history could not be loaded.')
        setStatus('error')
      })
    return () => { active = false }
  }, [reloadKey])

  useEffect(() => {
    if (status === 'error') errorRef.current?.focus()
  }, [status])

  if (status === 'loading') {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-gray-600" role="status">Loading your Beer Passport…</div>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300">
          <h1 className="text-lg font-semibold">Beer Passport unavailable</h1>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 font-medium text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const hasHistory = summary.tastingCount > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3 text-amber-700">
          <SafeIcon icon={FiCompass} className="h-6 w-6" />
          <p className="text-sm font-semibold uppercase tracking-wide">Taste Map · Beer Passport</p>
        </div>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">Your beer exploration</h1>
        <p className="mt-3 max-w-3xl text-gray-600">A private view of the verified styles and breweries represented in your Pourfolio rating history. Repeated tastings remain part of your tasting count while each beer is counted once in unique-beer totals.</p>
      </header>

      {!hasHistory ? (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-gray-700" role="status">
          <h2 className="text-xl font-semibold text-gray-900">No tasting history yet</h2>
          <p className="mt-2">Rate a beer to start building your Beer Passport.</p>
          <Link to="/home" className="mt-4 inline-flex rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">Discover beers</Link>
        </section>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="passport-summary-heading">
            <h2 id="passport-summary-heading" className="text-2xl font-semibold text-gray-900">Passport summary</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Tastings" value={summary.tastingCount} />
              <Stat label="Unique beers" value={summary.uniqueProductCount} />
              <Stat label="Verified styles" value={summary.styleCount} />
              <Stat label="Verified breweries" value={summary.breweryCount} />
            </dl>
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section aria-labelledby="passport-styles-heading" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 id="passport-styles-heading" className="text-2xl font-semibold text-gray-900">Styles explored</h2>
              {summary.styles.length === 0 ? <p className="mt-3 text-gray-600">No verified style relationships are available in your rating history.</p> : (
                <ul className="mt-4 divide-y divide-gray-100">
                  {summary.styles.map((style) => (
                    <li key={style.id} className="flex items-center justify-between gap-4 py-3">
                      <Link to={`/styles/${style.id}`} className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">{style.name}</Link>
                      <span className="text-right text-sm text-gray-600">{style.uniqueProductCount} {style.uniqueProductCount === 1 ? 'beer' : 'beers'} · {style.tastingCount} {style.tastingCount === 1 ? 'tasting' : 'tastings'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {summary.unknownStyleTastingCount > 0 && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Unverified/unknown style: {summary.unknownStyleProductCount} {summary.unknownStyleProductCount === 1 ? 'beer' : 'beers'} across {summary.unknownStyleTastingCount} {summary.unknownStyleTastingCount === 1 ? 'tasting' : 'tastings'}.</p>}
            </section>

            <section aria-labelledby="passport-breweries-heading" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 id="passport-breweries-heading" className="text-2xl font-semibold text-gray-900">Breweries explored</h2>
              {summary.breweries.length === 0 ? <p className="mt-3 text-gray-600">No verified brewery relationships are available in your rating history.</p> : (
                <ul className="mt-4 divide-y divide-gray-100">
                  {summary.breweries.map((brewery) => (
                    <li key={brewery.id} className="flex items-center justify-between gap-4 py-3">
                      <Link to={`/breweries/${brewery.id}`} className="font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">{brewery.name}</Link>
                      <span className="text-right text-sm text-gray-600">{brewery.uniqueProductCount} {brewery.uniqueProductCount === 1 ? 'beer' : 'beers'} · {brewery.tastingCount} {brewery.tastingCount === 1 ? 'tasting' : 'tastings'}</span>
                    </li>
                  ))}
                </ul>
              )}
              {summary.unknownProducerTastingCount > 0 && <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Unverified/unknown brewery: {summary.unknownProducerProductCount} {summary.unknownProducerProductCount === 1 ? 'beer' : 'beers'} across {summary.unknownProducerTastingCount} {summary.unknownProducerTastingCount === 1 ? 'tasting' : 'tastings'}.</p>}
            </section>
          </div>
        </>
      )}

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="passport-geography-heading">
        <div className="flex items-center gap-3">
          <SafeIcon icon={FiMap} className="h-5 w-5 text-gray-500" />
          <h2 id="passport-geography-heading" className="text-2xl font-semibold text-gray-900">Geography</h2>
        </div>
        <p className="mt-3 text-gray-600">Country and region exploration will appear when Pourfolio has governed canonical geography for breweries/products. The current catalogue does not provide enough verified geography to infer this safely, so suburb IDs, free-text addresses and your location are not used as substitutes.</p>
      </section>
    </div>
  )
}

export default TasteMap
