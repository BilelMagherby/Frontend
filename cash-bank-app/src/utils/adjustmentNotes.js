import { calculateAdjustmentLines, getAccountingDirection, validateAdjustmentAgainstInvoice } from "./accountingEngine";

export const NOTE_STATUSES = [
  "Draft",
  "Pending Approval",
  "Approved",
  "Rejected",
  "Issued",
  "Partially Applied",
  "Fully Applied",
  "Cancelled",
];

export const NOTE_REASONS = {
  credit: [
    "Returned goods",
    "Damaged products",
    "Discount",
    "Incorrect pricing",
    "Cancelled service",
    "Incorrect invoice",
    "Other",
  ],
  debit: [
    "Additional services",
    "Additional delivery charges",
    "Price difference",
    "Undercharged items",
    "Additional quantities",
    "Other",
  ],
};

const EFFECTIVE_STATUSES = new Set(["Issued", "Partially Applied", "Fully Applied"]);
const VALID_DIRECTIONS = new Set(["customer", "supplier"]);
const VALID_VAT_NUMBERS = /^\d{15}$/;

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

export function createAdjustmentDraft({ kind, number, values, now = new Date().toISOString(), actor }) {
  if (typeof actor !== "string" || !actor.trim()) throw new Error("A signed-in user is required.");
  if (!["credit", "debit"].includes(kind)) throw new Error("Adjustment kind must be credit or debit.");
  if (!number || !new RegExp(`^${kind === "credit" ? "CN" : "DN"}-\\d{4}-\\d{6}$`).test(number)) {
    throw new Error("A valid unique adjustment number is required.");
  }
  if (!validDate(values.issueDate)) throw new Error("Enter a valid issue date.");
  if (!values.branch) throw new Error("Select a branch.");
  if (!VALID_DIRECTIONS.has(values.direction)) throw new Error("Choose customer or supplier direction.");
  if (!String(values.counterparty ?? "").trim()) throw new Error("Customer or supplier name is required.");
  if (values.taxNumber && !VALID_VAT_NUMBERS.test(values.taxNumber)) throw new Error("VAT registration numbers must contain 15 digits.");
  if (!NOTE_REASONS[kind].includes(values.reason)) throw new Error("Select a valid adjustment reason.");
  if (values.reason === "Other" && !String(values.reasonDetail ?? "").trim()) {
    throw new Error("Enter a detailed explanation for the Other reason.");
  }
  if (values.originalInvoiceId && !String(values.originalInvoiceNumber ?? "").trim()) {
    throw new Error("The referenced invoice number is required.");
  }
  if (!values.originalInvoiceId && (!String(values.reasonDetail ?? "").trim() || !values.attachments?.length)) {
    throw new Error("Standalone adjustments require a detailed explanation and supporting documentation.");
  }
  if (values.currency !== "SAR") throw new Error("Only SAR is currently supported for adjustment documents.");

  const financials = calculateAdjustmentLines(values.lines);
  if (financials.total <= 0) throw new Error("Adjustment total must be greater than zero.");

  const note = {
    id: number,
    number,
    kind,
    issueDate: values.issueDate,
    fiscalYear: values.issueDate.slice(0, 4),
    branch: values.branch,
    direction: values.direction,
    accountDirection: getAccountingDirection({ kind, direction: values.direction }),
    originalInvoiceId: values.originalInvoiceId || "",
    originalInvoiceNumber: values.originalInvoiceNumber || "",
    originalInvoiceDate: values.originalInvoiceDate || "",
    counterparty: String(values.counterparty).trim(),
    taxNumber: String(values.taxNumber ?? "").trim(),
    address: String(values.address ?? "").trim(),
    currency: "SAR",
    reason: values.reason,
    reasonDetail: String(values.reasonDetail ?? "").trim(),
    lines: values.lines.map((line) => ({
      itemCode: String(line.itemCode ?? "").trim(),
      description: String(line.description).trim(),
      quantity: String(line.quantity),
      unit: String(line.unit ?? "Unit"),
      originalUnitPrice: String(line.originalUnitPrice ?? line.unitPrice ?? "0"),
      unitPrice: String(line.unitPrice),
      discountPercent: String(line.discountPercent ?? "0"),
      vatRate: String(line.vatRate ?? "15"),
    })),
    internalNotes: String(values.internalNotes ?? "").trim(),
    attachments: values.attachments ?? [],
    subtotal: (financials.subtotal / 100).toFixed(2),
    discount: (financials.discount / 100).toFixed(2),
    taxable: (financials.taxable / 100).toFixed(2),
    vat: (financials.vat / 100).toFixed(2),
    total: (financials.total / 100).toFixed(2),
    appliedAmount: "0.00",
    remainingAmount: (financials.total / 100).toFixed(2),
    status: "Draft",
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    updatedBy: actor,
    history: [{
      action: "Created",
      actor,
      at: now,
      previousValue: null,
      newValue: "Draft",
      reason: "",
    }],
  };
  return note;
}

export function validateNoteForIssue(note, invoices, adjustments, payments = []) {
  if (!note.originalInvoiceId) return null;
  const invoice = invoices.find((item) => item.id === note.originalInvoiceId);
  return validateAdjustmentAgainstInvoice({ note, invoice, adjustments, payments });
}

export function transitionAdjustment(note, action, { actor, reason = "", now = new Date().toISOString(), invoices = [], adjustments = [], payments = [] } = {}) {
  if (typeof actor !== "string" || !actor.trim()) throw new Error("A signed-in user is required.");
  const transitions = {
    submit: { from: "Draft", to: "Pending Approval", auditAction: "Submitted for approval" },
    approve: { from: "Pending Approval", to: "Approved", auditAction: "Approved" },
    reject: { from: "Pending Approval", to: "Rejected", auditAction: "Rejected" },
    reopen: { from: "Rejected", to: "Draft", auditAction: "Returned to draft" },
    issue: { from: "Approved", to: "Issued", auditAction: "Issued" },
    cancel: { from: ["Issued", "Partially Applied", "Fully Applied"], to: "Cancelled", auditAction: "Cancelled" },
  };
  const transition = transitions[action];
  if (!transition) throw new Error("Unsupported adjustment action.");
  const allowedFrom = Array.isArray(transition.from) ? transition.from : [transition.from];
  if (!allowedFrom.includes(note.status)) throw new Error(`Cannot ${action} a ${note.status.toLowerCase()} adjustment.`);
  if (["reject", "reopen", "cancel"].includes(action) && !reason.trim()) {
    throw new Error(`A reason is required to ${action} this adjustment.`);
  }
  if (action === "issue") validateNoteForIssue(note, invoices, adjustments, payments);
  const updated = {
    ...note,
    status: transition.to,
    updatedAt: now,
    updatedBy: actor,
    ...(action === "issue" ? { issuedAt: now, issuedBy: actor } : {}),
    ...(action === "approve" ? { approvedAt: now, approvedBy: actor } : {}),
    ...(action === "reject" ? { rejectionReason: reason.trim() } : {}),
    ...(action === "cancel" ? { cancellationReason: reason.trim(), cancelledAt: now } : {}),
    history: [...note.history, {
      action: transition.auditAction,
      actor,
      at: now,
      previousValue: note.status,
      newValue: transition.to,
      reason: reason.trim(),
    }],
  };
  return updated;
}

export function isAdjustmentEffective(note) {
  return EFFECTIVE_STATUSES.has(note.status);
}
