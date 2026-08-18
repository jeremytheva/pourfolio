export const ACCOUNT_DELETION_CONFIRMATION_FORMAT =
  'pourfolio.account-deletion-confirmation'
export const ACCOUNT_DELETION_CONFIRMATION_SCHEMA_VERSION = '1.0.0'
export const ACCOUNT_DELETION_CONFIRMATION_PHRASE = 'DELETE MY ACCOUNT'

const CONFIRMED_RESULT = Object.freeze({
  format: ACCOUNT_DELETION_CONFIRMATION_FORMAT,
  schema_version: ACCOUNT_DELETION_CONFIRMATION_SCHEMA_VERSION,
  confirmed: true
})

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const confirmationDescriptor = (requestBody) => {
  if (!isPlainObject(requestBody)) {
    throw new Error('Account deletion confirmation request is invalid.')
  }

  const ownKeys = Reflect.ownKeys(requestBody)
  if (ownKeys.length !== 1 || ownKeys[0] !== 'confirmation') {
    throw new Error('Account deletion confirmation request is invalid.')
  }

  const descriptor = Object.getOwnPropertyDescriptor(requestBody, 'confirmation')
  if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new Error('Account deletion confirmation request is invalid.')
  }

  return descriptor
}

export const validateAccountDeletionConfirmation = (requestBody) => {
  const descriptor = confirmationDescriptor(requestBody)
  if (typeof descriptor.value !== 'string' ||
      descriptor.value !== ACCOUNT_DELETION_CONFIRMATION_PHRASE) {
    throw new Error('Account deletion confirmation does not match.')
  }

  return CONFIRMED_RESULT
}
