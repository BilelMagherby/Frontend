import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, BarChart3, Check, CheckCircle2,
  CircleHelp, ClipboardCheck, FileSpreadsheet, FileUp, History, ListFilter,
  Printer, Search, ShieldAlert, Trash2, Upload, Wallet,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import { useLanguage } from "../hooks/useLanguage";
import { bankMovements } from "../data/bankMovements";
import { Button, Card, Field, SelectField, SectionTitle } from "../components/ui/Primitives";
import {
  classifyTransaction, columnDefinitions, detectHeaderRow, fingerprintFile,
  parseStatementRows,
} from "../utils/bankStatementParser";
import { deleteStatement, downloadOriginal, listStatements, saveStatement } from "../utils/bankStatementStore";

const companyName = "Ibrahim Abdulkarim Al-Rabian Trading Est.";
const categories = [
  "Supplier Payments", "Salary Payments", "Government Payments", "Utility Bills",
  "Bank Transfers", "Internal Transfers", "POS Settlements", "Customer Deposits",
  "SADAD Payments", "Bank Charges", "Tax Payments", "Other Income", "Other Expenses", "Unclassified",
];
const tabs = [
  ["overview", "Overview", BarChart3, "نظرة عامة"],
  ["transactions", "Transactions", ArrowLeftRight, "المعاملات"],
  ["reconciliation", "Reconciliation", ClipboardCheck, "المطابقة"],
  ["matching", "Match movements", CheckCircle2, "مطابقة الحركات"],
  ["reports", "Reports", FileSpreadsheet, "التقارير"],
  ["history", "Import history", History, "سجل الاستيراد"],
];
const money = (value, currency = "SAR") => value === null || value === undefined || !Number.isFinite(Number(value))
  ? "—"
  : `${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const safeSpreadsheetText = (value) => typeof value === "string" && /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
const shortDate = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "—";
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function downloadRows(rows, filename, format) {
  const data = rows.map((row) => ({
    Date: row.date,
    Time: row.time,
    Reference: safeSpreadsheetText(row.reference),
    Description: safeSpreadsheetText(row.description),
    Debit: row.debit,
    Credit: row.credit,
    Balance: row.balance,
    Category: safeSpreadsheetText(row.category),
    Status: safeSpreadsheetText(row.reviewStatus),
    Notes: safeSpreadsheetText(row.notes),
  }));
  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Transactions");
    XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
    return;
  }
  const sheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadReportFile(statement, title, rows, totals, format) {
  const summary = [
    ["Company", companyName],
    ["Bank", safeSpreadsheetText(statement.metadata.bankName || "Not provided")],
    ["Account", safeSpreadsheetText(statement.metadata.accountNumber ? `•••• •••• ${statement.metadata.accountNumber.slice(-4)}` : "Not provided")],
    ["Period", `${statement.metadata.startDate || "—"} - ${statement.metadata.endDate || "—"}`],
    ["Currency", statement.metadata.currency || "SAR"],
    ["Generated", new Date().toLocaleString()],
    ["Opening balance", totals.opening],
    ["Total deposits", totals.deposits],
    ["Total withdrawals", totals.withdrawals],
    ["Expected closing balance", totals.expected],
    ["Actual closing balance", totals.closing],
    ["Reconciliation difference", totals.difference],
  ];
  const rowsSheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
    Date: row.date,
    Time: row.time,
    Reference: safeSpreadsheetText(row.reference),
    Description: safeSpreadsheetText(row.description),
    Debit: row.debit,
    Credit: row.credit,
    Balance: row.balance,
    Category: safeSpreadsheetText(row.category),
    Status: safeSpreadsheetText(row.reviewStatus ?? row.status),
    Notes: safeSpreadsheetText(row.notes ?? row.reason),
  })));
  const summarySheet = XLSX.utils.aoa_to_sheet([[title], ...summary]);
  const filename = `${title.toLowerCase().replaceAll(" ", "-")}-report`;
  if (format === "xlsx") {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Report");
    XLSX.utils.book_append_sheet(workbook, rowsSheet, "Details");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    return;
  }
  const csvRows = [...summary, [], ...XLSX.utils.sheet_to_json(rowsSheet, { header: 1, defval: "" })];
  const csvSheet = XLSX.utils.aoa_to_sheet(csvRows);
  const blob = new Blob(["\uFEFF", XLSX.utils.sheet_to_csv(csvSheet)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}.csv`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function printReport(statement, rows, totals, title, exceptions) {
  const escape = (value) => String(value ?? "—").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) throw new Error("Allow pop-ups to open the print-ready report.");
  const transactionRows = rows.map((row) => `<tr><td>${escape(row.date)}</td><td>${escape(row.reference)}</td><td>${escape(row.description)}</td><td>${escape(row.debit)}</td><td>${escape(row.credit)}</td><td>${escape(row.balance)}</td><td>${escape(row.category)}</td></tr>`).join("");
  const exceptionRows = exceptions.map((item) => `<tr><td>${escape(item.type)}</td><td>${escape(item.transaction.reference)}</td><td>${escape(item.transaction.date)}</td><td>${escape(item.reason)}</td><td>${escape(item.status)}</td></tr>`).join("");
  reportWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>body{font:12px Arial,sans-serif;color:#1e293b;padding:24px}h1{font-size:20px}h2{font-size:15px;margin-top:24px}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#f1f5f9}.summary{line-height:1.8}@media print{body{padding:0}}</style></head><body><h1>${escape(companyName)} — ${escape(title)}</h1><p>${escape(statement.metadata.bankName || "Bank name not provided")} · Account ${escape(statement.metadata.accountNumber ? `•••• ${statement.metadata.accountNumber.slice(-4)}` : "—")} · ${escape(statement.metadata.startDate)} – ${escape(statement.metadata.endDate)} · ${escape(statement.metadata.currency)}</p><p class="summary">Opening balance: ${escape(totals.opening)} · Deposits: ${escape(totals.deposits)} · Withdrawals: ${escape(totals.withdrawals)} · Expected closing: ${escape(totals.expected)} · Actual closing: ${escape(totals.closing)} · Difference: ${escape(totals.difference)}<br>Generated: ${escape(new Date().toLocaleString())}</p><h2>Transactions</h2><table><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Category</th></tr></thead><tbody>${transactionRows}</tbody></table><h2>Exceptions</h2><table><thead><tr><th>Issue</th><th>Reference</th><th>Date</th><th>Reason</th><th>Status</th></tr></thead><tbody>${exceptionRows}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
  reportWindow.document.close();
}

function Metric({ label, value, note, tone = "blue" }) {
  const toneClass = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "red" ? "text-rose-700 bg-rose-50" : "text-navy bg-slate-50";
  return <Card className="p-4"><p className="text-xs font-medium text-slate-500">{label}</p><p className={`mt-2 text-lg font-bold tracking-tight ${toneClass.split(" ")[0]}`}>{value}</p>{note && <p className="mt-1 text-[11px] text-slate-400">{note}</p>}</Card>;
}

function StatusPill({ children, tone = "amber" }) {
  const classes = { green: "bg-emerald-50 text-emerald-700", red: "bg-rose-50 text-rose-700", blue: "bg-sky-50 text-sky-700", amber: "bg-amber-50 text-amber-700", gray: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${classes[tone]}`}>{children}</span>;
}

function getTotals(statement) {
  const transactions = statement?.transactions ?? [];
  const deposits = transactions.reduce((sum, row) => sum + (Number(row.credit) || 0), 0);
  const withdrawals = transactions.reduce((sum, row) => sum + (Number(row.debit) || 0), 0);
  const openingValue = statement?.metadata?.openingBalance;
  const closingValue = statement?.metadata?.closingBalance;
  const opening = openingValue === null || openingValue === "" || openingValue === undefined ? NaN : Number(openingValue);
  const closing = closingValue === null || closingValue === "" || closingValue === undefined ? NaN : Number(closingValue);
  const net = deposits - withdrawals;
  const expected = Number.isFinite(opening) ? opening + net : null;
  const difference = Number.isFinite(closing) && expected !== null ? closing - expected : null;
  return { deposits, withdrawals, net, opening: Number.isFinite(opening) ? opening : null, closing: Number.isFinite(closing) ? closing : null, expected, difference, count: transactions.length };
}

function getExceptions(statement) {
  if (!statement) return [];
  const transactions = statement.transactions ?? [];
  const results = [];
  const referenceGroups = new Map();
  transactions.forEach((row) => {
    if (row.reference) {
      const key = row.reference.toLocaleUpperCase();
      referenceGroups.set(key, [...(referenceGroups.get(key) ?? []), row]);
    }
  });
  const add = (row, type, reason) => results.push({
    id: `${row.id}:${type}`, type, transaction: row, reason,
    status: statement.exceptionStatus?.[`${row.id}:${type}`] ?? "Requires Investigation",
  });
  transactions.forEach((row) => {
    row.importIssues?.forEach((issue) => add(row, issue, "This row was imported and retained for review."));
    if (row.reference && referenceGroups.get(row.reference.toLocaleUpperCase()).length > 1) add(row, "Duplicate reference", "The reference occurs more than once. Both transactions are preserved.");
  });
  if (statement.metadata?.hasBalanceColumn) {
    const openingValue = statement.metadata.openingBalance;
    let expectedBalance = openingValue === null || openingValue === undefined || openingValue === "" || !Number.isFinite(Number(openingValue))
      ? null : Number(openingValue);
    for (const row of transactions) {
      if (row.balance === null || row.balance === undefined) {
        add(row, "Missing balance", "A balance column exists, but this transaction has no parsed balance.");
        continue;
      }
      if (expectedBalance !== null) {
        const computed = expectedBalance + (Number(row.credit) || 0) - (Number(row.debit) || 0);
        if (Math.abs(computed - row.balance) > 0.01) add(row, "Running balance mismatch", `Expected ${money(computed, statement.metadata.currency)}; bank shows ${money(row.balance, statement.metadata.currency)}.`);
      }
      expectedBalance = row.balance;
    }
  }
  return results;
}

function getMatchCandidates(transaction, statement) {
  const amount = Number(transaction.credit || transaction.debit || 0);
  const descriptionWords = new Set(transaction.description.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3));
  const accountNumber = String(statement?.metadata?.accountNumber ?? "").replace(/\D/g, "");
  return bankMovements.map((movement) => {
    let score = 0;
    if (Math.abs(Math.abs(movement.amount) - amount) < 0.01) score += 4;
    if (transaction.date && movement.date === transaction.date) score += 3;
    else if (transaction.date && Math.abs(new Date(`${movement.date}T00:00:00`) - new Date(`${transaction.date}T00:00:00`)) <= 3 * 86400000) score += 1;
    const reference = transaction.reference.toLowerCase();
    if (reference && (movement.id.toLowerCase().includes(reference) || reference.includes(movement.id.toLowerCase()))) score += 3;
    if (descriptionWords.size && movement.description.toLowerCase().split(/[^\p{L}\p{N}]+/u).some((word) => word.length > 3 && descriptionWords.has(word))) score += 1;
    if (accountNumber) {
      const movementAccount = movement.account.replace(/\D/g, "");
      if (movementAccount.endsWith(accountNumber.slice(-4))) score += 1;
      else if (movementAccount) score -= 4;
    }
    return { movement, score };
  }).filter((candidate) => candidate.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

export default function BankStatementPage() {
  const { t } = useLanguage();
  const inputRef = useRef(null);
  const [statements, setStatements] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [fileBusy, setFileBusy] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(null);
  const [detail, setDetail] = useState(null);
  const [metadataDraft, setMetadataDraft] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "date", direction: "desc" });
  const statementsRef = useRef([]);
  const saveQueues = useRef(new Map());

  useEffect(() => {
    listStatements().then((items) => {
      statementsRef.current = items;
      setStatements(items);
      setSelectedId(items[0]?.id ?? "");
    }).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  const selected = statements.find((item) => item.id === selectedId) ?? null;
  useEffect(() => setMetadataDraft(selected?.metadata ?? null), [selectedId]);
  const transactions = selected?.transactions ?? [];
  const totals = useMemo(() => getTotals(selected), [selected]);
  const exceptions = useMemo(() => getExceptions(selected), [selected]);
  const status = !selected ? "No statement" : !transactions.length ? "Import Failed" : totals.difference === null
    ? "Pending Review" : Math.abs(totals.difference) > 0.01 ? "Reconciliation Difference"
      : exceptions.length ? "Pending Review" : "Reconciled";

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const data = transactions.filter((row) => {
      const amount = Math.max(Number(row.debit) || 0, Number(row.credit) || 0);
      if (query && ![row.reference, row.description, row.date, row.category].some((value) => String(value ?? "").toLocaleLowerCase().includes(query))) return false;
      if (typeFilter === "debit" && !(row.debit > 0)) return false;
      if (typeFilter === "credit" && !(row.credit > 0)) return false;
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (amountMin && amount < Number(amountMin)) return false;
      if (amountMax && amount > Number(amountMax)) return false;
      return true;
    });
    if (sort.key) data.sort((a, b) => {
      const first = a[sort.key] ?? "";
      const second = b[sort.key] ?? "";
      const compare = typeof first === "number" && typeof second === "number" ? first - second : String(first).localeCompare(String(second));
      return sort.direction === "asc" ? compare : -compare;
    });
    return data;
  }, [transactions, search, typeFilter, dateFrom, dateTo, categoryFilter, amountMin, amountMax, sort]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => setPage(1), [search, typeFilter, categoryFilter, dateFrom, dateTo, amountMin, amountMax, selectedId]);

  const updateStatement = async (id, updater, message) => {
    const current = statementsRef.current.find((statement) => statement.id === id);
    if (!current) return;
    const updated = updater(current);
    const optimistic = statementsRef.current.map((statement) => statement.id === id ? updated : statement);
    statementsRef.current = optimistic;
    setStatements(optimistic);
    const previousWrite = saveQueues.current.get(id) ?? Promise.resolve();
    const write = previousWrite.catch(() => {}).then(() => saveStatement(updated));
    saveQueues.current.set(id, write);
    try {
      await write;
      if (saveQueues.current.get(id) === write) saveQueues.current.delete(id);
      if (message) setNotice(message);
      setError("");
    } catch (saveError) {
      if (saveQueues.current.get(id) === write) {
        saveQueues.current.delete(id);
        const reverted = statementsRef.current.map((statement) => statement.id === id ? current : statement);
        statementsRef.current = reverted;
        setStatements(reverted);
      }
      setError(`Unable to save changes locally: ${saveError.message}`);
    }
  };

  const prepareFile = async (file) => {
    setError("");
    setNotice("");
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      setError("Choose an .xlsx, .xls, or .csv file.");
      return;
    }
    setFileBusy(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      if (!workbook.SheetNames.length) throw new Error("The selected file contains no worksheets.");
      const sheets = workbook.SheetNames.map((name) => {
        const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: true, blankrows: true });
        return { name, matrix, ...detectHeaderRow(matrix) };
      });
      const best = sheets.reduce((previous, current) => current.score > previous.score ? current : previous);
      const fingerprint = await fingerprintFile(file);
      const parsed = parseStatementRows(best.matrix, best.rowIndex, best.mapping);
      const accountNumber = parsed.records.find((row) => row.accountNumber)?.accountNumber ?? "";
      const dates = parsed.records.map((row) => row.date).filter(Boolean).sort();
      const startDate = dates[0] ?? "";
      const endDate = dates[dates.length - 1] ?? "";
      const fileDuplicate = statements.some((statement) => statement.fingerprint === fingerprint);
      const periodDuplicate = statements.some((statement) => statement.metadata.accountNumber === accountNumber
        && statement.metadata.startDate === startDate && statement.metadata.endDate === endDate
        && Boolean(accountNumber && startDate && endDate));
      setPending({
        file, sheets, sheetName: best.name, matrix: best.matrix, headerRow: best.rowIndex,
        mapping: best.mapping, fingerprint, dateFormat: "", fileDuplicate, periodDuplicate,
      });
      setNotice("");
    } catch (parseError) {
      setError(`Unable to read this workbook: ${parseError.message}`);
    } finally {
      setFileBusy(false);
    }
  };

  const currentPreview = useMemo(() => pending
    ? parseStatementRows(pending.matrix, pending.headerRow, pending.mapping, pending.dateFormat)
    : null, [pending]);

  const chooseSheet = (name) => {
    const sheet = pending.sheets.find((item) => item.name === name);
    if (!sheet) return;
    setPending((current) => ({ ...current, sheetName: name, matrix: sheet.matrix, headerRow: sheet.rowIndex, mapping: sheet.mapping, dateFormat: "" }));
  };

  const commitImport = async () => {
    if (!pending || !currentPreview) return;
    if (!currentPreview.records.length) {
      setError("No transaction rows were found. Check the worksheet and header mapping.");
      return;
    }
    if (!pending.mapping.date || (!pending.mapping.debit && !pending.mapping.credit)) {
      setError("Map a transaction date and at least one Debit or Credit column before importing.");
      return;
    }
    if (currentPreview.ambiguousDateCount && !pending.dateFormat) {
      setError("Some dates are ambiguous. Confirm whether the file uses day/month/year or month/day/year.");
      return;
    }
    const previewAccount = currentPreview.records.find((row) => row.accountNumber)?.accountNumber ?? "";
    const previewDates = currentPreview.records.map((row) => row.date).filter(Boolean).sort();
    const previewStart = previewDates[0] ?? "";
    const previewEnd = previewDates[previewDates.length - 1] ?? "";
    const periodDuplicate = statementsRef.current.some((statement) => statement.metadata.accountNumber === previewAccount
      && statement.metadata.startDate === previewStart && statement.metadata.endDate === previewEnd
      && Boolean(previewAccount && previewStart && previewEnd));
    const fileDuplicate = statementsRef.current.some((statement) => statement.fingerprint === pending.fingerprint);
    if ((pending.fileDuplicate || pending.periodDuplicate || fileDuplicate || periodDuplicate) && !pending.forceDuplicate) {
      setPending((current) => ({ ...current, fileDuplicate: current.fileDuplicate || fileDuplicate, periodDuplicate: current.periodDuplicate || periodDuplicate }));
      setError("This file or account statement period was already imported. Confirm the corrected import explicitly to continue.");
      return;
    }
    setFileBusy(true);
    setImportProgress(10);
    try {
      const records = currentPreview.records.map((row) => ({ ...row, ...classifyTransaction(row.description, row.debit, row.credit) }));
      setImportProgress(45);
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const firstBalanceIndex = records.findIndex((row) => row.balance !== null);
      const firstWithBalance = firstBalanceIndex >= 0 ? records[firstBalanceIndex] : null;
      const movementThroughFirstBalance = records.slice(0, firstBalanceIndex + 1).reduce((sum, row) => sum + row.credit - row.debit, 0);
      const lastWithBalance = [...records].reverse().find((row) => row.balance !== null);
      const openingBalance = currentPreview.summary.openingBalance
        ?? (firstWithBalance ? firstWithBalance.balance - movementThroughFirstBalance : null);
      const closingBalance = currentPreview.summary.closingBalance ?? lastWithBalance?.balance ?? null;
      const dates = records.map((row) => row.date).filter(Boolean).sort();
      const now = new Date().toISOString();
      const statement = {
        id: makeId(),
        fileName: pending.file.name,
        fileSize: pending.file.size,
        fileType: pending.file.type,
        fileBlob: pending.file,
        fingerprint: pending.fingerprint,
        importedAt: now,
        importStatus: "Imported",
        headerRow: pending.headerRow,
        sheetName: pending.sheetName,
        metadata: {
          bankName: "",
          accountHolder: "",
          accountNumber: records.find((row) => row.accountNumber)?.accountNumber ?? "",
          customerCif: "",
          currency: records.find((row) => row.currency)?.currency || "SAR",
          startDate: dates[0] ?? "",
          endDate: dates[dates.length - 1] ?? "",
          openingBalance,
          closingBalance,
          hasBalanceColumn: pending.mapping.balance !== undefined,
          importDate: now.slice(0, 10),
        },
        transactions: records,
        exceptionStatus: {},
        matches: {},
      };
      setImportProgress(80);
      await saveStatement(statement);
      const nextStatements = [statement, ...statementsRef.current];
      statementsRef.current = nextStatements;
      setStatements(nextStatements);
      setSelectedId(statement.id);
      setPending(null);
      setActiveTab("overview");
      setNotice(`${records.length} transactions imported and stored in this browser.`);
      setError("");
      setImportProgress(100);
    } catch (saveError) {
      setError(`Import could not be saved in local browser storage: ${saveError.message}`);
    } finally {
      setFileBusy(false);
      window.setTimeout(() => setImportProgress(0), 700);
    }
  };

  const updateMetadata = () => {
    if (!selected || !metadataDraft) return;
    const metadata = { ...metadataDraft };
    for (const key of ["openingBalance", "closingBalance"]) {
      metadata[key] = metadata[key] === "" || !Number.isFinite(Number(metadata[key])) ? null : Number(metadata[key]);
    }
    updateStatement(selected.id, (item) => ({ ...item, metadata }), "Account and statement details saved locally.");
  };
  const changeMetadata = (key, value) => setMetadataDraft((current) => ({ ...selected.metadata, ...current, [key]: value }));
  const updateTransaction = (id, changes) => updateStatement(selected.id, (item) => ({
    ...item,
    transactions: item.transactions.map((row) => row.id === id ? { ...row, ...changes } : row),
  }));
  const updateExceptionStatus = (exception, value) => updateStatement(selected.id, (item) => ({
    ...item, exceptionStatus: { ...item.exceptionStatus, [exception.id]: value },
  }));
  const removeImport = async (statement) => {
    if (!window.confirm(`Delete "${statement.fileName}" and all its locally stored transactions? This cannot be undone.`)) return;
    try {
      const pendingWrite = saveQueues.current.get(statement.id);
      if (pendingWrite) await pendingWrite;
      await deleteStatement(statement.id);
      const remaining = statements.filter((item) => item.id !== statement.id);
      statementsRef.current = remaining;
      setStatements(remaining);
      setSelectedId(remaining[0]?.id ?? "");
      setNotice("Import and stored original file deleted.");
      setError("");
    } catch (deleteError) {
      setError(`Unable to delete the import: ${deleteError.message}`);
    }
  };

  const monthlyData = useMemo(() => {
    const grouped = new Map();
    transactions.forEach((row) => {
      const month = row.date?.slice(0, 7) || "Undated";
      const group = grouped.get(month) ?? { month, deposits: 0, withdrawals: 0 };
      group.deposits += row.credit || 0;
      group.withdrawals += row.debit || 0;
      grouped.set(month, group);
    });
    return [...grouped.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);
  const dailyData = useMemo(() => {
    const grouped = new Map();
    transactions.forEach((row) => {
      if (!row.date) return;
      const group = grouped.get(row.date) ?? { date: row.date, deposits: 0, withdrawals: 0 };
      group.deposits += row.credit || 0;
      group.withdrawals += row.debit || 0;
      grouped.set(row.date, group);
    });
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-31);
  }, [transactions]);
  const incomeCategories = useMemo(() => {
    const grouped = new Map();
    transactions.filter((row) => row.credit > 0).forEach((row) => grouped.set(row.category || "Unclassified", (grouped.get(row.category || "Unclassified") ?? 0) + row.credit));
    return [...grouped].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [transactions]);
  const expenseCategories = useMemo(() => {
    const grouped = new Map();
    transactions.filter((row) => row.debit > 0).forEach((row) => grouped.set(row.category || "Unclassified", (grouped.get(row.category || "Unclassified") ?? 0) + row.debit));
    return [...grouped].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 8);
  }, [transactions]);
  const categoryData = useMemo(() => {
    const names = new Set([...incomeCategories, ...expenseCategories].map((item) => item.name));
    const income = new Map(incomeCategories.map((item) => [item.name, item.amount]));
    const expenses = new Map(expenseCategories.map((item) => [item.name, item.amount]));
    return [...names].map((name) => ({ name, income: income.get(name) ?? 0, expenses: expenses.get(name) ?? 0 }))
      .sort((a, b) => b.income + b.expenses - a.income - a.expenses).slice(0, 8);
  }, [incomeCategories, expenseCategories]);
  const distributionData = useMemo(() => {
    const counts = { Deposits: 0, Withdrawals: 0, Transfers: 0, Other: 0 };
    transactions.forEach((row) => {
      if (["Bank Transfers", "Internal Transfers"].includes(row.category)) counts.Transfers += 1;
      else if (row.credit > 0) counts.Deposits += 1;
      else if (row.debit > 0) counts.Withdrawals += 1;
      else counts.Other += 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter((item) => item.value > 0);
  }, [transactions]);

  const report = (kind, format) => {
    if (!selected) return;
    let rows = transactions;
    if (kind === "Deposits") rows = rows.filter((row) => row.credit > 0);
    else if (kind === "Withdrawals") rows = rows.filter((row) => row.debit > 0);
    else if (kind === "Duplicates") {
      const repeated = new Set(exceptions.filter((item) => item.type === "Duplicate reference").map((item) => item.transaction.id));
      rows = rows.filter((row) => repeated.has(row.id));
    } else if (kind === "Unmatched") rows = rows.filter((row) => !selected.matches?.[row.id]);
    else if (kind === "Classification") rows = categories.flatMap((category) => {
      const categoryRows = transactions.filter((row) => row.category === category);
      return categoryRows.length ? [{ category, count: categoryRows.length, debit: categoryRows.reduce((sum, row) => sum + row.debit, 0), credit: categoryRows.reduce((sum, row) => sum + row.credit, 0), description: `Classification: ${category}` }] : [];
    });
    else if (kind === "Monthly Summary") rows = monthlyData.map((row) => ({ date: row.month, description: "Monthly summary", debit: row.withdrawals, credit: row.deposits }));
    else if (kind === "Reconciliation") rows = [
      { description: "Opening balance", balance: totals.opening },
      { description: "Total credits", credit: totals.deposits },
      { description: "Total debits", debit: totals.withdrawals },
      { description: "Expected closing balance", balance: totals.expected },
      { description: "Actual closing balance", balance: totals.closing },
      { description: "Reconciliation difference", balance: totals.difference },
      ...exceptions.map((item) => ({ ...item.transaction, description: item.reason, category: item.type, reviewStatus: item.status })),
    ];
    else if (kind === "Data Quality") rows = exceptions.map((item) => ({ ...item.transaction, category: item.type, reviewStatus: item.status, notes: item.reason }));
    downloadReportFile(selected, kind, rows, totals, format).catch((downloadError) => setError(`Unable to create report: ${downloadError.message}`));
  };
  const printSelectedReport = () => {
    try {
      printReport(selected, transactions, totals, "Complete Bank Statement Report", exceptions);
    } catch (printError) {
      setError(printError.message);
    }
  };

  const maskedAccount = (account) => account ? `•••• •••• ${account.slice(-4)}` : "—";
  const activeMatches = selected?.matches ?? {};
  const matchedIds = new Set(Object.values(activeMatches));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">{t("Local-only statement workspace", "مساحة كشوف الحساب المحلية")}</p>
        <h2 className="mt-1 text-xl font-bold text-navy">{t("Bank Statement", "كشف الحساب البنكي")}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{t("Import and analyze bank workbooks locally in this browser. No live banking connection or cloud sync.", "استورد وحلل كشوف البنك محلياً في هذا المتصفح. لا يوجد اتصال مصرفي مباشر أو مزامنة سحابية.")}</p>
      </div>
      {selected && <div className="flex flex-wrap items-end gap-2">
        <SelectField label={t("Selected import", "الاستيراد المحدد")} value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="min-w-[220px]">
          {statements.map((statement) => <option key={statement.id} value={statement.id}>{statement.fileName} · {shortDate(statement.metadata.startDate)}</option>)}
        </SelectField>
        <Button
          variant="outline"
          className="border-rose-200 text-rose-700 hover:bg-rose-50"
          aria-label={`${t("Delete", "حذف")} ${selected.fileName}`}
          onClick={() => removeImport(selected)}
        >
          <Trash2 size={15} />{t("Delete uploaded file", "حذف الملف المرفوع")}
        </Button>
      </div>}
    </div>

    {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {loading && <Card className="p-8 text-center text-sm text-slate-500">Loading local statements…</Card>}

    {!loading && <Card className="p-4 sm:p-5">
      <SectionTitle title={t("Import bank statement", "استيراد كشف حساب")} subtitle={t("Supported: Excel (.xlsx, .xls) and CSV. Imported records and original file remain in this browser.", "الصيغ المدعومة: Excel وCSV. تبقى البيانات والملف الأصلي محفوظة في هذا المتصفح.")} />
      <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); prepareFile(event.dataTransfer.files[0]); }}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-accent bg-sky-50" : "border-slate-200 bg-slate-50/60"}`}>
        <FileUp className="mx-auto mb-2 text-accent" size={28} />
        <p className="text-sm font-semibold text-slate-700">{t("Drop a statement workbook here", "اسحب ملف كشف الحساب إلى هنا")}</p>
        <p className="mt-1 text-xs text-slate-500">.xlsx · .xls · .csv</p>
        <Button className="mt-3" disabled={fileBusy} onClick={() => inputRef.current?.click()}><Upload size={15} />{fileBusy ? "Reading file…" : t("Browse files", "اختيار ملف")}</Button>
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => { prepareFile(event.target.files?.[0]); event.target.value = ""; }} />
      </div>

      {pending && currentPreview && <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-bold text-slate-800">{pending.file.name}</p><p className="mt-1 text-xs text-slate-500">{(pending.file.size / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB · {currentPreview.records.length} transaction rows detected</p></div>
          <SelectField label="Worksheet" value={pending.sheetName} onChange={(event) => chooseSheet(event.target.value)} className="min-w-[180px]">
            {pending.sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}
          </SelectField>
        </div>
        {(pending.fileDuplicate || pending.periodDuplicate) && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This file or account/period appears in import history. To import a corrected version anyway, confirm below.
          <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(pending.forceDuplicate)} onChange={(event) => setPending((current) => ({ ...current, forceDuplicate: event.target.checked }))} />Import this statement as a new version</label>
        </div>}
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><ListFilter size={16} />Column mapping</div>
          <p className="mb-3 text-xs text-slate-500">Detected headers can be changed. Choose “Not mapped” for columns not present in the workbook.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {columnDefinitions.map((column) => <SelectField key={column.key} label={column.label} value={pending.mapping[column.key] ?? ""} onChange={(event) => setPending((current) => ({ ...current, mapping: { ...current.mapping, [column.key]: event.target.value } }))}>
              <option value="">Not mapped</option>
              {(pending.matrix[pending.headerRow] ?? []).map((header, index) => <option key={index} value={index}>{String(header || `Column ${index + 1}`)}</option>)}
            </SelectField>)}
          </div>
        </div>
        {currentPreview.ambiguousDateCount > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <label className="text-xs font-semibold text-amber-900">{currentPreview.ambiguousDateCount} ambiguous date(s). Confirm the file date format before import.</label>
          <SelectField label="Date format" className="mt-2 max-w-xs" value={pending.dateFormat} onChange={(event) => setPending((current) => ({ ...current, dateFormat: event.target.value }))}>
            <option value="">Choose date format</option><option value="DMY">DD/MM/YYYY</option><option value="MDY">MM/DD/YYYY</option>
          </SelectField>
        </div>}
        {currentPreview.issues.length > 0 && <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-xs text-amber-900"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{currentPreview.issues.length} row(s) have potential data-quality issues. They will be retained and flagged for review.</div>}
        {fileBusy && <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-accent transition-all" style={{ width: `${importProgress}%` }} /></div>}
        <div className="scrollbar-thin overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full min-w-[700px] text-start text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{["Date", "Reference", "Description", "Debit", "Credit", "Balance"].map((header) => <th key={header} className="px-3 py-2.5 font-semibold">{header}</th>)}</tr></thead>
            <tbody>{currentPreview.records.slice(0, 5).map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2">{row.date || <StatusPill tone="amber">Check date</StatusPill>}</td><td className="px-3 py-2">{row.reference || "—"}</td><td className="max-w-[240px] truncate px-3 py-2">{row.description || <StatusPill tone="amber">Missing description</StatusPill>}</td><td className="px-3 py-2 text-rose-700">{row.debit ? money(row.debit) : "—"}</td><td className="px-3 py-2 text-emerald-700">{row.credit ? money(row.credit) : "—"}</td><td className="px-3 py-2">{money(row.balance)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap gap-2"><Button onClick={commitImport} disabled={fileBusy}>{fileBusy ? "Importing…" : <><Check size={15} />Confirm import · {currentPreview.records.length} rows</>}</Button><Button variant="outline" onClick={() => setPending(null)}>Cancel</Button></div>
      </div>}
    </Card>}

    {selected && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Opening balance" value={money(totals.opening, selected.metadata.currency)} />
        <Metric label="Closing balance" value={money(totals.closing, selected.metadata.currency)} />
        <Metric label="Total deposits" value={money(totals.deposits, selected.metadata.currency)} tone="green" />
        <Metric label="Total withdrawals" value={money(totals.withdrawals, selected.metadata.currency)} tone="red" />
        <Metric label="Net movement" value={money(totals.net, selected.metadata.currency)} tone={totals.net >= 0 ? "green" : "red"} />
        <Metric label="Transactions" value={totals.count.toLocaleString()} />
        <Metric label="Reconciliation difference" value={money(totals.difference, selected.metadata.currency)} tone={totals.difference === 0 ? "green" : totals.difference === null ? "blue" : "red"} />
        <Metric label="Data quality issues" value={exceptions.length.toLocaleString()} tone={exceptions.length ? "red" : "green"} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">Statement status</span><StatusPill tone={status === "Reconciled" ? "green" : status === "Reconciliation Difference" || status === "Import Failed" ? "red" : "amber"}>{status}</StatusPill></div>
        <span className="text-xs text-slate-400"><ShieldAlert className="me-1 inline" size={13} />Data is stored locally in this browser only.</span>
      </div>

      <div className="scrollbar-thin flex gap-2 overflow-x-auto border-b border-slate-200 pb-2">
        {tabs.map(([key, label, Icon, ar]) => <button key={key} onClick={() => setActiveTab(key)} className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${activeTab === key ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-100"}`}><Icon size={15} />{t(label, ar)}</button>)}
      </div>

      {activeTab === "overview" && <>
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card className="p-4 sm:p-5">
            <SectionTitle title="Deposits vs withdrawals" subtitle="Monthly totals calculated from the imported transaction rows" />
            {monthlyData.length ? <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => money(value, selected.metadata.currency)} /><Legend /><Bar dataKey="deposits" name="Deposits" fill="#36A38A" radius={[4, 4, 0, 0]} /><Bar dataKey="withdrawals" name="Withdrawals" fill="#E7786F" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-slate-400">Import a statement to see real monthly activity.</p>}
          </Card>
          <Card className="p-4 sm:p-5">
            <SectionTitle title="Transaction distribution" subtitle="Share of deposits, withdrawals, transfers and other imported rows." />
            {distributionData.length ? <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distributionData} dataKey="value" nameKey="name" outerRadius={90} label>{distributionData.map((item, index) => <Cell key={item.name} fill={["#2E86AB", "#36A38A", "#E6A23C", "#8A73C1"][index % 4]} />)}</Pie><Tooltip formatter={(value) => `${value} transactions`} /><Legend /></PieChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-slate-400">No transactions to analyze.</p>}
          </Card>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-4 sm:p-5"><SectionTitle title="Daily transaction activity" subtitle="Incoming and outgoing totals grouped by imported transaction date." />
            {dailyData.length ? <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={dailyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" /><YAxis /><Tooltip formatter={(value) => money(value, selected.metadata.currency)} /><Legend /><Bar dataKey="deposits" name="Incoming" fill="#36A38A" /><Bar dataKey="withdrawals" name="Outgoing" fill="#E7786F" /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-slate-400">No dated transactions.</p>}
          </Card>
          <Card className="p-4 sm:p-5"><SectionTitle title="Income and expense analysis" subtitle="Actual imported amounts grouped by editable transaction category." />
            {categoryData.length ? <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} layout="vertical" margin={{ left: 12, right: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="name" width={125} /><Tooltip formatter={(value) => money(value, selected.metadata.currency)} /><Legend /><Bar dataKey="income" name="Income" fill="#36A38A" /><Bar dataKey="expenses" name="Expenses" fill="#E7786F" /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-center text-sm text-slate-400">No categorized transactions.</p>}
          </Card>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="p-4 sm:p-5"><SectionTitle title="Bank account and statement details" subtitle="Editing metadata does not change imported transaction values." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bank name" value={metadataDraft?.bankName ?? selected.metadata.bankName} onChange={(event) => changeMetadata("bankName", event.target.value)} placeholder="Enter bank name" />
              <Field label="Account holder" value={metadataDraft?.accountHolder ?? selected.metadata.accountHolder} onChange={(event) => changeMetadata("accountHolder", event.target.value)} placeholder="Enter account holder" />
              <Field label="Account number" value={metadataDraft?.accountNumber ?? selected.metadata.accountNumber} onChange={(event) => changeMetadata("accountNumber", event.target.value)} />
              <Field label="Customer CIF" value={metadataDraft?.customerCif ?? selected.metadata.customerCif} onChange={(event) => changeMetadata("customerCif", event.target.value)} />
              <Field label="Currency" value={metadataDraft?.currency ?? selected.metadata.currency} onChange={(event) => changeMetadata("currency", event.target.value)} />
              <div className="flex items-end text-xs text-slate-500">Imported: {new Date(selected.importedAt).toLocaleString()}</div>
              <Field label="Imported file" value={selected.fileName} readOnly />
              <Field label="Import date" value={selected.metadata.importDate} readOnly />
              <Field label="Statement start date" type="date" value={metadataDraft?.startDate ?? selected.metadata.startDate} onChange={(event) => changeMetadata("startDate", event.target.value)} />
              <Field label="Statement end date" type="date" value={metadataDraft?.endDate ?? selected.metadata.endDate} onChange={(event) => changeMetadata("endDate", event.target.value)} />
              <Field label="Opening balance" type="number" step="0.01" value={metadataDraft?.openingBalance ?? ""} onChange={(event) => changeMetadata("openingBalance", event.target.value)} />
              <Field label="Closing balance" type="number" step="0.01" value={metadataDraft?.closingBalance ?? ""} onChange={(event) => changeMetadata("closingBalance", event.target.value)} />
            </div>
            <Button className="mt-4" onClick={updateMetadata}>Save account details</Button>
          </Card>
          <Card className="p-4 sm:p-5"><SectionTitle title="Largest transactions" subtitle="Top deposits and withdrawals from this import" />
            {[
              ["Largest deposits", [...transactions].filter((row) => row.credit > 0).sort((a, b) => b.credit - a.credit).slice(0, 10), "credit"],
              ["Largest withdrawals", [...transactions].filter((row) => row.debit > 0).sort((a, b) => b.debit - a.debit).slice(0, 10), "debit"],
            ].map(([label, rows, key]) => <div key={label} className="mb-4 last:mb-0"><h3 className="mb-2 text-xs font-bold text-slate-700">{label}</h3><div className="max-h-40 space-y-1.5 overflow-y-auto">{rows.map((row) => <div key={row.id} className="flex justify-between gap-3 text-xs"><span className="truncate text-slate-600">{row.description || row.reference || "Unlabeled transaction"}</span><b className={key === "credit" ? "text-emerald-700" : "text-rose-700"}>{money(row[key], selected.metadata.currency)}</b></div>)}{!rows.length && <p className="text-xs text-slate-400">No transactions.</p>}</div></div>)}
          </Card>
        </div>
      </>}

      {activeTab === "transactions" && <Card className="p-4 sm:p-5">
        <SectionTitle title="Transaction register" subtitle={`${filtered.length} of ${transactions.length} imported rows`} action={<div className="flex gap-2"><Button variant="outline" onClick={() => downloadRows(filtered, "bank-transactions", "csv").catch((downloadError) => setError(`Unable to export CSV: ${downloadError.message}`))}>CSV</Button><Button variant="outline" onClick={() => downloadRows(filtered, "bank-transactions", "xlsx").catch((downloadError) => setError(`Unable to export Excel: ${downloadError.message}`))}>Excel</Button></div>} />
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative text-xs text-slate-500"><span className="mb-1 block">Search</span><Search className="absolute start-3 top-9 text-slate-400" size={15} /><input className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Reference or description" /></label>
          <SelectField label="Transaction type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All</option><option value="debit">Debit / withdrawal</option><option value="credit">Credit / deposit</option></SelectField>
          <Field label="From date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <Field label="To date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <SelectField label="Classification" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</SelectField>
          <Field label="Minimum amount" type="number" min="0" value={amountMin} onChange={(event) => setAmountMin(event.target.value)} />
          <Field label="Maximum amount" type="number" min="0" value={amountMax} onChange={(event) => setAmountMax(event.target.value)} />
          <div className="flex items-end"><Button variant="ghost" onClick={() => { setSearch(""); setTypeFilter("all"); setCategoryFilter("all"); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); }}>Clear filters</Button></div>
        </div>
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1100px] text-start text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50 text-slate-500">{[["date", "Transaction date"], ["time", "Time"], ["reference", "Reference"], ["description", "Description"], ["debit", "Debit"], ["credit", "Credit"], ["balance", "Balance"], ["category", "Type / category"], ["reviewStatus", "Status"]].map(([key, label]) => <th key={key} className="cursor-pointer whitespace-nowrap px-3 py-3 font-semibold" onClick={() => setSort((old) => ({ key, direction: old.key === key && old.direction === "asc" ? "desc" : "asc" }))}>{label}{sort.key === key ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}</th>)}<th className="px-3 py-3">Actions</th></tr></thead>
            <tbody>{shown.map((row) => <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/70"><td className="whitespace-nowrap px-3 py-3">{shortDate(row.date)}</td><td className="px-3 py-3">{row.time || "—"}</td><td className="px-3 py-3">{row.reference || "—"}</td><td className="max-w-[250px] truncate px-3 py-3" title={row.description}>{row.description || <span className="text-amber-700">Missing description</span>}</td><td className="px-3 py-3 text-rose-700">{row.debit ? money(row.debit, selected.metadata.currency) : "—"}</td><td className="px-3 py-3 text-emerald-700">{row.credit ? money(row.credit, selected.metadata.currency) : "—"}</td><td className="px-3 py-3">{money(row.balance, selected.metadata.currency)}</td><td className="px-3 py-3"><select className="max-w-[155px] rounded-md border border-slate-200 bg-white p-1.5" value={row.category} onChange={(event) => updateTransaction(row.id, { category: event.target.value, confidence: 1 })}>{categories.map((category) => <option key={category}>{category}</option>)}</select>{row.confidence < 0.6 && <span className="ms-1 text-amber-600" title="Low-confidence classification; review recommended"><CircleHelp size={13} className="inline" /></span>}</td><td className="px-3 py-3"><select className="rounded-md border border-slate-200 bg-white p-1.5" value={row.reviewStatus} onChange={(event) => updateTransaction(row.id, { reviewStatus: event.target.value })}><option>Pending Review</option><option>Reviewed</option><option>Needs Investigation</option></select></td><td className="px-3 py-3"><Button variant="ghost" className="px-2" onClick={() => setDetail(row)}>Details</Button></td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex items-center justify-between pt-4 text-xs text-slate-500"><span>{filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button><span>{page} / {pageCount}</span><Button variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button></div></div>
      </Card>}

      {activeTab === "reconciliation" && <Card className="p-4 sm:p-5">
        <SectionTitle title="Bank reconciliation center" subtitle="Expected closing balance = opening balance + credits − debits. Imported records are never silently changed or removed." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Opening balance" value={money(totals.opening, selected.metadata.currency)} />
          <Metric label="Total bank credits" value={money(totals.deposits, selected.metadata.currency)} tone="green" />
          <Metric label="Total bank debits" value={money(totals.withdrawals, selected.metadata.currency)} tone="red" />
          <Metric label="Expected closing balance" value={money(totals.expected, selected.metadata.currency)} />
          <Metric label="Actual closing balance" value={money(totals.closing, selected.metadata.currency)} />
        </div>
        <div className={`mt-4 rounded-lg border p-4 text-sm ${totals.difference === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <b>Reconciliation difference = Actual closing − Expected closing = {money(totals.difference, selected.metadata.currency)}</b>
          <p className="mt-1 text-xs">Reconciliation status: {status}. A balanced summary does not clear transaction-level exceptions.</p>
        </div>
        <div className="mt-6"><SectionTitle title="Exceptions and data quality" subtitle={`${exceptions.length} issue(s), including duplicate references, missing data and balance sequence differences. Duplicates are retained.`} />
          <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[900px] text-start text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50 text-slate-500">{["Issue type", "Reference", "Date", "Amount", "Description", "Reason", "Review status", "Action"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
            <tbody>{exceptions.map((exception) => <tr key={exception.id} className="border-b border-slate-100"><td className="px-3 py-3"><StatusPill>{exception.type}</StatusPill></td><td className="px-3 py-3">{exception.transaction.reference || "—"}</td><td className="px-3 py-3">{shortDate(exception.transaction.date)}</td><td className="px-3 py-3">{money(exception.transaction.debit || exception.transaction.credit, selected.metadata.currency)}</td><td className="max-w-[180px] truncate px-3 py-3">{exception.transaction.description || "—"}</td><td className="max-w-[300px] whitespace-normal px-3 py-3">{exception.reason}</td><td className="px-3 py-3">{exception.status}</td><td className="px-3 py-3"><select aria-label={`Set exception status for ${exception.transaction.reference}`} value={exception.status} onChange={(event) => updateExceptionStatus(exception, event.target.value)} className="rounded-md border border-slate-200 bg-white p-1.5"><option>Requires Investigation</option><option>Reviewed</option><option>Resolved</option></select></td></tr>)}
              {!exceptions.length && <tr><td colSpan="8" className="px-3 py-10 text-center text-slate-400">No detected exceptions.</td></tr>}</tbody>
          </table></div>
        </div>
      </Card>}

      {activeTab === "matching" && <Card className="p-4 sm:p-5">
        <SectionTitle title="Match imported transactions to bank movements" subtitle="Suggested matches use amount, date and descriptions. Existing dashboard movements are never changed." />
        <div className="space-y-3">{transactions.map((row) => {
          const candidates = getMatchCandidates(row, selected);
          const matched = activeMatches[row.id];
          return <div key={row.id} className="grid gap-3 rounded-lg border border-slate-100 p-3 md:grid-cols-[1fr_1fr_auto] md:items-center">
            <div><p className="text-xs font-semibold text-slate-700">{row.description || row.reference || "Unlabeled bank transaction"}</p><p className="mt-1 text-[11px] text-slate-400">{shortDate(row.date)} · {row.reference || "No reference"} · {money(row.credit || -row.debit, selected.metadata.currency)}</p></div>
            <div>{matched ? <StatusPill tone="green">Matched to {matched}</StatusPill> : candidates.length ? <div className="flex flex-wrap items-center gap-2"><StatusPill tone="blue">{candidates[0].score >= 7 ? "Possible match" : "Requires review"}</StatusPill><select aria-label={`Match ${row.reference}`} className="max-w-[270px] rounded-md border border-slate-200 p-2 text-xs" defaultValue="" onChange={(event) => { if (event.target.value) updateStatement(selected.id, (item) => ({ ...item, matches: { ...item.matches, [row.id]: event.target.value } }), "Transaction manually matched."); }}><option value="">Choose dashboard movement</option>{candidates.map(({ movement, score }) => <option key={movement.id} value={movement.id} disabled={matchedIds.has(movement.id)}>{movement.id} · {movement.description} · score {score}</option>)}</select></div> : <StatusPill tone="gray">Unmatched</StatusPill>}</div>
            <div className="flex items-center gap-2 text-xs text-slate-500">{matched && <button className="font-semibold text-rose-600" onClick={() => updateStatement(selected.id, (item) => { const matches = { ...item.matches }; delete matches[row.id]; return { ...item, matches }; }, "Manual match removed.")}>Unmatch</button>}<span>{candidates.length ? `${candidates.length} candidate(s)` : "No candidates"}</span></div>
          </div>;
        })}</div>
      </Card>}

      {activeTab === "reports" && <Card className="p-4 sm:p-5">
        <SectionTitle title="Statement reports" subtitle="Download reports from this import. PDF output is provided using the browser's print-to-PDF workflow." />
        <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50 p-3 text-xs text-sky-900"><b>{companyName}</b> · {selected.metadata.bankName || "Bank name not provided"} · Account {maskedAccount(selected.metadata.accountNumber)} · {shortDate(selected.metadata.startDate)} – {shortDate(selected.metadata.endDate)} · {selected.metadata.currency} · Generated {new Date().toLocaleString()}<p className="mt-1">Opening {money(totals.opening, selected.metadata.currency)} · Deposits {money(totals.deposits, selected.metadata.currency)} · Withdrawals {money(totals.withdrawals, selected.metadata.currency)} · Closing {money(totals.closing, selected.metadata.currency)} · Difference {money(totals.difference, selected.metadata.currency)}</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["Complete Statement", "Deposits", "Withdrawals", "Monthly Summary", "Classification", "Reconciliation", "Duplicates", "Unmatched", "Data Quality"].map((kind) => <div key={kind} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"><span className="text-sm font-semibold text-slate-700">{kind}</span><div className="flex gap-1"><Button variant="outline" className="px-2 py-1.5 text-xs" onClick={() => report(kind, "csv")}>CSV</Button><Button variant="outline" className="px-2 py-1.5 text-xs" onClick={() => report(kind, "xlsx")}>Excel</Button></div></div>)}</div>
        <Button variant="outline" className="mt-4" onClick={printSelectedReport}><Printer size={15} />Print / Save PDF</Button>
      </Card>}

      {activeTab === "history" && <Card className="p-4 sm:p-5">
        <SectionTitle title="Import history" subtitle="View, reopen, export originals or delete local imports. Duplicate imports require explicit confirmation." action={<Button variant="outline" onClick={() => downloadRows(transactions, "bank-statement-backup", "xlsx").catch((downloadError) => setError(`Unable to export backup: ${downloadError.message}`))}><ArrowDownToLine size={15} />Export selected backup</Button>} />
        <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[1050px] text-start text-xs"><thead><tr className="border-y border-slate-100 bg-slate-50 text-slate-500">{["File", "Bank / account", "Period", "Imported", "Transactions", "Credits", "Debits", "Closing balance", "Status", "Actions"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
          <tbody>{statements.map((statement) => { const summary = getTotals(statement); const rowStatus = Math.abs(summary.difference ?? Infinity) <= 0.01 ? "Reconciled" : summary.difference === null ? "Pending Review" : "Reconciliation Difference"; return <tr key={statement.id} className="border-b border-slate-100"><td className="max-w-[180px] truncate px-3 py-3 font-semibold">{statement.fileName}</td><td className="px-3 py-3">{statement.metadata.bankName || "—"} · {maskedAccount(statement.metadata.accountNumber)}</td><td className="px-3 py-3">{shortDate(statement.metadata.startDate)} – {shortDate(statement.metadata.endDate)}</td><td className="px-3 py-3">{new Date(statement.importedAt).toLocaleString()}</td><td className="px-3 py-3">{summary.count}</td><td className="px-3 py-3 text-emerald-700">{money(summary.deposits, statement.metadata.currency)}</td><td className="px-3 py-3 text-rose-700">{money(summary.withdrawals, statement.metadata.currency)}</td><td className="px-3 py-3">{money(summary.closing, statement.metadata.currency)}</td><td className="px-3 py-3"><StatusPill tone={rowStatus === "Reconciled" ? "green" : rowStatus === "Reconciliation Difference" ? "red" : "amber"}>{rowStatus}</StatusPill></td><td className="px-3 py-3"><div className="flex gap-2"><button onClick={() => { setSelectedId(statement.id); setActiveTab("overview"); }} className="font-semibold text-accent">Open</button><button onClick={() => { try { downloadOriginal(statement); } catch (downloadError) { setError(downloadError.message); } }} className="font-semibold text-slate-600">Original</button><button aria-label={`Delete ${statement.fileName}`} onClick={() => removeImport(statement)} className="text-rose-600"><Trash2 size={15} /></button></div></td></tr>; })}{!statements.length && <tr><td colSpan="10" className="px-3 py-10 text-center text-slate-400">No statements imported yet.</td></tr>}</tbody>
        </table></div>
      </Card>}
    </>}

    {!loading && !selected && !pending && <Card className="p-8 text-center"><Wallet size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">Upload a statement to get started.</p><p className="mt-1 text-xs text-slate-400">Your statement is processed and stored locally; it is not sent to any external service.</p></Card>}

    {detail && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4" onClick={() => setDetail(null)}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between"><div><h3 className="text-lg font-bold text-navy">Transaction details</h3><p className="mt-1 text-xs text-slate-500">Original imported values are preserved in the source workbook.</p></div><button onClick={() => setDetail(null)} aria-label="Close dialog" className="text-slate-400">×</button></div>
      <div className="grid gap-3 sm:grid-cols-2">{[["Date", shortDate(detail.date)], ["Time", detail.time || "—"], ["Reference", detail.reference || "—"], ["Description", detail.description || "—"], ["Debit", money(detail.debit, selected.metadata.currency)], ["Credit", money(detail.credit, selected.metadata.currency)], ["Running balance", money(detail.balance, selected.metadata.currency)], ["Imported row", detail.sourceRow], ["Original row data", JSON.stringify(detail.raw, null, 2)]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-[11px] text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-700">{value}</p></div>)}</div>
      <label className="mt-4 block text-xs font-semibold text-slate-500">Internal note<textarea value={detail.notes} onChange={(event) => setDetail({ ...detail, notes: event.target.value })} className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" /></label>
      <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setDetail(null)}>Cancel</Button><Button onClick={() => { updateTransaction(detail.id, { notes: detail.notes }); setDetail(null); }}>Save note</Button></div>
    </div></div>}
  </div>;
}
