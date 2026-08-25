import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SCOPES = ['dependencies', 'devDependencies']

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const normaliseDependencyMap = (value, source, scope, findings) => {
  if (value === undefined) return {}
  if (!isPlainObject(value)) {
    findings.push({ code: 'invalid_dependency_map', source, scope })
    return {}
  }

  const entries = Object.entries(value)
  for (const [name, specifier] of entries) {
    if (typeof specifier !== 'string' || specifier.length === 0) {
      findings.push({ code: 'invalid_dependency_specifier', source, scope, name })
    }
  }

  return Object.fromEntries(entries.filter(([, specifier]) => typeof specifier === 'string' && specifier.length > 0))
}

export const auditPackageLockContract = (manifest, lockfile) => {
  const findings = []

  if (!isPlainObject(manifest)) {
    return { status: 'BLOCKED', findings: [{ code: 'invalid_package_manifest' }] }
  }

  if (!isPlainObject(lockfile)) {
    return { status: 'BLOCKED', findings: [{ code: 'invalid_lockfile_manifest' }] }
  }

  const lockRoot = lockfile.packages?.['']
  if (!isPlainObject(lockRoot)) {
    return { status: 'BLOCKED', findings: [{ code: 'missing_lockfile_root_package' }] }
  }

  for (const scope of SCOPES) {
    const manifestDependencies = normaliseDependencyMap(manifest[scope], 'package.json', scope, findings)
    const lockDependencies = normaliseDependencyMap(lockRoot[scope], 'package-lock.json', scope, findings)
    const names = [...new Set([...Object.keys(manifestDependencies), ...Object.keys(lockDependencies)])].sort()

    for (const name of names) {
      const manifestSpecifier = manifestDependencies[name]
      const lockSpecifier = lockDependencies[name]

      if (manifestSpecifier === undefined) {
        findings.push({ code: 'extra_lock_dependency', scope, name })
      } else if (lockSpecifier === undefined) {
        findings.push({ code: 'missing_lock_dependency', scope, name })
      } else if (manifestSpecifier !== lockSpecifier) {
        findings.push({ code: 'dependency_specifier_mismatch', scope, name })
      }
    }
  }

  findings.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))

  return {
    status: findings.length === 0 ? 'PASS' : 'BLOCKED',
    findings
  }
}

export const readPackageLockContract = (rootDirectory = process.cwd()) => {
  const readJson = (filename, invalidCode) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(rootDirectory, filename), 'utf8'))
    } catch {
      return { __packageLockContractInvalid: invalidCode }
    }
  }

  const manifest = readJson('package.json', 'invalid_package_manifest')
  const lockfile = readJson('package-lock.json', 'invalid_lockfile_manifest')

  if (manifest.__packageLockContractInvalid) {
    return { status: 'BLOCKED', findings: [{ code: manifest.__packageLockContractInvalid }] }
  }

  if (lockfile.__packageLockContractInvalid) {
    return { status: 'BLOCKED', findings: [{ code: lockfile.__packageLockContractInvalid }] }
  }

  return auditPackageLockContract(manifest, lockfile)
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (isDirectExecution) {
  const result = readPackageLockContract()
  process.stdout.write(`${JSON.stringify(result)}\n`)
  if (result.status !== 'PASS') process.exitCode = 1
}
