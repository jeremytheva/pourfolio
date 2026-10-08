import React, { useEffect, useRef, useState } from 'react'
import { ratingService } from '../services/ratingService.js'
import { formatDate } from '../utils/dateFormatting.js'

function RatingBreakdown({ rating, publicProfileId = null }) {
  const [status, setStatus] = useState('idle')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const errorRef = useRef(null)
  const requestId = useRef(0)
  useEffect(() => {
    requestId.current += 1
    setStatus('idle'); setData(null); setError('')
    return () => { requestId.current += 1 }
  }, [rating.id, publicProfileId])
  useEffect(() => { if (status === 'error') errorRef.current?.focus() }, [status])
  const load = async () => {
    const current = ++requestId.current
    setStatus('loading'); setError('')
    try {
      const result = await ratingService.getBreakdown(rating.id, publicProfileId)
      if (requestId.current !== current) return
      setData(result); setStatus('ready')
    } catch (failure) {
      if (requestId.current !== current) return
      setError(failure.message || 'Rating details could not be loaded.'); setStatus('error')
    }
  }
  return <details className="mt-4 rounded-lg border border-gray-200 bg-white" onToggle={(event) => {
    if (event.currentTarget.open && status === 'idle') load()
  }}>
    <summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300" aria-label={`View rating breakdown from ${formatDate(rating.date_rated)}`}>View rating breakdown</summary>
    <div className="border-t border-gray-200 px-4 py-4">
      {status === 'loading' && <p role="status" className="text-sm text-gray-600">Loading recorded rating details…</p>}
      {status === 'error' && <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300"><p>{error}</p><button type="button" onClick={load} className="mt-3 rounded border border-red-300 px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-red-300">Retry rating details</button></div>}
      {status === 'ready' && data && <>
        {data.scores.length > 0 ? <dl className="grid gap-3 sm:grid-cols-2" aria-label="Recorded attribute scores">{data.scores.map((score, index) => <div key={`${score.name}-${index}`}><dt className="text-sm text-gray-600">{score.name}{!score.scored && <span className="ml-1 text-xs">(non-scoring extra)</span>}</dt><dd className="font-semibold text-gray-900">{score.score} / {score.scale}</dd></div>)}</dl> : <p className="text-sm text-gray-600">No component scores were recorded for this historical rating.</p>}
        {data.selected_attributes.length > 0 && <div className="mt-4"><h3 className="text-sm font-semibold text-gray-900">Selected tasting attributes</h3><ul className="mt-2 flex flex-wrap gap-2" aria-label="Recorded tasting attributes">{data.selected_attributes.map((attribute, index) => <li key={index} className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">{attribute.description}</li>)}</ul></div>}
        {data.incomplete && <p className="mt-3 text-sm text-gray-600">Some recorded details are unavailable.</p>}
        <dl className="mt-4 grid gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2"><div><dt className="text-sm text-gray-600">Stored standard score</dt><dd className="font-semibold">{rating.total_unweighted === null || rating.total_unweighted === undefined ? 'Not recorded' : `${rating.total_unweighted} / 5`}</dd></div><div><dt className="text-sm text-gray-600">Stored weighted score</dt><dd className="font-semibold">{rating.total_weighted} / 5</dd></div></dl>
        <p className="mt-3 text-xs text-gray-500">Recorded values are shown without reconstructing historical weightings.</p>
      </>}
    </div>
  </details>
}

export default RatingBreakdown
