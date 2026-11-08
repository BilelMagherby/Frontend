const MONEY_SCALE = 100n;
const QUANTITY_SCALE = 1000n;
const DISCOUNT_SCALE = 10000n;
const STANDARD_VAT_RATE = 15;
const ADJUSTMENT_STATUSES = new Set(["Issued", "Partially Applied", "Fully Applied"]);

function decimalToScaled(value, scale, field) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) throw new Error(`${field} must be a non-negative decimal number.`);
  const places = scale.toString().length - 1;
  const fraction = match[2] ?? "";
  const whole = BigInt(match[1]) * scale;
  const kept = fraction.slice(0, places).padEnd(places, "0");
  let result = whole + BigInt(kept || "0");
  if (fraction.length > places && Number(fraction[places]) >= 5) result += 1n;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${field} is too large.`);
  return Number(result);
}

function roundRatio(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

function safeNumber(value, field) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`${field} is too large.`);
  }
  return Number(value);
}

export function toMinorUnits(value, field = "Amount") {
  return decimalToScaled(value, MONEY_SCALE, field);
}

export function fromMinorUnits(value) {
  if (!Number.isSafeInteger(value)) throw new Error("Minor-unit amount must be a safe integer.");
  return (value / 100).toFixed(2);
}

export function calculateAdjustmentLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("Add at least one adjustment line.");
  const totals = lines.reduce((sum, line, index) => {
    const lineNumber = index + 1;
    if (!String(line.description ?? "").trim()) throw new Error(`Line ${lineNumber}: description is required.`);
    const quantity = decimalToScaled(line.quantity, QUANTITY_SCALE, `Line ${lineNumber} quantity`);
    if (quantity <= 0) throw new Error(`Line ${lineNumber}: quantity must be greater than zero.`);
    const unitPrice = decimalToScaled(line.unitPrice, MONEY_SCALE, `Line ${lineNumber} unit price`);
    const discountBps = decimalToScaled(line.discountPercent ?? "0", 100n, `Line ${lineNumber} discount`);
    if (discountBps > Number(DISCOUNT_SCALE)) throw new Error(`Line ${lineNumber}: discount cannot exceed 100%.`);
    const vatRate = String(line.vatRate ?? STANDARD_VAT_RATE);
    if (!["15", "0", "exempt"].includes(vatRate)) throw new Error(`Line ${lineNumber}: unsupported VAT rate.`);

    const gross = safeNumber(roundRatio(BigInt(quantity) * BigInt(unitPrice), QUANTITY_SCALE), `Line ${lineNumber} gross`);
    const discount = safeNumber(roundRatio(BigInt(gross) * BigInt(discountBps), DISCOUNT_SCALE), `Line ${lineNumber} discount`);
    const taxable = gross - discount;
    const vat = vatRate === "15" ? safeNumber(roundRatio(BigInt(taxable) * 15n, 100n), `Line ${lineNumber} VAT`) : 0;
    return {
      subtotal: sum.subtotal + gross,
      discount: sum.discount + discount,
      taxable: sum.taxable + taxable,
      vat: sum.vat + vat,
      total: sum.total + taxable + vat,
    };
  }, { subtotal: 0, discount: 0, taxable: 0, vat: 0, total: 0 });

  for (const [field, value] of Object.entries(totals)) {
    if (!Number.isSafeInteger(value)) throw new Error(`Calculated ${field} exceeds the supported amount.`);
  }
  return totals;
}

export function calculateInvoiceLedger(invoice, adjustments = [], payments = []) {
  const originalTotal = toMinorUnits(invoice.total, "Original invoice total");
  const linkedAdjustments = adjustments.filter((item) =>
    item.originalInvoiceId === invoice.id && ADJUSTMENT_STATUSES.has(item.status),
  );
  const debitCents = linkedAdjustments
    .filter((item) => item.kind === "debit")
    .reduce((sum, item) => sum + toMinorUnits(item.total, "Debit adjustment"), 0);
  const creditCents = linkedAdjustments
    .filter((item) => item.kind === "credit")
    .reduce((sum, item) => sum + toMinorUnits(item.total, "Credit adjustment"), 0);
  const paidCents = payments
    .filter((payment) => payment.invoiceId === invoice.id)
    .reduce((sum, payment) => sum + toMinorUnits(payment.amount, "Payment"), 0);
  const adjustedTotal = originalTotal + debitCents - creditCents;
  const outstanding = adjustedTotal - paidCents;
  return {
    originalTotal,
    debitCents,
    creditCents,
    paidCents,
    adjustedTotal,
    outstanding,
    creditable: Math.max(0, Math.min(originalTotal - creditCents, outstanding)),
  };
}

export function validateAdjustmentAgainstInvoice({ note, invoice, adjustments = [], payments = [] }) {
  if (!invoice) throw new Error("The referenced original invoice was not found.");
  if (invoice.direction && invoice.direction !== note.direction) {
    throw new Error("The adjustment direction must match the original invoice.");
  }
  if (String(invoice.status ?? "").toLowerCase() === "paid" && !payments.some((payment) => payment.invoiceId === invoice.id)) {
    throw new Error("This invoice is marked paid, but no payment ledger is available to verify an adjustment safely.");
  }
  if (invoice.counterparty && note.counterparty && invoice.counterparty.trim().toLowerCase() !== note.counterparty.trim().toLowerCase()) {
    throw new Error("The counterparty must match the original invoice.");
  }
  const amount = toMinorUnits(note.total, "Adjustment total");
  if (amount <= 0) throw new Error("Adjustment total must be greater than zero.");
  const ledger = calculateInvoiceLedger(invoice, adjustments, payments);
  if (note.kind === "credit" && amount > ledger.creditable) {
    throw new Error(`Credit exceeds the remaining amount that can be adjusted (${fromMinorUnits(ledger.creditable)} SAR).`);
  }
  if (note.kind !== "credit" && note.kind !== "debit") {
    throw new Error("Adjustment kind must be credit or debit.");
  }
  return ledger;
}

export function getVatAdjustmentCents(note) {
  const vat = toMinorUnits(note.vat, "Adjustment VAT");
  return note.kind === "credit" ? -vat : vat;
}

export function getAccountingDirection(note) {
  if (note.direction === "customer") {
    return note.kind === "credit" ? "accounts-receivable-decrease" : "accounts-receivable-increase";
  }
  if (note.direction === "supplier") {
    return note.kind === "credit" ? "accounts-payable-decrease" : "accounts-payable-increase";
  }
  throw new Error("Direction must be customer or supplier.");
}

export function isFinanciallyEffective(note) {
  return ADJUSTMENT_STATUSES.has(note.status);
}

export const DEFAULT_VAT_RATE = STANDARD_VAT_RATE;
