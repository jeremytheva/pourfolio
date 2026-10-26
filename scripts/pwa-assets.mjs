import { createHash } from 'node:crypto'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const SHELL_CACHE_PREFIX = 'pourfolio-static-shell-'

const CACHE_TOKEN = "const CACHE = 'pourfolio-static-shell-v1'"
const ASSETS_TOKEN = 'const BUILD_ASSETS = []'
const CACHEABLE_ASSET = /\.(?:js|css|svg|png|webp|woff2?)$/
const MAX_ASSETS = 300
const MAX_PRECACHE_BYTES = 30 * 1024 * 1024

const collect = async (root, subdirectory = '') => {
  const directory = path.join(root, subdirectory)
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relative = path.posix.join(subdirectory.replaceAll(path.sep, '/'), entry.name)
    if (entry.isDirectory()) {
      files.push(...await collect(root, relative))
    } else if (entry.isFile() && CACHEABLE_ASSET.test(entry.name)) {
      files.push(relative)
    }
  }
  return files
}

export const discoverPublicAssets = async (buildDirectory) => {
  const assetRoot = path.join(buildDirectory, 'assets')
  const filenames = (await collect(assetRoot)).sort()
  if (!filenames.some((file) => file.endsWith('.js')) ||
      !filenames.some((file) => file.endsWith('.css'))) {
    throw new Error('Offline shell requires built JavaScript and CSS assets.')
  }
  if (filenames.length > MAX_ASSETS) {
    throw new Error('Offline shell asset count exceeds the reviewed limit.')
  }
  let totalBytes = 0
  for (const file of filenames) {
    totalBytes += (await stat(path.join(assetRoot, file))).size
  }
  if (totalBytes > MAX_PRECACHE_BYTES) {
    throw new Error('Offline shell asset size exceeds the reviewed limit.')
  }
  return filenames.map((file) => '/assets/' + file)
}

export const injectOfflineAssets = (workerSource, assetPaths) => {
  if (typeof workerSource !== 'string' ||
      workerSource.split(CACHE_TOKEN).length !== 2 ||
      workerSource.split(ASSETS_TOKEN).length !== 2 ||
      !Array.isArray(assetPaths) ||
      !assetPaths.length ||
      assetPaths.some((item) => typeof item !== 'string' || !item.startsWith('/assets/'))) {
    throw new Error('Invalid offline shell manifest or source placeholders.')
  }
  const version = createHash('sha256').update(JSON.stringify(assetPaths)).digest('hex').slice(0, 16)
  return workerSource
    .replace(CACHE_TOKEN, `const CACHE = '${SHELL_CACHE_PREFIX}${version}'`)
    .replace(ASSETS_TOKEN, `const BUILD_ASSETS = ${JSON.stringify(assetPaths)}`)
}

export const prepareOfflineShell = async (buildDirectory) => {
  const assets = await discoverPublicAssets(buildDirectory)
  const workerPath = path.join(buildDirectory, 'sw.js')
  const source = await readFile(workerPath, 'utf8')
  const generated = injectOfflineAssets(source, assets)
  await writeFile(workerPath, generated, 'utf8')
  return { count: assets.length }
}
