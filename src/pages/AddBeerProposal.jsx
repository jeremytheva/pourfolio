import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from '../lib/router.jsx'
import { beverageService } from '../services/beverageService.js'
import { producerService } from '../services/producerService.js'
import { styleService } from '../services/styleService.js'

const normalise = (value) => value.trim().toLocaleLowerCase().replace(/\s+/gu, ' ')

function AddBeerProposal() {
  const location = useLocation()
  const suggestedName = new URLSearchParams(location.search).get('name') || ''
  const [form, setForm] = useState({
    product_name: suggestedName,
    producer_id: '',
    product_category_id: '',
    abv: '',
    ibu: '',
    edition: '',
    collaboration: false
  })
  const [producers, setProducers] = useState([])
  const [styles, setStyles] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState([])
  const [duplicateStatus, setDuplicateStatus] = useState('idle')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    let active = true
    Promise.all([producerService.listVerifiedProducers(), styleService.listVerifiedStyles()])
      .then(([producerRows, styleRows]) => {
        if (!active) return
        setProducers(producerRows)
        setStyles(styleRows)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'Canonical beer relationships could not be loaded.')
        setStatus('error')
      })
    return () => { active = false }
  }, [])

  const selectedProducer = useMemo(
    () => producers.find(({ producer }) => String(producer.id) === form.producer_id)?.producer || null,
    [form.producer_id, producers]
  )
  const selectedStyle = useMemo(
    () => styles.find(({ style }) => String(style.id) === form.product_category_id)?.style || null,
    [form.product_category_id, styles]
  )

  useEffect(() => {
    const name = form.product_name.trim()
    if (name.length < 2 || !form.producer_id) {
      setDuplicates([])
      setDuplicateStatus('idle')
      return undefined
    }

    let active = true
    const timeout = window.setTimeout(() => {
      setDuplicateStatus('loading')
      beverageService.getProducts({ search: name, page: 1, limit: 24 })
        .then((payload) => {
          if (!active) return
          const needle = normalise(name)
          const candidates = payload.items.filter((product) => {
            const sameProducer = String(product.producer_id || '') === form.producer_id
            const productName = normalise(product.product_name || '')
            return sameProducer && (productName === needle || productName.includes(needle) || needle.includes(productName))
          })
          setDuplicates(candidates)
          setDuplicateStatus('ready')
        })
        .catch(() => {
          if (!active) return
          setDuplicates([])
          setDuplicateStatus('error')
        })
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [form.product_name, form.producer_id])

  const setField = (field, value) => {
    setReviewing(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const numericValue = (value) => value === '' ? null : Number(value)
  const abv = numericValue(form.abv)
  const ibu = numericValue(form.ibu)
  const valid = (
    form.product_name.trim().length >= 2 &&
    Boolean(selectedProducer) &&
    Boolean(selectedStyle) &&
    (abv === null || (Number.isFinite(abv) && abv >= 0 && abv <= 30)) &&
    (ibu === null || (Number.isFinite(ibu) && ibu >= 0 && ibu <= 200))
  )

  if (status === 'loading') return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600" role="status">Loading canonical breweries and styles…</div>
  if (status === 'error') return <div className="mx-auto max-w-3xl px-4 py-16"><div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900"><h1 className="text-lg font-semibold">Beer proposal unavailable</h1><p className="mt-1">{error}</p></div></div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Catalogue stewardship</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Propose a missing beer</h1>
        <p className="mt-2 text-gray-600">Choose verified catalogue relationships. This flow prepares a moderated proposal; it does not directly overwrite the canonical catalogue.</p>
      </header>

      <form className="mt-8 space-y-6" onSubmit={(event) => { event.preventDefault(); if (valid) setReviewing(true) }}>
        <label className="block text-sm font-medium text-gray-700">Beer name
          <input required minLength={2} maxLength={160} value={form.product_name} onChange={(event) => setField('product_name', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
        </label>

        <label className="block text-sm font-medium text-gray-700">Brewery / producer
          <select required value={form.producer_id} onChange={(event) => setField('producer_id', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
            <option value="">Select a verified brewery</option>
            {producers.map(({ producer }) => <option key={producer.id} value={String(producer.id)}>{producer.producer_name}</option>)}
          </select>
        </label>

        <label className="block text-sm font-medium text-gray-700">Beer style / category
          <select required value={form.product_category_id} onChange={(event) => setField('product_category_id', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
            <option value="">Select a verified style</option>
            {styles.map(({ style }) => <option key={style.id} value={String(style.id)}>{style.category_name}</option>)}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">ABV %
            <input type="number" min="0" max="30" step="0.1" inputMode="decimal" value={form.abv} onChange={(event) => setField('abv', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-gray-700">IBU
            <input type="number" min="0" max="200" step="1" inputMode="numeric" value={form.ibu} onChange={(event) => setField('ibu', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">Edition / vintage
          <input maxLength={120} value={form.edition} onChange={(event) => setField('edition', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={form.collaboration} onChange={(event) => setField('collaboration', event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Collaboration beer
        </label>
        {form.collaboration && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The current verified launch contract has no canonical collaboration relationship selector. This proposal records only the existing collaboration flag and does not invent collaborator relationships.</p>}

        <section aria-labelledby="duplicate-heading" className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 id="duplicate-heading" className="font-semibold text-gray-900">Possible duplicates</h2>
          <p className="mt-1 text-sm text-gray-600" role="status" aria-live="polite">
            {duplicateStatus === 'idle' && 'Enter a beer name and brewery to check the current catalogue.'}
            {duplicateStatus === 'loading' && 'Checking the catalogue…'}
            {duplicateStatus === 'error' && 'Duplicate checking is temporarily unavailable. A proposal must not be treated as approved until this check can run.'}
            {duplicateStatus === 'ready' && duplicates.length === 0 && 'No likely duplicate was found in the current search results.'}
            {duplicateStatus === 'ready' && duplicates.length > 0 && `${duplicates.length} possible duplicate${duplicates.length === 1 ? '' : 's'} found.`}
          </p>
          {duplicates.length > 0 && <ul className="mt-3 space-y-2">{duplicates.map((product) => <li key={product.id}><Link to={`/products/${product.id}`} className="font-medium text-amber-800 underline">{product.product_name}</Link></li>)}</ul>}
        </section>

        <button type="submit" disabled={!valid || duplicateStatus === 'loading'} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Review proposal</button>
      </form>

      {reviewing && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-xl font-semibold text-gray-900">Review proposal</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">Beer</dt><dd className="font-medium text-gray-900">{form.product_name.trim()}</dd></div>
            <div><dt className="text-gray-500">Brewery</dt><dd className="font-medium text-gray-900">{selectedProducer?.producer_name}</dd></div>
            <div><dt className="text-gray-500">Style</dt><dd className="font-medium text-gray-900">{selectedStyle?.category_name}</dd></div>
            <div><dt className="text-gray-500">ABV</dt><dd>{form.abv || 'Unknown'}</dd></div>
            <div><dt className="text-gray-500">IBU</dt><dd>{form.ibu || 'Unknown'}</dd></div>
            <div><dt className="text-gray-500">Edition</dt><dd>{form.edition.trim() || 'None specified'}</dd></div>
          </dl>
          <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900" role="status">
            Moderated catalogue-proposal persistence is not yet provider-certified, so submission remains intentionally unavailable. The reviewed proposal is not written to the canonical catalogue.
          </div>
          <button type="button" disabled className="mt-4 rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-600" aria-describedby="proposal-persistence-status">Submit for moderation</button>
          <p id="proposal-persistence-status" className="mt-2 text-sm text-gray-600">Available after a governed proposal storage and moderation contract is verified.</p>
        </section>
      )}
    </div>
  )
}

export default AddBeerProposal
