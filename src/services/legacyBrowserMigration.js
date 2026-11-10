import { api, request } from './api.js'
import { FOODICS_PROJECTS } from '../pages/FoodicsManagement/foodicsData.js'
import { parseLegacyRoleUsers } from '../utils/session.js'

const MIGRATION_KEY = 'taskflowMigrationV1'

function openLegacyDatabase(name, version, stores) {
  if (!window.indexedDB) throw new Error('Legacy browser storage is unavailable for migration.')
  return new Promise((resolve, reject) => {
    const opening = window.indexedDB.open(name, version)
    opening.onupgradeneeded = () => {
      for (const store of stores) {
        if (!opening.result.objectStoreNames.contains(store)) opening.result.createObjectStore(store, { keyPath: 'id' })
      }
    }
    opening.onsuccess = () => resolve(opening.result)
    opening.onerror = () => reject(opening.error || new Error(`Could not read legacy database "${name}".`))
    opening.onblocked = () => reject(new Error(`Close other dashboard tabs before migrating "${name}".`))
  })
}

function readStore(database, storeName, method = 'getAll', key) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const request = key === undefined
      ? transaction.objectStore(storeName)[method]()
      : transaction.objectStore(storeName)[method](key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error(`Could not read legacy "${storeName}" data.`))
    transaction.onabort = () => reject(transaction.error || new Error(`Reading legacy "${storeName}" data was cancelled.`))
  })
}

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const deletion = window.indexedDB.deleteDatabase(name)
    deletion.onsuccess = () => resolve()
    deletion.onerror = () => reject(deletion.error || new Error(`Could not remove migrated database "${name}".`))
    deletion.onblocked = () => reject(new Error(`Close other dashboard tabs to finish migrating "${name}".`))
  })
}

function legacyStorageValue(key) {
  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    throw new Error(`Could not access legacy browser data: ${error.message}`)
  }
}

async function savePreferences(userId, changes) {
  await api.patch(`preferences/${userId}`, changes)
}

async function migrateTaskflowDocuments(preferences) {
  const database = await openLegacyDatabase('natheelco-taskflow', 1, ['documents', 'files'])
  try {
    const [documents, files] = await Promise.all([
      readStore(database, 'documents'),
      readStore(database, 'files'),
    ])
    let fileMap = preferences.taskflowFileMap || {}
    for (const localFile of files) {
      if (fileMap[localFile.id]) continue
      if (!['config', 'foodics', 'gulf', 'hr'].includes(localFile.scope) || !(localFile.blob instanceof Blob)) {
        throw new Error(`Saved browser file "${localFile.name || localFile.id}" is invalid or has an unsupported scope.`)
      }
      const file = new File([localFile.blob], localFile.name || 'taskflow-file', {
        type: localFile.type || localFile.blob.type || 'application/octet-stream',
      })
      const uploaded = await api.uploadFile(file, localFile.scope)
      fileMap = { ...fileMap, [localFile.id]: uploaded.id }
      preferences = { ...preferences, taskflowFileMap: fileMap }
      await savePreferences(preferences.id, { taskflowFileMap: fileMap })
    }

    const replaceFileReferences = (value) => {
      if (typeof value === 'string') return fileMap[value] || value
      if (Array.isArray(value)) return value.map(replaceFileReferences)
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceFileReferences(item)]))
      }
      return value
    }
    const grouped = new Map()
    for (const document of documents) {
      if (!document.collection || !document.id.startsWith(`${document.collection}/`)) {
        throw new Error('A saved browser record has an invalid collection path; local records were not changed.')
      }
      const id = document.id.slice(document.collection.length + 1)
      const rows = grouped.get(document.collection) || []
      rows.push({ id, data: replaceFileReferences(document.data) })
      grouped.set(document.collection, rows)
    }

    let migrated = 0
    for (const [collection, rows] of grouped) {
      const existing = new Set((await api.list(collection)).map((row) => row.id))
      const missing = rows.filter((row) => !existing.has(row.id))
      for (let index = 0; index < missing.length; index += 500) {
        const items = missing.slice(index, index + 500)
        await request('/api/docs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ collection, items }),
        })
        migrated += items.length
      }
    }
    return { preferences, documents: migrated, files: Object.keys(fileMap).length }
  } finally {
    database.close()
  }
}

async function migrateFoodics(preferences) {
  const database = await openLegacyDatabase('natheelco-foodics-library', 1, ['records', 'files', 'settings'])
  try {
    const [records, files, settings] = await Promise.all([
      readStore(database, 'records'),
      readStore(database, 'files'),
      readStore(database, 'settings'),
    ])
    const fileMap = { ...(preferences.foodicsFileMap || {}) }
    const remoteRecords = new Set((await api.list('foodics')).map((row) => row.id))
    for (const record of records) {
      if (remoteRecords.has(record.id)) continue
      const next = { ...record }
      if (record.fileId) {
        const savedFile = files.find((file) => file.id === record.fileId)
        if (savedFile?.blob) {
          let uploadedId = fileMap[record.fileId]
          if (!uploadedId) {
            const uploaded = await api.uploadFile(
              new File([savedFile.blob], record.fileName || 'foodics-document', {
                type: savedFile.blob.type || 'application/octet-stream',
              }),
              'foodics',
            )
            uploadedId = uploaded.id
            fileMap[record.fileId] = uploadedId
            preferences = { ...preferences, foodicsFileMap: fileMap }
            await savePreferences(preferences.id, { foodicsFileMap: fileMap })
          }
          next.fileId = uploadedId
        } else {
          next.fileId = ''
        }
      }
      await api.put(`foodics/${record.id}`, next)
    }

    const settingMap = new Map(settings.map((setting) => [setting.id, setting.value]))
    const legacyWorkflow = settingMap.get('workflow')
    for (const project of FOODICS_PROJECTS) {
      const workflow = settingMap.get(`workflow:${project.id}`) ||
        (project.id === FOODICS_PROJECTS[0].id ? legacyWorkflow : null)
      if (!workflow || !Object.keys(workflow).length) continue
      const existing = await api.get(`foodics-settings/${project.id}`)
      if (!existing.exists) await api.put(`foodics-settings/${project.id}`, { value: workflow })
    }
  } finally {
    database.close()
  }
}

async function migrateHr() {
  const saved = legacyStorageValue('taskflow_hr_records')
  if (!saved) return
  const records = JSON.parse(saved)
  if (!Array.isArray(records) || records.some((record) =>
    !record || typeof record.id !== 'string' || typeof record.module !== 'string' ||
    !record.data || typeof record.data !== 'object' || Array.isArray(record.data)
  )) {
    throw new Error('Legacy HR browser data has an invalid format; it was not removed.')
  }
  const current = new Set((await api.list('hr')).map((row) => row.id))
  for (const record of records) {
    if (!current.has(record.id)) await api.put(`hr/${record.id}`, record)
  }
}

async function migrateRoleUsers() {
  const saved = legacyStorageValue('taskflow_role_users')
  if (!saved) return
  const legacyUsers = parseLegacyRoleUsers(saved)
  const current = await request('/api/users')
  if (!current.length) {
    await request('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users: legacyUsers }),
    })
  }
}

export async function migrateLegacyBrowserData(user) {
  if (!user?.isAdmin) return { documents: 0, files: 0, migrated: false }

  const result = await api.get(`preferences/${user.id}`)
  let preferences = { id: user.id, ...(result.exists ? result.data : {}) }
  if (preferences[MIGRATION_KEY]) return { documents: 0, files: 0, migrated: false }

  let migratedDocuments = 0
  let migratedFiles = 0
  const taskflow = await migrateTaskflowDocuments(preferences)
  preferences = taskflow.preferences
  migratedDocuments += taskflow.documents
  migratedFiles += taskflow.files
  await migrateFoodics(preferences)
  await migrateHr()
  await migrateRoleUsers()

  const legacyPreferences = legacyStorageValue('taskflow_demo_preferences')
  if (legacyPreferences) {
    const parsed = JSON.parse(legacyPreferences)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Legacy dashboard preferences have an invalid format; they were not removed.')
    }
    preferences = { ...parsed, ...preferences }
  }
  const legacyCalendarPerson = legacyStorageValue('who')
  const legacyReminders = legacyStorageValue('rem')
  if (legacyCalendarPerson && !preferences.calendarPerson) preferences.calendarPerson = legacyCalendarPerson
  if (legacyReminders && !Array.isArray(preferences.seenReminderIds)) {
    const ids = JSON.parse(legacyReminders)
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) {
      throw new Error('Legacy reminder preferences have an invalid format; they were not removed.')
    }
    preferences.seenReminderIds = ids.slice(-500)
  }

  preferences[MIGRATION_KEY] = true
  delete preferences.id
  await api.patch(`preferences/${user.id}`, preferences)

  for (const key of ['taskflow_role_users', 'taskflow_demo_preferences', 'taskflow_demo_pin', 'taskflow_hr_records', 'who', 'rem']) {
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      throw new Error(`The backend migration completed, but legacy browser data could not be removed: ${error.message}`)
    }
  }
  await Promise.all([
    deleteDatabase('natheelco-taskflow'),
    deleteDatabase('natheelco-foodics-library'),
  ])
  return { documents: migratedDocuments, files: migratedFiles, migrated: true }
}
