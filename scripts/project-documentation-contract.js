const sortedUnique = (values) => [...new Set(values)].sort()

export const extractSourceRoutes = ({ appText = '', publicDocumentsText = '' } = {}) => sortedUnique([
  ...[...appText.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => match[1]),
  ...[...publicDocumentsText.matchAll(/\[\s*["'](\/[^"']+)["']\s*,/g)].map((match) => match[1])
])

export const extractSystemMapRoutes = (systemMapText = '') => {
  const start = '<!-- current-browser-routes:start -->'
  const end = '<!-- current-browser-routes:end -->'
  const startIndex = systemMapText.indexOf(start)
  const endIndex = systemMapText.indexOf(end)
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return []
  const block = systemMapText.slice(startIndex + start.length, endIndex)
  return sortedUnique([...block.matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1]))
}

export const routeMapDrift = ({ sourceRoutes = [], mappedRoutes = [] } = {}) => ({
  missing: sourceRoutes.filter((route) => !mappedRoutes.includes(route)).sort(),
  stale: mappedRoutes.filter((route) => !sourceRoutes.includes(route)).sort()
})

export const canonicalEnvironmentNames = (contract = {}) =>
  sortedUnique(contract?.provider?.canonical_environment_variables || [])

export const environmentAssignments = (envText = '') =>
  sortedUnique([...envText.matchAll(/^(NOCODEBACKEND_[A-Z0-9_]+)=/gm)].map((match) => match[1]))

export const environmentDrift = ({ contractNames = [], templateNames = [], architectureText = '' } = {}) => ({
  missingFromTemplate: contractNames.filter((name) => !templateNames.includes(name)).sort(),
  extraInTemplate: templateNames.filter((name) => !contractNames.includes(name)).sort(),
  missingFromArchitecture: contractNames.filter((name) => !architectureText.includes(name)).sort()
})

const semverMajorMinor = (value = '') => {
  const match = String(value).match(/(\d+)\.(\d+)/)
  return match ? `${match[1]}.${match[2]}` : null
}

export const runtimeDocumentationDrift = ({ packageJson = {}, documents = {} } = {}) => {
  const reactVersion = semverMajorMinor(packageJson?.dependencies?.react)
  if (!reactVersion) return []
  return Object.entries(documents)
    .filter(([, content]) => !String(content).includes(`React ${reactVersion}`))
    .map(([path]) => ({ path, expected: `React ${reactVersion}` }))
}

export const ratingBonusFieldDrift = ({ contract = {}, ratingCode = '' } = {}) => {
  const fields = contract?.collections?.bonus_attribute_rating_mapping?.provider_fields || []
  const candidates = ['bonus_attribute_id', 'bonus_attributes_id']
  const configured = candidates.filter((field) => fields.includes(field))
  if (configured.length !== 1) {
    return { expected: null, stale: [], invalidContractFields: configured }
  }
  const expected = configured[0]
  const stale = candidates.filter((field) => field !== expected && ratingCode.includes(field))
  return {
    expected,
    stale,
    invalidContractFields: [],
    expectedMissingFromCode: !ratingCode.includes(expected)
  }
}

export const lifecycleWorkflowFindings = (workflow = '') => {
  const findings = []
  if (!/on:\n {2}pull_request:/.test(workflow)) findings.push('LIFECYCLE_PULL_REQUEST_EVENT_MISSING')
  if (/pull_request_target:/.test(workflow)) findings.push('LIFECYCLE_PULL_REQUEST_TARGET_UNSAFE')
  if (!/\npermissions: \{\}\n/.test(workflow)) findings.push('LIFECYCLE_GLOBAL_PERMISSIONS_NOT_EMPTY')

  const syncStart = workflow.indexOf('  sync-pull-request-state:')
  const cleanupStart = workflow.indexOf('  delete-merged-branch:')
  const sync = syncStart >= 0 && cleanupStart > syncStart ? workflow.slice(syncStart, cleanupStart) : ''
  const cleanup = cleanupStart >= 0 ? workflow.slice(cleanupStart) : ''

  if (!/issues:\s*write/.test(sync)) findings.push('LIFECYCLE_ISSUES_WRITE_MISSING')
  if (!/pull-requests:\s*write/.test(sync)) findings.push('LIFECYCLE_PULL_REQUESTS_WRITE_MISSING')
  if (/contents:\s*write/.test(sync)) findings.push('LIFECYCLE_SYNC_CONTENTS_WRITE_EXCESSIVE')
  if (!/continue-on-error:\s*true/.test(sync)) findings.push('LIFECYCLE_LABEL_SYNC_NOT_BEST_EFFORT')

  const addIndex = sync.indexOf('github.rest.issues.addLabels')
  const removeIndex = sync.indexOf('github.rest.issues.removeLabel')
  if (addIndex === -1 || removeIndex === -1 || addIndex > removeIndex) {
    findings.push('LIFECYCLE_REPLACEMENT_LABEL_NOT_ADDED_FIRST')
  }

  if (!/contents:\s*write/.test(cleanup)) findings.push('LIFECYCLE_CLEANUP_CONTENTS_WRITE_MISSING')
  if (/issues:\s*write/.test(cleanup) || /pull-requests:\s*write/.test(cleanup)) {
    findings.push('LIFECYCLE_CLEANUP_PERMISSIONS_EXCESSIVE')
  }
  if (!/head\.repo\.full_name == github\.repository/.test(cleanup)) findings.push('LIFECYCLE_CLEANUP_SAME_REPO_GUARD_MISSING')
  if (!/head\.ref != github\.event\.repository\.default_branch/.test(cleanup)) findings.push('LIFECYCLE_CLEANUP_DEFAULT_BRANCH_GUARD_MISSING')
  if (!/continue-on-error:\s*true/.test(cleanup)) findings.push('LIFECYCLE_CLEANUP_NOT_BEST_EFFORT')
  return findings
}

export const blockerIssueNumbers = (statusText = '') => {
  const frontMatterEnd = statusText.indexOf('\n---\n', 4)
  if (!statusText.startsWith('---\n') || frontMatterEnd === -1) return []
  const frontMatter = statusText.slice(4, frontMatterEnd)
  const start = frontMatter.indexOf('blockers:')
  const end = frontMatter.indexOf('requires_owner_decision:', start)
  if (start === -1 || end === -1) return []
  const block = frontMatter.slice(start, end)
  return sortedUnique([...block.matchAll(/^\s+issue:\s*(\d+)$/gm)].map((match) => Number(match[1])))
}

export const blockerEvidenceDrift = ({ blockerIssues = [], issueEvidence = [] } = {}) => {
  const evidenceByNumber = new Map(issueEvidence.map((item) => [Number(item.number), item]))
  const missing = blockerIssues.filter((number) => !evidenceByNumber.has(number))
  const closed = blockerIssues.filter((number) => evidenceByNumber.get(number)?.state === 'closed')
  return { missing, closed }
}

export const competingBlockerHeadingPaths = (documents = {}) =>
  Object.entries(documents)
    .filter(([, content]) => /^##?\s+Current blockers\b|^Current blockers\s*:/mi.test(String(content)))
    .map(([path]) => path)


export const providerWriteApprovalFindings = ({
  agentsText = '',
  providerReadmeText = '',
  statusText = ''
} = {}) => {
  const findings = []
  const routineMarker = 'Routine guarded production provider writes do **not** require explicit product-owner approval'
  if (!String(agentsText).includes(routineMarker)) findings.push('ROUTINE_PROVIDER_WRITE_AUTONOMY_MISSING_FROM_AGENTS')
  if (!String(providerReadmeText).includes('Routine production provider writes do **not** require explicit product-owner approval')) {
    findings.push('ROUTINE_PROVIDER_WRITE_AUTONOMY_MISSING_FROM_PROVIDER_GUIDE')
  }
  if (/irreversible or production-impacting provider\/schema/i.test(String(agentsText)) ||
      /irreversible or production-impacting provider\/schema/i.test(String(providerReadmeText))) {
    findings.push('BLANKET_PRODUCTION_PROVIDER_APPROVAL_GATE_REINTRODUCED')
  }
  if (/#509[^\n]*(?:explicit owner approval|requires exact owner approval)|(?:explicit owner approval|requires exact owner approval)[^\n]*#509/i.test(String(statusText))) {
    findings.push('ROUTINE_509_OWNER_APPROVAL_GATE_REINTRODUCED')
  }
  return findings
}
