import React from 'react'

const button = 'rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60'

export default function BrewDoneItRound({ game, round, role, busy, onRefresh, onForfeit, children }) {
  const turns = Number(round?.turn_sequence || 0)
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="round-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Game {game.id}</p>
          <h2 id="round-heading" className="text-2xl font-bold text-gray-900">{role === 'selector' ? 'You select the secret beer' : 'You make the guesses'}</h2>
          <p className="mt-1 text-gray-600">Turn {turns + 1} of {round?.max_turns || 6}</p>
        </div>
        <button type="button" className="rounded-lg border border-gray-300 px-4 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2" disabled={busy} onClick={onRefresh}>Refresh round</button>
      </div>
      <div className="mt-6">{children}</div>
      {game.status === 'active' && <button type="button" className={`${button} mt-6 bg-red-700 hover:bg-red-800`} disabled={busy} onClick={onForfeit}>Forfeit game</button>}
    </section>
  )
}
