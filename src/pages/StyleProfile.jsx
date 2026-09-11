import React, { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import { Link, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { styleService } from '../services/styleService.js'

function StyleProfile() {
  const { styleId } = useParams()
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
    styleService.getStyle(styleId)
      .then((payload) => {
        if (!active) return
        setDetail(payload)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Beer style could not be loaded.')
        setErrorCode(requestError.code || '')
        setStatus('error')
      })
    return () => { active = false }
  }, [styleId, reloadKey])

  useEffect(() => {
    if (status === 'error') errorRef.current?.focus()
  }, [status])

  if (status === 'loading') {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-gray-600" role="status">Loading beer style…</div>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300">
          <h1 className="text-lg font-semibold">Beer style unavailable</h1>
          <p className="mt-1">{error}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/styles" className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
              <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
              Back to styles
            </Link>
            {!['invalid_style_identifier', 'style_not_found'].includes(errorCode) && (
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

  const { style, products, breweries } = detail

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/styles" className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
        <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
        Back to styles
      </Link>

      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Beer Style Explorer</p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">{style.category_name}</h1>
        <p className="mt-3 max-w-3xl text-gray-600">This page uses the verified catalogue style identity. Reference descriptions, expected characteristics and typical ranges are intentionally omitted until Pourfolio has a governed reference-data source.</p>
        <dl className="mt-6 grid max-w-md grid-cols-2 gap-4 rounded-xl bg-gray-50 p-5">
          <div><dt className="text-sm text-gray-500">Beers</dt><dd className="mt-1 text-xl font-semibold text-gray-900">{products.length}</dd></div>
          <div><dt className="text-sm text-gray-500">Breweries</dt><dd className="mt-1 text-xl font-semibold text-gray-900">{breweries.length}</dd></div>
        </dl>
      </header>

      {breweries.length > 0 && (
        <section className="mt-8" aria-labelledby="style-breweries-heading">
          <h2 id="style-breweries-heading" className="text-2xl font-semibold text-gray-900">Breweries represented</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {breweries.map((brewery) => (
              <li key={brewery.id}>
                <Link to={`/breweries/${brewery.id}`} className="inline-flex rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:border-amber-300 hover:text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                  {brewery.producer_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="style-products-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="style-products-heading" className="text-2xl font-semibold text-gray-900">Beer in this style</h2>
          <p className="text-sm text-gray-600">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
        </div>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.id}>
              <Link to={`/products/${product.id}`} className="block h-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
                <h3 className="text-lg font-semibold text-gray-900">{product.product_name}</h3>
                <p className="mt-2 text-sm text-gray-600">{product.producer?.producer_name || 'Producer not recorded'}</p>
                {(product.abv !== null && product.abv !== undefined) && <p className="mt-2 text-sm text-gray-600">{product.abv}% ABV</p>}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default StyleProfile
