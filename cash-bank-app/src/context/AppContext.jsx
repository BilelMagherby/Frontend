import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { initialDocuments } from "../data/documents";
import { getLocalDateOnly, isValidDateOnly } from "../utils/taxReturnSchedule";
import { createAdjustmentDraft, transitionAdjustment } from "../utils/adjustmentNotes";
import { loadAccountingState, loadDocumentsState, saveAccountingState, saveDocumentsState } from "../utils/accountingRepository";

const AppContext = createContext(null);
const TAX_RETURN_STORAGE_KEY = "natheel-tax-return-last-submitted";
const PURCHASES_STORAGE_KEY = "natheel-vendor-bills";
const EMPTY_ACCOUNTING_STATE = { notes: [], sequences: {}, audit: [] };

export function AppProvider({ children }) {
  const today = getLocalDateOnly();
  const [branch, setBranch] = useState("all");
  const [language, setLanguage] = useState("en");
  const [fiscalYear, setFiscalYear] = useState(String(new Date().getFullYear()));
  const [dateFrom, setDateFrom] = useState(() => `${today.slice(0, 7)}-01`);
  const [dateTo, setDateTo] = useState(today);
  const [documentState, setDocumentState] = useState({ items: initialDocuments, ready: false, storageError: "" });
  const documentStateRef = useRef(documentState);
  const documentWriteQueue = useRef(Promise.resolve());
  const documents = documentState.items;
  const [purchaseState, setPurchaseState] = useState(() => {
    try {
      const savedPurchases = window.localStorage.getItem(PURCHASES_STORAGE_KEY);
      if (!savedPurchases) return { items: [], storageError: "" };
      const items = JSON.parse(savedPurchases);
      if (!Array.isArray(items)) throw new Error("Saved bills must be a list.");
      return { items, storageError: "" };
    } catch (error) {
      return {
        items: [],
        storageError: `Saved bills could not be loaded from this browser: ${error.message}`,
      };
    }
  });
  const { items: purchases, storageError: purchaseStorageError } = purchaseState;
  const [accountingState, setAccountingState] = useState({ ...EMPTY_ACCOUNTING_STATE, ready: false, storageError: "" });
  const accountingStateRef = useRef(accountingState);
  const accountingWriteQueue = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    loadDocumentsState().then((savedDocuments) => {
      if (!active) return;
      const loaded = { items: Array.isArray(savedDocuments) ? savedDocuments : initialDocuments, ready: true, storageError: "" };
      documentStateRef.current = loaded;
      setDocumentState(loaded);
    }).catch((error) => {
      if (!active) return;
      const failed = { items: initialDocuments, ready: true, storageError: error.message };
      documentStateRef.current = failed;
      setDocumentState(failed);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    loadAccountingState().then((savedState) => {
      if (!active) return;
      const loaded = { ...EMPTY_ACCOUNTING_STATE, ...(savedState ?? {}), ready: true, storageError: "" };
      accountingStateRef.current = loaded;
      setAccountingState(loaded);
    }).catch((error) => {
      if (!active) return;
      const failed = { ...EMPTY_ACCOUNTING_STATE, ready: true, storageError: error.message };
      accountingStateRef.current = failed;
      setAccountingState(failed);
    });
    return () => { active = false; };
  }, []);
  const [taxReturnSchedule, setTaxReturnSchedule] = useState(() => {
    try {
      const savedDate = window.localStorage.getItem(TAX_RETURN_STORAGE_KEY);
      if (!savedDate) return { lastSubmittedDate: "", storageError: "" };
      if (isValidDateOnly(savedDate)) return { lastSubmittedDate: savedDate, storageError: "" };
      return {
        lastSubmittedDate: "",
        storageError: "The saved tax return date is invalid. Save a valid date to replace it.",
      };
    } catch (error) {
      return {
        lastSubmittedDate: "",
        storageError: `Tax return reminder could not read browser storage: ${error.message}`,
      };
    }
  });
  const setTaxReturnLastSubmittedDate = (date) => {
    if (!isValidDateOnly(date)) throw new Error("A valid submission date is required.");
    setTaxReturnSchedule({ lastSubmittedDate: date, storageError: "" });
    try {
      window.localStorage.setItem(TAX_RETURN_STORAGE_KEY, date);
    } catch (error) {
      setTaxReturnSchedule({
        lastSubmittedDate: date,
        storageError: `The reminder date was updated for this session, but could not be saved in this browser: ${error.message}`,
      });
    }
  };
  const addDocuments = (type, newDocuments) => {
    const operation = documentWriteQueue.current.then(async () => {
      if (!documentStateRef.current.ready) throw new Error("Document storage is still loading. Try again shortly.");
      if (documentStateRef.current.storageError) throw new Error(documentStateRef.current.storageError);
      const updatedDocuments = [
        ...documentStateRef.current.items,
        ...newDocuments.map((document) => ({ ...document, id: `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type })),
      ];
      await saveDocumentsState(updatedDocuments);
      const loaded = { items: updatedDocuments, ready: true, storageError: "" };
      documentStateRef.current = loaded;
      setDocumentState(loaded);
      return updatedDocuments;
    });
    documentWriteQueue.current = operation.then(() => undefined, () => undefined);
    return operation.catch((error) => {
      const failed = { ...documentStateRef.current, storageError: error.message };
      documentStateRef.current = failed;
      setDocumentState(failed);
      throw error;
    });
  };
  const addPurchase = (purchase) => {
    const updatedPurchases = [...purchaseState.items, purchase];
    try {
      window.localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updatedPurchases));
      setPurchaseState({ items: updatedPurchases, storageError: "" });
    } catch (error) {
      const storageError = `The bill could not be saved in this browser: ${error.message}`;
      setPurchaseState((current) => ({ ...current, storageError }));
      throw new Error(storageError);
    }
  };
  const updatePurchase = (id, updates) => {
    const updatedPurchases = purchaseState.items.map((purchase) => purchase.id === id ? { ...purchase, ...updates } : purchase);
    try {
      window.localStorage.setItem(PURCHASES_STORAGE_KEY, JSON.stringify(updatedPurchases));
      setPurchaseState({ items: updatedPurchases, storageError: "" });
    } catch (error) {
      const storageError = `The bill could not be updated in this browser: ${error.message}`;
      setPurchaseState((current) => ({ ...current, storageError }));
      throw new Error(storageError);
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
      const nextState = mutator(accountingStateRef.current);
      const persistedState = { notes: nextState.notes, sequences: nextState.sequences, audit: nextState.audit };
      await saveAccountingState(persistedState);
      const loaded = { ...persistedState, ready: true, storageError: "" };
      accountingStateRef.current = loaded;
      setAccountingState(loaded);
      return loaded;
    });
    accountingWriteQueue.current = operation.then(() => undefined, () => undefined);
    return operation.catch((error) => {
      const failed = { ...accountingStateRef.current, storageError: error.message };
      accountingStateRef.current = failed;
      setAccountingState(failed);
      throw error;
    });
  };
  const createAdjustment = (kind, values) => persistAccountingMutation((current) => {
    const fiscalYear = values.issueDate?.slice(0, 4);
    const sequenceKey = `${kind}-${fiscalYear}`;
    const sequence = (current.sequences[sequenceKey] ?? 0) + 1;
    const prefix = kind === "credit" ? "CN" : "DN";
    const number = `${prefix}-${fiscalYear}-${String(sequence).padStart(6, "0")}`;
    const note = createAdjustmentDraft({ kind, number, values });
    const event = { ...note.history[0], documentNumber: note.number, documentId: note.id };
    return {
      ...current,
      sequences: { ...current.sequences, [sequenceKey]: sequence },
      notes: [...current.notes, note],
      audit: [...current.audit, event],
    };
  });
  const createAdjustments = (kind, valuesList) => persistAccountingMutation((current) => {
    let sequences = current.sequences;
    const notes = valuesList.map((values) => {
      const fiscalYear = values.issueDate?.slice(0, 4);
      const sequenceKey = `${kind}-${fiscalYear}`;
      const sequence = (sequences[sequenceKey] ?? 0) + 1;
      const prefix = kind === "credit" ? "CN" : "DN";
      const number = `${prefix}-${fiscalYear}-${String(sequence).padStart(6, "0")}`;
      sequences = { ...sequences, [sequenceKey]: sequence };
      return createAdjustmentDraft({ kind, number, values });
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
    const updatedDraft = createAdjustmentDraft({ kind: existing.kind, number: existing.number, values });
    const at = new Date().toISOString();
    const historyEntry = {
      action: "Draft updated",
      actor: "Local workspace user",
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
