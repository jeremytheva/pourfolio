import React, { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import { Link, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { producerService } from '../services/producerService.js'

const scoreText = (value) => value === null ? 'Not enough data' : String(value.toFixed(2)) + ' / 5'

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <dt className="text-sm font-medium text-gray-600">{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-gray-900">{value}</dd>
      {detail ? <dd className="mt-1 text-xs text-gray-500">{detail}</dd> : null}
    </div>
  )
}

function TopBeerList({ items, emptyText }) {
  if (!items.length) return <p className="mt-3 text-sm text-gray-600">{emptyText}</p>
  return (
    <ol className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item.productId}>
          <Link
            to={'/products/' + item.productId}
            className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
          >
            <span className="font-medium text-gray-900">{item.productName}</span>
            <span className="text-right text-sm text-gray-600">
              {item.averageWeighted.toFixed(2)} / 5 · {item.ratingCount} {item.ratingCount === 1 ? 'rating' : 'ratings'}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

function BreweryProfile() {
  const { producerId } = useParams()
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [errorCode, setErrorCode] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const errorRef = useRef(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    setErrorCode('')
    producerService.getProducer(producerId)
      .then((payload) => {
        if (!active) return
        setDetail(payload)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Producer details could not be loaded.')
        setErrorCode(requestError.code || '')
        setStatus('error')
      })
    return () => { active = false }
  }, [producerId, reloadKey])

  useEffect(() => {
    if (status === 'error') errorRef.current?.focus()
  }, [status])

  if (status === 'loading') {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-gray-600" role="status">Loading brewery…</div>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300">
          <h1 className="text-lg font-semibold">Brewery unavailable</h1>
          <p className="mt-1">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/places" className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
              <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
              Back to Breweries & Venues
            </Link>
            {errorCode !== 'invalid_producer_identifier' && (
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
                <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const { producer, products, communityStats, personalStats } = detail
  const address = typeof producer.address === 'string' ? producer.address.trim() : ''

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/places" className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
        <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
        Back to Breweries & Venues
      </Link>

      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Brewery</p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">{producer.producer_name}</h1>
        {address && <p className="mt-3 text-gray-600">{address}</p>}
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Community brewery summary">
          <StatCard label="Pourfolio score" value={scoreText(communityStats.averageWeighted)} detail={String(communityStats.ratingCount) + ' completed ' + (communityStats.ratingCount === 1 ? 'rating' : 'ratings')} />
          <StatCard label="Standard score" value={scoreText(communityStats.averageUnweighted)} detail={String(communityStats.unweightedRatingCount) + ' qualifying ' + (communityStats.unweightedRatingCount === 1 ? 'rating' : 'ratings')} />
          <StatCard label="Rated beers" value={communityStats.ratedBeerCount} detail={'of ' + communityStats.catalogueBeerCount + ' verified catalogue beers'} />
          <StatCard label="Catalogue beers" value={communityStats.catalogueBeerCount} />
        </dl>
      </header>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-6" aria-labelledby="community-profile-heading">
        <h2 id="community-profile-heading" className="text-2xl font-semibold text-gray-900">Community profile</h2>
        <p className="mt-2 text-sm text-gray-600">Aggregate completed ratings only. Individual community ratings and private tasting details are not shown.</p>
        <h3 className="mt-6 text-lg font-semibold text-gray-900">Core tasting attributes</h3>
        {communityStats.attributes.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600">No qualifying scored attributes are available yet.</p>
        ) : (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {communityStats.attributes.map((attribute) => (
              <div key={attribute.attributeId} className="rounded-lg border border-gray-200 bg-white p-4">
                <dt className="font-medium text-gray-900">{attribute.name}</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900">{attribute.average.toFixed(2)}</dd>
                <dd className="text-xs text-gray-500">{attribute.count} qualifying {attribute.count === 1 ? 'rating' : 'ratings'}</dd>
              </div>
            ))}
          </dl>
        )}
        <h3 className="mt-6 text-lg font-semibold text-gray-900">Highest average rated beers</h3>
        <p className="mt-1 text-xs text-gray-500">Descriptive averages with sample counts, not a brewery ranking.</p>
        <TopBeerList items={communityStats.topBeers} emptyText="No qualifying completed ratings are available yet." />
      </section>

      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6" aria-labelledby="personal-history-heading">
        <h2 id="personal-history-heading" className="text-2xl font-semibold text-gray-900">Your history</h2>
        <p className="mt-2 text-sm text-gray-700">Only your completed ratings for beers attributed to this brewery.</p>
        {personalStats.ratingCount === 0 ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-white p-4 text-sm text-gray-700">You have no completed ratings for this brewery yet.</p>
        ) : (
          <>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Your Pourfolio score" value={scoreText(personalStats.averageWeighted)} detail={String(personalStats.ratingCount) + ' completed ' + (personalStats.ratingCount === 1 ? 'rating' : 'ratings')} />
              <StatCard label="Your standard score" value={scoreText(personalStats.averageUnweighted)} detail={String(personalStats.unweightedRatingCount) + ' qualifying ' + (personalStats.unweightedRatingCount === 1 ? 'rating' : 'ratings')} />
              <StatCard label="Beers tasted" value={personalStats.ratedBeerCount} />
            </dl>
            <h3 className="mt-6 text-lg font-semibold text-gray-900">Your highest rated beers</h3>
            <TopBeerList items={personalStats.topBeers} emptyText="No qualifying completed ratings are available yet." />
          </>
        )}
      </section>

      <section className="mt-8" aria-labelledby="producer-products-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="producer-products-heading" className="text-2xl font-semibold text-gray-900">Beer from this brewery</h2>
          <p className="text-sm text-gray-600">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
        </div>

        {products.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
            No beer is currently linked to this brewery in the verified catalogue.
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const category = product.declared_category || product.category?.category_name || 'Beer'
              return (
                <li key={product.id}>
                  <Link to={`/products/${product.id}`} className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{category}</p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">{product.product_name}</h3>
                    {(product.abv !== null && product.abv !== undefined) && <p className="mt-2 text-sm text-gray-600">{product.abv}% ABV</p>}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default BreweryProfile
