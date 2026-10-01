const normalise = (value) => typeof value === 'string' && value.trim() ? value.trim() : null

const VARIABLE_NAMES = Object.freeze({
  userEmail: 'NOCODEBACKEND_USER_EMAIL',
  userSecretKey: 'NOCODEBACKEND_USER_SECRET_KEY',
  adminEmail: 'NOCODEBACKEND_ADMIN_EMAIL',
  adminSecretKey: 'NOCODEBACKEND_ADMIN_SECRET_KEY'
})

const readEntries = (environment = process.env) => ({
  user: {
    email: normalise(environment[VARIABLE_NAMES.userEmail]),
    secretKey: normalise(environment[VARIABLE_NAMES.userSecretKey])
  },
  admin: {
    email: normalise(environment[VARIABLE_NAMES.adminEmail]),
    secretKey: normalise(environment[VARIABLE_NAMES.adminSecretKey])
  }
})

export const certificationCredentialConfigurationState = (environment = process.env) => {
  const entries = readEntries(environment)
  const userConfigured = Boolean(entries.user.email && entries.user.secretKey)
  const adminConfigured = Boolean(entries.admin.email && entries.admin.secretKey)

  return Object.freeze({
    user: Object.freeze({
      emailConfigured: Boolean(entries.user.email),
      secretKeyConfigured: Boolean(entries.user.secretKey),
      configured: userConfigured
    }),
    admin: Object.freeze({
      emailConfigured: Boolean(entries.admin.email),
      secretKeyConfigured: Boolean(entries.admin.secretKey),
      configured: adminConfigured
    }),
    emailsDistinct: userConfigured && adminConfigured
      ? entries.user.email.toLowerCase() !== entries.admin.email.toLowerCase()
      : null,
    secretKeysDistinct: userConfigured && adminConfigured
      ? entries.user.secretKey !== entries.admin.secretKey
      : null
  })
}

const setupError = (code, detail = {}) => {
  const error = new Error('User/admin certification credentials are not safely configured.')
  error.status = 503
  error.code = code
  Object.assign(error, detail)
  return error
}

export const requireUserAdminCertificationCredentials = (environment = process.env) => {
  const entries = readEntries(environment)
  const missing = Object.entries(VARIABLE_NAMES)
    .filter(([entryName]) => {
      const [role, field] = entryName.startsWith('user')
        ? ['user', entryName === 'userEmail' ? 'email' : 'secretKey']
        : ['admin', entryName === 'adminEmail' ? 'email' : 'secretKey']
      return !entries[role][field]
    })
    .map(([, variableName]) => variableName)

  if (missing.length) throw setupError('CERTIFICATION_CREDENTIALS_MISSING', { missing })
  if (entries.user.email.toLowerCase() === entries.admin.email.toLowerCase()) {
    throw setupError('CERTIFICATION_IDENTITIES_NOT_DISTINCT')
  }
  if (entries.user.secretKey === entries.admin.secretKey) {
    throw setupError('CERTIFICATION_SECRET_KEYS_NOT_DISTINCT')
  }

  return entries
}

export const __testables = { VARIABLE_NAMES, normalise, readEntries }
