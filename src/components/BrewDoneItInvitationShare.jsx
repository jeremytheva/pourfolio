import React, { useMemo, useState } from 'react'
import { formatBrewDoneItInvitation } from '../utils/brewDoneItInvitation.js'

const actionClass = 'rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

export default function BrewDoneItInvitationShare({ gameId, inviteCode, disabled = false }) {
  const [status, setStatus] = useState('')
  const challengeText = useMemo(() => formatBrewDoneItInvitation(gameId, inviteCode), [gameId, inviteCode])

  if (!challengeText) return null

  const copyChallenge = async () => {
    setStatus('')
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setStatus('Copy is not available on this device. Select the game number and challenge code above to share them manually.')
      return
    }
    try {
      await navigator.clipboard.writeText(challengeText)
      setStatus('Challenge details copied. Send them privately to the other player.')
    } catch {
      setStatus('Challenge details could not be copied. Select the game number and challenge code above to share them manually.')
    }
  }

  const shareChallenge = async () => {
    setStatus('')
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return
    try {
      await navigator.share({ title: 'Brew Done It challenge', text: challengeText })
      setStatus('Challenge share sheet opened.')
    } catch (error) {
      if (error?.name !== 'AbortError') setStatus('The challenge could not be shared from this device. You can copy the details instead.')
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={copyChallenge} className={actionClass}>Copy challenge details</button>
        {canShare && <button type="button" disabled={disabled} onClick={shareChallenge} className={actionClass}>Share challenge</button>}
      </div>
      {status && <p className="mt-2 text-sm text-amber-950" role="status" aria-live="polite">{status}</p>}
      <p className="mt-2 text-xs text-gray-600">Only the game number and challenge code are shared. The selected beer stays private.</p>
    </div>
  )
}
