let databasePromise

export function openFoodicsDatabase() {
  if (!('indexedDB' in window)) return Promise.reject(new Error('This browser does not support persistent document storage.'))
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open('natheelco-foodics-library', 1)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains('records')) database.createObjectStore('records', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('files')) database.createObjectStore('files', { keyPath: 'id' })
        if (!database.objectStoreNames.contains('settings')) database.createObjectStore('settings', { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Could not open the Foodics library database.'))
      request.onblocked = () => reject(new Error('Close other Natheelco tabs to finish opening the Foodics library.'))
    })
  }
  return databasePromise
}

export function runTransaction(storeNames, mode, action) {
  return openFoodicsDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, mode)
    let result
    try {
      result = action(Object.fromEntries(storeNames.map((name) => [name, transaction.objectStore(name)])))
    } catch (error) {
      transaction.abort()
      reject(error)
      return
    }
    transaction.oncomplete = () => resolve(result)
    transaction.onerror = () => reject(transaction.error || new Error('The Foodics library could not save this change.'))
    transaction.onabort = () => reject(transaction.error || new Error('The Foodics library change was cancelled.'))
  }))
}

export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not read the Foodics library.'))
  })
}

