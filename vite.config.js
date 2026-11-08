import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import clickupHandler from './api/clickup.js'

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

function localClickupFunction() {
  const middleware = (request, response, next) => {
    const url = new URL(request.url || '/', 'http://localhost')
    if (url.pathname !== '/api/clickup') {
      next()
      return
    }

    const result = {
      setHeader: (...args) => response.setHeader(...args),
      status(code) {
        response.statusCode = code
        return this
      },
      json(body) {
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(body))
        return this
      },
    }

    clickupHandler(
      {
        method: request.method,
        query: Object.fromEntries(url.searchParams),
      },
      result,
    ).catch((error) => {
      if (!response.headersSent) {
        response.statusCode = 500
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ error: error.message || 'ClickUp sync failed.' }))
      }
    })
  }

  return {
    name: 'local-clickup-function',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const frontendOnly = mode === 'frontend-only'
  if (!process.env.CLICKUP_API_TOKEN) {
    const backendEnv = loadEnv(mode, resolve(frontendDirectory, '..', 'Backend'), '')
    process.env.CLICKUP_API_TOKEN = env.CLICKUP_API_TOKEN || backendEnv.CLICKUP_API_TOKEN || ''
  }

  return {
    plugins: [
      react(),
      cashBankHistoryFallback(),
      ...(frontendOnly ? [localClickupFunction()] : []),
    ],
    define: {
      'import.meta.env.VITE_FRONTEND_ONLY': JSON.stringify(String(frontendOnly)),
    },
    ...(!frontendOnly && {
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
    }),
  }
})
