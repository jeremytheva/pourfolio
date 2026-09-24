import React from 'react'

const Field = ({ label, value, unavailable = false }) => (
  <div className="rounded-lg bg-white p-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 font-semibold text-gray-900">{unavailable ? 'Not yet available' : value ?? 'Not recorded'}</dd>
  </div>
)

const History = ({ title, value = {} }) => (
  <div className="rounded-lg border border-blue-100 bg-white p-3">
    <h4 className="font-semibold text-gray-900">{title}</h4>
    {value.available === false ? (
      <p className="mt-1 text-sm text-gray-700">Unavailable because this catalogue relationship is unresolved.</p>
    ) : (
      <>
        <p className="mt-1 text-sm text-gray-700">{value.distinctBeerCount || 0} beers · {value.ratingCount || 0} ratings</p>
        <p className="text-sm text-gray-700">Average: {value.averageWeighted ?? 'No valid scored ratings'}</p>
        {value.lastRatedAt && <p className="text-xs text-gray-500">Last rated: {new Date(value.lastRatedAt).toLocaleDateString()}</p>}
      </>
    )}
  </div>
)

const yesNoUnknown = (value) => value === true ? 'Yes' : value === false ? 'No' : 'Unknown'

const GameMasterGuide = () => (
  <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="game-master-heading">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Selector · Game Master</p>
        <h3 id="game-master-heading" className="mt-1 text-lg font-semibold text-amber-950">Keep the mystery fair</h3>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900">Answer sheet is private</span>
    </div>
    <p className="mt-2 text-sm text-amber-950">Use the facts below while the guesser asks natural yes/no questions. Do not reveal the beer, brewery or style unless the round has ended.</p>
    <ol className="mt-3 grid gap-2 text-sm text-amber-950 sm:grid-cols-3">
      <li className="rounded-lg bg-white p-3"><strong>1. Check the fact.</strong><br />Use the answer sheet before responding.</li>
      <li className="rounded-lg bg-white p-3"><strong>2. Answer only what is known.</strong><br />Say “unknown” when Pourfolio cannot govern the fact.</li>
      <li className="rounded-lg bg-white p-3"><strong>3. Let the guesser record it.</strong><br />Their deduction board and formal submissions remain separate.</li>
    </ol>
  </aside>
)

export default function BrewDoneItSelectorSheet({ clues, loading = false }) {
  if (loading) return <div className="rounded-lg bg-blue-50 p-4 text-blue-950" role="status">Loading private Game Master answer sheet…</div>
  if (!clues) return <div className="rounded-lg bg-blue-50 p-4 text-blue-950">Your beer is locked in. The private Game Master answer sheet will appear here so you can answer the other player’s questions without revealing the secret.</div>

  const geographyAvailable = Boolean(clues.capabilities?.geography)
  const breweryOutcomeAvailable = Boolean(clues.brewery?.id && clues.brewery?.name)
  const styleOutcomeAvailable = Boolean(clues.style?.id)

  return (
    <div className="space-y-5">
      <GameMasterGuide />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="selector-brewery-heading">
          <h3 id="selector-brewery-heading" className="text-lg font-semibold text-gray-900">Brewery facts</h3>
          <p className="mt-1 text-sm text-gray-600">Use these for brewery and location questions.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Brewery" value={clues.brewery?.name} />
            <Field label="State" value={clues.brewery?.stateAcronym || clues.brewery?.state} unavailable={!geographyAvailable} />
            <Field label="Country" value={clues.brewery?.country} unavailable={!geographyAvailable} />
            <Field label="Suburb" value={clues.brewery?.suburb} unavailable={!geographyAvailable} />
          </dl>
          {!breweryOutcomeAvailable && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="note">
              <strong>This beer has no governed brewery relationship.</strong> You may answer brewery questions manually if you know the answer, but Pourfolio cannot validate a formal brewery guess from this catalogue record. An exact-beer result can still be scored.
            </p>
          )}
          {!geographyAvailable && (
            <p className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600" role="note">
              Pourfolio does not yet have governed canonical brewery geography. Answer location questions manually if you know the brewery; the game will not infer a state or country from free-text address data.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5" aria-labelledby="selector-beer-heading">
          <h3 id="selector-beer-heading" className="text-lg font-semibold text-gray-900">Beer & style facts</h3>
          <p className="mt-1 text-sm text-gray-600">Use these for beer, style and characteristic questions.</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Beer" value={clues.beer?.name} />
            <Field label="Style" value={clues.style?.name || clues.beer?.declaredCategory} />
            <Field label="ABV" value={clues.beer?.abv === null || clues.beer?.abv === undefined ? null : `${clues.beer.abv}%`} />
            <Field label="IBU" value={clues.beer?.ibu} />
            <Field label="Collaboration" value={yesNoUnknown(clues.beer?.collaboration)} />
            <Field label="Edition" value={clues.beer?.edition} />
            <Field label="Dark" value={clues.traits?.dark === 'unknown' ? 'Answer manually' : clues.traits?.dark} />
            <Field label="Barrel aged" value={clues.traits?.barrelAged === 'unknown' ? 'Answer manually' : clues.traits?.barrelAged} />
          </dl>
          {!styleOutcomeAvailable && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950" role="note">
              <strong>This beer has no governed canonical style relationship.</strong> You may answer style questions manually, but Pourfolio cannot validate the scored style-fallback result for this catalogue record. Exact-beer scoring remains available.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5" aria-labelledby="selector-history-heading">
        <h3 id="selector-history-heading" className="font-semibold text-blue-950">Guesser history clues</h3>
        <p className="mt-1 text-sm text-blue-900">These clues are shown only when the guesser has chosen to share the approved rating-history aggregates.</p>
        {!clues.history?.enabled ? (
          <p className="mt-2 text-sm text-blue-900">History-based clues are off for this player.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <History title="This brewery" value={clues.history.brewery} />
            <History title="This style" value={clues.history.style} />
            <History title="This exact beer" value={clues.history.exactBeer} />
          </div>
        )}
      </section>
    </div>
  )
}
