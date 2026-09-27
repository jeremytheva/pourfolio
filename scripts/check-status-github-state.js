import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const statusPath = path.join(root, 'STATUS.md')
const repository = process.env.GITHUB_REPOSITORY || 'jeremytheva/pourfolio'
const token = process.env.GITHUB_TOKEN

const output = (status, findings = [], evidence = {}) => {
  process.stdout.write(`${JSON.stringify({ status, findings, evidence })}\n`)
}

if (!fs.existsSync(statusPath)) {
  output('DRIFT', [{ code: 'STATUS_MISSING' }])
  process.exit(1)
}

const statusText = fs.readFileSync(statusPath, 'utf8')
const end = statusText.indexOf('\n---\n', 4)
if (!statusText.startsWith('---\n') || end === -1) {
  output('DRIFT', [{ code: 'STATUS_FRONT_MATTER_INVALID' }])
  process.exit(1)
}

const frontMatter = statusText.slice(4, end)
const scalar = (name) => {
  const match = new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(frontMatter)
  if (!match) return null
  const value = match[1].trim().replace(/^"(.*)"$/, '$1')
  return value === 'null' ? null : value
}
const nested = (name) => {
  const match = new RegExp(`^\\s{2}${name}:\\s*(.+)$`, 'm').exec(frontMatter)
  if (!match) return null
  const value = match[1].trim().replace(/^"(.*)"$/, '$1')
  return value === 'null' ? null : value
}

if (!token) {
  output('WAITING', [{ code: 'GITHUB_TOKEN_MISSING', detail: 'Live STATUS/GitHub reconciliation was not executed.' }])
  process.exit(0)
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28'
}

const getJson = async (url) => {
  const response = await fetch(url, { headers })
  if (!response.ok) throw new Error(`GitHub request failed: ${response.status} ${url}`)
  return response.json()
}

const [mainCommit, openPulls] = await Promise.all([
  getJson(`https://api.github.com/repos/${repository}/commits/main`),
  getJson(`https://api.github.com/repos/${repository}/pulls?state=open&per_page=100`)
])

const isImplementation = (pr) => {
  if (pr.user?.type === 'Bot' || /\[bot\]$/i.test(pr.user?.login || '')) return false
  return !/^(docs:|docs\(|chore\(deps|build\(deps)/i.test(pr.title || '')
}

const implementationPulls = openPulls.filter(isImplementation)
const headToPr = new Map(implementationPulls.map((pr) => [pr.head?.ref, pr]))
const depthFor = (pr, seen = new Set()) => {
  if (!pr || seen.has(pr.number)) return 1
  seen.add(pr.number)
  const parent = headToPr.get(pr.base?.ref)
  return parent ? 1 + depthFor(parent, seen) : 1
}
const dependentStackDepth = implementationPulls.length
  ? Math.max(...implementationPulls.map((pr) => depthFor(pr)))
  : 0

const findings = []
const recordedOpen = Number(nested('open_implementation_prs'))
const recordedDepth = Number(nested('dependent_stack_depth'))
if (Number.isFinite(recordedOpen) && recordedOpen !== implementationPulls.length) {
  findings.push({
    code: 'STATUS_OPEN_IMPLEMENTATION_PR_COUNT_STALE',
    recorded: recordedOpen,
    actual: implementationPulls.length
  })
}
if (Number.isFinite(recordedDepth) && recordedDepth !== dependentStackDepth) {
  findings.push({
    code: 'STATUS_DEPENDENT_STACK_DEPTH_STALE',
    recorded: recordedDepth,
    actual: dependentStackDepth
  })
}
if (implementationPulls.length > 3) {
  findings.push({ code: 'IMPLEMENTATION_WIP_LIMIT_EXCEEDED', actual: implementationPulls.length, maximum: 3 })
}
if (dependentStackDepth > 2) {
  findings.push({ code: 'DEPENDENT_STACK_LIMIT_EXCEEDED', actual: dependentStackDepth, maximum: 2 })
}

const currentPr = nested('pr')
if (currentPr && !openPulls.some((pr) => String(pr.number) === String(currentPr))) {
  findings.push({ code: 'STATUS_CURRENT_PR_NOT_OPEN', pr: Number(currentPr) })
}

const currentBranch = nested('branch')
if (currentBranch) {
  const branchResponse = await fetch(
    `https://api.github.com/repos/${repository}/branches/${encodeURIComponent(currentBranch)}`,
    { headers }
  )
  if (branchResponse.status === 404) findings.push({ code: 'STATUS_CURRENT_BRANCH_MISSING', branch: currentBranch })
  else if (!branchResponse.ok) throw new Error(`GitHub branch request failed: ${branchResponse.status}`)
}

const observedMain = nested('observed_main_commit')
if (observedMain) {
  let accepted = observedMain === mainCommit.sha
  const runningOnMain = process.env.GITHUB_REF === 'refs/heads/main' || process.env.GITHUB_REF_NAME === 'main'
  if (!accepted && runningOnMain) {
    const currentCommit = await getJson(`https://api.github.com/repos/${repository}/commits/${mainCommit.sha}`)
    accepted = (currentCommit.parents || []).some((parent) => parent.sha === observedMain)
  }
  if (!accepted) {
    findings.push({ code: 'STATUS_MAIN_BASELINE_STALE', recorded: observedMain, actual: mainCommit.sha })
  }
}

output(findings.length ? 'DRIFT' : 'PASS', findings, {
  main_commit: mainCommit.sha,
  open_implementation_prs: implementationPulls.map((pr) => pr.number),
  dependent_stack_depth: dependentStackDepth
})

if (findings.length && process.env.STATUS_GITHUB_STRICT === '1') process.exitCode = 1
