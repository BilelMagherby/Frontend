const DATABASE_NAME = "natheel-accounting-records";
const DATABASE_VERSION = 1;
const STORE_NAME = "application-state";
const STATE_ID = "accounting";
const DOCUMENTS_STATE_ID = "documents";

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error("This browser does not support IndexedDB, so accounting records cannot be saved."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local accounting storage."));
    request.onblocked = () => reject(new Error("Accounting storage is blocked by another browser tab. Close other tabs and retry."));
  });
}

export async function loadAccountingState() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STATE_ID);
    request.onsuccess = () => resolve(request.result?.state ?? null);
    request.onerror = () => reject(request.error ?? new Error("Unable to read accounting records."));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => reject(transaction.error ?? new Error("Reading accounting records was aborted."));
  });
}

export async function saveAccountingState(state) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id: STATE_ID, state });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save accounting records."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving accounting records was aborted."));
  });
}

export async function loadDocumentsState() {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DOCUMENTS_STATE_ID);
    request.onsuccess = () => resolve(request.result?.state ?? null);
    request.onerror = () => reject(request.error ?? new Error("Unable to read invoice records."));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => reject(transaction.error ?? new Error("Reading invoice records was aborted."));
  });
}

export async function saveDocumentsState(state) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put({ id: DOCUMENTS_STATE_ID, state });
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save invoice records."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving invoice records was aborted."));
  });
}
