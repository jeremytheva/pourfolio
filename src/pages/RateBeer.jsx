import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiArrowLeft, FiCheck, FiChevronLeft, FiChevronRight, FiRefreshCw } from 'react-icons/fi'
import { Link, useNavigate, useParams } from '../lib/router.jsx'
import SafeIcon from '../common/SafeIcon.jsx'
import { cellarService } from '../services/cellarService.js'
import { ratingService } from '../services/ratingService.js'
import { calculatePPP, canonicalRatingKey, ratingDimension } from '../lib/ratingFormulaV1.js'
import { calculateRatingTotals, createSubmissionId } from '../utils/ratingSubmission.js'
import { getSettings } from '../utils/settingsManager.js'

const SWIPE_THRESHOLD = 48

function RateBeer() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [formDefinition, setFormDefinition] = useState(null)
  const [scores, setScores] = useState({})
  const [bonusIds, setBonusIds] = useState([])
  const [cellarItems, setCellarItems] = useState([])
  const [cellarId, setCellarId] = useState('')
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [submissionId] = useState(() => createSubmissionId())
  const [weights] = useState(() => getSettings('beer').ratingWeights)
  const [step, setStep] = useState(0)
  const pointerStartXRef = useRef(null)
  const autoAdvanceTimerRef = useRef(null)
  const errorRef = useRef(null)
  const headingRef = useRef(null)
  const cardHeadingRef = useRef(null)
  const previousStepRef = useRef(0)
  const focusRatingAfterRetryRef = useRef(false)

  useEffect(() => {
    let active = true
    setStatus('loading')
    setError('')
    Promise.all([
      ratingService.getRatingForm(productId),
      cellarService.getCellarItems().catch(() => ({ items: [] }))
    ]).then(([form, cellarPayload]) => {
      if (!active) return
      setFormDefinition(form)
      setCellarItems((cellarPayload.items || []).filter((item) => String(item.product_id) === String(productId)))
      setScores({})
      setBonusIds([])
      setCellarId('')
      setStep(0)
      previousStepRef.current = 0
      setStatus('ready')
    }).catch((requestError) => {
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

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  useEffect(() => {
    if (status !== 'ready') return
    if (focusRatingAfterRetryRef.current) {
      focusRatingAfterRetryRef.current = false
      headingRef.current?.focus()
      return
    }
    if (previousStepRef.current !== step) cardHeadingRef.current?.focus()
    previousStepRef.current = step
  }, [step, status])

  const retryLoad = () => {
    focusRatingAfterRetryRef.current = true
    setReloadKey((value) => value + 1)
  }

  const attributes = formDefinition?.attributes || []
  const rows = useMemo(() => attributes.map((attribute) => {
    const key = canonicalRatingKey(attribute.attribute_name)
    const dimension = ratingDimension(key)
    const weight = dimension?.scored ? Number(weights[key] || 0) : 0
    return {
      attribute,
      key,
      dimension,
      weight,
      required: Boolean(dimension?.scored && weight > 0)
    }
  }).filter((row) => row.dimension), [attributes, weights])

  const preview = useMemo(() => {
    if (!formDefinition) return null
    try {
      return calculateRatingTotals(
        rows.filter(({ attribute }) => scores[attribute.id] !== undefined)
          .map(({ attribute }) => ({ attributeId: attribute.id, score: scores[attribute.id] })),
        attributes,
        weights
      )
    } catch {
      return null
    }
  }, [attributes, formDefinition, rows, scores, weights])

  const selectedCellar = cellarItems.find((item) => String(item.id) === String(cellarId)) || null
  const retailPPP = preview && selectedCellar ? calculatePPP(preview.total_weighted, selectedCellar.retail_price, selectedCellar.mls) : null
  const purchasedPPP = preview && selectedCellar ? calculatePPP(preview.total_weighted, selectedCellar.purchase_price, selectedCellar.mls) : null

  const hasBonusTags = (formDefinition?.bonusAttributes || []).length > 0
  const bonusTagStep = rows.length
  const reviewStep = rows.length + (hasBonusTags ? 1 : 0)
  const totalSteps = reviewStep + 1
  const currentRow = step < rows.length ? rows[step] : null
  const isBonusTagStep = hasBonusTags && step === bonusTagStep
  const isReview = step === reviewStep
  const canAdvance = !currentRow || !currentRow.required || scores[currentRow.attribute.id] !== undefined
  const submitting = status === 'submitting'

  const moveToStep = (next) => {
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current)
    setStep(Math.min(reviewStep, Math.max(0, next)))
  }

  const selectScore = (attributeId, value, autoAdvance = false) => {
    setScores((current) => ({ ...current, [attributeId]: Number(value) }))
    if (!autoAdvance) return
    if (autoAdvanceTimerRef.current) window.clearTimeout(autoAdvanceTimerRef.current)
    autoAdvanceTimerRef.current = window.setTimeout(() => setStep((current) => Math.min(reviewStep, current + 1)), 220)
  }

  const skipScore = (attributeId) => {
    setScores((current) => {
      const next = { ...current }
      delete next[attributeId]
      return next
    })
    moveToStep(step + 1)
  }

  const toggleBonusTag = (id) => {
    setBonusIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!preview) {
      const missing = rows.findIndex((row) => row.required && scores[row.attribute.id] === undefined)
      setError('Score every positively weighted attribute before submitting.')
      if (missing >= 0) setStep(missing)
      return
    }
    setStatus('submitting')
    try {
      await ratingService.submitRating({
        productId,
        submissionId,
        scores: rows.filter(({ attribute }) => scores[attribute.id] !== undefined)
          .map(({ attribute }) => ({ attributeId: attribute.id, score: scores[attribute.id] })),
        weights,
        bonusAttributeIds: bonusIds,
        cellarId: cellarId || null
      })
      navigate(`/products/${productId}`, { replace: true, state: { message: 'Rating submitted.' } })
    } catch (requestError) {
      setError(requestError.message || 'The rating could not be submitted.')
      setStatus('ready')
    }
  }

  const handlePointerUp = (event) => {
    if (pointerStartXRef.current === null) return
    const delta = event.clientX - pointerStartXRef.current
    pointerStartXRef.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (delta < 0 && step < reviewStep && canAdvance) moveToStep(step + 1)
    if (delta > 0 && step > 0) moveToStep(step - 1)
  }

  if (status === 'loading') return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-600" role="status">Loading rating form…</div>
  if (status === 'error' && !formDefinition) return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900 outline-none focus:ring-2 focus:ring-red-300">
        <h1 className="font-semibold">Rating form unavailable</h1><p className="mt-1">{error}</p>
        <button type="button" onClick={retryLoad} className="mt-4 inline-flex items-center rounded-lg bg-red-700 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2"><SafeIcon icon={FiRefreshCw} className="mr-2 h-4 w-4" />Try again</button>
      </div>
    </div>
  )

  const product = formDefinition.product
  const progress = Math.round(((step + 1) / totalSteps) * 100)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link to={`/products/${productId}`} className="mb-6 inline-flex items-center rounded text-sm font-medium text-gray-600 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"><SafeIcon icon={FiArrowLeft} className="mr-2 h-4 w-4" />Back to product</Link>
      <header className="mb-6"><p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Structured beer rating</p><h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">{product.product_name}</h1><p className="mt-1 text-gray-600">{product.producer?.producer_name || 'Producer not recorded'}</p></header>

      <div className="mb-6" aria-label={`Rating progress: step ${step + 1} of ${totalSteps}`}><div className="mb-2 flex justify-between text-sm text-gray-600"><span>Step {step + 1} of {totalSteps}</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden="true"><div className="h-full rounded-full bg-amber-600 transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div></div>
      {error && <div ref={errorRef} tabIndex={-1} className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 outline-none focus:ring-2 focus:ring-red-300" role="alert">{error}</div>}

      <form onSubmit={submit} aria-busy={submitting ? 'true' : 'false'}>
        <section role="group" aria-label="Rating attributes" className="min-h-[28rem] touch-pan-y rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" onPointerDown={(event) => { pointerStartXRef.current = event.clientX }} onPointerUp={handlePointerUp} onPointerCancel={() => { pointerStartXRef.current = null }}>
          {currentRow && (() => {
            const { attribute, dimension, weight, required } = currentRow
            const min = dimension.min ?? 1
            const options = Array.from({ length: dimension.max - min + 1 }, (_, index) => min + index)
            const optionGrid = options.length > 3 ? 'grid-cols-7' : options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
            return (
              <div>
                <p className="text-sm font-medium text-amber-700">{dimension.scored ? 'Scored attribute' : 'Fun extra'} · {step + 1} of {rows.length}</p>
                <h2 ref={cardHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 outline-none">{dimension.label}</h2>
                <p className="mt-2 text-sm text-gray-600">{dimension.scored ? (weight > 0 ? `Your weight: ${Math.round(weight * 100)}%` : 'Your weight is 0% — rate this only if you want to.') : 'This does not change your Pourfolio score.'}</p>
                <div className="mt-8 rounded-2xl bg-amber-50 p-5">
                  <div className="text-center" aria-live="polite" aria-atomic="true"><span className="text-sm font-medium text-amber-900">Selected score</span><div className="mt-1 text-5xl font-bold text-amber-950">{scores[attribute.id] ?? '—'} <span className="text-2xl font-medium text-amber-800">/ {dimension.max}</span></div></div>
                  <label htmlFor={`score-${attribute.id}`} className="mt-7 block text-sm font-semibold text-gray-800">{dimension.label} score</label>
                  <input id={`score-${attribute.id}`} type="range" min={min} max={dimension.max} step="1" value={scores[attribute.id] ?? min} onChange={(event) => selectScore(attribute.id, event.target.value)} onPointerUp={(event) => { event.stopPropagation(); selectScore(attribute.id, event.currentTarget.value, true) }} className="mt-4 w-full accent-amber-700" aria-valuetext={`${scores[attribute.id] ?? min} out of ${dimension.max}`} />
                  <div className={`mt-5 grid gap-2 ${optionGrid}`} aria-label={`${dimension.label} quick score selection`}>{options.map((score) => <button key={score} type="button" aria-pressed={scores[attribute.id] === score} aria-label={`${dimension.label}: ${score} out of ${dimension.max}`} onClick={() => selectScore(attribute.id, score, true)} className={`min-h-11 rounded-xl border text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 ${scores[attribute.id] === score ? 'border-amber-700 bg-amber-700 text-white' : 'border-gray-300 bg-white text-gray-800 hover:bg-amber-50'}`}>{score}</button>)}</div>
                </div>
                {!required && <button type="button" onClick={() => skipScore(attribute.id)} className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">{scores[attribute.id] === undefined ? 'Skip this attribute' : 'Clear and skip'}</button>}
              </div>
            )
          })()}

          {isBonusTagStep && <div><p className="text-sm font-medium text-amber-700">Optional</p><h2 ref={cardHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 outline-none">Bonus attributes</h2><p className="mt-2 text-gray-600">Record any descriptive bonus attributes that apply. These tags are separate from your scored Bonus value.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{formDefinition.bonusAttributes.map((bonus) => <label key={bonus.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-amber-700 focus-within:ring-offset-2"><input type="checkbox" checked={bonusIds.includes(String(bonus.id))} onChange={() => toggleBonusTag(String(bonus.id))} className="mt-1 h-5 w-5 accent-amber-600" /><span className="font-medium text-gray-800">{bonus.description}</span></label>)}</div></div>}

          {isReview && <div><p className="text-sm font-medium text-amber-700">Final check</p><h2 ref={cardHeadingRef} tabIndex={-1} className="mt-2 text-3xl font-bold text-gray-900 outline-none">Review your rating</h2><p className="mt-2 text-gray-600">Your personalised weights produce the final score out of 5. Design and Burp never affect that score.</p>
            <div className="mt-6 divide-y divide-gray-200 rounded-xl border border-gray-200">{rows.map(({ attribute, dimension, weight }, index) => <div key={attribute.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium text-gray-900">{dimension.label}</p><p className="text-xs text-gray-500">{dimension.scored ? `${Math.round(weight * 100)}% weight` : 'Fun extra'}</p></div><div className="flex items-center gap-3"><strong className="text-amber-800">{scores[attribute.id] === undefined ? 'Skipped' : `${scores[attribute.id]} / ${dimension.max}`}</strong><button type="button" onClick={() => moveToStep(index)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">Edit</button></div></div>)}</div>

            {cellarItems.length > 0 && <div className="mt-6"><label htmlFor="rating-cellar" className="block text-sm font-semibold text-gray-800">Price source for PPP (optional)</label><select id="rating-cellar" value={cellarId} onChange={(event) => setCellarId(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">No cellar purchase selected</option>{cellarItems.map((item) => <option key={item.id} value={item.id}>{item.mls ? `${item.mls} mL` : 'Unknown volume'} · purchased {item.purchase_price ? `$${item.purchase_price}` : 'price unavailable'} · retail {item.retail_price ? `$${item.retail_price}` : 'price unavailable'}</option>)}</select><p className="mt-1 text-xs text-gray-500">PPP is only calculated when a price and container volume are available.</p></div>}

            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status" aria-live="polite" aria-atomic="true"><h3 className="font-semibold text-amber-950">Rating preview</h3>{preview ? <dl className="mt-3 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-amber-800">Personalised score</dt><dd className="text-2xl font-bold text-amber-950">{preview.total_weighted.toFixed(2)} / 5</dd></div><div><dt className="text-sm text-amber-800">Score out of 100</dt><dd className="text-2xl font-bold text-amber-950">{preview.score_out_of_100.toFixed(2)}</dd></div><div><dt className="text-sm text-amber-800">Default-weight score</dt><dd className="text-xl font-semibold text-amber-950">{preview.total_unweighted === null ? 'Needs all default attributes' : `${preview.total_unweighted.toFixed(2)} / 5`}</dd></div><div><dt className="text-sm text-amber-800">Overall Scaled Score</dt><dd className="text-xl font-semibold text-amber-950">Calculated after submission</dd></div>{retailPPP !== null && <div><dt className="text-sm text-amber-800">Retail PPP</dt><dd className="text-xl font-semibold text-amber-950">{retailPPP.toFixed(2)}</dd></div>}{purchasedPPP !== null && <div><dt className="text-sm text-amber-800">Purchased PPP</dt><dd className="text-xl font-semibold text-amber-950">{purchasedPPP.toFixed(2)}</dd></div>}</dl> : <p className="mt-2 text-sm text-amber-900">Complete every positively weighted attribute to calculate your score.</p>}</section>
            <button type="submit" disabled={submitting || !preview} aria-busy={submitting} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-500"><SafeIcon icon={FiCheck} className="mr-2 h-5 w-5" />{submitting ? 'Submitting securely…' : 'Submit rating'}</button>
          </div>}
        </section>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => moveToStep(step - 1)} disabled={step === 0 || submitting} className="inline-flex min-w-28 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"><SafeIcon icon={FiChevronLeft} className="mr-1 h-5 w-5" />Back</button>
          {!isReview && <button type="button" onClick={() => moveToStep(step + 1)} disabled={!canAdvance || submitting} className="inline-flex min-w-28 items-center justify-center rounded-xl bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400">Next<SafeIcon icon={FiChevronRight} className="ml-1 h-5 w-5" /></button>}
        </div>
      </form>
    </div>
  )
}

export default RateBeer
