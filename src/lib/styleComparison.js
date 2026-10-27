export const STYLE_METRICS = Object.freeze([
  Object.freeze({ key: 'abv', label: 'Alcohol', unit: '% ABV', max: 80 }),
  Object.freeze({ key: 'ibu', label: 'Bitterness', unit: 'IBU', max: 10_000 })
])

export const exactMeasurement = (value, max = Infinity) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= max ? number : null
}

export const validStyleMetric = (metric, unit, max) => {
  if (!metric || typeof metric !== 'object' || Array.isArray(metric) || metric.unit !== unit) return false
  if (metric.kind === 'variable') return Object.keys(metric).length === 2
  return metric.kind === 'range' && Object.keys(metric).length === 4 &&
    typeof metric.min === 'number' && typeof metric.max === 'number' &&
    exactMeasurement(metric.min, max) !== null && exactMeasurement(metric.max, max) !== null && metric.min <= metric.max
}

// A descriptive comparison only: never a rating, quality grade or percentile.
export const compareStyleMetric = (rawValue, metric, definition) => {
  const value = exactMeasurement(rawValue, definition.max)
  if (!validStyleMetric(metric, definition.unit, definition.max)) return { value, status: 'reference_unavailable', difference: null }
  if (metric.kind === 'variable') return { value, status: 'variable', difference: null }
  if (value === null) return { value: null, status: 'not_recorded', difference: null }
  const status = value < metric.min ? 'below' : value > metric.max ? 'above' : 'within'
  const difference = status === 'within' ? 0 : Number(Math.abs(value - (status === 'below' ? metric.min : metric.max)).toFixed(6))
  return { value, status, difference }
}

// One scale per metric across guide switches, including outliers. No clamping.
export const styleComparisonScale = (value, references, metricKey) => {
  const values = [value, ...references.flatMap((reference) => {
    const metric = reference.metrics[metricKey]
    return metric.kind === 'range' ? [metric.min, metric.max] : []
  })].filter((number) => typeof number === 'number' && Number.isFinite(number))
  if (!values.length) return null
  const low = Math.min(...values), high = Math.max(...values)
  const padding = Math.max((high - low) * 0.15, high * 0.03, 0.1)
  const min = Math.max(0, low - padding), max = high + padding
  return { min, max, position: (number) => ((number - min) / (max - min)) * 100 }
}
