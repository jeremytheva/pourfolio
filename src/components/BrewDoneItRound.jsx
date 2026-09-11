import React from 'react'
import BrewDoneItRoundHistory from './BrewDoneItRoundHistory.jsx'

const button = 'rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60'

export default function BrewDoneItRound({ game, round, role, busy, options, onRefresh, onForfeit, children }) {
  const formalSubmissions = Number(round?.turn_sequence || 0)
  const maxTurns = Number(round?.max_turns || 20)
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="round-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Series {game.id} · Round {round.round_number}</p>
          <h2 id="round-heading" className="text-2xl font-bold text-gray-900">{role === 'selector' ? 'You chose the beer' : 'You are narrowing it down'}</h2>
          <p className="mt-1 text-gray-600">Formal submissions: {formalSubmissions} of {maxTurns}. Conversation and saved deductions are free.</p>
        </div>
        <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2" disabled={busy} onClick={onRefresh}>Refresh round</button>
      </div>
      <div className="mt-6">{children}</div>
      <BrewDoneItRoundHistory gameId={game.id} round={round} options={options} />
      {game.status === 'active' && round.status === 'guessing' && (
        <button type="button" className={`${button} mt-6 bg-red-700 hover:bg-red-800`} disabled={busy} onClick={onForfeit}>Forfeit round</button>
      )}
    </section>
  )
}
