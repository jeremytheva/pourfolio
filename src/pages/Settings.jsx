import React, { useEffect, useState } from 'react'
import { FiAlertTriangle, FiCheck, FiRotateCcw, FiSettings } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'
import { getSettings, resetSettings, saveSettings, validateWeights } from '../utils/settingsManager.js'

const ATTRIBUTE_LABELS = Object.freeze({
  appearance: 'Appearance',
  aroma: 'Aroma',
  mouthfeel: 'Mouthfeel',
  flavour: 'Flavour',
  follow: 'Follow',
  bonus: 'Bonus'
})

function Settings() {
  const [settings, setSettings] = useState(() => getSettings())
  const [weights, setWeights] = useState(settings.ratingWeights)
  const [status, setStatus] = useState('')
  const validation = validateWeights(weights)
  const changed = JSON.stringify(weights) !== JSON.stringify(settings.ratingWeights)

  useEffect(() => {
    if (!status) return undefined
    const timer = window.setTimeout(() => setStatus(''), 3000)
    return () => window.clearTimeout(timer)
  }, [status])

  const setWeight = (key, value) => {
    const number = Number(value)
    setWeights((current) => ({
      ...current,
      [key]: Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0
    }))
  }

  const save = () => {
    if (!validation.isValid) {
      setStatus('invalid')
      return
    }
    const next = { ...settings, ratingWeights: weights }
    if (!saveSettings(next)) {
      setStatus('error')
      return
    }
    setSettings(next)
    setStatus('saved')
  }

  const reset = () => {
    if (!window.confirm('Reset your beer rating weights to the Pourfolio defaults?')) return
    const next = resetSettings()
    setSettings(next)
    setWeights(next.ratingWeights)
    setStatus('reset')
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="rating-settings-heading">
        <header className="mb-8 flex items-start gap-3">
          <SafeIcon icon={FiSettings} className="mt-1 h-8 w-8 text-amber-700" />
          <div>
            <h1 id="rating-settings-heading" className="text-3xl font-bold text-gray-900">Rating settings</h1>
            <p className="mt-1 text-gray-600">Personalise how each scored attribute contributes to your final Pourfolio score.</p>
          </div>
        </header>

        {status && (
          <div className={`mb-6 rounded-lg border p-4 text-sm ${status === 'saved' || status === 'reset' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`} role="status" aria-live="polite">
            {status === 'saved' && 'Rating weights saved.'}
            {status === 'reset' && 'Rating weights reset to the Pourfolio defaults.'}
            {status === 'invalid' && 'Weights must total 1.00 and each weight must be between 0 and 1.'}
            {status === 'error' && 'Rating settings could not be saved.'}
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-gray-900">Score weighting</h2>
          <p className="mt-2 text-sm text-gray-600">
            The six scored attributes must total 1.00. A weight of 0 removes that attribute from your weighted score and makes it optional when you rate a beer.
          </p>

          <div className="mt-6 space-y-4">
            {Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => (
              <div key={key} className="rounded-xl border border-gray-200 p-4 sm:flex sm:items-center sm:gap-5">
                <div className="min-w-40 flex-1">
                  <label htmlFor={`weight-${key}`} className="font-medium text-gray-900">{label}</label>
                  <p className="mt-1 text-xs text-gray-500">{weights[key] === 0 ? 'Optional — excluded from your score' : `${Math.round(weights[key] * 100)}% of your score`}</p>
                </div>
                <div className="mt-3 flex items-center gap-3 sm:mt-0">
                  <input
                    id={`weight-${key}`}
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[key]}
                    onChange={(event) => setWeight(key, event.target.value)}
                    className="w-36 accent-amber-700"
                    aria-valuetext={`${Math.round(weights[key] * 100)} percent`}
                  />
                  <input
                    aria-label={`${label} weight`}
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={weights[key]}
                    onChange={(event) => setWeight(key, event.target.value)}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={`mt-5 rounded-lg border p-4 ${validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`} role="status" aria-live="polite">
            <div className="flex items-center gap-2">
              <SafeIcon icon={validation.isValid ? FiCheck : FiAlertTriangle} className={`h-5 w-5 ${validation.isValid ? 'text-green-700' : 'text-red-700'}`} />
              <strong className={validation.isValid ? 'text-green-900' : 'text-red-900'}>Total weight: {validation.sum.toFixed(2)} / 1.00</strong>
            </div>
            {!validation.isValid && <p className="mt-1 text-sm text-red-800">Adjust the weights until the total is exactly 1.00.</p>}
          </div>
        </div>

        <aside className="mt-8 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
          <h2 className="font-semibold">How the Pourfolio score works</h2>
          <p className="mt-2">Appearance, Aroma, Mouthfeel, Flavour and Follow are rated from 1–7. Bonus is rated from 0–2. Each value is normalised before your weighting is applied, producing a final score out of 5.</p>
          <p className="mt-2">Design and Burp are fun extra attributes. They never change the weighted score.</p>
          <p className="mt-2">The default weighting is Appearance 10%, Aroma 10%, Mouthfeel 20%, Flavour 25%, Follow 25% and Bonus 10%.</p>
        </aside>

        <div className="mt-8 flex flex-col gap-3 border-t border-gray-200 pt-6 sm:flex-row">
          <button type="button" onClick={save} disabled={!changed || !validation.isValid} className="inline-flex flex-1 items-center justify-center rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
            <SafeIcon icon={FiCheck} className="mr-2 h-5 w-5" />Save weights
          </button>
          <button type="button" onClick={reset} className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2">
            <SafeIcon icon={FiRotateCcw} className="mr-2 h-5 w-5" />Reset to defaults
          </button>
        </div>
      </section>
    </div>
  )
}

export default Settings
