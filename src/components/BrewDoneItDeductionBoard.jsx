import React, { useMemo, useState } from 'react'
import BrewDoneItBeerPicker from './BrewDoneItBeerPicker.jsx'

const selectClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500'
const buttonClass = 'rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60'
const answers = ['yes', 'no', 'unknown']

const labelFor = (deduction) => {
  const names = {
    brewery_country: 'Country', brewery_state: 'State', brewery_previously_rated: 'Previously rated brewery',
    style: 'Style', abv_at_least: 'ABV at least', abv_below: 'ABV below', ibu_at_least: 'IBU at least',
    ibu_below: 'IBU below', collaboration: 'Collaboration', dark: 'Dark', barrel_aged: 'Barrel aged'
  }
  const value = deduction.value_text || deduction.numeric_value || ''
  return `${names[deduction.dimension] || deduction.dimension}${value !== '' ? `: ${value}` : ''}`
}

export default function BrewDoneItDeductionBoard({
  round,
  options = { breweries: [], styles: [] },
  deductions = [],
  busy,
  historySharing,
  onHistorySharing,
  onSaveDeduction,
  onOutcome,
  onComplete
}) {
  const [side, setSide] = useState('brewery')
  const [stateValue, setStateValue] = useState('')
  const [countryValue, setCountryValue] = useState('')
  const [styleValue, setStyleValue] = useState('')
  const [abvValue, setAbvValue] = useState('6')
  const [ibuValue, setIbuValue] = useState('40')
  const [breweryGuess, setBreweryGuess] = useState('')
  const [styleGuess, setStyleGuess] = useState('')
  const [beerGuess, setBeerGuess] = useState('')

  const breweryDeductions = deductions.filter((item) => item.dimension.startsWith('brewery_'))
  const beerDeductions = deductions.filter((item) => !item.dimension.startsWith('brewery_'))
  const states = useMemo(() => [...new Set(options.breweries.map((item) => item.stateAcronym || item.state).filter(Boolean))].sort(), [options.breweries])
  const countries = useMemo(() => [...new Set(options.breweries.map((item) => item.country).filter(Boolean))].sort(), [options.breweries])

  const filteredBreweries = useMemo(() => options.breweries.filter((brewery) => breweryDeductions.every((item) => {
    if (item.answer === 'unknown') return true
    let matches = true
    if (item.dimension === 'brewery_state') matches = [brewery.stateAcronym, brewery.state].includes(item.value_text)
    if (item.dimension === 'brewery_country') matches = brewery.country === item.value_text
    if (item.dimension === 'brewery_previously_rated') matches = Boolean(brewery.previouslyRated)
    return item.answer === 'yes' ? matches : !matches
  })), [breweryDeductions, options.breweries])

  const filteredStyles = useMemo(() => options.styles.filter((style) => beerDeductions.every((item) => {
    if (item.dimension !== 'style' || item.answer === 'unknown') return true
    const matches = String(style.id) === String(item.reference_id)
    return item.answer === 'yes' ? matches : !matches
  })), [beerDeductions, options.styles])

  const save = (dimension, answer, values = {}) => onSaveDeduction({ dimension, answer, ...values })
  const progress = [
    ['Brewery', round?.brewery_correct],
    ['Exact beer', round?.beer_correct],
    ['Style fallback', round?.style_correct]
  ]

  return (
    <section className="space-y-5" aria-labelledby="deduction-board-heading">
      <div>
        <h3 id="deduction-board-heading" className="text-xl font-semibold text-gray-900">Deduction board</h3>
        <p className="mt-1 text-sm text-gray-600">Ask the other player natural yes/no questions. Record useful answers here so your board persists across sessions and devices. Questions themselves do not cost points.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Deduction card side">
        {['brewery', 'beer'].map((value) => (
          <button key={value} type="button" role="tab" aria-selected={side === value} onClick={() => setSide(value)}
            className={`rounded-full px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${side === value ? 'bg-amber-700 text-white' : 'border border-gray-300 bg-white text-gray-800'}`}>
            {value === 'brewery' ? `Brewery · ${filteredBreweries.length} candidates` : `Beer / style · ${filteredStyles.length} style candidates`}
          </button>
        ))}
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <input type="checkbox" checked={historySharing} disabled={busy} onChange={(event) => onHistorySharing(event.target.checked)} className="mt-1" />
        <span><strong>Use my Pourfolio rating history for clues.</strong> This lets the selector see aggregate counts and averages for the hidden brewery, style and beer.</span>
      </label>

      {side === 'brewery' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h4 className="font-semibold text-gray-900">Record brewery clues</h4>
            <form onSubmit={(event) => { event.preventDefault(); if (stateValue) save('brewery_state', 'yes', { valueText: stateValue }) }}>
              <label className="text-sm font-medium text-gray-800">State answered “Yes”
                <select value={stateValue} onChange={(event) => setStateValue(event.target.value)} className={selectClass}><option value="">Choose state</option>{states.map((state) => <option key={state}>{state}</option>)}</select>
              </label>
              <button disabled={busy || !stateValue} className={`${buttonClass} mt-2`}>Add state clue</button>
            </form>
            <form onSubmit={(event) => { event.preventDefault(); if (countryValue) save('brewery_country', 'yes', { valueText: countryValue }) }}>
              <label className="text-sm font-medium text-gray-800">Country answered “Yes”
                <select value={countryValue} onChange={(event) => setCountryValue(event.target.value)} className={selectClass}><option value="">Choose country</option>{countries.map((country) => <option key={country}>{country}</option>)}</select>
              </label>
              <button disabled={busy || !countryValue} className={`${buttonClass} mt-2`}>Add country clue</button>
            </form>
            <div>
              <p className="text-sm font-medium text-gray-800">Have I rated beer from this brewery before?</p>
              <div className="mt-2 flex gap-2">{answers.map((answer) => <button key={answer} type="button" disabled={busy} onClick={() => save('brewery_previously_rated', answer)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium capitalize">{answer}</button>)}</div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h4 className="font-semibold text-gray-900">Formal brewery guess</h4>
            <p className="mt-1 text-sm text-gray-600">Correct brewery: 4 points. Incorrect formal guesses reduce the final score by one point.</p>
            <select value={breweryGuess} onChange={(event) => setBreweryGuess(event.target.value)} className={selectClass}><option value="">Choose brewery</option>{filteredBreweries.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
            <button type="button" disabled={busy || !breweryGuess || round?.brewery_correct} onClick={() => onOutcome('brewery', breweryGuess)} className={`${buttonClass} mt-3`}>{round?.brewery_correct ? 'Brewery solved' : 'Submit brewery guess'}</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h4 className="font-semibold text-gray-900">Record beer / style clues</h4>
            <form onSubmit={(event) => { event.preventDefault(); if (styleValue) save('style', 'yes', { referenceId: styleValue, valueText: options.styles.find((item) => String(item.id) === String(styleValue))?.name }) }}>
              <label className="text-sm font-medium text-gray-800">Style answered “Yes”
                <select value={styleValue} onChange={(event) => setStyleValue(event.target.value)} className={selectClass}><option value="">Choose style</option>{options.styles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
              </label>
              <button disabled={busy || !styleValue} className={`${buttonClass} mt-2`}>Add style clue</button>
            </form>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-gray-800">ABV at least<select value={abvValue} onChange={(event) => setAbvValue(event.target.value)} className={selectClass}>{[4,5,6,7,8,10].map((value) => <option key={value} value={value}>{value}%</option>)}</select></label>
              <label className="text-sm font-medium text-gray-800">IBU at least<select value={ibuValue} onChange={(event) => setIbuValue(event.target.value)} className={selectClass}>{[20,40,60,80].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </div>
            <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => save('abv_at_least', 'yes', { numericValue: Number(abvValue) })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium">Add ABV clue</button><button type="button" disabled={busy} onClick={() => save('ibu_at_least', 'yes', { numericValue: Number(ibuValue) })} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium">Add IBU clue</button></div>
            {['collaboration', 'dark', 'barrel_aged'].map((dimension) => <div key={dimension}><p className="text-sm font-medium capitalize text-gray-800">{dimension.replace('_', ' ')}?</p><div className="mt-1 flex gap-2">{answers.map((answer) => <button type="button" key={answer} disabled={busy} onClick={() => save(dimension, answer)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium capitalize">{answer}</button>)}</div></div>)}
          </div>

          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
            <div><h4 className="font-semibold text-gray-900">Exact beer guess</h4><p className="mt-1 text-sm text-gray-600">Exact beer is worth 6 points and also confirms the brewery.</p><div className="mt-3"><BrewDoneItBeerPicker id="brew-outcome-beer" value={beerGuess} onChange={setBeerGuess} disabled={busy} /></div><button type="button" disabled={busy || !beerGuess || round?.beer_correct} onClick={() => onOutcome('beer', beerGuess)} className={`${buttonClass} mt-3`}>{round?.beer_correct ? 'Beer solved' : 'Submit beer guess'}</button></div>
            <div className="border-t border-gray-200 pt-4"><h4 className="font-semibold text-gray-900">Style fallback</h4><p className="mt-1 text-sm text-gray-600">If the exact beer is not practical to solve, the correct style is worth 3 points instead.</p><select value={styleGuess} onChange={(event) => setStyleGuess(event.target.value)} className={selectClass}><option value="">Choose style</option>{filteredStyles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button type="button" disabled={busy || !styleGuess || round?.style_correct || round?.beer_correct} onClick={() => onOutcome('style', styleGuess)} className={`${buttonClass} mt-3`}>{round?.style_correct ? 'Style solved' : 'Submit style guess'}</button></div>
          </div>
        </div>
      )}

      {deductions.length > 0 && <div className="rounded-xl border border-gray-200 bg-white p-5"><h4 className="font-semibold text-gray-900">Saved deductions</h4><ul className="mt-3 grid gap-2 sm:grid-cols-2">{deductions.map((item) => <li key={item.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm"><strong>{labelFor(item)}</strong> — <span className="capitalize">{item.answer}</span></li>)}</ul></div>}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap gap-2">{progress.map(([label, done]) => <span key={label} className={`rounded-full px-3 py-1 text-sm font-semibold ${done ? 'bg-green-100 text-green-900' : 'bg-white text-gray-700'}`}>{label}: {done ? 'solved' : 'open'}</span>)}</div>
        <p className="mt-3 text-sm text-amber-950">Incorrect formal guesses: {round?.incorrect_formal_guess_count ?? round?.incorrect_guess_count ?? 0}. Finish whenever you want to bank the brewery + exact beer/style result achieved so far.</p>
        <button type="button" disabled={busy} onClick={onComplete} className={`${buttonClass} mt-3`}>Finish round and score</button>
      </div>
    </section>
  )
}
