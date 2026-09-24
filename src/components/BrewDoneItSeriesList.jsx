import React from 'react'
import BrewDoneItInvitationExpiry from './BrewDoneItInvitationExpiry.jsx'
import BrewDoneItInvitationShare from './BrewDoneItInvitationShare.jsx'
import { isBrewDoneItInvitationExpired } from '../utils/brewDoneItInvitation.js'

const terminalRound = (round) => ['completed', 'forfeited'].includes(round?.status)

const describeState = (game, round, userId, invitationExpired = false) => {
  if (game.status === 'waiting') return invitationExpired ? 'The invitation expiry time has passed' : 'Waiting for the other player to accept'
  if (!round) return 'Series has no round yet'
  if (terminalRound(round)) {
    return String(round.guesser_participant_id) === String(userId)
      ? 'Your turn to choose the secret beer for the next round'
      : 'The other player is choosing the secret beer for the next round'
  }
  return String(round.guesser_participant_id) === String(userId)
    ? 'Your turn to solve the mystery beer'
    : 'You are Game Master while the other player guesses'
}

const actionState = (game, round, userId, invitationExpired = false) => {
  if (game.status === 'waiting' && invitationExpired) return { label: 'Invitation expired', tone: 'bg-red-100 text-red-900' }
  if (game.status === 'waiting') return { label: 'Invitation pending', tone: 'bg-amber-100 text-amber-900' }
  if (!round) return { label: 'Waiting', tone: 'bg-gray-100 text-gray-700' }
  const yourTurn = String(round.guesser_participant_id) === String(userId)
  if (terminalRound(round)) return yourTurn
    ? { label: 'Choose next beer', tone: 'bg-green-100 text-green-900' }
    : { label: 'Opponent choosing', tone: 'bg-blue-100 text-blue-900' }
  return yourTurn
    ? { label: 'Your guess', tone: 'bg-green-100 text-green-900' }
    : { label: 'Game Master', tone: 'bg-blue-100 text-blue-900' }
}

const roleSummary = (game, round, userId) => {
  if (game.status === 'waiting') return 'Challenge not started'
  if (!round) return 'Waiting for first round'
  const guessing = String(round.guesser_participant_id) === String(userId)
  if (terminalRound(round)) return guessing ? 'Next role: Game Master' : 'Next role: Guesser'
  return guessing ? 'Current role: Guesser' : 'Current role: Game Master'
}

export default function BrewDoneItSeriesList({ series, userId, busy, onOpen }) {
  if (!series.length) return null

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="series-heading">
      <h2 id="series-heading" className="text-xl font-semibold text-gray-900">Your challenges</h2>
      <p className="mt-1 text-sm text-gray-600">Keep each rivalry going across rounds. Roles alternate so the previous guesser chooses the next mystery beer.</p>
      <ul className="mt-4 divide-y divide-gray-200">
        {series.map(({ game, round, invitationCode }) => {
          const invitationExpired = game.status === 'waiting' && isBrewDoneItInvitationExpired(game.expires_at)
          const state = actionState(game, round, userId, invitationExpired)
          return (
            <li className="py-4" key={game.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">Series {game.id}{round ? ` · Round ${round.round_number}` : ''}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-700">{roleSummary(game, round, userId)}</p>
                  <p className="mt-1 text-sm text-gray-600">{describeState(game, round, userId, invitationExpired)}</p>
                  {game.status === 'waiting' && invitationCode && (
                    <div className="mt-2 rounded-lg bg-amber-50 p-3">
                      <p className="break-all font-mono text-xs text-gray-700">Game {game.id}: {invitationCode}</p>
                      <BrewDoneItInvitationExpiry expiresAt={game.expires_at} />
                      <BrewDoneItInvitationShare gameId={game.id} inviteCode={invitationCode} disabled={busy || invitationExpired} />
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
