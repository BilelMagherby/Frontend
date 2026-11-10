import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getLocalDateOnly, isValidDateOnly } from "../utils/taxReturnSchedule";
import { createAdjustmentDraft, transitionAdjustment } from "../utils/adjustmentNotes";
import {
  loadAccountingState,
  loadDocumentsState,
  loadPurchases,
  loadTaxReturnDate,
  reserveAdjustmentNumbers,
  saveAccountingState,
  saveDocument,
  savePurchase,
  saveTaxReturnDate,
  updatePurchaseRecord,
} from "../utils/accountingRepository";

const AppContext = createContext(null);
const EMPTY_ACCOUNTING_STATE = { notes: [], sequences: {}, audit: [] };

export function AppProvider({ children, user }) {
  const today = getLocalDateOnly();
  const [branch, setBranch] = useState("all");
  const [language, setLanguage] = useState("en");
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(today);
  const [documentState, setDocumentState] = useState({ items: [], ready: false, storageError: "" });
  const documentStateRef = useRef(documentState);
  const documentWriteQueue = useRef(Promise.resolve());
  const documentWriting = useRef(false);
  const documents = documentState.items;
  const [purchaseState, setPurchaseState] = useState({ items: [], ready: false, storageError: "" });
  const { items: purchases, storageError: purchaseStorageError } = purchaseState;
  const [accountingState, setAccountingState] = useState({ ...EMPTY_ACCOUNTING_STATE, ready: false, storageError: "" });
  const accountingStateRef = useRef(accountingState);
  const accountingWriteQueue = useRef(Promise.resolve());
  const accountingWriting = useRef(false);
  const purchaseWrites = useRef(new Set());
  const taxReturnWriting = useRef(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const results = await Promise.allSettled([
        loadDocumentsState(),
        loadPurchases(),
        loadAccountingState(),
        loadTaxReturnDate(),
      ]);
      if (!active) return;
      const [documentResult, purchaseResult, accountingResult, taxResult] = results;
      if (documentResult.status === "fulfilled" && !documentWriting.current) {
        const loaded = { items: documentResult.value, ready: true, storageError: "" };
        documentStateRef.current = loaded;
        setDocumentState(loaded);
      } else if (documentResult.status === "rejected") {
        const failed = { ...documentStateRef.current, ready: true, storageError: documentResult.reason.message };
        documentStateRef.current = failed;
        setDocumentState(failed);
      }
      if (purchaseResult.status === "fulfilled") {
        setPurchaseState((current) => ({
          items: purchaseWrites.current.size ? current.items : purchaseResult.value,
          ready: true,
          storageError: "",
        }));
      } else {
        setPurchaseState((current) => ({ ...current, ready: true, storageError: purchaseResult.reason.message }));
      }
      if (accountingResult.status === "fulfilled" && !accountingWriting.current) {
        const loaded = { ...EMPTY_ACCOUNTING_STATE, ...(accountingResult.value ?? {}), ready: true, storageError: "" };
        accountingStateRef.current = loaded;
        setAccountingState(loaded);
      } else if (accountingResult.status === "rejected") {
        const failed = { ...accountingStateRef.current, ready: true, storageError: accountingResult.reason.message };
        accountingStateRef.current = failed;
        setAccountingState(failed);
      }
      if (taxResult.status === "fulfilled") {
        if (!taxReturnWriting.current) {
          setTaxReturnSchedule({ lastSubmittedDate: taxResult.value, storageError: "" });
        }
      } else {
        setTaxReturnSchedule((current) => ({ ...current, storageError: taxResult.reason.message }));
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);
  const [taxReturnSchedule, setTaxReturnSchedule] = useState({ lastSubmittedDate: "", storageError: "" });
  const setTaxReturnLastSubmittedDate = async (date) => {
    if (!isValidDateOnly(date)) throw new Error("A valid submission date is required.");
    taxReturnWriting.current = true;
    try {
      await saveTaxReturnDate(date);
      setTaxReturnSchedule({ lastSubmittedDate: date, storageError: "" });
    } finally {
      taxReturnWriting.current = false;
    }
  };
  const addDocuments = (type, newDocuments) => {
    const operation = documentWriteQueue.current.then(async () => {
      if (!documentStateRef.current.ready) throw new Error("Document storage is still loading. Try again shortly.");
      if (documentStateRef.current.storageError) throw new Error(documentStateRef.current.storageError);
      documentWriting.current = true;
      const additions = newDocuments.map((document) => ({
        ...document,
        id: `DOC-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`,
        type,
        createdBy: user.name,
        createdAt: new Date().toISOString(),
      }));
      try {
        for (const document of additions) await saveDocument(document);
        const updatedDocuments = [...documentStateRef.current.items, ...additions];
        const loaded = { items: updatedDocuments, ready: true, storageError: "" };
        documentStateRef.current = loaded;
        setDocumentState(loaded);
        return updatedDocuments;
      } finally {
        documentWriting.current = false;
      }
    });
    documentWriteQueue.current = operation.then(() => undefined, () => undefined);
    return operation.catch((error) => {
      const failed = { ...documentStateRef.current, storageError: error.message };
      documentStateRef.current = failed;
      setDocumentState(failed);
      throw error;
    });
  };
  const addPurchase = async (purchase) => {
    if (!purchaseState.ready) throw new Error("Purchase storage is still loading. Try again shortly.");
    purchaseWrites.current.add(purchase.id);
    try {
      await savePurchase({ ...purchase, createdBy: user.name, createdAt: new Date().toISOString() });
      setPurchaseState((current) => ({
        items: [...current.items, purchase],
        ready: true,
        storageError: "",
      }));
    } catch (error) {
      const storageError = `The bill could not be saved to the backend: ${error.message}`;
      setPurchaseState((current) => ({ ...current, storageError }));
      throw new Error(storageError);
    } finally {
      purchaseWrites.current.delete(purchase.id);
    }
  };
  const updatePurchase = async (id, updates) => {
    if (!purchaseState.ready) throw new Error("Purchase storage is still loading. Try again shortly.");
    const currentPurchase = purchaseState.items.find((purchase) => purchase.id === id);
    if (!currentPurchase) throw new Error("The purchase record was not found.");
    purchaseWrites.current.add(id);
    try {
      await updatePurchaseRecord(id, { ...updates, updatedBy: user.name, updatedAt: new Date().toISOString() });
      setPurchaseState((current) => ({
        items: current.items.map((purchase) => purchase.id === id ? { ...purchase, ...updates } : purchase),
        ready: true,
        storageError: "",
      }));
    } catch (error) {
      const storageError = `The bill could not be updated in the backend: ${error.message}`;
      setPurchaseState((current) => ({ ...current, storageError }));
      throw new Error(storageError);
    } finally {
      purchaseWrites.current.delete(id);
    }
  };
  const invoiceSources = [
    ...purchases.map((purchase) => ({
      id: purchase.id,
      number: purchase.vendorReference || purchase.id,
      date: purchase.date,
      branch: purchase.branch,
      counterparty: purchase.supplier,
      direction: "supplier",
      subtotal: purchase.amount,
      vat: purchase.vat,
      total: purchase.total ?? Number(purchase.amount) + Number(purchase.vat),
      status: purchase.status,
      lines: purchase.lines ?? [],
    })),
    ...documents.filter((document) => document.type === "invoice").map((document) => ({
      id: document.id,
      number: document.number,
      date: document.issueDate,
      branch: document.branch,
      counterparty: document.counterparty,
      direction: document.direction ?? "supplier",
      subtotal: document.subtotal,
      vat: document.vat,
      total: document.total,
      status: document.status,
      lines: document.lines ?? [],
    })),
  ];
  const persistAccountingMutation = (mutator) => {
    const operation = accountingWriteQueue.current.then(async () => {
      if (!accountingStateRef.current.ready) throw new Error("Accounting storage is still loading. Try again shortly.");
      if (accountingStateRef.current.storageError) throw new Error(accountingStateRef.current.storageError);
      accountingWriting.current = true;
      try {
        const nextState = await mutator(accountingStateRef.current);
        const persistedState = { notes: nextState.notes, sequences: nextState.sequences, audit: nextState.audit };
        await saveAccountingState(persistedState);
        const remoteState = await loadAccountingState();
        const loaded = { ...EMPTY_ACCOUNTING_STATE, ...(remoteState ?? persistedState), ready: true, storageError: "" };
        accountingStateRef.current = loaded;
        setAccountingState(loaded);
        return loaded;
      } finally {
        accountingWriting.current = false;
      }
    });
    accountingWriteQueue.current = operation.then(() => undefined, () => undefined);
    return operation.catch((error) => {
      const failed = { ...accountingStateRef.current, storageError: error.message };
      accountingStateRef.current = failed;
      setAccountingState(failed);
      throw error;
    });
  };
  const createAdjustment = (kind, values) => persistAccountingMutation(async (current) => {
    const fiscalYear = values.issueDate?.slice(0, 4);
    const reservation = await reserveAdjustmentNumbers(kind, fiscalYear, 1);
    const sequence = reservation.first;
    const prefix = kind === "credit" ? "CN" : "DN";
    const number = `${prefix}-${fiscalYear}-${String(sequence).padStart(6, "0")}`;
    const note = createAdjustmentDraft({ kind, number, values, actor: user.name });
    const event = { ...note.history[0], documentNumber: note.number, documentId: note.id };
    return {
      ...current,
      sequences: { ...current.sequences, [reservation.sequenceKey]: reservation.last },
      notes: [...current.notes, note],
      audit: [...current.audit, event],
    };
  });
  const createAdjustments = (kind, valuesList) => persistAccountingMutation(async (current) => {
    const indexesByYear = new Map();
    valuesList.forEach((values, index) => {
      const year = values.issueDate?.slice(0, 4);
      indexesByYear.set(year, [...(indexesByYear.get(year) || []), index]);
    });
    const sequences = { ...current.sequences };
    const numbers = new Array(valuesList.length);
    for (const [year, indexes] of indexesByYear) {
      let remaining = indexes.length;
      while (remaining > 0) {
        const count = Math.min(remaining, 100);
        const reservation = await reserveAdjustmentNumbers(kind, year, count);
        const offset = indexes.length - remaining;
        for (let index = 0; index < count; index += 1) {
          numbers[indexes[offset + index]] = reservation.first + index;
        }
        sequences[reservation.sequenceKey] = reservation.last;
        remaining -= count;
      }
    }
    const prefix = kind === "credit" ? "CN" : "DN";
    const notes = valuesList.map((values, index) => {
      const fiscalYear = values.issueDate?.slice(0, 4);
      const number = `${prefix}-${fiscalYear}-${String(numbers[index]).padStart(6, "0")}`;
      return createAdjustmentDraft({ kind, number, values, actor: user.name });
    });
    return {
      ...current,
      sequences,
      notes: [...current.notes, ...notes],
      audit: [...current.audit, ...notes.map((note) => ({ ...note.history[0], documentNumber: note.number, documentId: note.id }))],
    };
  });
  const updateAdjustmentDraft = (id, values) => persistAccountingMutation((current) => {
    const existing = current.notes.find((note) => note.id === id);
    if (!existing) throw new Error("The adjustment document was not found.");
    if (existing.status !== "Draft") throw new Error("Only draft adjustment documents can be edited.");
    const updatedDraft = createAdjustmentDraft({ kind: existing.kind, number: existing.number, values, actor: user.name });
    const at = new Date().toISOString();
    const historyEntry = {
      action: "Draft updated",
      actor: user.name,
      at,
      previousValue: existing,
      newValue: updatedDraft,
      reason: "",
    };
    const updated = {
      ...existing,
      ...updatedDraft,
      createdAt: existing.createdAt,
      createdBy: existing.createdBy,
      history: [...existing.history, historyEntry],
      updatedAt: at,
    };
    return {
      ...current,
      notes: current.notes.map((note) => note.id === id ? updated : note),
      audit: [...current.audit, { ...historyEntry, documentNumber: existing.number, documentId: id }],
    };
  });
  const transitionAdjustmentRecord = (id, action, reason = "") => persistAccountingMutation((current) => {
    const note = current.notes.find((item) => item.id === id);
    if (!note) throw new Error("The adjustment document was not found.");
    const updated = transitionAdjustment(note, action, {
      actor: user.name,
      reason,
      invoices: invoiceSources,
      adjustments: current.notes,
    });
    const event = { ...updated.history[updated.history.length - 1], documentNumber: note.number, documentId: id };
    return {
      ...current,
      notes: current.notes.map((item) => item.id === id ? updated : item),
      audit: [...current.audit, event],
    };
  });
  const value = useMemo(() => ({
    branch, setBranch, language,
    direction: language === "ar" ? "rtl" : "ltr",
    toggleLanguage: () => setLanguage((current) => current === "en" ? "ar" : "en"),
    fiscalYear, setFiscalYear, dateFrom, setDateFrom, dateTo, setDateTo,
    documents, addDocuments, documentStorageReady: documentState.ready, documentStorageError: documentState.storageError, purchases, addPurchase, updatePurchase, purchaseStorageError,
    invoiceSources,
    accountingNotes: accountingState.notes,
    accountingAudit: accountingState.audit,
    accountingReady: accountingState.ready,
    accountingStorageError: accountingState.storageError,
    createAdjustment,
    createAdjustments,
    updateAdjustmentDraft,
    transitionAdjustmentRecord,
    taxReturnLastSubmittedDate: taxReturnSchedule.lastSubmittedDate,
    taxReturnStorageError: taxReturnSchedule.storageError,
    setTaxReturnLastSubmittedDate,
  }), [branch, language, fiscalYear, dateFrom, dateTo, documents, documentState.ready, documentState.storageError, purchases, purchaseStorageError, accountingState, taxReturnSchedule]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
