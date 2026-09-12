import React from 'react'
import { isBrewDoneItInvitationExpired } from '../utils/brewDoneItInvitation.js'

const formatExpiry = (value) => {
  const timestamp = Date.parse(value || '')
  if (!Number.isFinite(timestamp)) return null
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

export default function BrewDoneItInvitationExpiry({ expiresAt }) {
  const label = formatExpiry(expiresAt)
  if (!label) return null
  const expired = isBrewDoneItInvitationExpired(expiresAt)
  return (
    <p className={`mt-2 text-sm ${expired ? 'font-semibold text-red-800' : 'text-amber-950'}`}>
      {expired ? `Invitation expired ${label}. Refresh the challenge before sharing it again.` : `Invitation expires ${label}.`}
    </p>
  )
}

export const __testables = { formatExpiry }
