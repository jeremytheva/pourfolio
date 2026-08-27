import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowLeft, FiCheck, FiRefreshCw } from 'react-icons/fi'
import { Link, useNavigate, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { ratingService } from '../services/ratingService.js'
import { calculateRatingTotals, createSubmissionId } from '../utils/ratingSubmission.js'

const scoreOptions = [1, 2, 3, 4, 5, 6, 7]

function RateBeer() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [formDefinition, setFormDefinition] = useState(null)
  const [scores, setScores] = useState({})
  const [bonusIds, setBonusIds] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [submissionId] = useState(() => createSubmissionId())
  const errorRef = useRef(null)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    ratingService.getRatingForm(productId)
      .then((payload) => {
        if (!active) return
        setFormDefinition(payload)
        setScores({})
        setBonusIds([])
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError.message || 'The rating form could not be loaded.')
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [productId, reloadKey])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const preview = useMemo(() => {
    if (!formDefinition || Object.keys(scores).length !== formDefinition.attributes.length) return null
    try {
      return calculateRatingTotals(
        formDefinition.attributes.map((attribute) => ({
          attributeId: attribute.id,
          score: scores[attribute.id]
        })),
        formDefinition.attributes
      )
    } catch {
      return null
    }
  }, [formDefinition, scores])

  const toggleBonus = (bonusId) => {
    setBonusIds((current) => current.includes(bonusId)
      ? current.filter((id) => id !== bonusId)
      : [...current, bonusId])
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (Object.keys(scores).length !== formDefinition.attributes.length) {
      setError('Score every applicable attribute before submitting.')
      return
    }

    setStatus('submitting')
    try {
      await ratingService.submitRating({
        productId,
        submissionId,
        scores: formDefinition.attributes.map((attribute) => ({
          attributeId: attribute.id,
          score: scores[attribute.id]
        })),
        bonusAttributeIds: bonusIds
      })
      navigate(`/products/${productId}`, {
        replace: true,
        state: { message: 'Rating submitted.' }
      })
    } catch (requestError) {
      setError(requestError.message || 'The rating could not be submitted.')
      setStatus('ready')
    }
  }

  if (status === 'loading') {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600" role="status">Loading rating form…</div>
  }

  if (status === 'error' && !formDefinition) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div ref={errorRef} tabIndex={-1} className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2" role="alert">
          <h1 className="font-semibold">Rating form unavailable</h1>
          <p className="mt-1">{error}</p>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const product = formDefinition.product
  const submitting = status === 'submitting'

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to={`/products/${productId}`} className="mb-6 inline-flex items-center rounded text-sm font-medium text-gray-600 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">
        <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
        Back to product
      </Link>

      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Structured beer rating</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">{product.product_name}</h1>
        <p className="mt-1 text-gray-600">{product.producer?.producer_name || 'Producer not recorded'}</p>
      </header>

      {error && (
        <div ref={errorRef} tabIndex={-1} className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-8" aria-busy={submitting}>
        <fieldset className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-describedby="rating-required-help">
          <legend className="px-2 text-xl font-semibold text-gray-900">Applicable attributes</legend>
          <p id="rating-required-help" className="mb-6 text-sm text-gray-600">Every attribute is required. A score of 1 is valid and is not treated as missing.</p>
          <div className="space-y-5">
            {formDefinition.attributes.map((attribute) => (
              <div key={attribute.id} className="grid items-center gap-2 sm:grid-cols-[1fr_10rem]">
                <label htmlFor={`score-${attribute.id}`} className="font-medium text-gray-800">
                  {attribute.attribute_name}
                  <span id={`score-${attribute.id}-weight`} className="ml-2 text-xs font-normal text-gray-500">Weight {attribute.weighting}</span>
                </label>
                <select
                  id={`score-${attribute.id}`}
                  required
                  aria-describedby={`score-${attribute.id}-weight rating-required-help`}
                  value={scores[attribute.id] ?? ''}
                  onChange={(event) => setScores((current) => ({
                    ...current,
                    [attribute.id]: Number(event.target.value)
                  }))}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                >
                  <option value="" disabled>Select 1–7</option>
                  {scoreOptions.map((score) => <option key={score} value={score}>{score}</option>)}
                </select>
              </div>
            ))}
          </div>
        </fieldset>

        {formDefinition.bonusAttributes.length > 0 && (
          <fieldset className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <legend className="px-2 text-xl font-semibold text-gray-900">Optional bonus attributes</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {formDefinition.bonusAttributes.map((bonus) => (
                <label key={bonus.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-amber-700 focus-within:ring-offset-2">
                  <input type="checkbox" checked={bonusIds.includes(String(bonus.id))} onChange={() => toggleBonus(String(bonus.id))} className="mt-1 h-4 w-4 accent-amber-600" />
                  <span>
                    <span className="block text-sm font-medium text-gray-800">{bonus.description}</span>
                    {bonus.point_value !== null && bonus.point_value !== undefined && <span className="text-xs text-gray-500">{bonus.point_value > 0 ? '+' : ''}{bonus.point_value}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6" role="status" aria-live="polite" aria-atomic="true">
          <h2 className="font-semibold text-amber-950">Rating preview</h2>
          {preview ? (
            <div className="mt-2 flex flex-wrap gap-6">
              <p><span className="text-sm text-amber-800">Weighted</span><br /><strong className="text-2xl text-amber-950">{preview.total_weighted} / 7</strong></p>
              <p><span className="text-sm text-amber-800">Unweighted</span><br /><strong className="text-2xl text-amber-950">{preview.total_unweighted} / 7</strong></p>
            </div>
          ) : <p className="mt-1 text-sm text-amber-900">Complete every attribute to calculate the preview.</p>}
        </section>

        <button type="submit" disabled={submitting} aria-busy={submitting} className="inline-flex w-full items-center justify-center rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-500">
          <SafeIcon icon={FiCheck} className="mr-2 h-5 w-5" />
          {submitting ? 'Submitting securely…' : 'Submit rating'}
        </button>
      </form>
    </div>
  )
}

export default RateBeer