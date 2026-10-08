import { ApiError } from '../lib/nocodeBackend.js'

const object = (value) => value && typeof value === 'object' && !Array.isArray(value)
const only = (value, keys) => Object.keys(value).every((key) => keys.includes(key))
const invalid = () => { throw new ApiError('Rating details could not be read. Please retry.', { code: 'invalid_rating_breakdown' }) }

export function validateRatingBreakdown(payload) {
  if (!object(payload) || !only(payload, ['breakdown'])) invalid()
  const data = payload.breakdown
  if (!object(data) || !only(data, ['scores', 'selected_attributes', 'incomplete']) ||
      !Array.isArray(data.scores) || !Array.isArray(data.selected_attributes) || typeof data.incomplete !== 'boolean') invalid()
  for (const score of data.scores) {
    if (!object(score) || !only(score, ['name', 'score', 'scale', 'scored']) ||
        typeof score.name !== 'string' || !score.name.trim() || score.name.length > 255 ||
        ![1, 2, 7].includes(score.scale) || !Number.isFinite(score.score) || score.score < 0 || score.score > score.scale ||
        typeof score.scored !== 'boolean') invalid()
  }
  for (const selection of data.selected_attributes) {
    if (!object(selection) || !only(selection, ['description']) || typeof selection.description !== 'string' ||
        !selection.description.trim() || selection.description.length > 255) invalid()
  }
  return data
}
