import fs from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { parseCsv } from './audit-import-references.js'

export const FULL_COMMIT_SHA = /^[a-f0-9]{40}$/
export const SHA256 = /^[a-f0-9]{64}$/
export const UTC_TIMESTAMP = /(?:Z|\+00:00)$/i

export const textValue = (value) => String(value ?? '').trim()

export const isUtcTimestamp = (value) => (
  UTC_TIMESTAMP.test(textValue(value)) && !Number.isNaN(Date.parse(value))
)

export const fingerprintBuffer = (buffer) => ({
  bytes: buffer.byteLength,
  sha256: createHash('sha256').update(buffer).digest('hex')
})

export const resolveEvidenceFile = (manifestPath, file) => {
  const relativeFile = textValue(file)
  if (!relativeFile || path.isAbsolute(relativeFile) || relativeFile.split(/[\\/]/).includes('..')) {
    throw new Error(`Evidence file must be a safe path relative to the manifest: ${relativeFile || '<blank>'}.`)
  }

  const manifestDirectory = fs.realpathSync(path.dirname(path.resolve(manifestPath)))
  const resolved = path.resolve(manifestDirectory, relativeFile)
  const real = fs.realpathSync(resolved)
  if (real !== manifestDirectory && !real.startsWith(`${manifestDirectory}${path.sep}`)) {
    throw new Error(`Evidence file escapes the manifest directory: ${relativeFile}.`)
  }
  return real
}

const parseHeader = (text) => {
  let firstLineEnd = text.length
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1
      else quoted = !quoted
    } else if (character === '\n' && !quoted) {
      firstLineEnd = index
      break
    }
  }
  const firstLine = text.slice(0, firstLineEnd).replace(/\r$/, '')
  if (!firstLine) return []
  return Object.keys(parseCsv(`${firstLine}\n${firstLine}\n`)[0] || {}).filter((key) => key !== '__row')
}

export const readCsvEvidence = (manifestPath, file) => {
  const resolved = resolveEvidenceFile(manifestPath, file)
  const buffer = fs.readFileSync(resolved)
  const text = buffer.toString('utf8')
  return {
    file: path.relative(path.dirname(path.resolve(manifestPath)), resolved),
    ...fingerprintBuffer(buffer),
    headers: parseHeader(text),
    records: parseCsv(text)
  }
}

export const countByCode = (blockers) => blockers.reduce((counts, blocker) => {
  counts[blocker.code] = (counts[blocker.code] || 0) + 1
  return counts
}, {})

export const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0
