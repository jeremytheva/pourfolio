import React, { useEffect, useMemo, useState } from 'react'
import { beverageService } from '../services/beverageService.js'

const optionLabel = (product) => `${product.product_name}${product.producer?.producer_name ? ` — ${product.producer.producer_name}` : ''}`
const normaliseCandidate = (product) => ({
  ...product,
  product_name: product?.product_name || product?.name || '',
  producer: product?.producer || (product?.producerName ? { producer_name: product.producerName } : null)
})
const matchesQuery = (product, query) => optionLabel(product).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())

export default function BrewDoneItBeerPicker({
  id,
  label = 'Beer',
  value,
  onChange,
  initialProductId = '',
  disabled = false,
  required = true,
  helpText = 'Search the Pourfolio catalogue by beer name.',
  candidates = null
}) {
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState([])
  const [initialProduct, setInitialProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const normalisedInitialId = initialProductId === null || initialProductId === undefined ? '' : String(initialProductId)
  const candidateMode = Array.isArray(candidates)
  const normalisedCandidates = useMemo(
    () => candidateMode ? candidates.map(normaliseCandidate).filter((product) => product.id && product.product_name) : [],
    [candidateMode, candidates]
  )

  useEffect(() => {
    if (candidateMode && value && !normalisedCandidates.some((product) => String(product.id) === String(value))) {
      onChange('')
    }
  }, [candidateMode, normalisedCandidates, onChange, value])

  useEffect(() => {
    if (candidateMode || !normalisedInitialId) {
      setInitialProduct(null)
      return undefined
    }
    let active = true
    beverageService.getProduct(normalisedInitialId)
      .then((product) => {
        if (active) setInitialProduct(product)
      })
      .catch(() => {
        if (active) setInitialProduct(null)
      })
    return () => { active = false }
  }, [candidateMode, normalisedInitialId])

  useEffect(() => {
    if (candidateMode) {
      setProducts([])
      setError('')
      setStatus('ready')
      return undefined
    }

    let active = true
    const timer = window.setTimeout(() => {
      setStatus('loading')
      setError('')
      beverageService.getProducts({ search: query, page: 1, limit: 24 })
        .then((payload) => {
          if (!active) return
          setProducts(Array.isArray(payload.items) ? payload.items : [])
          setStatus('ready')
        })
        .catch(() => {
          if (!active) return
          setProducts([])
          setStatus('error')
          setError('Catalogue choices could not be loaded. Refine the search or try again.')
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [candidateMode, query])

  const options = useMemo(() => {
    const byId = new Map()
    if (candidateMode) {
      const selected = normalisedCandidates.find((product) => String(product.id) === String(value))
      if (selected) byId.set(String(selected.id), selected)
      for (const product of normalisedCandidates) {
        if (!query.trim() || matchesQuery(product, query)) byId.set(String(product.id), product)
      }
      return [...byId.values()]
    }

    if (initialProduct?.id) byId.set(String(initialProduct.id), initialProduct)
    for (const product of products) byId.set(String(product.id), product)
    return [...byId.values()]
  }, [candidateMode, initialProduct, normalisedCandidates, products, query, value])

  const selectedProduct = options.find((product) => String(product.id) === String(value)) || null
  const searchId = `${id}-search`
  const selectId = `${id}-select`
  const helpId = `${id}-help`
  const statusId = `${id}-status`

  return (
    <div>
      <label htmlFor={searchId} className="block text-sm font-medium text-gray-800">Search {label.toLowerCase()}
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={disabled}
          placeholder="Start typing a beer name"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
        />
      </label>
      <p id={helpId} className="mt-1 text-xs text-gray-600">{helpText}</p>
      <label htmlFor={selectId} className="mt-3 block text-sm font-medium text-gray-800">{label}
        <select
          id={selectId}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || status === 'loading'}
          aria-describedby={`${helpId} ${statusId}`}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
        >
          <option value="">{status === 'loading' ? 'Loading beers…' : candidateMode && normalisedCandidates.length === 0 ? 'No remaining beer candidates' : 'Choose a beer'}</option>
          {options.map((product) => <option value={product.id} key={product.id}>{optionLabel(product)}</option>)}
        </select>
      </label>
      <div id={statusId} className="mt-2 text-xs text-gray-600" role="status" aria-live="polite">
        {error || (selectedProduct
          ? `Selected: ${optionLabel(selectedProduct)}`
          : status === 'ready'
            ? candidateMode
              ? `${options.length} of ${normalisedCandidates.length} remaining candidate${normalisedCandidates.length === 1 ? '' : 's'} shown.`
              : `${options.length} catalogue choices shown.`
            : '')}
      </div>
    </div>
  )
}
