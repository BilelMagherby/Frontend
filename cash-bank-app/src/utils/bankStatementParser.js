export const columnDefinitions = [
  { key: "date", label: "Transaction date", aliases: ["transaction date", "date", "posting date", "value date", "تاريخ العملية", "تاريخ المعاملة", "التاريخ", "تاريخ القيد"] },
  { key: "time", label: "Transaction time", aliases: ["transaction time", "time", "وقت المعاملة", "وقت العملية", "الوقت"] },
  { key: "reference", label: "Reference number", aliases: ["reference number", "reference", "ref no", "transaction id", "رقم المرجع", "الرقم المرجعي", "رقم العملية", "رقم الحركة"] },
  { key: "description", label: "Description", aliases: ["transaction description", "description", "details", "narrative", "تفاصيل العملية", "وصف العملية", "الوصف", "البيان", "تفاصيل"] },
  { key: "debit", label: "Debit", aliases: ["debit", "withdrawal", "paid out", "مدين", "المدين", "خصم", "مبلغ الخصم"] },
  { key: "credit", label: "Credit", aliases: ["credit", "deposit", "paid in", "دائن", "الدائن", "إيداع", "ايداع", "مبلغ الإيداع"] },
  { key: "balance", label: "Balance", aliases: ["running balance", "balance", "الرصيد", "الرصيد الحالي", "الرصيد بعد العملية"] },
  { key: "accountNumber", label: "Account number", aliases: ["account number", "account no", "رقم الحساب", "الحساب"] },
  { key: "currency", label: "Currency", aliases: ["currency", "عملة الحساب", "العملة"] },
];

const normalize = (value) => String(value ?? "").toLocaleLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0640]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const asciiDigits = (value) => String(value ?? "").replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
const headerMatches = (header, aliases) => {
  const value = normalize(header);
  return aliases.some((alias) => value === normalize(alias) || value.includes(normalize(alias)));
};

export function detectHeaderRow(matrix) {
  let best = { rowIndex: 0, mapping: {}, score: 0 };
  matrix.slice(0, 25).forEach((row, rowIndex) => {
    const mapping = {};
    for (const column of columnDefinitions) {
      const index = row.findIndex((cell) => headerMatches(cell, column.aliases));
      if (index >= 0) mapping[column.key] = String(index);
    }
    const score = Object.keys(mapping).length;
    if (score > best.score) best = { rowIndex, mapping, score };
  });
  return best;
}

export function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || String(value).trim() === "") return null;
  let text = asciiDigits(value).replace(/[٬,]/g, "").replace(/[٫]/g, ".").replace(/\s/g, "");
  const negative = /^\(.*\)$/.test(text);
  text = text.replace(/[()]/g, "").replace(/[^\d.+-]/g, "");
  if (!text || !/[0-9]/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : null;
}

function parseDate(value, dateFormat) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { value: value.toISOString().slice(0, 10), ambiguous: false };
  }
  if (typeof value === "number" && value > 0) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000);
    if (!Number.isNaN(date.getTime())) return { value: date.toISOString().slice(0, 10), ambiguous: false };
  }
  const text = asciiDigits(value).trim();
  const ymd = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymd) return { value: `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`, ambiguous: false };
  const dmy = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (!dmy) return { value: "", ambiguous: false };
  const first = Number(dmy[1]);
  const second = Number(dmy[2]);
  const year = Number(dmy[3]) < 100 ? String(2000 + Number(dmy[3])) : dmy[3];
  if (first <= 12 && second <= 12 && first !== second && !dateFormat) return { value: "", ambiguous: true };
  const resolvedFormat = dateFormat || (first > 12 ? "DMY" : second > 12 ? "MDY" : "DMY");
  const day = resolvedFormat === "MDY" ? second : first;
  const month = resolvedFormat === "MDY" ? first : second;
  if (month < 1 || month > 12 || day < 1 || day > 31) return { value: "", ambiguous: false };
  return { value: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, ambiguous: false };
}

function parseTime(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toTimeString().slice(0, 8);
  if (typeof value === "number" && value >= 0 && value < 1) {
    const seconds = Math.round(value * 86400) % 86400;
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }
  return String(value ?? "").trim();
}

const summaryPattern = /(opening balance|closing balance|total debits?|total credits?|statement total|الرصيد الافتتاحي|الرصيد الختامي|إجمالي المدين|اجمالي المدين|إجمالي الدائن|اجمالي الدائن|الإجمالي|الاجمالي)/i;

export function parseStatementRows(matrix, headerRow, mapping, dateFormat = "") {
  const headers = matrix[headerRow] ?? [];
  const records = [];
  const summary = { openingBalance: null, closingBalance: null };
  const issues = [];
  let ambiguousDateCount = 0;
  for (const [offset, row] of matrix.slice(headerRow + 1).entries()) {
    if (!row.some((cell) => String(cell ?? "").trim() !== "")) continue;
    const read = (key) => mapping[key] === undefined || mapping[key] === "" ? "" : row[Number(mapping[key])] ?? "";
    const description = String(read("description") ?? "").trim();
    const joined = row.map((cell) => String(cell ?? "")).join(" ");
    const summaryMatch = joined.match(summaryPattern);
    if (summaryMatch && !read("reference") && !read("date")) {
      const value = parseAmount(read("balance")) ?? parseAmount(row.find((cell) => parseAmount(cell) !== null));
      if (value !== null) {
        if (/opening balance|الرصيد الافتتاحي/i.test(summaryMatch[0])) summary.openingBalance = Math.abs(value);
        if (/closing balance|الرصيد الختامي/i.test(summaryMatch[0])) summary.closingBalance = value;
      }
      continue;
    }
    const debitRaw = read("debit");
    const creditRaw = read("credit");
    const debitValue = parseAmount(debitRaw);
    const creditValue = parseAmount(creditRaw);
    const signedDebit = debitValue === null ? 0 : Math.abs(debitValue);
    const signedCredit = creditValue === null ? 0 : Math.abs(creditValue);
    const parsedDate = parseDate(read("date"), dateFormat);
    if (parsedDate.ambiguous) ambiguousDateCount += 1;
    const record = {
      id: `row-${headerRow + offset + 2}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
      sourceRow: headerRow + offset + 2,
      date: parsedDate.value,
      time: parseTime(read("time")),
      reference: String(read("reference") ?? "").trim(),
      description,
      debit: signedDebit,
      credit: signedCredit,
      balance: parseAmount(read("balance")),
      accountNumber: String(read("accountNumber") ?? "").trim(),
      currency: String(read("currency") ?? "").trim(),
      category: "",
      confidence: 0,
      reviewStatus: "Pending Review",
      notes: "",
      raw: Object.fromEntries(headers.map((header, index) => [String(header || `Column ${index + 1}`), row[index] ?? ""])),
      importIssues: [],
    };
    if (!record.date) record.importIssues.push(parsedDate.ambiguous ? "Ambiguous date" : "Missing or invalid date");
    if (!record.description) record.importIssues.push("Missing description");
    if (debitValue === null && creditValue === null) record.importIssues.push("Missing or invalid amount");
    if (signedDebit > 0 && signedCredit > 0) record.importIssues.push("Both debit and credit are populated");
    if ((creditValue ?? 0) < 0) record.importIssues.push("Suspicious negative credit value");
    if (debitValue === 0 && creditValue === 0) record.importIssues.push("Zero-value transaction");
    if (record.importIssues.length) issues.push({ row: record.sourceRow, issues: record.importIssues });
    records.push(record);
  }
  return { records, summary, issues, ambiguousDateCount };
}

export async function fingerprintFile(file) {
  const bytes = await file.arrayBuffer();
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 2166136261;
  for (const byte of new Uint8Array(bytes)) hash = Math.imul(hash ^ byte, 16777619);
  return `fnv-${(hash >>> 0).toString(16)}-${file.size}`;
}

export function classifyTransaction(description, debit, credit) {
  const text = normalize(description);
  const rules = [
    ["Salary Payments", ["salary", "payroll", "راتب", "رواتب"]],
    ["Government Payments", ["government", "ministry", "وزارة", "حكومي"]],
    ["Utility Bills", ["electricity", "water bill", "utility", "كهرباء", "مياه"]],
    ["Bank Charges", ["bank fee", "bank charge", "commission", "رسوم", "عمولة"]],
    ["Tax Payments", ["vat", "tax", "ضريبة", "زكاة"]],
    ["SADAD Payments", ["sadad", "سداد"]],
    ["POS Settlements", ["pos", "point of sale", "نقاط البيع"]],
    ["Customer Deposits", ["customer deposit", "client deposit", "إيداع العميل", "ايداع العميل", "إيداع عميل"]],
    ["Internal Transfers", ["own account", "internal transfer", "بين الحسابات", "تحويل داخلي"]],
    ["Bank Transfers", ["transfer", "wire", "تحويل"]],
    ["Supplier Payments", ["supplier", "vendor", "invoice", "مورد", "فاتورة"]],
  ];
  for (const [category, keywords] of rules) {
    if (keywords.some((keyword) => text.includes(normalize(keyword)))) return { category, confidence: 0.82 };
  }
  if (credit > 0) return { category: text ? "Other Income" : "Unclassified", confidence: text ? 0.42 : 0.1 };
  if (debit > 0) return { category: text ? "Other Expenses" : "Unclassified", confidence: text ? 0.42 : 0.1 };
  return { category: "Unclassified", confidence: 0.1 };
}
