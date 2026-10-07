import fs from 'node:fs'
import path from 'node:path'
import {
  blockerEvidenceDrift,
  blockerIssueNumbers,
  canonicalEnvironmentNames,
  competingBlockerHeadingPaths,
  environmentAssignments,
  environmentDrift,
  extractSourceRoutes,
  extractSystemMapRoutes,
  lifecycleWorkflowFindings,
  providerWriteApprovalFindings,
  ratingBonusFieldDrift,
  routeMapDrift,
  runtimeDocumentationDrift
} from './project-documentation-contract.js'

const root = process.cwd()

const requiredFiles = [
  'PROJECT.md',
  'STATUS.md',
  'ARCHITECTURE.md',
  'DATA_MODEL.md',
  'ROADMAP.md',
  'SYSTEM_MAP.md',
  'PR_LIFECYCLE_STANDARD.md'
]

const canonicalGuidanceFiles = [
  'AGENTS.md',
  'README.md',
  'docs/CONTRIBUTING.md',
  '.github/pull_request_template.md'
]

const requiredDecisionDirectory = 'docs/DECISIONS'
const requiredDecisionReadme = 'docs/DECISIONS/README.md'
const requiredStatusSections = [
  '## AI execution gate',
  '## Autonomous continuation support',
  '## Next dependency-correct work'
]
const requiredAgentSections = [
  '## Authority',
  '## Required project-entry sequence',
  '## Whole-system rule',
  '## Autonomous continuation semantics',
  '## Work-in-progress and productive-work control',
  '## Valid stop and escalation conditions',
  '## Pull-request lifecycle',
  '## Template and pattern reuse',
  '## Data, provider and migration governance',
  '## Required validation',
  '## State maintenance',
  '## Reporting'
]

const findings = []

const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

for (const file of requiredFiles) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    findings.push({ code: 'PROJECT_DOCUMENT_MISSING', path: file })
    continue
  }
  if (!readText(file).trim()) findings.push({ code: 'PROJECT_DOCUMENT_EMPTY', path: file })
}

for (const file of canonicalGuidanceFiles) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    findings.push({ code: 'PROJECT_GUIDANCE_MISSING', path: file })
    continue
  }
  const content = readText(file)
  if (!content.includes('npm run platform:validate')) {
    findings.push({ code: 'CANONICAL_VALIDATION_GUIDANCE_MISSING', path: file })
  }
}

for (const file of ['AGENTS.md', 'README.md']) {
  const filePath = path.join(root, file)
  if (fs.existsSync(filePath) && /\bVite 7\b/.test(readText(file))) {
    findings.push({ code: 'STALE_VITE_MAJOR_GUIDANCE', path: file })
  }
}

const decisionsPath = path.join(root, requiredDecisionDirectory)
if (!fs.existsSync(decisionsPath) || !fs.statSync(decisionsPath).isDirectory()) {
  findings.push({ code: 'DECISIONS_DIRECTORY_MISSING', path: requiredDecisionDirectory })
} else {
  const decisionFiles = fs.readdirSync(decisionsPath)
    .filter((name) => name.toLowerCase().endsWith('.md') && name.toLowerCase() !== 'readme.md')
  if (decisionFiles.length === 0) findings.push({ code: 'DECISION_RECORD_MISSING', path: requiredDecisionDirectory })
}

if (!fs.existsSync(path.join(root, requiredDecisionReadme))) {
  findings.push({ code: 'DECISIONS_README_MISSING', path: requiredDecisionReadme })
}

const agentsPath = path.join(root, 'AGENTS.md')
if (fs.existsSync(agentsPath)) {
  const agents = readText('AGENTS.md')
  for (const section of requiredAgentSections) {
    if (!agents.includes(section)) findings.push({ code: 'AGENTS_SECTION_MISSING', section })
  }

  const requiredAgentSemantics = [
    'Continue the highest-priority dependency-correct work that can safely be completed autonomously.',
    'Do not stop merely because one task, commit or pull-request subtask has finished.',
    'Implementing → Validating → Ready → Mergeable → Merged',
    'GitHub Draft reserved for exceptional incomplete/non-reviewable work',
    'maximum ordinary open implementation PRs: **3**',
    'maximum dependent PR stack depth: **2**',
    'VALIDATION WAITING',
    'Reuse the **pattern before sharing runtime implementation**',
    'exports/schema.sql',
    'Chat history is supporting context only.'
  ]
  for (const marker of requiredAgentSemantics) {
    if (!agents.includes(marker)) findings.push({ code: 'AGENTS_AUTONOMY_MARKER_MISSING', marker })
  }
}

const statusPath = path.join(root, 'STATUS.md')
if (fs.existsSync(statusPath)) {
  const status = readText('STATUS.md')
  for (const section of requiredStatusSections) {
    if (!status.includes(section)) findings.push({ code: 'STATUS_SECTION_MISSING', section })
  }

  if (!status.startsWith('---\n')) {
    findings.push({ code: 'STATUS_FRONT_MATTER_MISSING' })
  } else {
    const endIndex = status.indexOf('\n---\n', 4)
    if (endIndex === -1) {
      findings.push({ code: 'STATUS_FRONT_MATTER_UNTERMINATED' })
    } else {
      const frontMatter = status.slice(4, endIndex)
      const requiredPatterns = [
        ['project', /^project:\s*\S.+$/m],
        ['portfolio_state', /^portfolio_state:\s*(PLANNED|READY|ACTIVE|VALIDATING|BLOCKED|MAINTENANCE|COMPLETE)$/m],
        ['execution_slot', /^execution_slot:\s*(BUILDING|INTEGRATING|VERIFYING|WAITING|NONE)$/m],
        ['phase', /^phase:\s*.+$/m],
        ['stage', /^stage:\s*.+$/m],
        ['gate', /^gate:\s*(Project Entry|Change|Integration|Release|Completion)$/m],
        ['execution_state', /^execution_state:\s*(READY|IMPLEMENTING|VALIDATING|BLOCKED|COMPLETE|MAINTENANCE)$/m],
        ['current_work', /^current_work:\s*$/m],
        ['current_work.objective', /^\s{2}objective:\s*.+$/m],
        ['current_work.issue', /^\s{2}issue:\s*(null|\d+)$/m],
        ['current_work.pr', /^\s{2}pr:\s*(null|\d+)$/m],
        ['current_work.branch', /^\s{2}branch:\s*(null|\S.+)$/m],
        ['next_actions', /^next_actions:\s*$/m],
        ['blockers', /^blockers:\s*(\[\])?$/m],
        ['requires_owner_decision', /^requires_owner_decision:\s*(true|false)$/m],
        ['owner_decision', /^owner_decision:\s*$/m],
        ['wip', /^wip:\s*$/m],
        ['wip.open_implementation_prs', /^\s{2}open_implementation_prs:\s*\d+$/m],
        ['wip.dependent_stack_depth', /^\s{2}dependent_stack_depth:\s*\d+$/m],
        ['wip.max_open_implementation_prs', /^\s{2}max_open_implementation_prs:\s*3$/m],
        ['wip.max_dependent_stack_depth', /^\s{2}max_dependent_stack_depth:\s*2$/m],
        ['evidence', /^evidence:\s*$/m],
        ['evidence.observed_main_commit', /^\s{2}observed_main_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['evidence.current_candidate_commit', /^\s{2}current_candidate_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['evidence.latest_validated_commit', /^\s{2}latest_validated_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['evidence.latest_deployed_commit', /^\s{2}latest_deployed_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['evidence.latest_runtime_verified_commit', /^\s{2}latest_runtime_verified_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['evidence.latest_browser_verified_commit', /^\s{2}latest_browser_verified_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['validation', /^validation:\s*$/m],
        ['validation.governance', /^\s{2}governance:\s*(PASS|FAIL|NOT_RUN|NOT_APPLICABLE)$/m],
        ['validation.lint', /^\s{2}lint:\s*(PASS|FAIL|NOT_RUN|NOT_APPLICABLE)$/m],
        ['validation.typecheck', /^\s{2}typecheck:\s*(PASS|FAIL|NOT_RUN|NOT_APPLICABLE)$/m],
        ['validation.tests', /^\s{2}tests:\s*(PASS|FAIL|NOT_RUN|NOT_APPLICABLE)$/m],
        ['validation.build', /^\s{2}build:\s*(PASS|FAIL|NOT_RUN|NOT_APPLICABLE)$/m],
        ['validation.ci', /^\s{2}ci:\s*(PASS|FAIL|PENDING|NOT_RUN|NOT_APPLICABLE)$/m],
        ['validation.runtime', /^\s{2}runtime:\s*(VERIFIED|UNVERIFIED|NOT_APPLICABLE)$/m],
        ['last_verified_commit', /^last_verified_commit:\s*(null|"?[0-9a-f]{40}"?)$/m],
        ['last_updated', /^last_updated:\s*"?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})"?$/m]
      ]

      for (const [field, pattern] of requiredPatterns) {
        if (!pattern.test(frontMatter)) findings.push({ code: 'STATUS_FRONT_MATTER_FIELD_INVALID', field })
      }

      if (!/^next_actions:\s*\n(?: {2}- .+(?:\n|$))+/m.test(frontMatter)) {
        findings.push({ code: 'STATUS_NEXT_ACTIONS_EMPTY' })
      }

      const openImplementationPrs = Number(/^\s{2}open_implementation_prs:\s*(\d+)$/m.exec(frontMatter)?.[1])
      const dependentStackDepth = Number(/^\s{2}dependent_stack_depth:\s*(\d+)$/m.exec(frontMatter)?.[1])
      if (Number.isFinite(openImplementationPrs) && openImplementationPrs > 3) {
        findings.push({ code: 'STATUS_WIP_LIMIT_EXCEEDED', openImplementationPrs, maximum: 3 })
      }
      if (Number.isFinite(dependentStackDepth) && dependentStackDepth > 2) {
        findings.push({ code: 'STATUS_DEPENDENT_STACK_LIMIT_EXCEEDED', dependentStackDepth, maximum: 2 })
      }
    }
  }
}


const projectPath = path.join(root, 'PROJECT.md')
if (fs.existsSync(projectPath)) {
  const project = readText('PROJECT.md')
  const requiredMasterMarkers = [
    'AI-First Platform Development Framework v3.2',
    'AI Platform Development Standard v1.5',
    'Project Documentation Standard v1.5',
    'Pull Request Lifecycle Standard v1.1',
    'GitHub Reference Guide v1.2',
    'Testing, Validation & Release Standard v1.2'
  ]
  for (const marker of requiredMasterMarkers) {
    if (!project.includes(marker)) findings.push({ code: 'MASTER_ADOPTION_MARKER_MISSING', marker })
  }
}

const routeInputs = [
  'src/App.jsx',
  'src/data/publicDocuments.js',
  'SYSTEM_MAP.md'
]
if (routeInputs.every((file) => fs.existsSync(path.join(root, file)))) {
  const sourceRoutes = extractSourceRoutes({
    appText: readText('src/App.jsx'),
    publicDocumentsText: readText('src/data/publicDocuments.js')
  })
  const mappedRoutes = extractSystemMapRoutes(readText('SYSTEM_MAP.md'))
  const drift = routeMapDrift({ sourceRoutes, mappedRoutes })
  for (const route of drift.missing) findings.push({ code: 'SYSTEM_MAP_ROUTE_MISSING', route })
  for (const route of drift.stale) findings.push({ code: 'SYSTEM_MAP_ROUTE_STALE', route })
} else {
  for (const file of routeInputs) {
    if (!fs.existsSync(path.join(root, file))) findings.push({ code: 'ROUTE_AUTHORITY_FILE_MISSING', path: file })
  }
}

const contractPath = path.join(root, 'contracts/pourfolio-data-contract.json')
const envPath = path.join(root, '.env.example')
const architecturePath = path.join(root, 'ARCHITECTURE.md')
let dataContract = null
if (fs.existsSync(contractPath)) {
  try {
    dataContract = JSON.parse(readText('contracts/pourfolio-data-contract.json'))
  } catch (error) {
    findings.push({ code: 'DATA_CONTRACT_INVALID_FOR_DOCUMENTATION_CHECK', message: error.message })
  }
}
if (dataContract && fs.existsSync(envPath) && fs.existsSync(architecturePath)) {
  const drift = environmentDrift({
    contractNames: canonicalEnvironmentNames(dataContract),
    templateNames: environmentAssignments(readText('.env.example')),
    architectureText: readText('ARCHITECTURE.md')
  })
  for (const name of drift.missingFromTemplate) findings.push({ code: 'CANONICAL_ENV_MISSING_FROM_TEMPLATE', name })
  for (const name of drift.extraInTemplate) findings.push({ code: 'CANONICAL_ENV_EXTRA_IN_TEMPLATE', name })
  for (const name of drift.missingFromArchitecture) findings.push({ code: 'CANONICAL_ENV_MISSING_FROM_ARCHITECTURE', name })
}

const packagePath = path.join(root, 'package.json')
if (fs.existsSync(packagePath)) {
  let packageJson
  try {
    packageJson = JSON.parse(readText('package.json'))
  } catch (error) {
    findings.push({ code: 'PACKAGE_JSON_INVALID_FOR_DOCUMENTATION_CHECK', message: error.message })
  }
  if (packageJson) {
    for (const drift of runtimeDocumentationDrift({
      packageJson,
      documents: Object.fromEntries(['AGENTS.md', 'PROJECT.md', 'README.md']
        .filter((file) => fs.existsSync(path.join(root, file)))
        .map((file) => [file, readText(file)]))
    })) {
      findings.push({ code: 'RUNTIME_DOCUMENTATION_DRIFT', ...drift })
    }
  }
}

const ratingProxyPath = path.join(root, 'api/rating-data-proxy.js')
if (dataContract && fs.existsSync(ratingProxyPath)) {
  const drift = ratingBonusFieldDrift({
    contract: dataContract,
    ratingCode: readText('api/rating-data-proxy.js')
  })
  if (drift.invalidContractFields.length) {
    findings.push({ code: 'RATING_BONUS_PROVIDER_FIELD_AMBIGUOUS', fields: drift.invalidContractFields })
  } else if (!drift.expected) {
    findings.push({ code: 'RATING_BONUS_PROVIDER_FIELD_MISSING' })
  } else {
    if (drift.expectedMissingFromCode) findings.push({ code: 'RATING_BONUS_FIELD_MISSING_FROM_CODE', field: drift.expected })
    for (const field of drift.stale) findings.push({ code: 'RATING_BONUS_STALE_FIELD_IN_CODE', field, expected: drift.expected })
  }
}

const providerGuidePath = path.join(root, 'docs/nocodebackend/README.md')
if (fs.existsSync(agentsPath) && fs.existsSync(providerGuidePath) && fs.existsSync(statusPath)) {
  for (const code of providerWriteApprovalFindings({
    agentsText: readText('AGENTS.md'),
    providerReadmeText: readText('docs/nocodebackend/README.md'),
    statusText: readText('STATUS.md')
  })) {
    findings.push({ code })
  }
}

const lifecycleWorkflowPath = path.join(root, '.github/workflows/pr-lifecycle.yml')
if (fs.existsSync(lifecycleWorkflowPath)) {
  for (const code of lifecycleWorkflowFindings(readText('.github/workflows/pr-lifecycle.yml'))) {
    findings.push({ code })
  }
} else {
  findings.push({ code: 'PR_LIFECYCLE_WORKFLOW_MISSING' })
}

const blockerOwnerDocuments = ['PROJECT.md', 'ARCHITECTURE.md', 'ROADMAP.md', 'SYSTEM_MAP.md', 'AGENTS.md', 'README.md']
for (const pathValue of competingBlockerHeadingPaths(Object.fromEntries(
  blockerOwnerDocuments
    .filter((file) => fs.existsSync(path.join(root, file)))
    .map((file) => [file, readText(file)])
))) {
  findings.push({ code: 'COMPETING_CURRENT_BLOCKER_LIST', path: pathValue })
}

const issueEvidencePath = path.join(root, 'docs/evidence/github-issue-state.json')
if (!fs.existsSync(issueEvidencePath)) {
  findings.push({ code: 'GITHUB_ISSUE_STATE_EVIDENCE_MISSING', path: 'docs/evidence/github-issue-state.json' })
} else if (fs.existsSync(statusPath)) {
  try {
    const issueEvidence = JSON.parse(readText('docs/evidence/github-issue-state.json'))
    const drift = blockerEvidenceDrift({
      blockerIssues: blockerIssueNumbers(readText('STATUS.md')),
      issueEvidence: issueEvidence.issues || []
    })
    for (const issue of drift.missing) findings.push({ code: 'STATUS_BLOCKER_MISSING_RETAINED_ISSUE_EVIDENCE', issue })
    for (const issue of drift.closed) findings.push({ code: 'STATUS_BLOCKER_RECORDED_CLOSED', issue })
  } catch (error) {
    findings.push({ code: 'GITHUB_ISSUE_STATE_EVIDENCE_INVALID', message: error.message })
  }
}

const workflowPath = '.github/workflows/pull-request-validation.yml'
const workflowFullPath = path.join(root, workflowPath)
if (!fs.existsSync(workflowFullPath)) {
  findings.push({ code: 'CANONICAL_VALIDATION_WORKFLOW_MISSING', path: workflowPath })
} else if (!readText(workflowPath).includes('run: npm run platform:validate')) {
  findings.push({ code: 'CANONICAL_VALIDATION_WORKFLOW_DIVERGED', path: workflowPath })
}

findings.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))

const result = { status: findings.length ? 'BLOCKED' : 'PASS', findings }
process.stdout.write(`${JSON.stringify(result)}\n`)
if (findings.length) process.exitCode = 1
