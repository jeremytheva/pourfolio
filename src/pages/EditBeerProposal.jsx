import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from '../lib/router.jsx'
import { beverageService } from '../services/beverageService.js'
import { buildCatalogueDuplicateCandidates } from '../services/catalogueProposalDuplicates.js'
import { producerService } from '../services/producerService.js'
import { styleService } from '../services/styleService.js'

const textValue = (value) => value === undefined || value === null ? '' : String(value)
const booleanValue = (value) => value === true || value === 1 || value === '1'
const normalise = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/gu, ' ')
const sameNumericValue = (left, right) => {
  if (left === '' && right === '') return true
  if (left === '' || right === '') return false
  return Number(left) === Number(right)
}
const displayValue = (value, fallback = 'Not recorded') => value === '' || value === null || value === undefined ? fallback : String(value)
const duplicateSignals = (duplicate) => [
  duplicate.exactName ? 'Exact name' : 'Similar name',
  duplicate.styleMatch ? 'Same style' : null,
  duplicate.editionMatch ? 'Same edition' : null,
  duplicate.editionConflict ? 'Different edition' : null
].filter(Boolean).join(' · ')

const productForm = (product) => ({
  product_name: textValue(product.product_name),
  producer_id: textValue(product.producer_id),
  product_category_id: textValue(product.product_category_id),
  abv: textValue(product.abv),
  ibu: textValue(product.ibu),
  edition: textValue(product.edition),
  collaboration: booleanValue(product.collaboration)
})

function EditBeerProposal() {
  const { productId } = useParams()
  const [product, setProduct] = useState(null)
  const [baseline, setBaseline] = useState(null)
  const [form, setForm] = useState(null)
  const [producers, setProducers] = useState([])
  const [styles, setStyles] = useState([])
  const [producerQuery, setProducerQuery] = useState('')
  const [styleQuery, setStyleQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [duplicateStatus, setDuplicateStatus] = useState('idle')

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')

    Promise.all([
      beverageService.getProduct(productId),
      producerService.listVerifiedProducers(),
      styleService.listVerifiedStyles()
    ])
      .then(([productPayload, producerRows, styleRows]) => {
        if (!active) return
        const initial = productForm(productPayload)
        setProduct(productPayload)
        setBaseline(initial)
        setForm(initial)
        setProducers(producerRows)
        setStyles(styleRows)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'This beer could not be prepared for correction.')
        setStatus('error')
      })

    return () => { active = false }
  }, [productId])

  const selectedProducer = useMemo(
    () => producers.find(({ producer }) => String(producer.id) === form?.producer_id)?.producer || null,
    [form?.producer_id, producers]
  )
  const selectedStyle = useMemo(
    () => styles.find(({ style }) => String(style.id) === form?.product_category_id)?.style || null,
    [form?.product_category_id, styles]
  )
  const filteredProducers = useMemo(() => {
    const query = normalise(producerQuery)
    if (!query) return producers
    return producers.filter(({ producer }) => (
      String(producer.id) === form?.producer_id || normalise(producer.producer_name).includes(query)
    ))
  }, [form?.producer_id, producerQuery, producers])
  const filteredStyles = useMemo(() => {
    const query = normalise(styleQuery)
    if (!query) return styles
    return styles.filter(({ style }) => (
      String(style.id) === form?.product_category_id || normalise(style.category_name).includes(query)
    ))
  }, [form?.product_category_id, styleQuery, styles])

  useEffect(() => {
    if (!form || !product) return undefined
    const name = form.product_name.trim()
    if (name.length < 2 || !form.producer_id) {
      setDuplicates([])
      setDuplicateStatus('idle')
      return undefined
    }

    let active = true
    setDuplicateStatus('loading')
    const timeout = window.setTimeout(() => {
      beverageService.getProducts({ search: name, page: 1, limit: 24 })
        .then((payload) => {
          if (!active) return
          setDuplicates(buildCatalogueDuplicateCandidates(payload.items, form, { excludeProductId: product.id }))
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
  }, [form?.product_name, form?.producer_id, form?.product_category_id, form?.edition, product])

  const changes = useMemo(() => {
    if (!product || !baseline || !form) return []
    const result = []
    const add = (key, label, before, after) => result.push({ key, label, before, after })

    if (form.product_name.trim() !== baseline.product_name.trim()) add('product_name', 'Beer name', baseline.product_name, form.product_name.trim())
    if (form.producer_id !== baseline.producer_id) add('producer_id', 'Brewery / producer', product.producer?.producer_name || 'Not recorded', selectedProducer?.producer_name || 'Not selected')
    if (form.product_category_id !== baseline.product_category_id) add('product_category_id', 'Beer style / category', product.category?.category_name || product.declared_category || 'Not recorded', selectedStyle?.category_name || 'Not selected')
    if (!sameNumericValue(form.abv, baseline.abv)) add('abv', 'ABV', displayValue(baseline.abv), displayValue(form.abv))
    if (!sameNumericValue(form.ibu, baseline.ibu)) add('ibu', 'IBU', displayValue(baseline.ibu), displayValue(form.ibu))
    if (form.edition.trim() !== baseline.edition.trim()) add('edition', 'Edition / vintage', displayValue(baseline.edition), displayValue(form.edition.trim()))
    if (form.collaboration !== baseline.collaboration) add('collaboration', 'Collaboration beer', baseline.collaboration ? 'Yes' : 'No', form.collaboration ? 'Yes' : 'No')
    return result
  }, [baseline, form, product, selectedProducer, selectedStyle])

  const setField = (field, value) => {
    setReviewing(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  const numericValue = (value) => value === '' ? null : Number(value)
  const abv = form ? numericValue(form.abv) : null
  const ibu = form ? numericValue(form.ibu) : null
  const valid = Boolean(form) && (
    form.product_name.trim().length >= 2 &&
    Boolean(selectedProducer) &&
    Boolean(selectedStyle) &&
    (abv === null || (Number.isFinite(abv) && abv >= 0 && abv <= 30)) &&
    (ibu === null || (Number.isFinite(ibu) && ibu >= 0 && ibu <= 200))
  )
  const duplicateCheckReady = duplicateStatus === 'ready'

  if (status === 'loading') return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600" role="status">Loading current beer and canonical relationships…</div>

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h1 className="text-lg font-semibold">Correction proposal unavailable</h1>
          <p className="mt-1">{error}</p>
          <Link to={`/products/${productId}`} className="mt-4 inline-block font-medium underline">Back to beer</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Catalogue stewardship</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Suggest a correction</h1>
        <p className="mt-2 text-gray-600">Propose corrected catalogue facts for {product.product_name}. The existing product identity stays fixed and no canonical record is changed directly.</p>
        <p className="mt-2 text-sm font-medium text-gray-700">Stable product ID: {product.id}</p>
      </header>

      <form className="mt-8 space-y-6" onSubmit={(event) => { event.preventDefault(); if (valid && changes.length > 0 && duplicateCheckReady) setReviewing(true) }}>
        <label className="block text-sm font-medium text-gray-700">Beer name
          <input required minLength={2} maxLength={160} value={form.product_name} onChange={(event) => setField('product_name', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
        </label>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Search breweries
            <input type="search" value={producerQuery} onChange={(event) => setProducerQuery(event.target.value)} aria-describedby="correction-producer-search-status" placeholder="Filter verified breweries" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          <p id="correction-producer-search-status" className="text-xs text-gray-500" role="status" aria-live="polite">{filteredProducers.length} of {producers.length} verified breweries shown.</p>
          <label className="block text-sm font-medium text-gray-700">Brewery / producer
            <select required value={form.producer_id} onChange={(event) => setField('producer_id', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
              <option value="">Select a verified brewery</option>
              {filteredProducers.map(({ producer }) => <option key={producer.id} value={String(producer.id)}>{producer.producer_name}</option>)}
            </select>
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Search beer styles
            <input type="search" value={styleQuery} onChange={(event) => setStyleQuery(event.target.value)} aria-describedby="correction-style-search-status" placeholder="Filter verified styles" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          <p id="correction-style-search-status" className="text-xs text-gray-500" role="status" aria-live="polite">{filteredStyles.length} of {styles.length} verified styles shown.</p>
          <label className="block text-sm font-medium text-gray-700">Beer style / category
            <select required value={form.product_category_id} onChange={(event) => setField('product_category_id', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
              <option value="">Select a verified style</option>
              {filteredStyles.map(({ style }) => <option key={style.id} value={String(style.id)}>{style.category_name}</option>)}
            </select>
          </label>
        </div>
        <p className="-mt-3 text-sm text-gray-600">The verified style relationship is the canonical correction control. Free-text declared category is not independently edited here, which avoids contradictory style values.</p>

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
        {form.collaboration && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The current verified launch contract has no canonical collaborator relationship. This correction can change only the existing collaboration flag; it does not invent participating brewery links.</p>}

        <section aria-labelledby="correction-duplicate-heading" className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 id="correction-duplicate-heading" className="font-semibold text-gray-900">Catalogue conflict check</h2>
          <p className="mt-1 text-sm text-gray-600" role="status" aria-live="polite">
            {duplicateStatus === 'idle' && 'A beer name and verified brewery are required before conflict checking can run.'}
            {duplicateStatus === 'loading' && 'Checking the catalogue…'}
            {duplicateStatus === 'error' && 'Conflict checking is temporarily unavailable. Review is blocked until the catalogue can be checked.'}
            {duplicateStatus === 'ready' && duplicates.length === 0 && 'No other likely same-brewery duplicate was found in the current search results.'}
            {duplicateStatus === 'ready' && duplicates.length > 0 && `${duplicates.length} possible conflicting product${duplicates.length === 1 ? '' : 's'} found.`}
          </p>
          {duplicates.length > 0 && <ul className="mt-3 space-y-2">{duplicates.map((duplicate) => (
            <li key={duplicate.product.id}>
              <Link to={`/products/${duplicate.product.id}`} className="font-medium text-amber-800 underline">{duplicate.product.product_name}</Link>
              <p className="mt-1 text-xs text-gray-600">{duplicateSignals(duplicate)}</p>
            </li>
          ))}</ul>}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!valid || changes.length === 0 || !duplicateCheckReady} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Review changes</button>
          <Link to={`/products/${product.id}`} className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
        </div>
        {valid && changes.length === 0 && <p className="text-sm text-gray-600" role="status">Change at least one catalogue field before reviewing a correction.</p>}
      </form>

      {reviewing && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="correction-review-heading">
          <h2 id="correction-review-heading" className="text-xl font-semibold text-gray-900">Review proposed corrections</h2>
          <p className="mt-1 text-sm text-gray-600">Product ID {product.id} remains unchanged. Only the differences below are part of this proposal.</p>
          <dl className="mt-5 space-y-4">
            {changes.map((change) => (
              <div key={change.key} className="rounded-lg border border-gray-200 p-4">
                <dt className="font-semibold text-gray-900">{change.label}</dt>
                <dd className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <span><span className="block text-xs uppercase tracking-wide text-gray-500">Current</span>{change.before}</span>
                  <span><span className="block text-xs uppercase tracking-wide text-gray-500">Proposed</span>{change.after}</span>
                </dd>
              </div>
            ))}
          </dl>
          <div id="correction-persistence-status" className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900" role="status">
            Moderated catalogue-proposal persistence is not yet provider-certified. This reviewed correction is not written to the canonical product and cannot alter existing ratings or cellar history.
          </div>
          <button type="button" disabled className="mt-4 rounded-lg bg-gray-300 px-4 py-2 font-semibold text-gray-600" aria-describedby="correction-persistence-status">Submit correction for moderation</button>
        </section>
      )}
    </div>
  )
}

export default EditBeerProposal