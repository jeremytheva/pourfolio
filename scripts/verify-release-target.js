import { verifyReleaseTargetWithRetry } from '../release-check/releaseTarget.js'

try {
  const verified = await verifyReleaseTargetWithRetry({
    baseUrl: process.env.RELEASE_BASE_URL,
    releaseSha: process.env.RELEASE_SHA
  })
  process.stdout.write(`${JSON.stringify({
    status: 'PASS',
    commitSha: verified.commitSha,
    environment: verified.environment,
    dataProvider: verified.dataProvider
  })}\n`)
} catch {
  process.stderr.write(`${JSON.stringify({
    status: 'BLOCKED',
    code: 'RELEASE_TARGET_UNVERIFIED'
  })}\n`)
  process.exitCode = 1
}
