const DATABASE = "natheel-bank-statements";
const VERSION = 1;
const STORE = "statements";

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("This browser does not support local IndexedDB storage."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local statement storage."));
    request.onblocked = () => reject(new Error("Statement storage is blocked by another browser tab. Close other tabs and retry."));
  });
}

async function requestStore(mode, callback) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    const request = callback(transaction.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to access locally stored statements."));
    transaction.onabort = () => reject(transaction.error ?? new Error("The statement storage operation was aborted."));
    transaction.oncomplete = () => database.close();
  });
}

export async function listStatements() {
  const statements = await requestStore("readonly", (store) => store.getAll());
  return statements.sort((first, second) => second.importedAt.localeCompare(first.importedAt));
}

export function saveStatement(statement) {
  return requestStore("readwrite", (store) => store.put(statement));
}

export function deleteStatement(id) {
  return requestStore("readwrite", (store) => store.delete(id));
}

export function downloadOriginal(statement) {
  if (!statement.fileBlob) throw new Error("The original workbook was not stored for this import.");
  const url = URL.createObjectURL(statement.fileBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = statement.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
