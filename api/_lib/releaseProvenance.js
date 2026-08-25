const FULL_GIT_SHA = /^[0-9a-f]{40}$/u
const VERCEL_ENVIRONMENTS = new Set(['production', 'preview', 'development'])

export const releaseProvenance = () => {
  const candidateSha = process.env.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase() || ''
  const candidateEnvironment = process.env.VERCEL_ENV?.trim().toLowerCase() || ''

  return Object.freeze({
    commitSha: FULL_GIT_SHA.test(candidateSha) ? candidateSha : null,
    environment: VERCEL_ENVIRONMENTS.has(candidateEnvironment) ? candidateEnvironment : null
  })
}

export const __testables = { FULL_GIT_SHA, VERCEL_ENVIRONMENTS }
