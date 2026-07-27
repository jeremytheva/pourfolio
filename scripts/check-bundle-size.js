import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'

const ASSET_DIRECTORY = path.resolve('dist/assets')
const MAX_ENTRY_GZIP_BYTES = 180 * 1024
const MAX_TOTAL_JS_GZIP_BYTES = 350 * 1024

const files = await readdir(ASSET_DIRECTORY)
const javascript = files.filter((file) => file.endsWith('.js'))

if (!javascript.length) {
  console.error('Bundle check failed: no built JavaScript assets were found.')
  process.exit(1)
}

const assets = []
for (const file of javascript) {
  const filePath = path.join(ASSET_DIRECTORY, file)
  const [contents, metadata] = await Promise.all([readFile(filePath), stat(filePath)])
  assets.push({
    file,
    bytes: metadata.size,
    gzipBytes: gzipSync(contents).byteLength
  })
}

const largest = [...assets].sort((left, right) => right.gzipBytes - left.gzipBytes)[0]
const totalGzipBytes = assets.reduce((sum, asset) => sum + asset.gzipBytes, 0)

console.log(`Largest JavaScript asset: ${largest.file} (${(largest.gzipBytes / 1024).toFixed(2)} KiB gzip)`)
console.log(`Total JavaScript assets: ${(totalGzipBytes / 1024).toFixed(2)} KiB gzip`)

if (largest.gzipBytes > MAX_ENTRY_GZIP_BYTES || totalGzipBytes > MAX_TOTAL_JS_GZIP_BYTES) {
  console.error('Bundle check failed: JavaScript budget exceeded.')
  process.exit(1)
}
