import React from 'react'
import BrewDoneItInvitationShare from './BrewDoneItInvitationShare.jsx'

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

const actionState = (game, round, userId) => {
  if (game.status === 'waiting') return { label: 'Invitation pending', tone: 'bg-amber-100 text-amber-900' }
  if (!round) return { label: 'Waiting', tone: 'bg-gray-100 text-gray-700' }
  const terminal = round.status === 'completed' || round.status === 'forfeited'
  const yourTurn = terminal
    ? String(round.guesser_participant_id) === String(userId)
    : String(round.guesser_participant_id) === String(userId)
  return yourTurn
    ? { label: 'Your turn', tone: 'bg-green-100 text-green-900' }
    : { label: 'Waiting', tone: 'bg-blue-100 text-blue-900' }
}

export default function BrewDoneItSeriesList({ series, userId, busy, onOpen }) {
  if (!series.length) return null

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="series-heading">
      <h2 id="series-heading" className="text-xl font-semibold text-gray-900">Your challenges</h2>
      <p className="mt-1 text-sm text-gray-600">Resume an existing challenge or series from this device. Your turn and waiting states persist between sessions.</p>
      <ul className="mt-4 divide-y divide-gray-200">
        {series.map(({ game, round, invitationCode }) => {
          const state = actionState(game, round, userId)
          return (
            <li className="py-4" key={game.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">Series {game.id}{round ? ` · Round ${round.round_number}` : ''}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{describeState(game, round, userId)}</p>
                  {game.status === 'waiting' && invitationCode && (
                    <div className="mt-2 rounded-lg bg-amber-50 p-3">
                      <p className="break-all font-mono text-xs text-gray-700">Game {game.id}: {invitationCode}</p>
                      <BrewDoneItInvitationShare gameId={game.id} inviteCode={invitationCode} disabled={busy} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onOpen(game.id, invitationCode)}
                  className="rounded-lg border border-amber-700 px-4 py-2 font-semibold text-amber-800 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-60"
                >
                  Open series
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
