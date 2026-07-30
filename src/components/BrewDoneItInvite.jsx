import React, { useState } from 'react'

const control = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500'
const button = 'rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

export default function BrewDoneItInvite({ invitation, busy, onCreate, onJoin }) {
  const [gameId, setGameId] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [consent, setConsent] = useState(false)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="invitation-heading">
      <h2 id="invitation-heading" className="text-xl font-semibold text-gray-900">Start or join a game</h2>
      <p className="mt-2 text-sm text-gray-600">Both players need a Pourfolio account. Invitations expire after 24 hours.</p>
      <label className="mt-4 flex gap-3 text-sm text-gray-800">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-700 focus:ring-2 focus:ring-amber-500" />
        Allow this game to answer up to two controlled yes/no questions from our shared rating history.
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" className={button} disabled={busy || !consent} onClick={() => onCreate(consent)}>Create invitation</button>
      </div>
      {invitation && (
        <div className="mt-5 rounded-lg bg-amber-50 p-4" role="status">
          <h3 className="font-semibold text-amber-950">Invitation ready</h3>
          <p className="mt-1 text-sm">Share the game number and private code with your opponent.</p>
          <p className="mt-2 break-all font-mono text-sm">Game {invitation.gameId}: {invitation.code}</p>
        </div>
      )}
      <form className="mt-6 border-t border-gray-200 pt-5" onSubmit={(event) => { event.preventDefault(); onJoin({ gameId, inviteCode, consent }) }}>
        <h3 className="font-semibold text-gray-900">Join an invitation</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-800">Game number
            <input className={control} inputMode="numeric" pattern="[1-9][0-9]*" required value={gameId} onChange={(event) => setGameId(event.target.value)} />
          </label>
          <label className="text-sm font-medium text-gray-800">Invitation code
            <input className={control} autoComplete="off" required minLength={32} value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
          </label>
        </div>
        <button className={`${button} mt-4`} disabled={busy || !consent}>Join game</button>
      </form>
    </section>
  )
}
