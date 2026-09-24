import fs from 'node:fs'

const manifestPath = process.argv[2] || 'docs/nocodebackend/brew-done-it-release-readiness.template.json'
const fail = (message) => { console.error(`BLOCKED: ${message}`); process.exitCode = 1 }
const fullCommitSha = /^[0-9a-f]{40}$/

if (!fs.existsSync(manifestPath)) {
  fail(`release-readiness manifest not found: ${manifestPath}`)
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const requiredEvidence = ['providerContract', 'twoAccountFlow', 'privacy', 'recovery', 'accessibility', 'cleanup']

  if (manifest.contract !== 'pourfolio.brew-done-it-release-readiness.v1') fail('unexpected release-readiness contract')
  if (!fullCommitSha.test(String(manifest.candidateRevision || ''))) fail('candidate revision must be a full lowercase 40-character commit SHA')
  for (const key of requiredEvidence) {
    const evidence = manifest.evidence?.[key]
    if (evidence?.status !== 'PASS' || !evidence?.reference || evidence.reference === 'PENDING') {
      fail(`${key} evidence is not attributable PASS evidence`)
    }
  }
  if (manifest.providerMutationApproved !== true) fail('provider mutation approval is absent')
  if (manifest.enablementApproved !== true) fail('enablement approval is absent')

  if (!process.exitCode) console.log(`PASS: Brew Done It release readiness certified for ${manifest.candidateRevision}`)
}
