import { api, request } from "../../../src/services/api.js";

const ACCOUNTING_PATH = "cashbankAccounting/main";
const DOCUMENTS_COLLECTION = "cashbankDocuments";

export async function loadAccountingState() {
  const result = await api.get(ACCOUNTING_PATH);
  return result.exists ? result.data : null;
}

export function saveAccountingState(state) {
  return api.patch(ACCOUNTING_PATH, state);
}

export async function loadDocumentsState() {
  const rows = await api.list(DOCUMENTS_COLLECTION);
  return rows.map(({ id, data }) => ({ ...data, id }));
}

export async function saveDocument(document) {
  const { id, ...data } = document;
  await api.put(`${DOCUMENTS_COLLECTION}/${id}`, data);
}

export async function loadPurchases() {
  const rows = await api.list("cashbankPurchases");
  return rows.map(({ id, data }) => ({ ...data, id }));
}

export async function savePurchase(purchase) {
  const { id, ...data } = purchase;
  await api.put(`cashbankPurchases/${id}`, data);
}

export function updatePurchaseRecord(id, updates) {
  return api.patch(`cashbankPurchases/${id}`, updates);
}

export async function loadTaxReturnDate() {
  const result = await api.get("cashbankSettings/taxReturn");
  return result.exists ? result.data.lastSubmittedDate || "" : "";
}

export async function saveTaxReturnDate(lastSubmittedDate) {
  await api.patch("cashbankSettings/taxReturn", { lastSubmittedDate });
}

export async function reserveAdjustmentNumbers(kind, year, count) {
  return request("/api/cashbank/sequences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, year, count }),
  });
}
