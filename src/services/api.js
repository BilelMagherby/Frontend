const DATABASE_NAME = 'natheelco-taskflow'
const DATABASE_VERSION = 1
const DOCUMENT_STORE = 'documents'
const FILE_STORE = 'files'
const FRONTEND_ONLY = import.meta.env.VITE_FRONTEND_ONLY === 'true'
const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

let databasePromise

function apiUrl(path) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

function openDatabase() {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support local data storage.'))
  }
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(DOCUMENT_STORE)) {
          database.createObjectStore(DOCUMENT_STORE, { keyPath: 'id' })
        }
        if (!database.objectStoreNames.contains(FILE_STORE)) {
          database.createObjectStore(FILE_STORE, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Could not open local TaskFlow storage.'))
      request.onblocked = () => reject(new Error('Close other TaskFlow tabs to finish opening local storage.'))
    })
  }
  return databasePromise
}

function runTransaction(storeName, mode, action) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, mode)
        let result
        try {
          const request = action(transaction.objectStore(storeName))
          request.onsuccess = () => {
            result = request.result
          }
        } catch (error) {
          transaction.abort()
          reject(error)
          return
        }
        transaction.oncomplete = () => resolve(result)
        transaction.onerror = () =>
          reject(transaction.error || new Error('Could not complete the local storage operation.'))
        transaction.onabort = () =>
          reject(transaction.error || new Error('The local storage operation was cancelled.'))
      }),
  )
}

function documentKey(path) {
  const [collection, ...parts] = String(path).split('/')
  const id = parts.join('/')
  if (!collection || !id) throw new Error('A collection and record ID are required.')
  return { collection, id, key: `${collection}/${id}` }
}

async function listDocuments(collection) {
  const documents = await runTransaction(DOCUMENT_STORE, 'readonly', (store) => store.getAll())
  return documents
    .filter((document) => document.collection === collection)
    .map(({ id, data }) => ({ id: id.slice(collection.length + 1), data }))
}

async function getDocument(path) {
  const target = documentKey(path)
  const document = await runTransaction(DOCUMENT_STORE, 'readonly', (store) => store.get(target.key))
  return { exists: Boolean(document), data: document?.data }
}

async function putDocument(path, data) {
  const target = documentKey(path)
  await runTransaction(DOCUMENT_STORE, 'readwrite', (store) =>
    store.put({ id: target.key, collection: target.collection, data }),
  )
  return { id: target.id, data }
}

async function removeDocument(path) {
  const target = documentKey(path)
  await runTransaction(DOCUMENT_STORE, 'readwrite', (store) => store.delete(target.key))
}

async function backendRequest(path, init = {}) {
  let response
  try {
    response = await fetch(apiUrl(path), {
      cache: 'no-store',
      credentials: 'same-origin',
      ...init,
    })
  } catch {
    throw new Error('Could not connect to the TaskFlow database. Check that the backend is running and try again.')
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

function readBody(init) {
  if (!init?.body) return {}
  if (typeof init.body !== 'string') throw new Error('This local operation expects a JSON request body.')
  return JSON.parse(init.body)
}

function createMeeting(data) {
  const id = `meeting-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const meeting = {
    ...data,
    id,
    status: data.status || 'scheduled',
    createdAt: new Date().toISOString(),
    joinUrl: data.instant
      ? data.platform === 'google'
        ? 'https://meet.google.com/new'
        : 'https://zoom.us/start/videomeeting'
      : '',
  }
  return putDocument(`meetings/${id}`, meeting).then(() => ({
    meeting,
    warning: data.instant ? 'The meeting record is saved locally; the meeting provider opens separately.' : '',
  }))
}

export async function request(path, init = {}) {
  const url = new URL(path, window.location.origin)
  const method = (init.method || 'GET').toUpperCase()

  if (!FRONTEND_ONLY) return backendRequest(`${url.pathname}${url.search}`, init)

  if (url.pathname === '/api/clickup' && method === 'GET') {
    let response
    try {
      response = await fetch(apiUrl(`${url.pathname}${url.search}`), { cache: 'no-store' })
    } catch {
      throw new Error('ClickUp sync is unavailable because its optional serverless endpoint could not be reached.')
    }
    const body = await response.json().catch(() => null)
    if (!body) throw new Error('ClickUp sync needs the optional serverless endpoint, which is not available on this host.')
    if (!response.ok) throw new Error(body.error || `ClickUp sync failed (${response.status}).`)
    return body
  }

  if (url.pathname === '/api/docs') {
    const collection = url.searchParams.get('collection')
    const recordPath = url.searchParams.get('path')
    if (method === 'GET' && collection) return listDocuments(collection)
    if (method === 'GET' && recordPath) return getDocument(recordPath)
    if (method === 'DELETE' && collection) {
      const records = await listDocuments(collection)
      await Promise.all(records.map((record) => removeDocument(`${collection}/${record.id}`)))
      return { ok: true }
    }
    const body = readBody(init)
    if (method === 'PUT' && typeof body.path === 'string') return putDocument(body.path, body.data)
    if (method === 'POST' && typeof body.collection === 'string' && Array.isArray(body.items)) {
      await Promise.all(
        body.items.map((item) => putDocument(`${body.collection}/${item.id}`, item.data)),
      )
      return { ok: true, count: body.items.length }
    }
  }

  if (url.pathname === '/api/meetings' && method === 'POST') {
    return createMeeting(readBody(init))
  }

  if (url.pathname === '/api/summarize' && method === 'POST') {
    const { notes = '' } = readBody(init)
    const summary = String(notes).trim().split(/\s+/).slice(0, 60).join(' ')
    return { summary, decisions: [], actions: [] }
  }

  throw new Error(`This feature is not available in standalone frontend mode: ${method} ${url.pathname}`)
}

export const api = {
  list: (collection) =>
    FRONTEND_ONLY
      ? listDocuments(collection)
      : backendRequest(`/api/docs?collection=${encodeURIComponent(collection)}`),
  get: (path) => {
    if (FRONTEND_ONLY) return getDocument(path)
    return backendRequest(`/api/docs?path=${encodeURIComponent(path)}`)
  },
  put: (path, data) =>
    FRONTEND_ONLY
      ? putDocument(path, data)
      : backendRequest('/api/docs', jsonRequest('PUT', { path, data })),
  patch: async (path, data) => {
    if (!FRONTEND_ONLY) return backendRequest('/api/docs', jsonRequest('PATCH', { path, data }))
    const current = await getDocument(path)
    if (!current.exists) throw new Error(`Cannot update missing local record: ${path}`)
    return putDocument(path, { ...current.data, ...data })
  },
  remove: (path) =>
    FRONTEND_ONLY
      ? removeDocument(path)
      : backendRequest(`/api/docs?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
  uploadFile: async (file, scope) => {
    if (!FRONTEND_ONLY) {
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
          multipart: file.size > 5 * 1024 * 1024,
        })
        return { id, url: apiUrl(`/api/files/${id}`), name: file.name, size: file.size }
      }

      const body = new FormData()
      body.append('file', file, file.name)
      return backendRequest(`/api/files?scope=${encodeURIComponent(scope)}`, { method: 'POST', body })
    }
    const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    await runTransaction(FILE_STORE, 'readwrite', (store) =>
      store.put({ id, scope, name: file.name, size: file.size, type: file.type, blob: file }),
    )
    return { id, url: `local-file:${id}`, name: file.name, size: file.size }
  },
  fileUrl: (id) =>
    FRONTEND_ONLY ? `local-file:${encodeURIComponent(id)}` : apiUrl(`/api/files/${encodeURIComponent(id)}`),
  downloadFile: async (id) => {
    if (!FRONTEND_ONLY) {
      let response
      try {
        response = await fetch(apiUrl(`/api/files/${encodeURIComponent(id)}`), {
          cache: 'no-store',
          credentials: 'same-origin',
        })
      } catch {
        throw new Error('Could not connect to the TaskFlow database to download this file.')
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || `The file download failed (${response.status}).`)
      }
      return response.blob()
    }
    const file = await runTransaction(FILE_STORE, 'readonly', (store) => store.get(id))
    if (!file) throw new Error('This file is not available in local browser storage.')
    return file.blob
  },
  deleteFile: async (id) => {
    if (!FRONTEND_ONLY) return backendRequest(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await runTransaction(FILE_STORE, 'readwrite', (store) => store.delete(id))
  },
}

export async function migrateBrowserDataToBackend() {
  if (FRONTEND_ONLY) return { documents: 0, files: 0 }

  const migrationKey = 'taskflow_backend_migration_v1'
  const fileMapKey = `${migrationKey}_files`
  if (localStorage.getItem(migrationKey) === 'complete') return { documents: 0, files: 0 }

  const localDocuments = await runTransaction(DOCUMENT_STORE, 'readonly', (store) => store.getAll())
  const localFiles = await runTransaction(FILE_STORE, 'readonly', (store) => store.getAll())
  let fileMap
  try {
    fileMap = JSON.parse(localStorage.getItem(fileMapKey) || '{}')
  } catch {
    throw new Error('The saved browser file-migration state is invalid; local records were not changed.')
  }

  let migratedFiles = 0
  for (const localFile of localFiles) {
    if (fileMap[localFile.id]) continue
    if (!['config', 'foodics', 'gulf', 'hr'].includes(localFile.scope)) {
      throw new Error(`Cannot migrate a saved file with unsupported scope "${localFile.scope || 'unknown'}".`)
    }
    if (!(localFile.blob instanceof Blob)) {
      throw new Error(`Saved file "${localFile.name || localFile.id}" is unavailable for migration.`)
    }
    const file = new File([localFile.blob], localFile.name || 'taskflow-file', {
      type: localFile.type || localFile.blob.type || 'application/octet-stream',
    })
    const uploaded = await api.uploadFile(file, localFile.scope)
    fileMap[localFile.id] = uploaded.id
    localStorage.setItem(fileMapKey, JSON.stringify(fileMap))
    migratedFiles += 1
  }

  const replaceFileReferences = (value) => {
    if (typeof value === 'string') return fileMap[value] || value
    if (Array.isArray(value)) return value.map(replaceFileReferences)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceFileReferences(item)]))
    }
    return value
  }
  const documentsByCollection = new Map()
  for (const document of localDocuments) {
    if (!document.collection || !document.id.startsWith(`${document.collection}/`)) {
      throw new Error('A saved browser record has an invalid collection path; local records were not changed.')
    }
    const id = document.id.slice(document.collection.length + 1)
    const rows = documentsByCollection.get(document.collection) || []
    rows.push({ id, data: replaceFileReferences(document.data) })
    documentsByCollection.set(document.collection, rows)
  }

  let migratedDocuments = 0
  for (const [collection, rows] of documentsByCollection) {
    const existing = new Set((await api.list(collection)).map((row) => row.id))
    const missing = rows.filter((row) => !existing.has(row.id))
    for (let index = 0; index < missing.length; index += 500) {
      const items = missing.slice(index, index + 500)
      await backendRequest('/api/docs', jsonRequest('POST', { collection, items }))
      migratedDocuments += items.length
    }
  }

  localStorage.setItem(migrationKey, 'complete')
  localStorage.removeItem(fileMapKey)
  return { documents: migratedDocuments, files: migratedFiles }
}
