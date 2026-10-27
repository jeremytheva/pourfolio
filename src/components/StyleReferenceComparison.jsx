import React, { useEffect, useId, useState } from 'react'
import { styleReferenceService } from '../services/styleReferenceService.js'
import { STYLE_METRICS, compareStyleMetric, exactMeasurement, styleComparisonScale } from '../lib/styleComparison.js'

const number = (value) => new Intl.NumberFormat('en-AU', { maximumFractionDigits: 6 }).format(value)
const rangeLabel = (metric) => metric.kind === 'variable' ? 'Varies by base style' : `${number(metric.min)}–${number(metric.max)} ${metric.unit}`
const statusLabel = (result, definition) => {
  if (result.status === 'within') return 'Within reference range'
  if (result.status === 'not_recorded') return 'Exact value not recorded'
  if (result.status === 'variable') return 'No fixed reference range'
  if (result.status === 'reference_unavailable') return 'Reference unavailable'
  return `${number(result.difference)} ${definition.key === 'abv' ? 'percentage points' : 'IBU'} ${result.status} reference range`
}

function ReferencePanel({ category, product }) {
  const headingId = useId(), selectId = useId()
  const [payload, setPayload] = useState(null)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  useEffect(() => {
    let active = true
    setPayload(null); setError(false); setSelectedId('')
    styleReferenceService.getForCategory(category.id, category.category_name)
      .then((result) => {
        if (!active) return
        setPayload(result); setSelectedId(result.references[0]?.id || '')
      })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [category.id, category.category_name, reload])
  const references = payload?.references || []
  const selected = references.find((reference) => reference.id === selectedId)

  return <section aria-labelledby={headingId} className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 id={headingId} className="text-xl font-semibold text-gray-900">{product ? 'Style reference comparison' : 'Style reference ranges'}</h2>
    <p className="mt-2 text-sm text-gray-600">{product ? 'Compare recorded specifications' : 'Reviewed reference ranges'} for {category.category_name}.</p>
    {!payload && !error && <p className="mt-4 text-sm text-gray-600" role="status">Loading style references…</p>}
    {error && <div className="mt-4" role="status">
      <p className="text-sm text-gray-700">Style references could not be loaded. The rest of this page is available.</p>
      <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400">Retry style references</button>
    </div>}
    {payload?.status === 'unmapped' && <p className="mt-4 text-sm text-gray-600">A verified guideline mapping is not available for this catalogue style yet.</p>}
    {selected && <>
      {references.length > 1 ? <div className="mt-5 max-w-md">
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-800">Style guideline</label>
        <select id={selectId} value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400">
          {references.map((reference) => <option key={reference.id} value={reference.id}>{reference.guide.label}</option>)}
        </select>
      </div> : <p className="mt-4 text-sm font-medium text-gray-900">{selected.guide.label}</p>}
      <p className="mt-3 text-sm font-medium text-gray-900">{selected.name}</p>
      <p className="mt-1 text-xs text-gray-600">{selected.code ? `${selected.code} · ` : ''}Checked {selected.verifiedAt}</p>
      <div className="mt-5 space-y-6" aria-live="polite" aria-atomic="true">
        {STYLE_METRICS.map((definition) => {
          const metric = selected.metrics[definition.key]
          const result = compareStyleMetric(product?.[definition.key], metric, definition)
          const scale = styleComparisonScale(exactMeasurement(product?.[definition.key], definition.max), references, definition.key)
          return <div key={definition.key}>
            <h3 className="font-semibold text-gray-900">{definition.label}</h3>
            <dl className={`mt-2 grid gap-3 text-sm ${product ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div><dt className="text-gray-600">Reference range</dt><dd className="mt-1 font-medium text-gray-900">{rangeLabel(metric)}</dd></div>
              {product && <div><dt className="text-gray-600">Recorded specification</dt><dd className="mt-1 font-medium text-gray-900">{result.value === null ? 'Not recorded as an exact value' : `${number(result.value)} ${definition.unit}`}</dd></div>}
            </dl>
            {metric.kind === 'range' && scale && <div className="mt-4" aria-hidden="true">
              <div className="relative h-3 rounded bg-gray-100">
                <span className="absolute inset-y-0 rounded bg-amber-200" style={{ left: `${scale.position(metric.min)}%`, width: `${scale.position(metric.max) - scale.position(metric.min)}%` }} />
                {product && result.value !== null && <span className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded bg-gray-900" style={{ left: `${scale.position(result.value)}%` }} />}
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-600"><span>{number(scale.min)}</span><span>{number(scale.max)} {definition.unit}</span></div>
            </div>}
            {product && <p className="mt-2 text-sm text-gray-700">{statusLabel(result, definition)}</p>}
          </div>
        })}
      </div>
      {product && <p className="mt-5 text-xs text-gray-600">Product source: catalogue. Measurement method and batch verification are not recorded. IBU describes a specification; perceived bitterness can differ.</p>}
      <p className="mt-4 text-xs text-gray-600">{selected.guide.attribution} <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-amber-400">View source guidelines<span className="sr-only"> (opens a new tab)</span></a></p>
    </>}
  </section>
}

export default function StyleReferenceComparison({ category, product = null }) {
  if (!category?.id || !category?.category_name) return <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
    <h2 className="text-xl font-semibold text-gray-900">Style reference comparison</h2>
    <p className="mt-2 text-sm text-gray-600">A verified catalogue style is needed before specifications can be compared.</p>
  </section>
  return <ReferencePanel key={`${category.id}:${category.category_name}`} category={category} product={product} />
}
