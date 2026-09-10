import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync('.github/workflows/pr-lifecycle.yml', 'utf8')

const section = (start, end) => {
  const startIndex = workflow.indexOf(start)
  const endIndex = workflow.indexOf(end, startIndex + start.length)
  assert.ok(startIndex >= 0, `missing workflow section ${start}`)
  assert.ok(endIndex > startIndex, `missing workflow section boundary ${end}`)
  return workflow.slice(startIndex, endIndex)
}

test('pull_request_target lifecycle workflow defaults to no token authority', () => {
  assert.match(workflow, /on:\n {2}pull_request_target:/)
  assert.match(workflow, /\npermissions: \{\}\n/)
})

test('lifecycle label synchronisation receives only issue-label write authority', () => {
  const sync = section('  sync-pull-request-state:', '  delete-merged-branch:')
  assert.match(sync, /permissions:\n {6}issues: write/)
  assert.doesNotMatch(sync, /pull-requests:\s*write/)
  assert.doesNotMatch(sync, /contents:\s*write/)
  assert.match(sync, /github\.rest\.issues\.removeLabel/)
  assert.match(sync, /github\.rest\.issues\.addLabels/)
  assert.doesNotMatch(sync, /github\.rest\.pulls\./)
})

test('merged-branch cleanup receives only contents write authority', () => {
  const cleanupStart = workflow.indexOf('  delete-merged-branch:')
  assert.ok(cleanupStart >= 0)
  const cleanup = workflow.slice(cleanupStart)
  assert.match(cleanup, /permissions:\n {6}contents: write/)
  assert.doesNotMatch(cleanup, /issues:\s*write/)
  assert.doesNotMatch(cleanup, /pull-requests:\s*write/)
  assert.match(cleanup, /github\.rest\.git\.deleteRef/)
})
