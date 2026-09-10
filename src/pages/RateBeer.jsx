import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowLeft, FiCheck, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi'
import { Link, useNavigate, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { ratingService } from '../services/ratingService.js'
import { calculateRatingTotals, createSubmissionId } from '../utils/ratingSubmission.js'

const scoreOptions = [1, 2, 3, 4, 5, 6, 7]
const SWIPE_THRESHOLD = 48

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
  const [step, setStep] = useState(0)
  const pointerStartXRef = useRef(null)
  const autoAdvanceTimerRef = useRef(null)
  const errorRef = useRef(null)
  const ratingHeadingRef = useRef(null)
  const cardHeadingRef = useRef(null)
  const focusRatingAfterRetryRef = useRef(false)

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
        setStep(0)
        setStatus('ready')
      })
      .catch((requestError) => {
        if (!active) return
        focusRatingAfterRetryRef.current = false
        setError(requestError.message || 'The rating form could not be loaded.')
        setStatus('error')
      })
    return () => {
      active = false
      if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current)
    }
  }, [productId, reloadKey])

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (status !== 'ready' || !focusRatingAfterRetryRef.current) return
    focusRatingAfterRetryRef.current = false
    ratingHeadingRef.current?.focus()
  }, [status])

  useEffect(() => {
    if (status === 'ready') cardHeadingRef.current?.focus()
  }, [step, status])

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

  const retryLoad = () => {
    focusRatingAfterRetryRef.current = true
    setReloadKey((value) => value + 1)
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (Object.keys(scores).length !== formDefinition.attributes.length) {
      setError('Score every applicable attribute before submitting.')
      setStep(0)
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
          <button type="button" onClick={retryLoad} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2">
            <SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const product = formDefinition.product
  const attributes = formDefinition.attributes
  const hasBonuses = formDefinition.bonusAttributes.length > 0
  const bonusStep = attributes.length
  const reviewStep = attributes.length + (hasBonuses ? 1 : 0)
  const totalSteps = reviewStep + 1
  const submitting = status === 'submitting'
  const currentAttribute = step < attributes.length ? attributes[step] : null
  const isReview = step === reviewStep
  const isBonusStep = hasBonuses && step === bonusStep

  const moveToStep = (nextStep) => {
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current)
    setStep(Math.min(reviewStep, Math.max(0, nextStep)))
  }

  const selectScore = (attributeId, score, { autoAdvance = false } = {}) => {
    setScores((current) => ({ ...current, [attributeId]: Number(score) }))
    if (autoAdvance) {
      if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current)
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        setStep((currentStep) => Math.min(reviewStep, currentStep + 1))
      }, 220)
    }
  }

  const toggleBonus = (bonusId) => {
    setBonusIds((current) => current.includes(bonusId)
      ? current.filter((id) => id !== bonusId)
      : [...current, bonusId])
  }

  const handlePointerDown = (event) => {
    pointerStartXRef.current = event.clientX
  }

  const handlePointerUp = (event) => {
    if (pointerStartXRef.current === null) return
    const delta = event.clientX - pointerStartXRef.current
    pointerStartXRef.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (delta < 0 && step < reviewStep) moveToStep(step + 1)
    if (delta > 0 && step > 0) moveToStep(step - 1)
  }

  const progressValue = Math.round(((step + 1) / totalSteps) * 100)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to={`/products/${productId}`} className="mb-6 inline-flex items-center rounded text-sm font-medium text-gray-600 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">
        <SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />
        Back to product
      </Link>

      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Structured beer rating</p>
        <h1 ref={ratingHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">{product.product_name}</h1>
        <p className="mt-1 text-gray-600">{product.producer?.producer_name || 'Producer not recorded'}</p>
      </header>

      <div className="mb-6" aria-label={`Rating progress: step ${step + 1} of ${totalSteps}`}>
        <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
          <span>Step {step + 1} of {totalSteps}</span>
          <span>{progressValue}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
          <div className="h-full rounded-full bg-amber-600 transition-[width] motion-reduce:transition-none" style={{ width: `${progressValue}%` }} />
        </div>
      </div>

      {error && (
        <div ref={errorRef} tabIndex={-1} className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} aria-busy={submitting}>
        <section
          className="min-h-[28rem] touch-pan-y rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => { pointerStartXRef.current = null }}
        >
          {currentAttribute && (
            <div>
              <p className="text-sm font-medium text-amber-700">Attribute {step + 1} of {attributes.length}</p>
              <h2 ref={cardHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 focus:outline-none">{currentAttribute.attribute_name}</h2>
              <p className="mt-2 text-sm text-gray-500">Weight {currentAttribute.weighting}. Choose a score from 1 to 7.</p>

              <div className="mt-10 rounded-2xl bg-amber-50 p-5 sm:p-6">
                <div className="text-center" aria-live="polite" aria-atomic="true">
                  <span className="text-sm font-medium text-amber-900">Selected score</span>
                  <div className="mt-1 text-5xl font-bold text-amber-950">{scores[currentAttribute.id] ?? '—'}<span className="text-2xl font-medium text-amber-800"> / 7</span></div>
                </div>

                <label htmlFor={`score-${currentAttribute.id}`} className="mt-8 block text-sm font-semibold text-gray-800">
                  {currentAttribute.attribute_name} score
                </label>
                <input
                  id={`score-${currentAttribute.id}`}
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={scores[currentAttribute.id] ?? 4}
                  aria-valuetext={`${scores[currentAttribute.id] ?? 4} out of 7`}
                  onChange={(event) => selectScore(currentAttribute.id, event.target.value)}
                  onPointerUp={(event) => {
                    event.stopPropagation()
                    if (scores[currentAttribute.id] !== undefined) selectScore(currentAttribute.id, scores[currentAttribute.id], { autoAdvance: true })
                  }}
                  onKeyUp={(event) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                      selectScore(currentAttribute.id, event.currentTarget.value)
                    }
                  }}
                  className="mt-4 w-full accent-amber-700"
                />

                <div className="mt-5 grid grid-cols-7 gap-2" aria-label="Quick score selection">
                  {scoreOptions.map((score) => {
                    const selected = scores[currentAttribute.id] === score
                    return (
                      <button
                        key={score}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`${score} out of 7`}
                        onClick={() => selectScore(currentAttribute.id, score, { autoAdvance: true })}
                        className={`min-h-11 rounded-xl border text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 ${selected ? 'border-amber-700 bg-amber-700 text-white' : 'border-gray-300 bg-white text-gray-800 hover:border-amber-400 hover:bg-amber-50'}`}
                      >
                        {score}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500" aria-hidden="true">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-gray-500">Select a score to advance automatically, or swipe between cards.</p>
            </div>
          )}

          {isBonusStep && (
            <div>
              <p className="text-sm font-medium text-amber-700">Optional</p>
              <h2 ref={cardHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 focus:outline-none">Bonus attributes</h2>
              <p className="mt-2 text-gray-600">Select any bonus attributes that apply, then continue to review.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {formDefinition.bonusAttributes.map((bonus) => (
                  <label key={bonus.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-amber-700 focus-within:ring-offset-2">
                    <input type="checkbox" checked={bonusIds.includes(String(bonus.id))} onChange={() => toggleBonus(String(bonus.id))} className="mt-1 h-5 w-5 accent-amber-600" />
                    <span>
                      <span className="block font-medium text-gray-800">{bonus.description}</span>
                      {bonus.point_value !== null && bonus.point_value !== undefined && <span className="text-sm text-gray-500">{bonus.point_value > 0 ? '+' : ''}{bonus.point_value}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {isReview && (
            <div>
              <p className="text-sm font-medium text-amber-700">Final check</p>
              <h2 ref={cardHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 focus:outline-none">Review your rating</h2>
              <p className="mt-2 text-gray-600">Check each attribute before submitting. You can edit any score without losing the rest.</p>

              <div className="mt-7 divide-y divide-gray-200 rounded-2xl border border-gray-200">
                {attributes.map((attribute, index) => (
                  <div key={attribute.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="font-medium text-gray-900">{attribute.attribute_name}</div>
                      <div className="text-sm text-gray-500">Weight {attribute.weighting}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <strong className="text-xl text-amber-800">{scores[attribute.id] ?? '—'} / 7</strong>
                      <button type="button" onClick={() => moveToStep(index)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">Edit</button>
                    </div>
                  </div>
                ))}
              </div>

              {hasBonuses && bonusIds.length > 0 && (
                <div className="mt-5 rounded-xl bg-gray-50 p-4">
                  <h3 className="font-semibold text-gray-900">Selected bonuses</h3>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {formDefinition.bonusAttributes.filter((bonus) => bonusIds.includes(String(bonus.id))).map((bonus) => (
                      <li key={bonus.id}>{bonus.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status" aria-live="polite" aria-atomic="true">
                <h3 className="font-semibold text-amber-950">Rating preview</h3>
                {preview ? (
                  <div className="mt-2 flex flex-wrap gap-6">
                    <p><span className="text-sm text-amber-800">Weighted</span><br /><strong className="text-2xl text-amber-950">{preview.total_weighted} / 7</strong></p>
                    <p><span className="text-sm text-amber-800">Unweighted</span><br /><strong className="text-2xl text-amber-950">{preview.total_unweighted} / 7</strong></p>
                  </div>
                ) : <p className="mt-1 text-sm text-amber-900">Every attribute needs a score before submission.</p>}
              </section>

              <button type="submit" disabled={submitting || !preview} aria-busy={submitting} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-500">
                <SafeIcon icon={FiCheck} className="mr-2 h-5 w-5" />
                {submitting ? 'Submitting securely…' : 'Submit rating'}
              </button>
            </div>
          )}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => moveToStep(step - 1)}
            disabled={step === 0 || submitting}
            className="inline-flex min-w-28 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SafeIcon icon={FiChevronLeft} className="mr-1 h-5 w-5" />
            Back
          </button>
          {!isReview && (
            <button
              type="button"
              onClick={() => moveToStep(step + 1)}
              disabled={(currentAttribute && scores[currentAttribute.id] === undefined) || submitting}
              className="inline-flex min-w-28 items-center justify-center rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              Next
              <SafeIcon icon={FiChevronRight} className="ml-1 h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default RateBeer
