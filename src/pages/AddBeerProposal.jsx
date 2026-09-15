import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from '../lib/router.jsx'
import { beverageService } from '../services/beverageService.js'
import { buildCatalogueDuplicateCandidates } from '../services/catalogueProposalDuplicates.js'
import { producerService } from '../services/producerService.js'
import { styleService } from '../services/styleService.js'

const normalise = (value) => String(value || '').trim().toLocaleLowerCase().replace(/\s+/gu, ' ')

function AddBeerProposal() {
  const location = useLocation()
  const navigate = useNavigate()
  const suggestedName = new URLSearchParams(location.search).get('name') || ''
  const [form, setForm] = useState({
    product_name: suggestedName,
    producer_id: '',
    product_category_id: '',
    abv: '',
    ibu: '',
    declared_category: '',
    edition: '',
    collaboration: false,
    product_image: ''
  })
  const [producerMode, setProducerMode] = useState('existing')
  const [newProducerName, setNewProducerName] = useState('')
  const [producers, setProducers] = useState([])
  const [styles, setStyles] = useState([])
  const [producerQuery, setProducerQuery] = useState('')
  const [styleQuery, setStyleQuery] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState([])
  const [duplicateStatus, setDuplicateStatus] = useState('idle')
  const [reviewing, setReviewing] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState('idle')
  const [submissionError, setSubmissionError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([producerService.listCanonicalProducers(), styleService.listVerifiedStyles()])
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
  const matchingProducerForNewName = useMemo(() => {
    const target = normalise(newProducerName)
    if (!target) return null
    return producers.find(({ producer }) => normalise(producer.producer_name) === target)?.producer || null
  }, [newProducerName, producers])
  const selectedStyle = useMemo(
    () => styles.find(({ style }) => String(style.id) === form.product_category_id)?.style || null,
    [form.product_category_id, styles]
  )
  const filteredProducers = useMemo(() => {
    const query = normalise(producerQuery)
    if (!query) return producers
    return producers.filter(({ producer }) => (
      String(producer.id) === form.producer_id || normalise(producer.producer_name).includes(query)
    ))
  }, [form.producer_id, producerQuery, producers])
  const filteredStyles = useMemo(() => {
    const query = normalise(styleQuery)
    if (!query) return styles
    return styles.filter(({ style }) => (
      String(style.id) === form.product_category_id || normalise(style.category_name).includes(query)
    ))
  }, [form.product_category_id, styleQuery, styles])

  const producerRelationshipId = producerMode === 'existing'
    ? form.producer_id
    : matchingProducerForNewName ? String(matchingProducerForNewName.id) : ''
  const producerReady = producerMode === 'existing'
    ? Boolean(selectedProducer)
    : newProducerName.trim().length >= 2

  useEffect(() => {
    const name = form.product_name.trim()
    if (name.length < 2 || !producerReady) {
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
          setDuplicates(producerRelationshipId
            ? buildCatalogueDuplicateCandidates(payload.items, { ...form, producer_id: producerRelationshipId })
            : [])
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
  }, [form, producerReady, producerRelationshipId])

  const setField = (field, value) => {
    setReviewing(false)
    setSubmissionError('')
    setForm((current) => ({ ...current, [field]: value }))
  }

  const setProducerChoice = (mode) => {
    setProducerMode(mode)
    setReviewing(false)
    setSubmissionError('')
  }

  const numericValue = (value) => value === '' ? null : Number(value)
  const abv = numericValue(form.abv)
  const ibu = numericValue(form.ibu)
  const valid = (
    form.product_name.trim().length >= 2 &&
    form.product_name.trim().length <= 255 &&
    producerReady &&
    Boolean(selectedStyle) &&
    (abv === null || (Number.isFinite(abv) && abv >= 0 && abv <= 80)) &&
    (ibu === null || (Number.isFinite(ibu) && ibu >= 0 && ibu <= 10000)) &&
    form.declared_category.trim().length <= 255 &&
    form.edition.trim().length <= 255 &&
    form.product_image.trim().length <= 255
  )
  const duplicateCheckReady = duplicateStatus === 'ready'

  const createProduct = async () => {
    if (!valid || !duplicateCheckReady || submissionStatus === 'submitting') return
    setSubmissionStatus('submitting')
    setSubmissionError('')
    try {
      const result = await beverageService.createProduct({
        product_name: form.product_name.trim(),
        product_category_id: form.product_category_id,
        ...(producerMode === 'existing'
          ? { producer_id: form.producer_id }
          : { new_producer: { producer_name: newProducerName.trim() } }),
        abv: form.abv === '' ? null : Number(form.abv),
        ibu: form.ibu === '' ? null : Number(form.ibu),
        declared_category: form.declared_category.trim() || null,
        edition: form.edition.trim() || null,
        collaboration: form.collaboration,
        product_image: form.product_image.trim() || null
      })
      setSubmissionStatus('complete')
      navigate(`/products/${result.product.id}`, { replace: true })
    } catch (requestError) {
      setSubmissionStatus('error')
      setSubmissionError(requestError.message || 'The beer could not be added. Review the details and try again.')
    }
  }

  if (status === 'loading') return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600" role="status">Loading canonical breweries and styles…</div>
  if (status === 'error') return <div className="mx-auto max-w-3xl px-4 py-16"><div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900"><h1 className="text-lg font-semibold">Add beer unavailable</h1><p className="mt-1">{error}</p></div></div>

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Catalogue</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Add a beer</h1>
        <p className="mt-2 text-gray-600">Link the beer to an existing brewery, or add the brewery when it is not yet available. Pourfolio verifies the canonical relationships before creating the product.</p>
      </header>

      <form className="mt-8 space-y-6" onSubmit={(event) => { event.preventDefault(); if (valid && duplicateCheckReady) setReviewing(true) }}>
        <label className="block text-sm font-medium text-gray-700">Beer name
          <input required minLength={2} maxLength={255} value={form.product_name} onChange={(event) => setField('product_name', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
        </label>

        <fieldset className="space-y-4 rounded-xl border border-gray-200 p-4">
          <legend className="px-1 text-sm font-semibold text-gray-900">Brewery / producer</legend>
          <div className="flex flex-wrap gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="producer-mode" value="existing" checked={producerMode === 'existing'} onChange={() => setProducerChoice('existing')} />
              Existing brewery
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="producer-mode" value="new" checked={producerMode === 'new'} onChange={() => setProducerChoice('new')} />
              Add a brewery
            </label>
          </div>

          {producerMode === 'existing' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search breweries
                <input type="search" value={producerQuery} onChange={(event) => setProducerQuery(event.target.value)} aria-describedby="producer-search-status" placeholder="Filter verified breweries" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </label>
              <p id="producer-search-status" className="text-xs text-gray-500" role="status" aria-live="polite">{filteredProducers.length} of {producers.length} verified breweries shown.</p>
              <label className="block text-sm font-medium text-gray-700">Select brewery
                <select required value={form.producer_id} onChange={(event) => setField('producer_id', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
                  <option value="">Select a verified brewery</option>
                  {filteredProducers.map(({ producer }) => <option key={producer.id} value={String(producer.id)}>{producer.producer_name}</option>)}
                </select>
              </label>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700">New brewery / producer name
                <input required minLength={2} maxLength={255} value={newProducerName} onChange={(event) => { setNewProducerName(event.target.value); setReviewing(false); setSubmissionError('') }} placeholder="Brewery name" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
              </label>
              <p className="mt-2 text-xs text-gray-500">Before creating a brewery, the server checks the producer table for an existing brewery with the same normalized name and reuses it when found.</p>
              {matchingProducerForNewName && <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">An existing brewery named <strong>{matchingProducerForNewName.producer_name}</strong> is already visible. It will be reused rather than duplicated.</p>}
            </div>
          )}
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Search beer styles
            <input type="search" value={styleQuery} onChange={(event) => setStyleQuery(event.target.value)} aria-describedby="style-search-status" placeholder="Filter verified styles" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          <p id="style-search-status" className="text-xs text-gray-500" role="status" aria-live="polite">{filteredStyles.length} of {styles.length} verified styles shown.</p>
          <label className="block text-sm font-medium text-gray-700">Beer style / category
            <select required value={form.product_category_id} onChange={(event) => setField('product_category_id', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
              <option value="">Select a verified style</option>
              {filteredStyles.map(({ style }) => <option key={style.id} value={String(style.id)}>{style.category_name}</option>)}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">Declared category / style on the beer
          <input maxLength={255} value={form.declared_category} onChange={(event) => setField('declared_category', event.target.value)} placeholder="Optional brewery-declared style" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-gray-700">ABV %
            <input type="number" min="0" max="80" step="0.01" inputMode="decimal" value={form.abv} onChange={(event) => setField('abv', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium text-gray-700">IBU
            <input type="number" min="0" max="10000" step="1" inputMode="numeric" value={form.ibu} onChange={(event) => setField('ibu', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-700">Edition / vintage
          <input maxLength={255} value={form.edition} onChange={(event) => setField('edition', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>

        <label className="block text-sm font-medium text-gray-700">Product image URL
          <input type="url" maxLength={255} value={form.product_image} onChange={(event) => setField('product_image', event.target.value)} placeholder="https://…" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
          <span className="mt-1 block text-xs font-normal text-gray-500">Optional. HTTPS URLs only.</span>
        </label>

        <label className="flex items-center gap-3 text-sm font-medium text-gray-700">
          <input type="checkbox" checked={form.collaboration} onChange={(event) => setField('collaboration', event.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          Collaboration beer
        </label>
        {form.collaboration && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">The current products table has one primary <code>producer_id</code> plus the collaboration flag. The primary brewery is linked here; additional collaborator relationships need a separate canonical relationship model.</p>}

        <section aria-labelledby="duplicate-heading" className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h2 id="duplicate-heading" className="font-semibold text-gray-900">Possible duplicates</h2>
          <p className="mt-1 text-sm text-gray-600" role="status" aria-live="polite">
            {duplicateStatus === 'idle' && 'Enter a beer name and brewery to check the current catalogue.'}
            {duplicateStatus === 'loading' && 'Checking the catalogue…'}
            {duplicateStatus === 'error' && 'Duplicate checking is temporarily unavailable. Creation is blocked until this check can run.'}
            {duplicateStatus === 'ready' && duplicates.length === 0 && 'No likely duplicate was found in the current search results. The server performs an exact duplicate check again before creation.'}
            {duplicateStatus === 'ready' && duplicates.length > 0 && `${duplicates.length} possible duplicate${duplicates.length === 1 ? '' : 's'} found. Compare the signals below before continuing.`}
          </p>
          {duplicates.length > 0 && <ul className="mt-3 space-y-3">{duplicates.map(({ product, exactName, styleMatch, editionMatch, editionConflict }) => <li key={product.id} className="rounded-lg border border-gray-200 bg-white p-3"><Link to={`/products/${product.id}`} className="font-medium text-amber-800 underline">{product.product_name}</Link><p className="mt-1 text-xs text-gray-600">Same brewery · {exactName ? 'same name' : 'similar name'}{styleMatch ? ' · same style' : ''}{editionMatch ? ' · same edition' : ''}{editionConflict ? ' · different edition' : ''}</p></li>)}</ul>}
        </section>

        <button type="submit" disabled={!valid || !duplicateCheckReady} className="rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Review beer</button>
      </form>

      {reviewing && (
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-xl font-semibold text-gray-900">Review beer</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-gray-500">Beer</dt><dd className="font-medium text-gray-900">{form.product_name.trim()}</dd></div>
            <div><dt className="text-gray-500">Brewery</dt><dd className="font-medium text-gray-900">{producerMode === 'existing' ? selectedProducer?.producer_name : newProducerName.trim()}</dd></div>
            <div><dt className="text-gray-500">Style</dt><dd className="font-medium text-gray-900">{selectedStyle?.category_name}</dd></div>
            <div><dt className="text-gray-500">Declared category</dt><dd>{form.declared_category.trim() || 'Not specified'}</dd></div>
            <div><dt className="text-gray-500">ABV</dt><dd>{form.abv || 'Unknown'}</dd></div>
            <div><dt className="text-gray-500">IBU</dt><dd>{form.ibu || 'Unknown'}</dd></div>
            <div><dt className="text-gray-500">Edition</dt><dd>{form.edition.trim() || 'None specified'}</dd></div>
            <div><dt className="text-gray-500">Collaboration</dt><dd>{form.collaboration ? 'Yes' : 'No'}</dd></div>
          </dl>
          {submissionError && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">{submissionError}</div>}
          <button type="button" onClick={createProduct} disabled={submissionStatus === 'submitting'} className="mt-5 rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {submissionStatus === 'submitting' ? 'Adding beer…' : 'Add beer to catalogue'}
          </button>
          <p className="mt-2 text-sm text-gray-600">The server verifies the selected style and brewery relationship, reuses an existing producer with the same name where applicable, and records your authenticated account as the creator.</p>
        </section>
      )}
    </div>
  )
}

export default AddBeerProposal
