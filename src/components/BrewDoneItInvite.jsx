import React, { useState } from 'react'
import BrewDoneItBeerPicker from './BrewDoneItBeerPicker.jsx'

const control = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500'
const button = 'rounded-lg bg-amber-700 px-4 py-2 font-semibold text-white hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

export default function BrewDoneItInvite({ invitation, busy, initialProductId = '', onCreate, onJoin }) {
  const normalisedInitialProductId = initialProductId === null || initialProductId === undefined ? '' : String(initialProductId)
  const [productId, setProductId] = useState(normalisedInitialProductId)
  const [gameId, setGameId] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const profileBeerSelected = Boolean(normalisedInitialProductId) && String(productId) === normalisedInitialProductId

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="invitation-heading">
      <h2 id="invitation-heading" className="text-xl font-semibold text-gray-900">Start or join a challenge</h2>
      <p className="mt-2 text-sm text-gray-600">Both players use their own Pourfolio account and device. Choose the beer before sharing the challenge.</p>

      <form className="mt-5" onSubmit={(event) => { event.preventDefault(); if (productId) onCreate(productId) }}>
        <h3 className="font-semibold text-gray-900">Create a challenge</h3>
        <div className="mt-3">
          <BrewDoneItBeerPicker
            id="brew-done-it-create-beer"
            label="Beer to guess"
            value={productId}
            onChange={setProductId}
            initialProductId={normalisedInitialProductId}
            disabled={busy}
            helpText="Search the full catalogue. The other player will not receive this beer identity before the round ends."
          />
        </div>
        {profileBeerSelected && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
            The beer opened from its profile is preselected. Review or change it before creating the challenge.
          </p>
        )}
        <button className={`${button} mt-4`} disabled={busy || !productId}>Create challenge</button>
      </form>

      {invitation && (
        <div className="mt-5 rounded-lg bg-amber-50 p-4" role="status">
          <h3 className="font-semibold text-amber-950">Challenge ready</h3>
          <p className="mt-1 text-sm">Send the game number and challenge code to the other player. The invitation expires after seven days.</p>
          <p className="mt-2 break-all font-mono text-sm">Game {invitation.gameId}: {invitation.code}</p>
        </div>
      )}

      <form className="mt-6 border-t border-gray-200 pt-5" onSubmit={(event) => { event.preventDefault(); onJoin({ gameId, inviteCode }) }}>
        <h3 className="font-semibold text-gray-900">Join a challenge</h3>
        <p className="mt-1 text-sm text-gray-600">The selected beer remains hidden while you are guessing.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-800">Game number
            <input className={control} inputMode="numeric" pattern="[1-9][0-9]*" required value={gameId} onChange={(event) => setGameId(event.target.value)} />
          </label>
          <label className="text-sm font-medium text-gray-800">Challenge code
            <input className={control} autoComplete="off" required minLength={32} value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
          </label>
        </div>
        <button className={`${button} mt-4`} disabled={busy}>Join challenge</button>
      </form>
    </section>
  )
}
