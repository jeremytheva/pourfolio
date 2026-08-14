const mediumDateFormatter = new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' })

export const DATE_NOT_RECORDED = 'Date not recorded'

function isValidIsoCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value)
  if (!match) return true

  const [, year, month, day] = match
  const numericYear = Number(year)
  const numericMonth = Number(month)
  const numericDay = Number(day)
  const isLeapYear = numericYear % 4 === 0 && (numericYear % 100 !== 0 || numericYear % 400 === 0)
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

  return numericMonth >= 1
    && numericMonth <= 12
    && numericDay >= 1
    && numericDay <= daysInMonth[numericMonth - 1]
}

export function formatDate(value, fallback = DATE_NOT_RECORDED) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return fallback
  }

  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return fallback
  }

  if (typeof value === 'string' && !isValidIsoCalendarDate(value.trim())) return fallback

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return fallback

  return mediumDateFormatter.format(date)
}
