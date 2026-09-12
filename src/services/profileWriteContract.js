import { PROFILE_EDITABLE_FIELDS } from '../data/contract.js'

const requirePlainObject = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Profile write data is invalid.')
  }
  return input
}

export const projectProfileWrite = (input) => {
  const source = requirePlainObject(input)
  const projected = {}

  for (const field of PROFILE_EDITABLE_FIELDS) {
    if (source[field] !== undefined) projected[field] = source[field]
  }

  if (Object.keys(projected).length === 0) {
    throw new Error('A profile update must include at least one supported field.')
  }

  return projected
}
