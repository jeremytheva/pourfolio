import React, { useEffect, useMemo, useState } from 'react'
import { FiEdit3, FiRefreshCw, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { cellarService } from '../services/cellarService.js'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value))
  : 'Date not recorded'

function Cellar() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({})
  const [mutationError, setMutationError] = useState('')

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    cellarService.getCellarItems()
      .then((payload) => {
        if (!active) return
        setItems(payload.items || [])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Your cellar could not be loaded.')
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return items
    return items.filter((item) => [
      item.product?.product_name,
      item.product?.producer?.producer_name,
      item.product?.declared_category,
      item.container,
      item.notes
    ].some((value) => String(value || '').toLocaleLowerCase().includes(term)))
  }, [items, query])

  const startEditing = (item) => {
    setMutationError('')
    setEditingId(item.id)
    setDraft({
      quantity: item.quantity ?? 0,
      mls: item.mls ?? '',
      container: item.container ?? '',
      purchase_price: item.purchase_price ?? '',
      retail_price: item.retail_price ?? '',
      date_received: item.date_received ? String(item.date_received).slice(0, 10) : '',
      notes: item.notes ?? ''
    })
  }

  const save = async (event) => {
    event.preventDefault()
    setMutationError('')
    try {
      const payload = await cellarService.updateCellarItem(editingId, draft)
      setItems((current) => current.map((item) => item.id === editingId ? payload.item : item))
      setEditingId(null)
    } catch (requestError) {
      setMutationError(requestError.message || 'The cellar item could not be updated.')
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.product?.product_name || 'this item'} from your cellar?`)) return
    setMutationError('')
    try {
      await cellarService.deleteCellarItem(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
    } catch (requestError) {
      setMutationError(requestError.message || 'The cellar item could not be removed.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Private inventory</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">My cellar</h1>
        <p className="mt-2 text-gray-600">Items are loaded from your owner-scoped server records, not this browser.</p>
      </header>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <label htmlFor="cellar-search" className="sr-only">Search cellar</label>
        <div className="relative">
          <SafeIcon icon={FiSearch} className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input id="cellar-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product, producer or notes" className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3" />
        </div>
      </div>

      {mutationError && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">{mutationError}</div>}

      {status === 'loading' && <div className="py-16 text-center text-gray-600" role="status">Loading your cellar…</div>}
      {status === 'error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900" role="alert">
          <p className="font-semibold">Cellar unavailable</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && filteredItems.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">{items.length ? 'No matching cellar items' : 'Your cellar is empty'}</h2>
          <p className="mt-2 text-gray-600">{items.length ? 'Try a different search.' : 'Open a product and choose “Add to cellar” to begin.'}</p>
          {!items.length && <Link to="/home" className="mt-4 inline-block font-medium text-amber-700 hover:underline">Browse products</Link>}
        </div>
      )}

      {status === 'ready' && filteredItems.length > 0 && (
        <ul className="space-y-4">
          {filteredItems.map((item) => (
            <li key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link to={`/products/${item.product_id}`} className="text-xl font-semibold text-gray-900 hover:text-amber-800">
                    {item.product?.product_name || `Product ${item.product_id}`}
                  </Link>
                  <p className="mt-1 text-sm text-gray-600">{item.product?.producer?.producer_name || 'Producer not recorded'}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Quantity {item.quantity ?? 0}
                    {item.mls ? ` · ${item.mls} mL` : ''}
                    {item.container ? ` · ${item.container}` : ''}
                    {` · ${formatDate(item.date_received)}`}
                  </p>
                  {item.notes && <p className="mt-3 max-w-3xl text-sm text-gray-700">{item.notes}</p>}
                  {(item.sharing_series_id || item.series_version_id) && (
                    <p className="mt-2 text-xs text-gray-500">
                      Sharing series {item.sharing_series_id || '—'} · Edition {item.series_version_id || '—'}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editingId === item.id ? setEditingId(null) : startEditing(item)} className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50" aria-label={`Edit ${item.product?.product_name || 'cellar item'}`}>
                    <SafeIcon icon={editingId === item.id ? FiX : FiEdit3} className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => remove(item)} className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${item.product?.product_name || 'cellar item'}`}>
                    <SafeIcon icon={FiTrash2} className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {editingId === item.id && (
                <form onSubmit={save} className="mt-5 grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-3">
                  <label className="text-sm font-medium text-gray-700">Quantity
                    <input type="number" min="0" max="10000" required value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Volume (mL)
                    <input type="number" min="0" max="100000" value={draft.mls} onChange={(event) => setDraft((current) => ({ ...current, mls: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Container
                    <input value={draft.container} onChange={(event) => setDraft((current) => ({ ...current, container: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Purchase price
                    <input type="number" min="0" step="0.01" value={draft.purchase_price} onChange={(event) => setDraft((current) => ({ ...current, purchase_price: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Retail price
                    <input type="number" min="0" step="0.01" value={draft.retail_price} onChange={(event) => setDraft((current) => ({ ...current, retail_price: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-gray-700">Date received
                    <input type="date" value={draft.date_received} onChange={(event) => setDraft((current) => ({ ...current, date_received: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <label className="text-sm font-medium text-gray-700 sm:col-span-3">Notes
                    <textarea maxLength={255} rows={2} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                  </label>
                  <button type="submit" className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 sm:col-span-3">Save changes</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Cellar
