import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const frontendDirectory = dirname(fileURLToPath(import.meta.url))

function cashBankHistoryFallback() {
  const rewriteCashBankRoute = (request, _response, next) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (
      (url.pathname === '/cash-bank' || url.pathname.startsWith('/cash-bank/')) &&
      !/\.[^/]+$/.test(url.pathname)
    ) {
      request.url = `/cash-bank/index.html${url.search}`
    }
    next()
  }

  return {
    name: 'cash-bank-history-fallback',
    configureServer(server) {
      server.middlewares.use(rewriteCashBankRoute)
    },
    configurePreviewServer(server) {
      server.middlewares.use(rewriteCashBankRoute)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendDirectory, '')
  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL must be configured for production builds.')
  }
  if (!process.env.CLICKUP_API_TOKEN) {
    const backendEnv = loadEnv(mode, resolve(frontendDirectory, '..', 'Backend'), '')
    process.env.CLICKUP_API_TOKEN = env.CLICKUP_API_TOKEN || backendEnv.CLICKUP_API_TOKEN || ''
  }

  return {
    plugins: [react(), cashBankHistoryFallback()],
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8889',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyRequest, request) => {
              if (request.headers.origin) proxyRequest.setHeader('origin', 'http://127.0.0.1:8889')
            })
          },
        },
      },
    },
    preview: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8889',
          changeOrigin: true,
          configure(proxy) {
            proxy.on('proxyReq', (proxyRequest, request) => {
              if (request.headers.origin) proxyRequest.setHeader('origin', 'http://127.0.0.1:8889')
            })
          },
        },
      },
    },
  }
})
