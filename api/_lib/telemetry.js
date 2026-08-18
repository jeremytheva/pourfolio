const TELEMETRY_FIELDS = new Set([
  'environment', 'route_template', 'method', 'status_class', 'duration_ms',
  'event_name', 'deployment', 'commit', 'region', 'correlation_id'
])

const textValue = (value, maximumLength = 128) => {
  if (typeof value !== 'string') return undefined
  const cleaned = [...value]
    .filter((character) => {
      const codePoint = character.codePointAt(0)
      return codePoint > 31 && codePoint !== 127
    })
    .join('')
    .slice(0, maximumLength)
  return cleaned || undefined
}

export const safeCorrelationId = (value, fallback = crypto.randomUUID) =>
  textValue(Array.isArray(value) ? value[0] : value) || fallback()

export const createTelemetryEvent = (values) => {
  const event = {}
  for (const [field, rawValue] of Object.entries(values || {})) {
    if (!TELEMETRY_FIELDS.has(field)) continue
    if (field === 'duration_ms') {
      const duration = Number(rawValue)
      if (Number.isFinite(duration) && duration >= 0) event[field] = Math.round(duration)
      continue
    }
    const value = textValue(String(rawValue ?? ''))
    if (value) event[field] = value
  }
  return event
}

export const writeTelemetryError = (values) => console.error(JSON.stringify(createTelemetryEvent(values)))

export const runtimeTelemetry = (values) => createTelemetryEvent({
  environment: process.env.VERCEL_ENV,
  deployment: process.env.VERCEL_URL,
  commit: process.env.VERCEL_GIT_COMMIT_SHA,
  region: process.env.VERCEL_REGION,
  ...values
})

export const SAFE_TELEMETRY_FIELDS = Object.freeze([...TELEMETRY_FIELDS])