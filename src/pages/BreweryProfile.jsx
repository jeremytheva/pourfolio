import React, { useEffect, useRef, useState } from 'react'
import { FiArrowLeft, FiRefreshCw } from 'react-icons/fi'
import { Link, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { producerService } from '../services/producerService.js'

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
            <Link to="/home" className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 font-medium text-red-900 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
              <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
              Back to products
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

  const { producer, products } = detail
  const address = typeof producer.address === 'string' ? producer.address.trim() : ''

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/home" className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
        <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
        Back to products
      </Link>

      <header className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Brewery</p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">{producer.producer_name}</h1>
        {address && <p className="mt-3 text-gray-600">{address}</p>}
      </header>

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
