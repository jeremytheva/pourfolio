import React from 'react'
import { FiCheckCircle, FiClock, FiUsers } from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon.jsx'

const rules = [
  'Choose secret beers from the Pourfolio beer catalogue.',
  'Take turns asking a reviewed yes/no question or making a beer guess.',
  'Pass the device when prompted so each secret stays private.',
  'Finish on a correct guess or after the 20-turn limit.'
]

function BrewDoneIt() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-amber-900 px-6 py-8 text-white sm:px-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-200">Approved game format</p>
        <h1 className="mt-2 text-3xl font-bold">Brew Done It</h1>
        <p className="mt-3 max-w-2xl text-amber-50">
          A two-player beer guessing game for people sharing this device. It is not live or asynchronous multiplayer.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Game format">
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SafeIcon icon={FiUsers} className="h-6 w-6 text-amber-700" />
          <h2 className="mt-3 font-semibold text-gray-900">Two people, one device</h2>
          <p className="mt-1 text-sm text-gray-600">Play with any consenting adult present. No Drinking Buddy relationship or second account is needed.</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SafeIcon icon={FiCheckCircle} className="h-6 w-6 text-amber-700" />
          <h2 className="mt-3 font-semibold text-gray-900">Reviewed questions</h2>
          <p className="mt-1 text-sm text-gray-600">Questions come from a controlled bank and have yes or no answers. Typed questions are not supported.</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SafeIcon icon={FiClock} className="h-6 w-6 text-amber-700" />
          <h2 className="mt-3 font-semibold text-gray-900">Session only</h2>
          <p className="mt-1 text-sm text-gray-600">Future round details and statistics will clear on refresh or sign-out, not become social profile data.</p>
        </article>
      </section>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">How a round works</h2>
        <ol className="mt-4 space-y-3">
          {rules.map((rule, index) => (
            <li key={rule} className="flex gap-3 text-gray-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900" aria-hidden="true">{index + 1}</span>
              <span>{rule}</span>
            </li>
          ))}
        </ol>
      </section>

      <aside className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-blue-950" aria-labelledby="game-status">
        <h2 id="game-status" className="font-semibold">Gameplay is not enabled yet</h2>
        <p className="mt-1 text-sm">This page publishes the reviewed decision without simulating a round. Interactive play will arrive only after its catalogue, privacy, scoring, abandonment, rematch and accessibility criteria pass review.</p>
      </aside>
    </div>
  )
}

export default BrewDoneIt
