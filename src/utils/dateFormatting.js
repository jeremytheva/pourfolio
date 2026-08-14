const mediumDateFormatter = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' })

export const DATE_NOT_RECORDED = 'Date not recorded'

export function formatDate(value, fallback = DATE_NOT_RECORDED) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return fallback
  }

  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return fallback
  }

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return fallback

  return mediumDateFormatter.format(date)
}
