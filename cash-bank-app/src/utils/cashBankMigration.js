import { api } from "../../../src/services/api.js";
import { isValidDateOnly } from "./taxReturnSchedule.js";

const ACCOUNTING_DATABASE = "natheel-accounting-records";
const STATEMENTS_DATABASE = "natheel-bank-statements";
const MIGRATION_KEY = "cashBankMigrationV1";

function openDatabase(name, stores) {
  if (!window.indexedDB) throw new Error("Legacy browser records are not accessible for migration.");
  return new Promise((resolve, reject) => {
    const opening = window.indexedDB.open(name, 1);
    opening.onupgradeneeded = () => {
      for (const store of stores) {
        if (!opening.result.objectStoreNames.contains(store)) {
          opening.result.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error || new Error(`Could not read legacy storage "${name}".`));
    opening.onblocked = () => reject(new Error(`Close other Cash & Bank tabs before migrating "${name}".`));
  });
}

function readLegacyState(database, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const reading = transaction.objectStore(storeName).get(id);
    reading.onsuccess = () => resolve(reading.result?.state ?? null);
    reading.onerror = () => reject(reading.error || new Error(`Could not read legacy "${storeName}" records.`));
    transaction.onabort = () => reject(transaction.error || new Error(`Reading legacy "${storeName}" records was cancelled.`));
  });
}

function readLegacyRows(database, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readonly");
    const reading = transaction.objectStore(storeName).getAll();
    reading.onsuccess = () => resolve(reading.result || []);
    reading.onerror = () => reject(reading.error || new Error(`Could not read legacy "${storeName}" records.`));
    transaction.onabort = () => reject(transaction.error || new Error(`Reading legacy "${storeName}" records was cancelled.`));
  });
}

function deleteDatabase(name) {
  return new Promise((resolve, reject) => {
    const deletion = window.indexedDB.deleteDatabase(name);
    deletion.onsuccess = () => resolve();
    deletion.onerror = () => reject(deletion.error || new Error(`Could not remove migrated storage "${name}".`));
    deletion.onblocked = () => reject(new Error(`Close other Cash & Bank tabs to finish migrating "${name}".`));
  });
}

function readLegacyLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    throw new Error(`Could not access legacy browser records: ${error.message}`);
  }
}

function parseLegacyList(value, label) {
  if (!value) return [];
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Legacy ${label} data is not valid JSON; it was not removed.`);
  }
  if (!Array.isArray(parsed)) throw new Error(`Legacy ${label} data must be a list; it was not removed.`);
  return parsed;
}

async function saveLegacyPreference(userId, changes) {
  await api.patch(`preferences/${userId}`, changes);
}

function combineAccountingState(remote, local) {
  const notes = new Map((remote?.notes || []).map((note) => [note.id, note]));
  for (const note of local?.notes || []) {
    if (!notes.has(note.id)) notes.set(note.id, note);
  }
  const audit = new Map();
  for (const event of [...(remote?.audit || []), ...(local?.audit || [])]) {
    audit.set(`${event.documentId || ""}:${event.action || ""}:${event.at || ""}`, event);
  }
  const sequences = { ...(remote?.sequences || {}) };
  for (const [key, sequence] of Object.entries(local?.sequences || {})) {
    sequences[key] = Math.max(Number(sequences[key]) || 0, Number(sequence) || 0);
  }
  return { notes: [...notes.values()], sequences, audit: [...audit.values()] };
}

async function migrateDocuments(documents) {
  const existing = new Set((await api.list("cashbankDocuments")).map((row) => row.id));
  for (const document of documents) {
    if (!document || typeof document.id !== "string" || !document.id || typeof document !== "object") {
      throw new Error("A legacy invoice record is invalid; browser records were not removed.");
    }
    if (existing.has(document.id)) continue;
    const { id, ...data } = document;
    await api.put(`cashbankDocuments/${id}`, data);
  }
}

async function migratePurchases(purchases) {
  const existing = new Set((await api.list("cashbankPurchases")).map((row) => row.id));
  for (const purchase of purchases) {
    if (!purchase || typeof purchase.id !== "string" || !purchase.id || typeof purchase !== "object") {
      throw new Error("A legacy purchase record is invalid; browser records were not removed.");
    }
    if (existing.has(purchase.id)) continue;
    const { id, ...data } = purchase;
    await api.put(`cashbankPurchases/${id}`, data);
  }
}

async function migrateStatements(statements, preferences, userId) {
  const existing = new Set((await api.list("cashbankStatements")).map((row) => row.id));
  let fileMap = preferences.cashBankFileMap || {};
  for (const statement of statements) {
    if (!statement || typeof statement.id !== "string" || !statement.id || typeof statement !== "object") {
      throw new Error("A legacy bank statement is invalid; browser records were not removed.");
    }
    if (existing.has(statement.id)) continue;
    const migrated = { ...statement };
    if (migrated.fileBlob instanceof Blob) {
      let fileId = fileMap[statement.id];
      if (!fileId) {
        const file = new File([migrated.fileBlob], migrated.fileName || "bank-statement", {
          type: migrated.fileType || migrated.fileBlob.type || "application/octet-stream",
        });
        const uploaded = await api.uploadFile(file, "cashbank");
        fileId = uploaded.id;
        fileMap = { ...fileMap, [statement.id]: fileId };
        preferences = { ...preferences, cashBankFileMap: fileMap };
        await saveLegacyPreference(userId, { cashBankFileMap: fileMap });
      }
      migrated.fileId = fileId;
    }
    delete migrated.fileBlob;
    await api.put(`cashbankStatements/${statement.id}`, migrated);
  }
  return preferences;
}

export async function migrateCashBankBrowserData(user) {
  if (!user?.id) throw new Error("Sign in before migrating Cash & Bank records.");
  const preferenceResult = await api.get(`preferences/${user.id}`);
  let preferences = { ...(preferenceResult.exists ? preferenceResult.data : {}) };
  if (preferences[MIGRATION_KEY]) return { migrated: false };

  const accountingDatabase = await openDatabase(ACCOUNTING_DATABASE, ["application-state"]);
  let statementsDatabase;
  try {
    statementsDatabase = await openDatabase(STATEMENTS_DATABASE, ["statements"]);
    const [accounting, documents, statements] = await Promise.all([
      readLegacyState(accountingDatabase, "application-state", "accounting"),
      readLegacyState(accountingDatabase, "application-state", "documents"),
      readLegacyRows(statementsDatabase, "statements"),
    ]);
    if (documents !== null && !Array.isArray(documents)) {
      throw new Error("Legacy invoice records are invalid; browser records were not removed.");
    }
    if (accounting !== null && (!accounting || typeof accounting !== "object" || Array.isArray(accounting))) {
      throw new Error("Legacy accounting records are invalid; browser records were not removed.");
    }

    const legacyPurchases = parseLegacyList(readLegacyLocalStorage("natheel-vendor-bills"), "purchase");
    const legacyTaxDate = readLegacyLocalStorage("natheel-tax-return-last-submitted");
    await migrateDocuments(Array.isArray(documents) ? documents : []);
    await migratePurchases(legacyPurchases);
    const accountingResult = await api.get("cashbankAccounting/main");
    if (accounting && typeof accounting === "object" && !Array.isArray(accounting)) {
      await api.patch("cashbankAccounting/main", combineAccountingState(accountingResult.data, accounting));
    }
    const taxResult = await api.get("cashbankSettings/taxReturn");
    if (!taxResult.exists && legacyTaxDate) {
      if (!isValidDateOnly(legacyTaxDate)) {
        throw new Error("The legacy tax-return date is invalid; it was not removed.");
      }
      await api.put("cashbankSettings/taxReturn", { lastSubmittedDate: legacyTaxDate });
    }
    preferences = await migrateStatements(statements, preferences, user.id);
  } finally {
    accountingDatabase.close();
    statementsDatabase?.close();
  }

  try {
    window.localStorage.removeItem("natheel-vendor-bills");
    window.localStorage.removeItem("natheel-tax-return-last-submitted");
  } catch (error) {
    throw new Error(`Backend migration completed, but legacy browser records could not be removed: ${error.message}`);
  }
  await Promise.all([
    deleteDatabase(ACCOUNTING_DATABASE),
    deleteDatabase(STATEMENTS_DATABASE),
  ]);
  await saveLegacyPreference(user.id, { [MIGRATION_KEY]: true });
  return { migrated: true };
}
