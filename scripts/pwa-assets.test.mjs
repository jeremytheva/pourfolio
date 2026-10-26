import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  discoverPublicAssets,
  injectOfflineAssets,
  prepareOfflineShell
} from './pwa-assets.mjs'

const SOURCE = `const CACHE = 'pourfolio-static-shell-v1'
const BUILD_ASSETS = []
// Service worker placeholder`

test('offline build produces a deterministic versioned bundle allowlist, no API data', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pourfolio-offline-'))
  try {
    const assetRoot = path.join(directory, 'assets')
    await mkdir(assetRoot)
    await writeFile(path.join(assetRoot, 'index-abc123.js'), 'export default 42')
    await writeFile(path.join(assetRoot, 'main-bc456.css'), 'body{}')
    await writeFile(path.join(assetRoot, 'secrets.txt'), 'NOT_AN_ASSET')
    await writeFile(path.join(directory, 'sw.js'), SOURCE)
    const assets = await discoverPublicAssets(directory)
    assert.deepEqual(assets, ['/assets/index-abc123.js', '/assets/main-bc456.css'])
    const result = await prepareOfflineShell(directory)
    assert.equal(result.count, 2)
    const sw = await readFile(path.join(directory, 'sw.js'), 'utf8')
    assert.match(sw, /pourfolio-static-shell-[a-f0-9]{16}/)
    assert.match(sw, /index-abc123\.js/)
    assert.match(sw, /main-bc456\.css/)
    assert.doesNotMatch(sw, /secrets\.txt|\/api\//)
    assert.equal(injectOfflineAssets(SOURCE, assets), sw)
    assert.notEqual(injectOfflineAssets(SOURCE, [...assets, '/assets/a-new.js']), sw)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('offline build refuses an incomplete asset set or missing safe placeholders', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pourfolio-offline-negative-'))
  try {
    await mkdir(path.join(directory, 'assets'))
    await writeFile(path.join(directory, 'assets', 'index-a.js'), 'export default 1')
    await assert.rejects(discoverPublicAssets(directory), /JavaScript and CSS/)
    assert.throws(() => injectOfflineAssets('const CACHE = \'bad\'', ['/assets/a.js']), /Invalid offline/)
    assert.throws(() => injectOfflineAssets(SOURCE, []), /Invalid offline/)
    assert.throws(() => injectOfflineAssets(SOURCE, ['/api/private']), /Invalid offline/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
