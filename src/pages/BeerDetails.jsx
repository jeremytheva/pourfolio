import React, { useEffect, useState } from 'react'
import { FiArrowLeft, FiPackage, FiRefreshCw, FiStar, FiX } from 'react-icons/fi'
import { Link, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { beverageService } from '../services/beverageService.js'
import { cellarService } from '../services/cellarService.js'

const FALLBACK_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"%3E%3Crect width="960" height="540" fill="%23fef3c7"/%3E%3Ctext x="480" y="285" text-anchor="middle" font-family="sans-serif" font-size="64" fill="%2392400e"%3EPourfolio%3C/text%3E%3C/svg%3E'

const initialCellarForm = {
  quantity: 1,
  mls: '',
  container: '',
  purchase_price: '',
  retail_price: '',
  date_received: new Date().toISOString().slice(0, 10),
  notes: ''
}

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value))
  : 'Date not recorded'

function BeerDetails() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [showCellarForm, setShowCellarForm] = useState(false)
  const [cellarForm, setCellarForm] = useState(initialCellarForm)
  const [cellarStatus, setCellarStatus] = useState('')
  const [cellarError, setCellarError] = useState('')

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    beverageService.getProduct(productId)
      .then((payload) => {
        if (!active) return
        setProduct(payload)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Product details could not be loaded.')
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [productId, reloadKey])

  const updateCellarField = (field) => (event) => {
    setCellarForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const addToCellar = async (event) => {
    event.preventDefault()
    setCellarStatus('saving')
    setCellarError('')
    try {
      await cellarService.addCellarItem({
        product_id: product.id,
        ...cellarForm
      })
      setCellarStatus('saved')
      setCellarForm(initialCellarForm)
    } catch (requestError) {
      setCellarStatus('')
      setCellarError(requestError.message || 'The cellar item could not be saved.')
    }
  }

  if (status === 'loading') {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-gray-600" role="status">Loading product…</div>
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
          <h1 className="text-lg font-semibold">Product unavailable</h1>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const category = product.declared_category || product.category?.category_name || 'Beer'
  const producer = product.producer?.producer_name || 'Producer not recorded'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/home" className="mb-6 inline-flex items-center text-sm font-medium text-gray-600 hover:text-amber-800">
        <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
        Back to products
      </Link>

      <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-2">
          <img src={product.product_image || FALLBACK_IMAGE} alt="" className="h-full min-h-80 w-full bg-amber-50 object-cover" />
          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">{category}</p>
            <h1 className="mt-2 text-4xl font-bold text-gray-900">{product.product_name}</h1>
            <p className="mt-2 text-lg text-gray-600">{producer}</p>

            <dl className="mt-8 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-5">
              <div>
                <dt className="text-sm text-gray-500">Average rating</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">
                  {product.ratingSummary.average === null ? 'Not rated' : `${product.ratingSummary.average} / 7`}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Ratings</dt>
                <dd className="mt-1 text-xl font-semibold text-gray-900">{product.ratingSummary.count}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">ABV</dt>
                <dd className="mt-1 font-medium text-gray-900">{product.abv ?? 'Not recorded'}{product.abv !== null && product.abv !== undefined ? '%' : ''}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">IBU</dt>
                <dd className="mt-1 font-medium text-gray-900">{product.ibu || 'Not recorded'}</dd>
              </div>
              {product.edition && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Edition</dt>
                  <dd className="mt-1 font-medium text-gray-900">{product.edition}</dd>
                </div>
              )}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/products/${product.id}/rate`} className="inline-flex items-center rounded-lg bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-700">
                <SafeIcon icon={FiStar} className="mr-2 h-5 w-5" />
                Rate this beer
              </Link>
              <button type="button" onClick={() => { setShowCellarForm((value) => !value); setCellarStatus(''); setCellarError('') }} className="inline-flex items-center rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50" aria-expanded={showCellarForm}>
                <SafeIcon icon={showCellarForm ? FiX : FiPackage} className="mr-2 h-5 w-5" />
                {showCellarForm ? 'Close cellar form' : 'Add to cellar'}
              </button>
            </div>
          </div>
        </div>
      </article>

      {showCellarForm && (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="cellar-form-heading">
          <h2 id="cellar-form-heading" className="text-2xl font-semibold text-gray-900">Add {product.product_name} to your cellar</h2>
          <p className="mt-1 text-sm text-gray-600">Sharing series and edition links are optional and remain empty unless explicitly selected in a future supported workflow.</p>
          {cellarStatus === 'saved' && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-green-800" role="status">Cellar item saved.</div>}
          {cellarError && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert">{cellarError}</div>}
          <form onSubmit={addToCellar} className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Quantity
              <input type="number" min="0" max="10000" required value={cellarForm.quantity} onChange={updateCellarField('quantity')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Container volume (mL)
              <input type="number" min="0" max="100000" value={cellarForm.mls} onChange={updateCellarField('mls')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Container
              <input value={cellarForm.container} onChange={updateCellarField('container')} placeholder="Can, bottle, growler…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Date received
              <input type="date" value={cellarForm.date_received} onChange={updateCellarField('date_received')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Purchase price
              <input type="number" min="0" step="0.01" value={cellarForm.purchase_price} onChange={updateCellarField('purchase_price')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700">Retail price
              <input type="number" min="0" step="0.01" value={cellarForm.retail_price} onChange={updateCellarField('retail_price')} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <label className="text-sm font-medium text-gray-700 sm:col-span-2">Notes
              <textarea value={cellarForm.notes} onChange={updateCellarField('notes')} maxLength={255} rows={3} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
            </label>
            <button type="submit" disabled={cellarStatus === 'saving'} className="rounded-lg bg-amber-600 px-5 py-3 font-medium text-white hover:bg-amber-700 disabled:bg-gray-400 sm:col-span-2">
              {cellarStatus === 'saving' ? 'Saving…' : 'Save cellar item'}
            </button>
          </form>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="recent-ratings">
        <h2 id="recent-ratings" className="text-2xl font-semibold text-gray-900">Recent ratings</h2>
        {product.ratings.length === 0 ? (
          <p className="mt-3 text-gray-600">No ratings yet. Be the first to rate this product.</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-200">
            {product.ratings.map((rating) => (
              <li key={rating.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
                <span className="text-lg font-semibold text-amber-800">{rating.total_weighted} / 7</span>
                <span className="text-sm text-gray-500">{formatDate(rating.date_rated)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default BeerDetails
