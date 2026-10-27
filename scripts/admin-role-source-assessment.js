import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { extractSessionUser } from '../api/_lib/authSession.js'
import { resolveBonusCertificationOwner } from './bonus-certification-owner.js'

const CONFIRMATION = 'RUN READ ONLY ADMIN ROLE ASSESSMENT'
const BASE_URL = 'https://brew-buds-mobile-app-design-3577.vercel.app'
const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
const missingRole = (roleClass = 'missing') => ({ status: 'UNAVAILABLE', roleClass, source: null })

// This observes an allowlisted role field only. It never grants a capability
// or treats user_metadata/profile/credential names as role authority.
export const classifySessionRole = (payload) => {
  const user = extractSessionUser(payload)
  if (!user || !user.id.trim() || /\s/.test(user.id)) return missingRole('missing_identity')
  const candidates = [
    [payload?.user, 'user.role'], [payload?.data?.user, 'data.user.role'],
    [payload?.session?.user, 'session.user.role'], [payload?.data?.session?.user, 'data.session.user.role'],
    [payload?.data, 'data.role'], [payload, 'role']
  ].filter(([record]) => record && typeof record === 'object' && !Array.isArray(record) && Object.hasOwn(record, 'role'))
  const observations = []
  for (const [record, source] of candidates) {
    const id = record.id || record.user_id || record.userId || record._id
    if (typeof id !== 'string' || id !== user.id) return missingRole('ambiguous')
    if (typeof record.role !== 'string' || !record.role.trim() || record.role.length > 50) return missingRole('malformed')
    observations.push({ role: record.role, source })
  }
  if (!observations.length) return missingRole()
  if (new Set(observations.map((row) => row.role)).size !== 1) return missingRole('ambiguous')
  const value = observations[0].role
  return {
    status: 'OBSERVED', source: observations[0].source,
    roleClass: value === 'Admin' ? 'admin_exact' : value.trim().toLowerCase() === 'admin' ? 'near_admin' : 'non_admin'
  }
}

export const runAdminRoleSourceAssessment = async ({ environment = process.env, fetchImpl = fetch } = {}) => {
  const report = {
    version: 1, scope: 'session_role_shape_only', authorityCertified: false,
    sourceSha: sha(environment.ADMIN_ROLE_ASSESSMENT_SHA) ? environment.ADMIN_ROLE_ASSESSMENT_SHA : null,
    targetSha: sha(environment.ADMIN_ROLE_TARGET_SHA) ? environment.ADMIN_ROLE_TARGET_SHA : null,
    accounts: [], checks: { identitiesDistinct: 'NOT_RUN', roleProjectionAvailable: 'NOT_RUN',
      exactAdminObserved: 'NOT_RUN', nonAdminObserved: 'NOT_RUN', providerRoleWriteDenial: 'NOT_RUN',
      revocation: 'NOT_RUN' }, overall: 'SETUP_REQUIRED'
  }
  const required = ['ADMIN_ROLE_ASSESSMENT_SHA', 'ADMIN_ROLE_TARGET_SHA', 'RELEASE_OWNER_EMAIL',
    'RELEASE_OWNER_PASSWORD', 'RELEASE_OTHER_EMAIL', 'RELEASE_OTHER_PASSWORD']
  const missing = required.filter((key) => typeof environment[key] !== 'string' || !environment[key].trim())
  if (missing.length || !report.sourceSha || !report.targetSha || environment.ADMIN_ROLE_ASSESSMENT_CONFIRMATION !== CONFIRMATION) {
    report.setupCode = 'ASSESSMENT_CONFIGURATION_REQUIRED'
    report.missing = missing
    return report
  }
  if (environment.RELEASE_OWNER_EMAIL.trim().toLowerCase() === environment.RELEASE_OTHER_EMAIL.trim().toLowerCase()) {
    report.setupCode = 'DISTINCT_CONFIGURED_ACCOUNTS_REQUIRED'
    return report
  }
  const identities = []
  for (const [label, prefix] of [['configured_account_1', 'RELEASE_OWNER'], ['configured_account_2', 'RELEASE_OTHER']]) {
    let observed = missingRole()
    try {
      // Reuse the existing bounded same-origin login, target provenance,
      // immutable identity/email verification and sign-out machinery. This
      // isolated environment cannot select its configured-user-ID shortcut.
      const identity = await resolveBonusCertificationOwner({ environment: {
        BONUS_CERTIFICATION_BASE_URL: BASE_URL, BONUS_CERTIFICATION_AUTH_SHA: report.targetSha,
        RELEASE_OWNER_EMAIL: environment[`${prefix}_EMAIL`], RELEASE_OWNER_PASSWORD: environment[`${prefix}_PASSWORD`]
      }, fetchImpl: async (url, init) => {
        const response = await fetchImpl(url, init)
        if (new URL(url).pathname === '/api/nocodebackend/auth/get-session' && response.ok) {
          try { observed = classifySessionRole(await response.clone().json()) } catch { observed = missingRole('malformed') }
        }
        return response
      } })
      identities.push(identity.id)
      report.accounts.push({ label, session: 'PASS', cleanup: 'PASS', role: observed })
    } catch (error) {
      const codes = { BONUS_TEST_OWNER_TARGET_UNVERIFIED: 'TARGET_UNVERIFIED',
        BONUS_TEST_OWNER_AUTH_REJECTED: 'AUTH_REJECTED', BONUS_TEST_OWNER_SESSION_UNCONFIRMED: 'SESSION_UNCONFIRMED',
        BONUS_TEST_OWNER_SIGNOUT_UNCONFIRMED: 'SIGNOUT_UNCONFIRMED' }
      const code = codes[error?.code] || 'ASSESSMENT_UNAVAILABLE'
      report.accounts.push({ label, session: code === 'TARGET_UNVERIFIED' ? 'NOT_RUN' : 'FAIL',
        cleanup: code === 'TARGET_UNVERIFIED' ? 'NOT_REQUIRED' : 'UNCONFIRMED', code,
        ...(Number.isInteger(error?.authStatus) && error.authStatus >= 400 && error.authStatus <= 599 ? { httpStatus: error.authStatus } : {}) })
      report.overall = code === 'TARGET_UNVERIFIED' ? 'SETUP_REQUIRED' : 'FAIL'
      return report
    }
  }
  report.checks.identitiesDistinct = identities[0] !== identities[1] ? 'PASS' : 'FAIL'
  report.checks.roleProjectionAvailable = report.accounts.every((account) => account.role.status === 'OBSERVED') ? 'PASS' : 'INCONCLUSIVE'
  report.checks.exactAdminObserved = report.accounts.some((account) => account.role.roleClass === 'admin_exact') ? 'PASS' : 'INCONCLUSIVE'
  report.checks.nonAdminObserved = report.accounts.some((account) => account.role.roleClass === 'non_admin') ? 'PASS' : 'INCONCLUSIVE'
  // Observing a role is not provider write-denial or revocation certification.
  report.overall = report.checks.identitiesDistinct === 'FAIL' ? 'FAIL' : 'INCONCLUSIVE'
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let report
  try { report = await runAdminRoleSourceAssessment() }
  catch { report = { version: 1, authorityCertified: false, overall: 'FAIL', code: 'ASSESSMENT_UNAVAILABLE' } }
  fs.mkdirSync('artifacts/admin-role-source-assessment', { recursive: true })
  fs.writeFileSync('artifacts/admin-role-source-assessment/summary.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
  console.log(JSON.stringify(report, null, 2))
  if (report.overall !== 'INCONCLUSIVE') process.exitCode = 1
}
