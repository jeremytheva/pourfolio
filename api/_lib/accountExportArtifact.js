import { createHash } from 'node:crypto'

import { buildAccountExportManifest } from './accountExport.js'

export const ACCOUNT_EXPORT_ARTIFACT_FILENAME = 'pourfolio-account-data.json'
export const ACCOUNT_EXPORT_ARTIFACT_MEDIA_TYPE = 'application/json; charset=utf-8'

export const ACCOUNT_EXPORT_ARTIFACT_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Disposition': `attachment; filename="${ACCOUNT_EXPORT_ARTIFACT_FILENAME}"`,
  'Content-Type': ACCOUNT_EXPORT_ARTIFACT_MEDIA_TYPE,
  'X-Content-Type-Options': 'nosniff'
})

export const buildAccountExportArtifact = (options) => {
  const manifest = buildAccountExportManifest(options)
  const body = `${JSON.stringify(manifest, null, 2)}\n`
  const checksum = Object.freeze({
    algorithm: 'sha256',
    value: createHash('sha256').update(body, 'utf8').digest('hex')
  })

  return Object.freeze({
    filename: ACCOUNT_EXPORT_ARTIFACT_FILENAME,
    media_type: ACCOUNT_EXPORT_ARTIFACT_MEDIA_TYPE,
    body,
    byte_length: Buffer.byteLength(body, 'utf8'),
    checksum,
    headers: ACCOUNT_EXPORT_ARTIFACT_HEADERS
  })
}