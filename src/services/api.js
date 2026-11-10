const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
let accessToken = ''

function apiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function authorizationHeaders() {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

async function backendRequest(path, init = {}) {
  let response
  try {
    response = await fetch(apiUrl(path), {
      cache: 'no-store',
      credentials: 'include',
      ...init,
      headers: { ...authorizationHeaders(), ...init.headers },
    })
  } catch {
    throw new Error('Could not connect to the TaskFlow backend. Check the API URL and try again.')
  }

  const text = await response.text()
  let body = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      if (response.ok) throw new Error('The TaskFlow backend returned an invalid response.')
    }
  }
  if (!response.ok) {
    throw new Error(body?.error || `The TaskFlow backend request failed (${response.status}).`)
  }
  return body
}

function jsonRequest(method, body) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export async function request(path, init = {}) {
  const url = new URL(path, window.location.origin)
  const authAction = url.pathname === '/api/auth' && init.method?.toUpperCase() === 'POST'
    ? JSON.parse(init.body || '{}').action
    : ''
  const body = await backendRequest(`${url.pathname}${url.search}`, init)
  if (url.pathname === '/api/auth') {
    accessToken = body?.token || ''
    if (authAction === 'logout') accessToken = ''
  }
  return body
}

export const api = {
  list: (collection) => backendRequest(`/api/docs?collection=${encodeURIComponent(collection)}`),
  get: (path) => backendRequest(`/api/docs?path=${encodeURIComponent(path)}`),
  put: (path, data) => backendRequest('/api/docs', jsonRequest('PUT', { path, data })),
  patch: (path, data) => backendRequest('/api/docs', jsonRequest('PATCH', { path, data })),
  remove: (path) => backendRequest(`/api/docs?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  uploadFile: async (file, scope) => {
    if (import.meta.env.PROD) {
      const id = Array.from(crypto.getRandomValues(new Uint8Array(18)))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
      const { upload } = await import('@vercel/blob/client')
      await upload(id, file, {
        access: 'private',
        contentType: file.type || 'application/octet-stream',
        handleUploadUrl: apiUrl(`/api/files?scope=${encodeURIComponent(scope)}`),
        clientPayload: JSON.stringify({ id, scope, name: file.name }),
        headers: authorizationHeaders(),
        multipart: file.size > 5 * 1024 * 1024,
      })
      return { id, url: apiUrl(`/api/files/${id}`), name: file.name, size: file.size }
    }

    const body = new FormData()
    body.append('file', file, file.name)
    return backendRequest(`/api/files?scope=${encodeURIComponent(scope)}`, { method: 'POST', body })
  },
  fileUrl: (id) => apiUrl(`/api/files/${encodeURIComponent(id)}`),
  downloadFile: async (id) => {
    let response
    try {
      response = await fetch(apiUrl(`/api/files/${encodeURIComponent(id)}`), {
        cache: 'no-store',
        credentials: 'include',
        headers: authorizationHeaders(),
      })
    } catch {
      throw new Error('Could not connect to the TaskFlow backend to download this file.')
    }
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error || `The file download failed (${response.status}).`)
    }
    return response.blob()
  },
  downloadMailAttachment: async (messageId, attachmentId, filename) => {
    const path = `/api/mails/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}?filename=${encodeURIComponent(filename)}`
    let response
    try {
      response = await fetch(apiUrl(path), {
        cache: 'no-store',
        credentials: 'include',
        headers: authorizationHeaders(),
      })
    } catch {
      throw new Error('Could not connect to the TaskFlow backend to download this attachment.')
    }
    if (response.status === 401) window.dispatchEvent(new CustomEvent('taskflow:locked'))
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error || `The attachment download failed (${response.status}).`)
    }
    return response.blob()
  },
  deleteFile: (id) => backendRequest(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
