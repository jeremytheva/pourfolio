import React from 'react'

const describeState = (game, round, userId) => {
  if (game.status === 'waiting') return 'Waiting for the other player to accept'
  if (!round) return 'Series has no round yet'
  if (round.status === 'completed' || round.status === 'forfeited') {
    return String(round.guesser_participant_id) === String(userId)
      ? 'Your turn to choose the next beer'
      : 'Waiting for the other player to choose the next beer'
  }
  return String(round.guesser_participant_id) === String(userId)
    ? 'Your turn to guess'
    : 'Waiting for the other player to guess'
}

export default function BrewDoneItSeriesList({ series, userId, busy, onOpen }) {
  if (!series.length) return null

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="series-heading">
      <h2 id="series-heading" className="text-xl font-semibold text-gray-900">Your challenges</h2>
      <p className="mt-1 text-sm text-gray-600">Resume an existing challenge or series from this device.</p>
      <ul className="mt-4 divide-y divide-gray-200">
        {series.map(({ game, round, invitationCode }) => (
          <li className="py-4" key={game.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Series {game.id}{round ? ` · Round ${round.round_number}` : ''}</p>
                <p className="text-sm text-gray-600">{describeState(game, round, userId)}</p>
                {game.status === 'waiting' && invitationCode && (
                  <p className="mt-1 break-all font-mono text-xs text-gray-600">Game {game.id}: {invitationCode}</p>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onOpen(game.id, invitationCode)}
                className="rounded-lg border border-amber-700 px-4 py-2 font-semibold text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60"
              >
                Open series
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
