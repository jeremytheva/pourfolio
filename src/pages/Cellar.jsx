import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiEdit3, FiRefreshCw, FiSearch, FiTrash2, FiX } from 'react-icons/fi'
import { Link } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { cellarService } from '../services/cellarService.js'
import { formatDate } from '../utils/dateFormatting.js'

function Cellar() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({})
  const [mutationError, setMutationError] = useState('')
  const [mutation, setMutation] = useState(null)
  const loadErrorRef = useRef(null)
  const mutationErrorRef = useRef(null)

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

  useEffect(() => {
    if (status === 'error') loadErrorRef.current?.focus()
  }, [status])

  useEffect(() => {
    if (mutationError) mutationErrorRef.current?.focus()
  }, [mutationError])

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
    setMutation({ kind: 'save', id: editingId })
    try {
      const payload = await cellarService.updateCellarItem(editingId, draft)
      setItems((current) => current.map((item) => item.id === editingId ? payload.item : item))
      setEditingId(null)
    } catch (requestError) {
      setMutationError(requestError.message || 'The cellar item could not be updated.')
    } finally {
      setMutation(null)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.product?.product_name || 'this item'} from your cellar?`)) return
    setMutationError('')
    setMutation({ kind: 'delete', id: item.id })
    try {
      await cellarService.deleteCellarItem(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      if (editingId === item.id) setEditingId(null)
    } catch (requestError) {
      setMutationError(requestError.message || 'The cellar item could not be removed.')
    } finally {
      setMutation(null)
    }
  }

  const cellarStatus = status === 'ready'
    ? `${filteredItems.length} ${filteredItems.length === 1 ? 'item' : 'items'} shown${query.trim() ? ' for this search' : ''}.`
    : ''

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
          <input
            id="cellar-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, producer or notes"
            aria-describedby="cellar-search-status"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </div>
        <p id="cellar-search-status" className="sr-only" role="status" aria-live="polite" aria-atomic="true">{cellarStatus}</p>
      </div>

      {mutationError && (
        <div ref={mutationErrorRef} tabIndex={-1} className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 outline-none focus:ring-2 focus:ring-red-300" role="alert">
          {mutationError}
        </div>
      )}

      {status === 'loading' && <div className="py-16 text-center text-gray-600" role="status">Loading your cellar…</div>}
      {status === 'error' && (
        <div ref={loadErrorRef} tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300" role="alert">
          <p className="font-semibold">Cellar unavailable</p>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && filteredItems.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">{items.length ? 'No matching cellar items' : 'Your cellar is empty'}</h2>
          <p className="mt-2 text-gray-600">{items.length ? 'Try a different search.' : 'Open a product and choose “Add to cellar” to begin.'}</p>
          {!items.length && <Link to="/home" className="mt-4 inline-block font-medium text-amber-700 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">Browse products</Link>}
        </div>
      )}

      {status === 'ready' && filteredItems.length > 0 && (
        <ul className="space-y-4" aria-label="Cellar items">
          {filteredItems.map((item) => {
            const isMutating = mutation?.id === item.id
            const editFormId = `cellar-edit-${item.id}`
            return (
              <li key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-busy={isMutating ? 'true' : undefined}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link to={`/products/${item.product_id}`} className="text-xl font-semibold text-gray-900 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
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
                    <button
                      type="button"
                      onClick={() => editingId === item.id ? setEditingId(null) : startEditing(item)}
                      disabled={isMutating}
                      className="rounded-lg border border-gray-300 p-2 text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
                      aria-label={`${editingId === item.id ? 'Close editor for' : 'Edit'} ${item.product?.product_name || 'cellar item'}`}
                      aria-expanded={editingId === item.id}
                      aria-controls={editFormId}
                    >
                      <SafeIcon icon={editingId === item.id ? FiX : FiEdit3} className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={isMutating}
                      className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"
                      aria-label={`${mutation?.kind === 'delete' && isMutating ? 'Deleting' : 'Delete'} ${item.product?.product_name || 'cellar item'}`}
                    >
                      <SafeIcon icon={FiTrash2} className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {editingId === item.id && (
                  <form id={editFormId} onSubmit={save} aria-busy={mutation?.kind === 'save' && isMutating ? 'true' : 'false'} className="mt-5 grid gap-4 border-t border-gray-200 pt-5 sm:grid-cols-3">
                    <label className="text-sm font-medium text-gray-700">Quantity
                      <input autoFocus type="number" min="0" max="10000" required value={draft.quantity} onChange={(event) => setDraft((current) => ({ ...current, quantity: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">Volume (mL)
                      <input type="number" min="0" max="100000" value={draft.mls} onChange={(event) => setDraft((current) => ({ ...current, mls: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">Container
                      <input value={draft.container} onChange={(event) => setDraft((current) => ({ ...current, container: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">Purchase price
                      <input type="number" min="0" step="0.01" value={draft.purchase_price} onChange={(event) => setDraft((current) => ({ ...current, purchase_price: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">Retail price
                      <input type="number" min="0" step="0.01" value={draft.retail_price} onChange={(event) => setDraft((current) => ({ ...current, retail_price: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <label className="text-sm font-medium text-gray-700">Date received
                      <input type="date" value={draft.date_received} onChange={(event) => setDraft((current) => ({ ...current, date_received: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <label className="text-sm font-medium text-gray-700 sm:col-span-3">Notes
                      <textarea maxLength={255} rows={2} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                    </label>
                    <button type="submit" disabled={isMutating} className="rounded-lg bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:cursor-wait disabled:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 sm:col-span-3">
                      {mutation?.kind === 'save' && isMutating ? 'Saving changes…' : 'Save changes'}
                    </button>
                  </form>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Cellar
