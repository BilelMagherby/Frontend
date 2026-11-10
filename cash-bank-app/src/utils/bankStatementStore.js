import { api } from "../../../src/services/api.js";

const COLLECTION = "cashbankStatements";

export async function listStatements() {
  const rows = await api.list(COLLECTION);
  return rows
    .map(({ id, data }) => ({ ...data, id }))
    .sort((first, second) => second.importedAt.localeCompare(first.importedAt));
}

export async function saveStatement(statement) {
  const data = { ...statement };
  let uploadedFileId = "";
  if (data.fileBlob instanceof Blob) {
    const file = new File([data.fileBlob], data.fileName || "bank-statement", {
      type: data.fileType || data.fileBlob.type || "application/octet-stream",
    });
    const uploaded = await api.uploadFile(file, "cashbank");
    data.fileId = uploaded.id;
    uploadedFileId = uploaded.id;
  }
  delete data.fileBlob;

  try {
    await api.put(`${COLLECTION}/${data.id}`, data);
  } catch (error) {
    if (uploadedFileId) {
      try {
        await api.deleteFile(uploadedFileId);
      } catch (cleanupError) {
        throw new Error(`${error.message} The uploaded original file could not be cleaned up: ${cleanupError.message}`);
      }
    }
    throw error;
  }
  return data;
}

export async function deleteStatement(id) {
  const result = await api.get(`${COLLECTION}/${id}`);
  if (!result.exists) return;
  await api.remove(`${COLLECTION}/${id}`);
  if (result.data.fileId) await api.deleteFile(result.data.fileId);
}

export async function downloadOriginal(statement) {
  if (!statement.fileId) throw new Error("No original workbook is stored for this import.");
  const blob = await api.downloadFile(statement.fileId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = statement.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
