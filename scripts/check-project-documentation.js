import fs from 'node:fs'
import path from 'node:path'

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
  '## Valid stop and escalation conditions',
  '## Pull-request lifecycle',
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
        ['portfolio_state', /^portfolio_state:\s*(ACTIVE|PAUSED|COMPLETE)$/m],
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
    }
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
