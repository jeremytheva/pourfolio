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
    <p className="mt-1 text-sm text-gray-700">{value.distinctBeerCount || 0} beers · {value.ratingCount || 0} ratings</p>
    <p className="text-sm text-gray-700">Average: {value.averageWeighted ?? 'No valid scored ratings'}</p>
    {value.lastRatedAt && <p className="text-xs text-gray-500">Last rated: {new Date(value.lastRatedAt).toLocaleDateString()}</p>}
  </div>
)

const yesNoUnknown = (value) => value === true ? 'Yes' : value === false ? 'No' : 'Unknown'

export default function BrewDoneItSelectorSheet({ clues, loading = false }) {
  if (loading) return <div className="rounded-lg bg-blue-50 p-4 text-blue-950" role="status">Loading answer sheet…</div>
  if (!clues) return <div className="rounded-lg bg-blue-50 p-4 text-blue-950">Your beer is locked in. Use the answer sheet to respond to the other player’s yes/no questions.</div>

  const geographyAvailable = Boolean(clues.capabilities?.geography)

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-lg font-semibold text-gray-900">Brewery</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Brewery" value={clues.brewery?.name} />
            <Field label="State" value={clues.brewery?.stateAcronym || clues.brewery?.state} unavailable={!geographyAvailable} />
            <Field label="Country" value={clues.brewery?.country} unavailable={!geographyAvailable} />
            <Field label="Suburb" value={clues.brewery?.suburb} unavailable={!geographyAvailable} />
          </dl>
          {!geographyAvailable && (
            <p className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-600" role="note">
              Pourfolio does not yet have governed canonical brewery geography. Answer location questions manually if you know the brewery; the game will not infer a state or country from free-text address data.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-lg font-semibold text-gray-900">Beer / style</h3>
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
        </section>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="font-semibold text-blue-950">Player history clues</h3>
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
