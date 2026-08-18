import React, { useState } from 'react'

const questions = [
  ['both_rated_product', 'Have both players rated this beer?'],
  ['both_rated_producer', 'Have both players rated this brewery?'],
  ['both_rated_style', 'Have both players rated this exact style?'],
  ['current_player_rated_product', 'Have I rated this beer?']
]

export default function BrewDoneItQuestion({ busy, onAsk }) {
  const [predicate, setPredicate] = useState('')
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (predicate) onAsk(predicate) }}>
      <h3 className="text-lg font-semibold text-gray-900">Ask a controlled question</h3>
      <label className="mt-3 block text-sm font-medium text-gray-800">Question
        <select required value={predicate} onChange={(event) => setPredicate(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="">Choose a question</option>
          {questions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <button disabled={busy} className="mt-3 rounded-lg border border-amber-700 px-4 py-2 font-semibold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60">Ask question</button>
    </form>
  )
}