import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { prepareOfflineShell } from './scripts/pwa-assets.mjs'

const offlineShellManifest = () => ({
  name: 'pourfolio-offline-static-shell',
  apply: 'build',
  async closeBundle() {
    const result = await prepareOfflineShell(path.resolve('dist'))
    console.log(`Offline app shell: ${result.count} hashed assets prepared`)
  }
})

const previewApiBoundary = (apiProxyTarget) => ({
  name: 'pourfolio-preview-api-boundary',
  configureServer(server) {
    if (apiProxyTarget) return
    server.middlewares.use('/api', (_request, response) => {
      response.statusCode = 503
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(JSON.stringify({
        error: 'The local API proxy is not configured.',
        code: 'preview_api_unconfigured'
      }))
    })
  }
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.POURFOLIO_API_PROXY_TARGET?.trim()

  return {
    plugins: [react(), previewApiBoundary(apiProxyTarget), offlineShellManifest()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src')
      }
    },
    server: {
      historyApiFallback: true,
      ...(apiProxyTarget
        ? {
            proxy: {
              '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
                secure: true,
                cookieDomainRewrite: ''
              }
            }
          }
        : {})
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 600
    }
  }
})
