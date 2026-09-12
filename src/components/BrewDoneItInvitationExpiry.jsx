import React from 'react'

const formatExpiry = (value) => {
  const timestamp = Date.parse(value || '')
  if (!Number.isFinite(timestamp)) return null
  return {
    timestamp,
    label: new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
  }
}

export default function BrewDoneItInvitationExpiry({ expiresAt }) {
  const expiry = formatExpiry(expiresAt)
  if (!expiry) return null
  const expired = expiry.timestamp <= Date.now()
  return (
    <p className={`mt-2 text-sm ${expired ? 'font-semibold text-red-800' : 'text-amber-950'}`} role="status">
      {expired ? `Invitation expired ${expiry.label}. Refresh the challenge before sharing it again.` : `Invitation expires ${expiry.label}.`}
    </p>
  )
}

export const __testables = { formatExpiry }
