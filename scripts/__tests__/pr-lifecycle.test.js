import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const workflow = fs.readFileSync(new URL('../../.github/workflows/pr-lifecycle.yml', import.meta.url), 'utf8')
const script = workflow.split('script: |\n')[1].split('\n  delete-merged-branch:')[0].split('\n').map((line) => line.replace(/^ {12}/, '')).join('\n')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const run = new AsyncFunction('github', 'context', 'core', script)
const context = { repo: { owner: 'example', repo: 'project' }, payload: { pull_request: { number: 1, draft: false, labels: [{ name: 'pr:draft' }] } } }

test('read-only label refusal warns and preserves the existing state', async () => {
  const warnings = []
  let removals = 0
  await run({ rest: { issues: {
    addLabels: async () => { throw Object.assign(new Error('integration denied'), { status: 403 }) },
    removeLabel: async () => { removals += 1 }
  } } }, context, { warning: (message) => warnings.push(message) })
  assert.equal(removals, 0)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /403/)
})

test('removal refusal after adding the intended state remains advisory', async () => {
  const warnings = []
  const operations = []
  await run({ rest: { issues: {
    addLabels: async () => operations.push('add'),
    removeLabel: async () => { operations.push('remove'); throw Object.assign(new Error('denied'), { status: 403 }) }
  } } }, context, { warning: (message) => warnings.push(message) })
  assert.deepEqual(operations, ['add', 'remove'])
  assert.equal(warnings.length, 1)
})
