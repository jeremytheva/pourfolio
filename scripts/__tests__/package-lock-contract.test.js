import assert from 'node:assert/strict'
import test from 'node:test'

import { auditPackageLockContract } from '../check-package-lock-contract.js'

const validManifest = {
  dependencies: {
    alpha: '^1.0.0'
  },
  devDependencies: {
    beta: '^2.0.0'
  }
}

const validLockfile = {
  packages: {
    '': {
      dependencies: {
        alpha: '^1.0.0'
      },
      devDependencies: {
        beta: '^2.0.0'
      }
    }
  }
}

test('matching manifest and lock root dependency specifiers pass', () => {
  assert.deepEqual(auditPackageLockContract(validManifest, validLockfile), {
    status: 'PASS',
    findings: []
  })
})

test('changed dependency specifiers fail closed', () => {
  const result = auditPackageLockContract(
    { ...validManifest, dependencies: { alpha: '^1.1.0' } },
    validLockfile
  )

  assert.deepEqual(result, {
    status: 'BLOCKED',
    findings: [{ code: 'dependency_specifier_mismatch', scope: 'dependencies', name: 'alpha' }]
  })
})

test('missing and extra dependency names are reported deterministically', () => {
  const result = auditPackageLockContract(
    {
      dependencies: { alpha: '^1.0.0', gamma: '^3.0.0' },
      devDependencies: {}
    },
    {
      packages: {
        '': {
          dependencies: { alpha: '^1.0.0', delta: '^4.0.0' },
          devDependencies: { beta: '^2.0.0' }
        }
      }
    }
  )

  assert.equal(result.status, 'BLOCKED')
  assert.deepEqual(result.findings, [
    { code: 'extra_lock_dependency', scope: 'dependencies', name: 'delta' },
    { code: 'extra_lock_dependency', scope: 'devDependencies', name: 'beta' },
    { code: 'missing_lock_dependency', scope: 'dependencies', name: 'gamma' }
  ].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right))))
})

test('malformed manifest and lock structures fail closed without coercion', () => {
  assert.deepEqual(auditPackageLockContract(null, validLockfile), {
    status: 'BLOCKED',
    findings: [{ code: 'invalid_package_manifest' }]
  })

  assert.deepEqual(auditPackageLockContract(validManifest, { packages: {} }), {
    status: 'BLOCKED',
    findings: [{ code: 'missing_lockfile_root_package' }]
  })

  const invalidMap = auditPackageLockContract(
    { dependencies: [], devDependencies: {} },
    validLockfile
  )

  assert.equal(invalidMap.status, 'BLOCKED')
  assert.ok(invalidMap.findings.some((finding) => finding.code === 'invalid_dependency_map'))
})

test('invalid dependency specifiers never pass as matching values', () => {
  const result = auditPackageLockContract(
    { dependencies: { alpha: null }, devDependencies: {} },
    { packages: { '': { dependencies: { alpha: null }, devDependencies: {} } } }
  )

  assert.equal(result.status, 'BLOCKED')
  assert.equal(result.findings.filter((finding) => finding.code === 'invalid_dependency_specifier').length, 2)
})
