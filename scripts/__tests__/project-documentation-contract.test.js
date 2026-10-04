import assert from 'node:assert/strict'
import test from 'node:test'

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
  ratingBonusFieldDrift,
  routeMapDrift,
  runtimeDocumentationDrift
} from '../project-documentation-contract.js'

test('route map drift reports missing and stale routes', () => {
  const sourceRoutes = extractSourceRoutes({
    appText: '<Route path="/home" element={x} /><Route path="/history" element={y} />',
    publicDocumentsText: "[['/privacy', 'Privacy']]"
  })
  const mappedRoutes = extractSystemMapRoutes(`<!-- current-browser-routes:start -->
- \`/home\`
- \`/old\`
- \`/privacy\`
<!-- current-browser-routes:end -->`)
  assert.deepEqual(routeMapDrift({ sourceRoutes, mappedRoutes }), {
    missing: ['/history'],
    stale: ['/old']
  })
})

test('environment drift detects template and architecture disagreement', () => {
  const contractNames = canonicalEnvironmentNames({
    provider: { canonical_environment_variables: ['NOCODEBACKEND_A', 'NOCODEBACKEND_B'] }
  })
  const templateNames = environmentAssignments('NOCODEBACKEND_A=\nNOCODEBACKEND_EXTRA=\n')
  assert.deepEqual(environmentDrift({
    contractNames,
    templateNames,
    architectureText: 'NOCODEBACKEND_A'
  }), {
    missingFromTemplate: ['NOCODEBACKEND_B'],
    extraInTemplate: ['NOCODEBACKEND_EXTRA'],
    missingFromArchitecture: ['NOCODEBACKEND_B']
  })
})

test('runtime documentation follows package React major/minor', () => {
  const findings = runtimeDocumentationDrift({
    packageJson: { dependencies: { react: '^19.3.0' } },
    documents: {
      'AGENTS.md': 'React 19.2',
      'README.md': 'React 19.3'
    }
  })
  assert.deepEqual(findings, [{ path: 'AGENTS.md', expected: 'React 19.3' }])
})

test('rating bonus field drift follows the provider contract rather than stale code', () => {
  const finding = ratingBonusFieldDrift({
    contract: {
      collections: {
        bonus_attribute_rating_mapping: {
          provider_fields: ['id', 'rating_id', 'bonus_attribute_id']
        }
      }
    },
    ratingCode: 'body.bonus_attributes_id'
  })
  assert.equal(finding.expected, 'bonus_attribute_id')
  assert.equal(finding.expectedMissingFromCode, true)
  assert.deepEqual(finding.stale, ['bonus_attributes_id'])
})

test('unsafe lifecycle event and permission changes are detected', () => {
  const unsafe = `on:
  pull_request_target:
permissions:
  contents: write
jobs:
  sync-pull-request-state:
    permissions:
      contents: write
  delete-merged-branch:
    permissions:
      contents: write
`
  const findings = lifecycleWorkflowFindings(unsafe)
  assert.ok(findings.includes('LIFECYCLE_PULL_REQUEST_EVENT_MISSING'))
  assert.ok(findings.includes('LIFECYCLE_PULL_REQUEST_TARGET_UNSAFE'))
  assert.ok(findings.includes('LIFECYCLE_GLOBAL_PERMISSIONS_NOT_EMPTY'))
  assert.ok(findings.includes('LIFECYCLE_LABEL_SYNC_NOT_BEST_EFFORT'))
  assert.ok(findings.includes('LIFECYCLE_CLEANUP_SAME_REPO_GUARD_MISSING'))
})

test('closed retained blocker evidence is detected', () => {
  const status = `---
blockers:
  - scope: one
    issue: 165
  - scope: two
    issue: 577
requires_owner_decision: false
---
`
  const blockers = blockerIssueNumbers(status)
  assert.deepEqual(blockers, [165, 577])
  assert.deepEqual(blockerEvidenceDrift({
    blockerIssues: blockers,
    issueEvidence: [
      { number: 165, state: 'open' },
      { number: 577, state: 'closed' }
    ]
  }), { missing: [], closed: [577] })
})

test('competing current-blocker headings outside STATUS are rejected', () => {
  assert.deepEqual(competingBlockerHeadingPaths({
    'PROJECT.md': '# Project\n## Current blockers\n- x',
    'ROADMAP.md': '# Roadmap\n## Dependencies\n- y'
  }), ['PROJECT.md'])
})
