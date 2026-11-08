import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateAdjustmentLines,
  calculateInvoiceLedger,
  fromMinorUnits,
  getAccountingDirection,
  getVatAdjustmentCents,
  validateAdjustmentAgainstInvoice,
} from "../src/utils/accountingEngine.js";

test("calculates a 200 SAR credit note including 15% VAT", () => {
  const totals = calculateAdjustmentLines([{ description: "Return", quantity: "1", unitPrice: "200", vatRate: "15" }]);
  assert.deepEqual(totals, { subtotal: 20000, discount: 0, taxable: 20000, vat: 3000, total: 23000 });
});

test("uses decimal-safe line arithmetic and rounds VAT per line", () => {
  const totals = calculateAdjustmentLines([
    { description: "First", quantity: "0.333", unitPrice: "0.10", vatRate: "15" },
    { description: "Second", quantity: "3", unitPrice: "0.05", discountPercent: "10", vatRate: "0" },
  ]);
  assert.equal(fromMinorUnits(totals.subtotal), "0.18");
  assert.equal(fromMinorUnits(totals.discount), "0.02");
  assert.equal(fromMinorUnits(totals.taxable), "0.16");
});

test("adjusts original invoice totals for credit and debit notes", () => {
  const invoice = { id: "INV-1", total: "1150.00" };
  const credit = { id: "CN-1", originalInvoiceId: "INV-1", kind: "credit", status: "Issued", total: "230.00" };
  const creditLedger = calculateInvoiceLedger(invoice, [credit]);
  assert.equal(fromMinorUnits(creditLedger.adjustedTotal), "920.00");

  const debit = { id: "DN-1", originalInvoiceId: "INV-1", kind: "debit", status: "Issued", total: "115.00" };
  const debitLedger = calculateInvoiceLedger(invoice, [debit]);
  assert.equal(fromMinorUnits(debitLedger.adjustedTotal), "1265.00");
});

test("draft, rejected, and cancelled adjustments do not change balances", () => {
  const invoice = { id: "INV-1", total: "100.00" };
  const adjustments = ["Draft", "Pending Approval", "Rejected", "Cancelled"].map((status, index) => ({
    id: `CN-${index}`,
    originalInvoiceId: "INV-1",
    kind: "credit",
    status,
    total: "10.00",
  }));
  assert.equal(fromMinorUnits(calculateInvoiceLedger(invoice, adjustments).outstanding), "100.00");
});

test("limits credit adjustments to the remaining invoice balance after payments and prior credits", () => {
  const invoice = { id: "INV-1", total: "1150.00", direction: "customer", counterparty: "Customer A" };
  const adjustments = [{ originalInvoiceId: "INV-1", kind: "credit", status: "Issued", total: "230.00" }];
  const payments = [{ invoiceId: "INV-1", amount: "500.00" }];
  const note = { direction: "customer", counterparty: "Customer A", kind: "credit", total: "420.00" };
  const ledger = validateAdjustmentAgainstInvoice({ note, invoice, adjustments, payments });
  assert.equal(fromMinorUnits(ledger.creditable), "420.00");
  assert.throws(() => validateAdjustmentAgainstInvoice({
    note: { ...note, total: "420.01" },
    invoice,
    adjustments,
    payments,
  }), /remaining amount/);
});

test("uses correct receivable/payable and VAT directions", () => {
  const customerCredit = { direction: "customer", kind: "credit", vat: "30.00" };
  const supplierDebit = { direction: "supplier", kind: "debit", vat: "15.00" };
  assert.equal(getAccountingDirection(customerCredit), "accounts-receivable-decrease");
  assert.equal(getAccountingDirection(supplierDebit), "accounts-payable-increase");
  assert.equal(getVatAdjustmentCents(customerCredit), -3000);
  assert.equal(getVatAdjustmentCents(supplierDebit), 1500);
});

test("refuses to adjust an invoice marked paid without payment evidence", () => {
  assert.throws(() => validateAdjustmentAgainstInvoice({
    note: { direction: "supplier", counterparty: "Vendor A", kind: "credit", total: "1.00" },
    invoice: { id: "BILL-1", total: "10.00", direction: "supplier", counterparty: "Vendor A", status: "Paid" },
  }), /no payment ledger/);
});

test("rejects unsupported rates, negative amounts, and mismatched counterparties", () => {
  assert.throws(() => calculateAdjustmentLines([{ description: "Bad tax", quantity: "1", unitPrice: "10", vatRate: "7" }]), /unsupported VAT rate/);
  assert.throws(() => calculateAdjustmentLines([{ description: "Negative", quantity: "1", unitPrice: "-1", vatRate: "15" }]), /non-negative/);
  assert.throws(() => validateAdjustmentAgainstInvoice({
    note: { direction: "customer", counterparty: "Other", kind: "credit", total: "1.00" },
    invoice: { id: "INV-1", total: "10.00", direction: "customer", counterparty: "Customer A" },
  }), /counterparty must match/);
});
