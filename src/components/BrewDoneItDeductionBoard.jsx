import React, { useMemo, useState } from 'react'
import BrewDoneItBeerPicker from './BrewDoneItBeerPicker.jsx'
import { filterBrewDoneItBeers, filterBrewDoneItBreweries, filterBrewDoneItStyles } from '../utils/brewDoneItDeductionFilters.js'

const selectClass = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500'
const buttonClass = 'rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60'
const secondaryButtonClass = 'rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60'
const answerButton = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium capitalize hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60'
const answers = ['yes', 'no', 'unknown']
const MAX_VISIBLE_BREWERIES = 25

const AnswerButtons = ({ disabled, onAnswer }) => (
  <div className="mt-2 flex flex-wrap gap-2">
    {answers.map((answer) => (
      <button key={answer} type="button" disabled={disabled} onClick={() => onAnswer(answer)} className={answerButton}>{answer}</button>
    ))}
  </div>
)

const labelFor = (deduction, options) => {
  if (deduction.dimension === 'brewery_ruled_out') {
    const name = (options.breweries || []).find((item) => String(item.id) === String(deduction.reference_id))?.name
    return `Brewery ruled out: ${name || `#${deduction.reference_id}`}`
  }
  if (deduction.dimension === 'beer_ruled_out') {
    const name = (options.beers || []).find((item) => String(item.id) === String(deduction.reference_id))?.name
    return `Beer ruled out: ${name || `#${deduction.reference_id}`}`
  }

  const names = {
    brewery_country: 'Country',
    brewery_state: 'State',
    brewery_previously_rated: 'Previously rated brewery',
    style: 'Style',
    abv_at_least: 'ABV at least',
    abv_below: 'ABV below',
    ibu_at_least: 'IBU at least',
    ibu_below: 'IBU below',
    collaboration: 'Collaboration',
    dark: 'Dark',
    barrel_aged: 'Barrel aged'
  }
  const value = deduction.value_text || deduction.numeric_value || ''
  return `${names[deduction.dimension] || deduction.dimension}${value !== '' ? `: ${value}` : ''}`
}

const valuesForDeduction = (deduction) => ({
  ...(deduction.reference_id === null || deduction.reference_id === undefined ? {} : { referenceId: deduction.reference_id }),
  ...(deduction.value_text === null || deduction.value_text === undefined ? {} : { valueText: deduction.value_text }),
  ...(deduction.numeric_value === null || deduction.numeric_value === undefined ? {} : { numericValue: deduction.numeric_value })
})

const validNumber = (value, maximum) => value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= maximum
const matchesText = (value, query) => String(value || '').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())

export default function BrewDoneItDeductionBoard({
  round,
  options = { breweries: [], styles: [], beers: [], capabilities: {} },
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
  const [abvDimension, setAbvDimension] = useState('abv_at_least')
  const [abvValue, setAbvValue] = useState('6')
  const [ibuDimension, setIbuDimension] = useState('ibu_at_least')
  const [ibuValue, setIbuValue] = useState('40')
  const [breweryQuery, setBreweryQuery] = useState('')
  const [breweryGuess, setBreweryGuess] = useState('')
  const [styleGuess, setStyleGuess] = useState('')
  const [beerGuess, setBeerGuess] = useState('')
  const [ruledOutBeer, setRuledOutBeer] = useState('')

  const capabilities = options.capabilities || {}
  const geographyAvailable = Boolean(capabilities.geography)
  const breweryDeductions = deductions.filter((item) => item.dimension.startsWith('brewery_'))
  const beerDeductions = deductions.filter((item) => !item.dimension.startsWith('brewery_'))
  const states = useMemo(() => [...new Set((options.breweries || []).map((item) => item.stateAcronym || item.state).filter(Boolean))].sort(), [options.breweries])
  const countries = useMemo(() => [...new Set((options.breweries || []).map((item) => item.country).filter(Boolean))].sort(), [options.breweries])

  const filteredBreweries = useMemo(() => filterBrewDoneItBreweries(
    options.breweries || [],
    breweryDeductions,
    { geographyAvailable }
  ), [breweryDeductions, geographyAvailable, options.breweries])

  const visibleBreweries = useMemo(() => {
    if (!breweryQuery.trim()) return filteredBreweries
    return filteredBreweries.filter((brewery) => matchesText(brewery.name, breweryQuery))
  }, [breweryQuery, filteredBreweries])

  const knownBreweryIds = useMemo(
    () => new Set((options.breweries || []).map((brewery) => String(brewery.id))),
    [options.breweries]
  )
  const breweryIds = useMemo(() => new Set(filteredBreweries.map((brewery) => String(brewery.id))), [filteredBreweries])
  const filteredBeers = useMemo(() => filterBrewDoneItBeers(
    options.beers || [],
    beerDeductions,
    breweryIds,
    knownBreweryIds
  ), [beerDeductions, breweryIds, knownBreweryIds, options.beers])

  const filteredStyles = useMemo(() => filterBrewDoneItStyles(options.styles || [], filteredBeers), [filteredBeers, options.styles])
  const unresolvedProducerBeerCount = useMemo(
    () => filteredBeers.filter((beer) => !beer.producerId).length,
    [filteredBeers]
  )
  const onlyUnresolvedProducerBeersRemain = filteredBreweries.length === 0 && filteredBeers.length > 0 && unresolvedProducerBeerCount === filteredBeers.length
  const save = (dimension, answer, values = {}) => onSaveDeduction({ dimension, answer, ...values })
  const setUnknown = (deduction) => save(deduction.dimension, 'unknown', valuesForDeduction(deduction))
  const styleName = (styleId) => (options.styles || []).find((item) => String(item.id) === String(styleId))?.name || null
  const progress = [['Brewery', round?.brewery_correct], ['Exact beer', round?.beer_correct], ['Style fallback', round?.style_correct]]

  return (
    <section className="space-y-5" aria-labelledby="deduction-board-heading">
      <div>
        <h3 id="deduction-board-heading" className="text-xl font-semibold text-gray-900">Deduction board</h3>
        <p className="mt-1 text-sm text-gray-600">Ask natural yes/no questions. Record useful answers here so the board persists across sessions and devices. Unknown source data never eliminates a candidate, and questions themselves do not cost points.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Deduction card side">
        <button type="button" role="tab" aria-selected={side === 'brewery'} onClick={() => setSide('brewery')} className={`rounded-full px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${side === 'brewery' ? 'bg-amber-700 text-white' : 'border border-gray-300 bg-white text-gray-800'}`}>Brewery · {filteredBreweries.length} candidates</button>
        <button type="button" role="tab" aria-selected={side === 'beer'} onClick={() => setSide('beer')} className={`rounded-full px-4 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 ${side === 'beer' ? 'bg-amber-700 text-white' : 'border border-gray-300 bg-white text-gray-800'}`}>Beer / style · {filteredBeers.length} beer candidates</button>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <input type="checkbox" checked={historySharing} disabled={busy} onChange={(event) => onHistorySharing(event.target.checked)} className="mt-1" />
        <span><strong>Use my Pourfolio rating history for clues.</strong> The selector receives aggregate counts and averages for the hidden brewery, style and beer, not your raw rating history.</span>
      </label>

      {side === 'brewery' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h4 className="font-semibold text-gray-900">Record brewery clues</h4>
            {geographyAvailable ? (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-800">Is the brewery in this state?
                    <select value={stateValue} onChange={(event) => setStateValue(event.target.value)} className={selectClass}><option value="">Choose state</option>{states.map((state) => <option key={state}>{state}</option>)}</select>
                  </label>
                  <AnswerButtons disabled={busy || !stateValue} onAnswer={(answer) => save('brewery_state', answer, { valueText: stateValue })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-800">Is the brewery in this country?
                    <select value={countryValue} onChange={(event) => setCountryValue(event.target.value)} className={selectClass}><option value="">Choose country</option>{countries.map((country) => <option key={country}>{country}</option>)}</select>
                  </label>
                  <AnswerButtons disabled={busy || !countryValue} onAnswer={(answer) => save('brewery_country', answer, { valueText: countryValue })} />
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700" role="note">
                <strong>State/country filtering is not available yet.</strong> Pourfolio will add these deduction controls after canonical brewery geography is governed and certified; it will not infer location from free-text addresses.
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-800">Have I rated beer from this brewery before?</p>
              <AnswerButtons disabled={busy} onAnswer={(answer) => save('brewery_previously_rated', answer)} />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label htmlFor="brew-brewery-candidate-search" className="text-sm font-medium text-gray-800">Search remaining breweries</label>
              <input id="brew-brewery-candidate-search" type="search" value={breweryQuery} onChange={(event) => setBreweryQuery(event.target.value)} placeholder="Filter brewery candidates" className={selectClass} />
              <p className="mt-2 text-xs text-gray-600" role="status" aria-live="polite">{visibleBreweries.length} of {filteredBreweries.length} remaining breweries match this search.</p>

              {filteredBreweries.length === 0 ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" role="status">
                  <strong>No governed brewery candidates remain.</strong> {filteredBeers.length > 0 ? 'Some beers may still remain because their brewery attribution is unresolved; switch to Beer / style to continue.' : 'Review saved brewery clues and set an uncertain deduction back to Unknown.'}
                </div>
              ) : visibleBreweries.length === 0 ? (
                <p className="mt-3 text-sm text-gray-600">No remaining brewery matches this search.</p>
              ) : (
                <>
                  <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto" aria-label="Remaining brewery candidates">
                    {visibleBreweries.slice(0, MAX_VISIBLE_BREWERIES).map((brewery) => (
                      <li key={brewery.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                        <span className="font-medium text-gray-900">{brewery.name}</span>
                        <span className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy || round?.brewery_correct} onClick={() => setBreweryGuess(String(brewery.id))} className="rounded px-2 py-1 text-xs font-semibold text-amber-800 underline focus:outline-none focus:ring-2 focus:ring-amber-500">Select as guess</button>
                          <button type="button" disabled={busy} onClick={() => save('brewery_ruled_out', 'yes', { referenceId: brewery.id })} className="rounded px-2 py-1 text-xs font-semibold text-gray-700 underline focus:outline-none focus:ring-2 focus:ring-amber-500">Rule out</button>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {visibleBreweries.length > MAX_VISIBLE_BREWERIES && <p className="mt-2 text-xs text-gray-500">Showing the first {MAX_VISIBLE_BREWERIES}. Refine the search to see other remaining breweries.</p>}
                </>
              )}
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
          <div className="space-y-5 rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h4 className="font-semibold text-gray-900">Record beer / style clues</h4>
            <div><label className="text-sm font-medium text-gray-800">Is it this style?<select value={styleValue} onChange={(event) => setStyleValue(event.target.value)} className={selectClass}><option value="">Choose style</option>{(options.styles || []).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><AnswerButtons disabled={busy || !styleValue} onAnswer={(answer) => save('style', answer, { referenceId: styleValue, valueText: styleName(styleValue) })} /></div>
            <div>
              <p className="text-sm font-medium text-gray-800">ABV comparison</p>
              <div className="mt-1 grid gap-2 sm:grid-cols-[1fr_1fr]">
                <select aria-label="ABV comparison operator" value={abvDimension} onChange={(event) => setAbvDimension(event.target.value)} className={selectClass}>
                  <option value="abv_at_least">At least</option>
                  <option value="abv_below">Below</option>
                </select>
                <label className="sr-only" htmlFor="brew-abv-threshold">ABV threshold</label>
                <input id="brew-abv-threshold" type="number" min="0" max="100" step="0.1" inputMode="decimal" value={abvValue} onChange={(event) => setAbvValue(event.target.value)} className={selectClass} aria-describedby="brew-abv-help" />
              </div>
              <p id="brew-abv-help" className="mt-1 text-xs text-gray-500">Record the selector’s answer for any ABV threshold, including decimals.</p>
              <AnswerButtons disabled={busy || !validNumber(abvValue, 100)} onAnswer={(answer) => save(abvDimension, answer, { numericValue: Number(abvValue) })} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">IBU comparison</p>
              <div className="mt-1 grid gap-2 sm:grid-cols-[1fr_1fr]">
                <select aria-label="IBU comparison operator" value={ibuDimension} onChange={(event) => setIbuDimension(event.target.value)} className={selectClass}>
                  <option value="ibu_at_least">At least</option>
                  <option value="ibu_below">Below</option>
                </select>
                <label className="sr-only" htmlFor="brew-ibu-threshold">IBU threshold</label>
                <input id="brew-ibu-threshold" type="number" min="0" max="1000" step="1" inputMode="numeric" value={ibuValue} onChange={(event) => setIbuValue(event.target.value)} className={selectClass} aria-describedby="brew-ibu-help" />
              </div>
              <p id="brew-ibu-help" className="mt-1 text-xs text-gray-500">Use the threshold that matches the question you asked.</p>
              <AnswerButtons disabled={busy || !validNumber(ibuValue, 1000)} onAnswer={(answer) => save(ibuDimension, answer, { numericValue: Number(ibuValue) })} />
            </div>
            {['collaboration', 'dark', 'barrel_aged'].map((dimension) => (
              <div key={dimension}>
                <p className="text-sm font-medium capitalize text-gray-800">Is it {dimension.replace('_', ' ')}?</p>
                <AnswerButtons disabled={busy} onAnswer={(answer) => save(dimension, answer)} />
                {['dark', 'barrel_aged'].includes(dimension) && <p className="mt-1 text-xs text-gray-500">Recorded for your notes only until this trait is reliably available in the catalogue.</p>}
              </div>
            ))}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-800">Rule out a beer</p>
              <div className="mt-2"><BrewDoneItBeerPicker id="brew-rule-out-beer" value={ruledOutBeer} onChange={setRuledOutBeer} disabled={busy} candidates={filteredBeers} helpText="Search only the beers still remaining in your deduction field." /></div>
              <button type="button" disabled={busy || !ruledOutBeer} onClick={() => save('beer_ruled_out', 'yes', { referenceId: ruledOutBeer })} className={`${secondaryButtonClass} mt-3`}>Rule out beer</button>
            </div>
          </div>

          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
            <div>
              <h4 className="font-semibold text-gray-900">Current field</h4>
              <p className="mt-1 text-sm text-gray-600">Your supported catalogue deductions currently leave <strong>{filteredBeers.length}</strong> beers across <strong>{filteredStyles.length}</strong> styles. Beers with missing source facts remain candidates rather than being silently treated as “No”. Dark/barrel-aged notes do not auto-filter until that metadata is certified.</p>
              {onlyUnresolvedProducerBeersRemain && (
                <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950" role="status">
                  <strong>No governed brewery candidates remain.</strong> The {filteredBeers.length} remaining beer{filteredBeers.length === 1 ? '' : 's'} stay possible only because their brewery attribution is unresolved. Continue with beer/style clues or set a brewery deduction back to Unknown if the answer may have been recorded incorrectly.
                </p>
              )}
              {filteredBeers.length === 0 && (
                <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="alert">
                  <strong>No beer candidates match the saved deductions.</strong> Review the saved clues below and set a contradictory or uncertain deduction back to Unknown before continuing.
                </p>
              )}
            </div>
            <div className="border-t border-gray-200 pt-4"><h4 className="font-semibold text-gray-900">Exact beer guess</h4><p className="mt-1 text-sm text-gray-600">Exact beer is worth 6 points and also confirms the brewery.</p><div className="mt-3"><BrewDoneItBeerPicker id="brew-outcome-beer" value={beerGuess} onChange={setBeerGuess} disabled={busy} candidates={filteredBeers} helpText="Search only the beers still remaining in your deduction field." /></div><button type="button" disabled={busy || !beerGuess || round?.beer_correct} onClick={() => onOutcome('beer', beerGuess)} className={`${buttonClass} mt-3`}>{round?.beer_correct ? 'Beer solved' : 'Submit beer guess'}</button></div>
            <div className="border-t border-gray-200 pt-4"><h4 className="font-semibold text-gray-900">Style fallback</h4><p className="mt-1 text-sm text-gray-600">If the exact beer is not practical to solve, the correct style is worth 3 points instead.</p><select value={styleGuess} onChange={(event) => setStyleGuess(event.target.value)} className={selectClass}><option value="">Choose style</option>{filteredStyles.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><button type="button" disabled={busy || !styleGuess || round?.style_correct || round?.beer_correct} onClick={() => onOutcome('style', styleGuess)} className={`${buttonClass} mt-3`}>{round?.style_correct ? 'Style solved' : 'Submit style guess'}</button></div>
          </div>
        </div>
      )}

      {deductions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="font-semibold text-gray-900">Saved deductions</h4>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {deductions.map((item) => (
              <li key={item.id} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><strong>{labelFor(item, options)}</strong> — <span className="capitalize">{item.answer}</span></div>
                  {item.answer !== 'unknown' && !['brewery_country', 'brewery_state'].includes(item.dimension) && (
                    <button type="button" disabled={busy} onClick={() => setUnknown(item)} className="shrink-0 rounded px-2 py-1 text-xs font-semibold text-amber-800 underline focus:outline-none focus:ring-2 focus:ring-amber-500">Set unknown</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex flex-wrap gap-2">{progress.map(([label, done]) => <span key={label} className={`rounded-full px-3 py-1 text-sm font-semibold ${done ? 'bg-green-100 text-green-900' : 'bg-white text-gray-700'}`}>{label}: {done ? 'solved' : 'open'}</span>)}</div>
        <p className="mt-3 text-sm text-amber-950">Incorrect formal guesses: {round?.incorrect_formal_guess_count ?? round?.incorrect_guess_count ?? 0}. Finish whenever you want to bank the brewery + exact beer/style result achieved so far.</p>
        <button type="button" disabled={busy} onClick={onComplete} className={`${buttonClass} mt-3`}>Finish round and score</button>
      </div>
    </section>
  )
}
