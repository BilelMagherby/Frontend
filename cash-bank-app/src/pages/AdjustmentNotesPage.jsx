import { useMemo, useState } from "react";
import { Download, FileUp, History, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { branches } from "../data/branches";
import { useApp } from "../context/AppContext";
import { useBranchFilter } from "../hooks/useBranchFilter";
import { useLanguage } from "../hooks/useLanguage";
import { calculateInvoiceLedger, fromMinorUnits, toMinorUnits } from "../utils/accountingEngine";
import { NOTE_REASONS, NOTE_STATUSES } from "../utils/adjustmentNotes";
import { getLocalDateOnly } from "../utils/taxReturnSchedule";
import { exportCsv } from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import { Button, Card, Field, SectionTitle, SelectField } from "../components/ui/Primitives";

const EMPTY_LINE = () => ({ itemCode: "", description: "", quantity: "1", unit: "Unit", originalUnitPrice: "", unitPrice: "", discountPercent: "0", vatRate: "15" });
const formatMoney = (value) => `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;

function blankForm(branch) {
  return {
    issueDate: getLocalDateOnly(),
    branch: branch === "all" ? branches[1].id : branch,
    direction: "customer",
    originalInvoiceId: "",
    originalInvoiceNumber: "",
    originalInvoiceDate: "",
    counterparty: "",
    taxNumber: "",
    address: "",
    currency: "SAR",
    reason: "",
    reasonDetail: "",
    internalNotes: "",
    attachments: [],
    lines: [EMPTY_LINE()],
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  if (field || row.length) {
    row.push(field.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  if (rows.length < 2) throw new Error("CSV needs a header and at least one adjustment row.");
  const headers = rows[0].map((header) => header.replace(/^\uFEFF/, "").trim().toLowerCase());
  const required = ["direction", "issuedate", "branch", "counterparty", "reason", "description", "quantity", "unitprice", "vatrate"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}.`);
  return rows.slice(1).map((cells, index) => {
    const record = Object.fromEntries(headers.map((header, column) => [header, cells[column] ?? ""]));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.issuedate)) throw new Error(`Invalid issue date on CSV row ${index + 2}.`);
    const direction = record.direction.toLowerCase();
    if (!["customer", "supplier"].includes(direction)) throw new Error(`Invalid direction on CSV row ${index + 2}.`);
    const branchName = record.branch.toLowerCase();
    const branch = branches.slice(1).find((item) => item.id === branchName || item.name.toLowerCase() === branchName);
    if (!branch) throw new Error(`Unknown branch on CSV row ${index + 2}.`);
    const originalInvoiceNumber = record.originalinvoicenumber ?? "";
    return {
      issueDate: record.issuedate,
      branch: branch.id,
      direction,
      originalInvoiceNumber,
      originalInvoiceId: record.originalinvoiceid ?? "",
      originalInvoiceDate: record.originalinvoicedate ?? "",
      counterparty: record.counterparty,
      taxNumber: record.taxnumber ?? "",
      address: record.address ?? "",
      currency: "SAR",
      reason: record.reason,
      reasonDetail: record.reasondetail ?? "",
      internalNotes: record.internalnotes ?? "",
      attachments: [],
      lines: [{
        itemCode: record.itemcode ?? "",
        description: record.description,
        quantity: record.quantity,
        unit: record.unit || "Unit",
        originalUnitPrice: record.originalunitprice || record.unitprice,
        unitPrice: record.unitprice,
        discountPercent: record.discountpercent || "0",
        vatRate: record.vatrate,
      }],
    };
  });
}

export default function AdjustmentNotesPage({ kind }) {
  const { t, isArabic } = useLanguage();
  const {
    branch: activeBranch,
    invoiceSources,
    accountingNotes,
    accountingAudit,
    accountingReady,
    accountingStorageError,
    documentStorageReady,
    documentStorageError,
    createAdjustment,
    createAdjustments,
    updateAdjustmentDraft,
    transitionAdjustmentRecord,
  } = useApp();
  const rows = useBranchFilter(accountingNotes.filter((note) => note.kind === kind));
  const [form, setForm] = useState(() => blankForm(activeBranch));
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [directionFilter, setDirectionFilter] = useState("All");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [importPreview, setImportPreview] = useState(null);
  const [importFileRef, setImportFileRef] = useState(null);
  const prefix = kind === "credit" ? "Credit" : "Debit";
  const title = t(`${prefix} notes`, kind === "credit" ? "الإشعارات الدائنة" : "الإشعارات المدينة");
  const validInvoices = invoiceSources.filter((invoice) => invoice.direction === form.direction);
  const selectedInvoice = invoiceSources.find((invoice) => invoice.id === form.originalInvoiceId);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((note) =>
      (statusFilter === "All" || note.status === statusFilter)
      && (directionFilter === "All" || note.direction === directionFilter)
      && (!query || [note.number, note.counterparty, note.originalInvoiceNumber, note.reason, note.reasonDetail]
        .some((value) => String(value ?? "").toLowerCase().includes(query))),
    );
  }, [rows, search, statusFilter, directionFilter]);
  const selectedNote = accountingNotes.find((note) => note.id === selectedId);

  const totals = (items) => items.reduce((result, note) => {
    result.net += toMinorUnits(note.taxable);
    result.vat += toMinorUnits(note.vat);
    result.total += toMinorUnits(note.total);
    return result;
  }, { net: 0, vat: 0, total: 0 });
  const amountTotals = totals(filteredRows);
  const countStatus = (status) => filteredRows.filter((note) => note.status === status).length;
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateLine = (index, field, value) => setForm((current) => ({
    ...current,
    lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line),
  }));
  const openNewForm = () => {
    setForm({ ...blankForm(activeBranch), reason: NOTE_REASONS[kind][0] });
    setEditingId("");
    setError("");
    setMessage("");
    setFormOpen(true);
  };
  const openEditForm = (note) => {
    setForm({
      issueDate: note.issueDate,
      branch: note.branch,
      direction: note.direction,
      originalInvoiceId: note.originalInvoiceId,
      originalInvoiceNumber: note.originalInvoiceNumber,
      originalInvoiceDate: note.originalInvoiceDate,
      counterparty: note.counterparty,
      taxNumber: note.taxNumber,
      address: note.address,
      currency: note.currency,
      reason: note.reason,
      reasonDetail: note.reasonDetail,
      internalNotes: note.internalNotes,
      attachments: note.attachments ?? [],
      lines: note.lines.map((line) => ({ ...line })),
    });
    setEditingId(note.id);
    setError("");
    setFormOpen(true);
  };
  const selectInvoice = (id) => {
    const invoice = invoiceSources.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      originalInvoiceId: id,
      originalInvoiceNumber: invoice?.number ?? "",
      originalInvoiceDate: invoice?.date ?? "",
      counterparty: invoice?.counterparty ?? current.counterparty,
      branch: invoice?.branch ?? current.branch,
    }));
  };
  const saveDraft = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      if (editingId) {
        await updateAdjustmentDraft(editingId, form);
        setMessage(t("Draft updated and saved to the shared backend.", "تم تحديث المسودة وحفظها في الخادم المشترك."));
      } else {
        await createAdjustment(kind, form);
        setMessage(t("Draft saved to the shared backend.", "تم حفظ المسودة في الخادم المشترك."));
      }
      setFormOpen(false);
      setEditingId("");
    } catch (saveError) {
      setError(saveError.message);
    }
  };
  const runAction = async (note, action, reason = "") => {
    setError("");
    try {
      await transitionAdjustmentRecord(note.id, action, reason);
      setPendingAction(null);
      setActionReason("");
      setMessage(t("Local document workflow updated. No external approval or tax submission was performed.", "تم تحديث سير المستند المحلي. لم يتم تنفيذ اعتماد خارجي أو إقرار ضريبي."));
    } catch (actionError) {
      setError(actionError.message);
    }
  };
  const uploadAttachments = (event) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    const invalid = files.find((file) => !file.name.toLowerCase().endsWith(".pdf") || file.size > 8 * 1024 * 1024);
    if (invalid) {
      setError(t("Attachments must be PDF files no larger than 8 MB each.", "يجب أن تكون المرفقات ملفات PDF لا يتجاوز حجم كل منها 8 ميغابايت."));
      return;
    }
    setForm((current) => ({
      ...current,
      attachments: [...current.attachments, ...files.map((file) => ({ name: file.name, size: file.size, type: file.type, blob: file }))],
    }));
    setError("");
  };
  const downloadTemplate = () => {
    const headers = ["direction", "issueDate", "branch", "originalInvoiceNumber", "counterparty", "taxNumber", "reason", "reasonDetail", "description", "quantity", "unit", "unitPrice", "discountPercent", "vatRate"];
    const blob = new Blob(["\uFEFF" + headers.map(csvEscape).join(",") + "\n"], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${kind}-notes-template.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imported = parseCsv(await file.text());
      const preview = imported.map((values, index) => {
        if (values.originalInvoiceNumber) {
          const invoice = invoiceSources.find((item) =>
            item.number.toLowerCase() === values.originalInvoiceNumber.toLowerCase()
            && item.direction === values.direction,
          );
          if (!invoice) throw new Error(`Row ${index + 2}: original invoice was not found for this direction.`);
          values.originalInvoiceId = invoice.id;
          values.originalInvoiceDate = invoice.date;
          if (invoice.counterparty.toLowerCase() !== values.counterparty.toLowerCase()) {
            throw new Error(`Row ${index + 2}: counterparty does not match the original invoice.`);
          }
        } else {
          throw new Error(`Row ${index + 2}: standalone imports are not accepted without individual supporting attachments.`);
        }
        return values;
      });
      setImportPreview(preview);
      setImportFileRef(file.name);
      setError("");
    } catch (importError) {
      setError(importError.message);
      setImportPreview(null);
    }
  };
  const confirmImport = async () => {
    setError("");
    try {
      await createAdjustments(kind, importPreview ?? []);
      setMessage(t(`Imported ${(importPreview ?? []).length} draft documents from ${importFileRef}.`, `تم استيراد ${(importPreview ?? []).length} مسودة من ${importFileRef}.`));
      setImportPreview(null);
      setImportFileRef(null);
    } catch (importError) {
      setError(importError.message);
    }
  };
  const csvColumns = [
    { key: "number", label: t("Document number", "رقم المستند") },
    { key: "issueDate", label: t("Issue date", "تاريخ الإصدار") },
    { key: "direction", label: t("Direction", "الاتجاه") },
    { key: "counterparty", label: t("Customer / supplier", "العميل / المورد") },
    { key: "originalInvoiceNumber", label: t("Original invoice", "الفاتورة الأصلية") },
    { key: "reason", label: t("Reason", "السبب") },
    { key: "subtotal", label: t("Subtotal", "المجموع الفرعي") },
    { key: "discount", label: t("Discount", "الخصم") },
    { key: "taxable", label: t("Taxable amount", "المبلغ الخاضع للضريبة") },
    { key: "vat", label: t("VAT", "الضريبة") },
    { key: "total", label: t("Total", "الإجمالي") },
    { key: "appliedAmount", label: t("Applied", "المطبق") },
    { key: "remainingAmount", label: t("Remaining", "المتبقي") },
    { key: "status", label: t("Status", "الحالة") },
  ];

  if (!accountingReady || !documentStorageReady) return <Card className="p-6 text-sm text-slate-500">{t("Loading local accounting records…", "جارٍ تحميل السجلات المحاسبية المحلية…")}</Card>;

  return <div className="space-y-5">
    <Card className="p-5">
      <SectionTitle
        title={title}
        subtitle={t("Financial adjustments · Shared backend records", "التعديلات المالية · سجلات الخادم المشترك")}
        action={<div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={downloadTemplate}><Download size={15} />{t("CSV template", "نموذج CSV")}</Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileUp size={15} />{t("Import CSV", "استيراد CSV")}<input type="file" accept=".csv,text/csv" className="sr-only" onChange={handleImportFile} /></label>
          <Button type="button" onClick={openNewForm}><Plus size={15} />{t(`Create ${kind} note`, kind === "credit" ? "إنشاء إشعار دائن" : "إنشاء إشعار مدين")}</Button>
        </div>}
      />
      <div role="note" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        {t("Records and approval actions are saved to the authenticated backend with the signed-in user recorded. This workflow does not submit transactions to a bank or ZATCA.", "تُحفظ السجلات وإجراءات الاعتماد في الخادم الموثق مع تسجيل المستخدم. لا يرسل سير العمل معاملات إلى البنك أو هيئة الزكاة والضريبة والجمارك.")}
      </div>
      {(accountingStorageError || documentStorageError || error || message) && <div role={error || accountingStorageError || documentStorageError ? "alert" : "status"} className={`mb-4 rounded-lg p-3 text-sm ${error || accountingStorageError || documentStorageError ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{accountingStorageError || documentStorageError || error || message}</div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t("Documents", "المستندات"), filteredRows.length],
          [t("Total adjustment", "إجمالي التعديل"), formatMoney(amountTotals.total / 100)],
          [t("VAT adjustment", "تعديل الضريبة"), formatMoney(amountTotals.vat / 100)],
          [t("Pending approval", "بانتظار الاعتماد"), countStatus("Pending Approval")],
          [t("Approved", "معتمد"), countStatus("Approved")],
          [t("Issued", "صادر"), countStatus("Issued")],
          [t("Rejected", "مرفوض"), countStatus("Rejected")],
          [t("Cancelled", "ملغى"), countStatus("Cancelled")],
        ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-navy">{value}</p></div>)}
      </div>
    </Card>

    {formOpen && <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-lg font-bold text-navy">{editingId ? t("Edit draft", "تعديل المسودة") : t(`New ${kind} note`, kind === "credit" ? "إشعار دائن جديد" : "إشعار مدين جديد")}</h2><p className="mt-1 text-xs text-slate-500">{t("Amounts are calculated from line items using integer minor-unit arithmetic.", "يتم حساب المبالغ من البنود باستخدام حساب صحيح بوحدات العملة الصغرى.")}</p></div>
        <Button type="button" variant="ghost" aria-label={t("Close form", "إغلاق النموذج")} onClick={() => setFormOpen(false)}><X size={17} /></Button>
      </div>
      <form onSubmit={saveDraft} className="space-y-5">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">{t("Document information", "بيانات المستند")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {editingId && <Field label={t("Document number", "رقم المستند")} readOnly value={editingId} />}
            <Field label={t("Issue date", "تاريخ الإصدار")} type="date" required value={form.issueDate} onChange={(event) => setField("issueDate", event.target.value)} />
            <SelectField label={t("Branch", "الفرع")} required value={form.branch} onChange={(event) => setField("branch", event.target.value)}>{branches.slice(1).map((item) => <option key={item.id} value={item.id}>{isArabic ? item.nameAr : item.name}</option>)}</SelectField>
            <SelectField label={t("Direction", "الاتجاه")} required value={form.direction} onChange={(event) => setForm((current) => ({ ...current, direction: event.target.value, originalInvoiceId: "", originalInvoiceNumber: "", originalInvoiceDate: "", counterparty: "" }))}><option value="customer">{t("Customer", "عميل")}</option><option value="supplier">{t("Supplier", "مورد")}</option></SelectField>
            <Field label={t("Currency", "العملة")} readOnly value="SAR" />
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">{t("Original invoice and counterparty", "الفاتورة الأصلية والطرف المقابل")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SelectField label={t("Original invoice (optional for documented standalone adjustments)", "الفاتورة الأصلية (اختيارية للتعديلات المستقلة الموثقة)")} value={form.originalInvoiceId} onChange={(event) => selectInvoice(event.target.value)}><option value="">{t("Standalone adjustment", "تعديل مستقل")}</option>{validInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.number} · {invoice.counterparty}</option>)}</SelectField>
            <Field label={t("Customer / supplier", "العميل / المورد")} required readOnly={Boolean(form.originalInvoiceId)} value={form.counterparty} onChange={(event) => setField("counterparty", event.target.value)} />
            <Field label={t("VAT registration number (15 digits)", "الرقم الضريبي (15 رقماً)")} inputMode="numeric" maxLength={15} value={form.taxNumber} onChange={(event) => setField("taxNumber", event.target.value.replace(/\D/g, ""))} />
            <Field label={t("Address", "العنوان")} value={form.address} onChange={(event) => setField("address", event.target.value)} />
          </div>
          {selectedInvoice && <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
            <p>{t("Invoice date", "تاريخ الفاتورة")}: <b>{selectedInvoice.date || "—"}</b></p>
            <p>{t("Original total", "الإجمالي الأصلي")}: <b>{formatMoney(selectedInvoice.total)}</b></p>
            <p>{t("Original VAT", "الضريبة الأصلية")}: <b>{formatMoney(selectedInvoice.vat)}</b></p>
            <p>{t("Payment status", "حالة الدفع")}: <b>{selectedInvoice.status || t("Unpaid / unknown", "غير مدفوع / غير معروف")}</b></p>
            <p>{t("Previous credit notes", "الإشعارات الدائنة السابقة")}: <b>{formatMoney(calculateInvoiceLedger(selectedInvoice, accountingNotes).creditCents / 100)}</b></p>
            <p>{t("Outstanding balance (before this note)", "الرصيد المستحق قبل هذا الإشعار")}: <b>{formatMoney(calculateInvoiceLedger(selectedInvoice, accountingNotes).outstanding / 100)}</b></p>
          </div>}
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">{t("Reason and explanation", "السبب والتوضيح")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <SelectField label={t("Reason", "السبب")} required value={form.reason} onChange={(event) => setField("reason", event.target.value)}><option value="">{t("Select a reason", "اختر السبب")}</option>{NOTE_REASONS[kind].map((reason) => <option key={reason} value={reason}>{t(reason, reason)}</option>)}</SelectField>
            <Field label={t("Detailed explanation", "شرح تفصيلي")} required={form.reason === "Other" || !form.originalInvoiceId} value={form.reasonDetail} onChange={(event) => setField("reasonDetail", event.target.value)} />
            <Field label={t("Internal notes", "ملاحظات داخلية")} value={form.internalNotes} onChange={(event) => setField("internalNotes", event.target.value)} />
          </div>
        </section>
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-800">{t("Adjustment lines", "بنود التعديل")}</h3><Button type="button" variant="outline" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, EMPTY_LINE()] }))}><Plus size={14} />{t("Add line", "إضافة بند")}</Button></div>
          <div className="space-y-3">
            {form.lines.map((line, index) => <div key={index} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2 xl:grid-cols-8">
              <Field label={t("Item code", "رمز الصنف")} value={line.itemCode} onChange={(event) => updateLine(index, "itemCode", event.target.value)} />
              <Field label={t("Description", "الوصف")} required value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} />
              <Field label={kind === "credit" ? t("Credit quantity", "كمية الإشعار") : t("Quantity", "الكمية")} required type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} />
              <Field label={t("Unit", "الوحدة")} value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)} />
              <Field label={kind === "credit" ? t("Original / adjustment unit price", "سعر الوحدة الأصلي / المعدل") : t("Unit price", "سعر الوحدة")} required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => { updateLine(index, "unitPrice", event.target.value); if (kind === "credit") updateLine(index, "originalUnitPrice", event.target.value); }} />
              <Field label={t("Discount %", "الخصم %")} type="number" min="0" max="100" step="0.01" value={line.discountPercent} onChange={(event) => updateLine(index, "discountPercent", event.target.value)} />
              <SelectField label={t("VAT rate", "نسبة الضريبة")} value={line.vatRate} onChange={(event) => updateLine(index, "vatRate", event.target.value)}><option value="15">15%</option><option value="0">0%</option><option value="exempt">{t("Exempt", "معفى")}</option></SelectField>
              <div className="flex items-end justify-between"><span className="pb-2 text-xs text-slate-500">{t("Line total", "إجمالي البند")}</span><b className="pb-2 text-sm">{formatMoney(Number(line.quantity || 0) * Number(line.unitPrice || 0))}</b><Button type="button" variant="ghost" aria-label={t("Remove line", "حذف البند")} disabled={form.lines.length === 1} onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}><Trash2 size={15} /></Button></div>
            </div>)}
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500"><span>{t("Supporting PDF documents", "مستندات داعمة PDF")}</span><input type="file" accept=".pdf,application/pdf" multiple onChange={uploadAttachments} className="rounded-lg border border-slate-200 p-2 text-sm" /></label>
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            {(form.attachments.length > 0) ? form.attachments.map((file, index) => <p key={`${file.name}-${index}`} className="flex justify-between gap-3 py-1"><span className="truncate">{file.name}</span><button type="button" aria-label={t("Remove attachment", "إزالة المرفق")} onClick={() => setForm((current) => ({ ...current, attachments: current.attachments.filter((_, fileIndex) => fileIndex !== index) }))}><X size={14} /></button></p>) : <p className="text-xs text-slate-500">{t("Standalone adjustments require at least one supporting PDF.", "تتطلب التعديلات المستقلة ملف PDF داعماً واحداً على الأقل.")}</p>}
          </div>
        </section>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button type="submit" disabled={!accountingReady || Boolean(accountingStorageError || documentStorageError)}>{t("Save draft", "حفظ كمسودة")}</Button><Button type="button" variant="outline" onClick={() => { setFormOpen(false); setError(""); }}>{t("Cancel", "إلغاء")}</Button></div>
      </form>
    </Card>}

    <Card className="p-5">
      <SectionTitle title={t("Document register", "سجل المستندات")} subtitle={t("Only issued adjustments affect the invoice ledger and VAT adjustment totals.", "تؤثر التعديلات الصادرة فقط على دفتر الفواتير وإجمالي تعديلات الضريبة.")} action={<Button type="button" variant="outline" onClick={() => exportCsv(`${kind}-notes.csv`, filteredRows, csvColumns)}><Download size={15} />{t("Export CSV", "تصدير CSV")}</Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_180px]">
        <div className="relative"><Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search notes", "البحث في الإشعارات")} className="h-10 w-full rounded-lg border border-slate-200 ps-9 pe-3 text-sm" /></div>
        <SelectField label={t("Status", "الحالة")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All</option>{NOTE_STATUSES.map((status) => <option key={status}>{status}</option>)}</SelectField>
        <SelectField label={t("Direction", "الاتجاه")} value={directionFilter} onChange={(event) => setDirectionFilter(event.target.value)}><option value="All">{t("All", "الكل")}</option><option value="customer">{t("Customer", "عميل")}</option><option value="supplier">{t("Supplier", "مورد")}</option></SelectField>
      </div>
      {importPreview && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
        <p className="font-semibold">{t(`Preview ${importPreview.length} rows from ${importFileRef}`, `معاينة ${importPreview.length} صفوف من ${importFileRef}`)}</p>
        <p className="mt-1 text-xs text-slate-600">{t("Rows are validated against existing invoice references. Confirm to save them as drafts.", "تم التحقق من مراجع الفواتير. أكد لحفظ الصفوف كمسودات.")}</p>
        <div className="mt-3 flex gap-2"><Button type="button" onClick={confirmImport}>{t("Confirm import", "تأكيد الاستيراد")}</Button><Button type="button" variant="outline" onClick={() => setImportPreview(null)}>{t("Cancel", "إلغاء")}</Button></div>
      </div>}
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[1150px] border-collapse text-start text-xs">
          <thead><tr className="border-y bg-slate-50 text-slate-500">{[
            ["number", t("Number", "الرقم")], ["issueDate", t("Date", "التاريخ")], ["branch", t("Branch", "الفرع")], ["direction", t("Direction", "الاتجاه")], ["counterparty", t("Customer / supplier", "العميل / المورد")], ["originalInvoiceNumber", t("Original invoice", "الفاتورة الأصلية")], ["reason", t("Reason", "السبب")], ["taxable", t("Net amount", "المبلغ الصافي")], ["vat", t("VAT", "الضريبة")], ["total", t("Total", "الإجمالي")], ["appliedAmount", t("Applied", "المطبق")], ["remainingAmount", t("Remaining", "المتبقي")], ["status", t("Status", "الحالة")],
          ].map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3">{label}</th>)}<th className="px-3 py-3">{t("Actions", "الإجراءات")}</th></tr></thead>
          <tbody>{filteredRows.map((note) => <tr key={note.id} className="border-b border-slate-100">
            <td className="px-3 py-3 font-semibold">{note.number}</td><td className="px-3 py-3">{note.issueDate}</td><td className="px-3 py-3">{branches.find((item) => item.id === note.branch)?.[isArabic ? "nameAr" : "name"] ?? note.branch}</td><td className="px-3 py-3">{t(note.direction, note.direction === "customer" ? "عميل" : "مورد")}</td><td className="px-3 py-3">{note.counterparty}</td><td className="px-3 py-3">{note.originalInvoiceNumber || "—"}</td><td className="px-3 py-3">{t(note.reason, note.reason)}</td><td className="px-3 py-3">{formatMoney(note.taxable)}</td><td className="px-3 py-3">{formatMoney(note.vat)}</td><td className="px-3 py-3 font-semibold">{formatMoney(note.total)}</td><td className="px-3 py-3">{formatMoney(note.appliedAmount)}</td><td className="px-3 py-3">{formatMoney(note.remainingAmount)}</td><td className="px-3 py-3"><StatusBadge status={note.status} /></td>
            <td className="px-3 py-3"><div className="flex flex-wrap gap-1">
              <Button type="button" variant="outline" className="px-2 py-1 text-[10px]" onClick={() => setSelectedId(note.id)}>{t("View", "عرض")}</Button>
              {note.status === "Draft" && <><Button type="button" variant="outline" className="px-2 py-1 text-[10px]" onClick={() => openEditForm(note)}>{t("Edit", "تعديل")}</Button><Button type="button" className="px-2 py-1 text-[10px]" onClick={() => runAction(note, "submit")}>{t("Submit", "إرسال")}</Button></>}
              {note.status === "Pending Approval" && <><Button type="button" className="px-2 py-1 text-[10px]" onClick={() => runAction(note, "approve")}>{t("Approve locally", "اعتماد محلي")}</Button><Button type="button" variant="outline" className="px-2 py-1 text-[10px]" onClick={() => setPendingAction({ note, action: "reject" })}>{t("Reject", "رفض")}</Button></>}
              {note.status === "Approved" && <Button type="button" onClick={() => runAction(note, "issue")} className="px-2 py-1 text-[10px]">{t("Issue", "إصدار")}</Button>}
              {note.status === "Rejected" && <Button type="button" variant="outline" className="px-2 py-1 text-[10px]" onClick={() => setPendingAction({ note, action: "reopen" })}>{t("Return to draft", "إرجاع للمسودة")}</Button>}
              {["Issued", "Partially Applied", "Fully Applied"].includes(note.status) && <Button type="button" variant="outline" className="px-2 py-1 text-[10px]" onClick={() => setPendingAction({ note, action: "cancel" })}>{t("Cancel document", "إلغاء المستند")}</Button>}
            </div></td>
          </tr>)}{filteredRows.length === 0 && <tr><td colSpan={14} className="px-4 py-10 text-center text-sm text-slate-400">{t("No adjustment notes match these filters.", "لا توجد إشعارات مطابقة لعوامل التصفية.")}</td></tr>}</tbody>
          {filteredRows.length > 0 && <tfoot><tr className="bg-slate-50 font-bold"><td colSpan={7} className="px-3 py-3">{t("Filtered totals", "إجمالي النتائج المصفاة")}</td><td className="px-3 py-3">{formatMoney(amountTotals.net / 100)}</td><td className="px-3 py-3">{formatMoney(amountTotals.vat / 100)}</td><td className="px-3 py-3">{formatMoney(amountTotals.total / 100)}</td><td colSpan={4} /></tr></tfoot>}
        </table>
      </div>
    </Card>

    <Card className="p-5">
      <SectionTitle title={t("Audit trail", "سجل التدقيق")} subtitle={t("Shared backend history with the authenticated actor recorded.", "سجل الخادم المشترك مع تسجيل المستخدم الموثق.")} action={<History size={17} className="text-slate-400" />} />
      <div className="max-h-64 overflow-auto">
        {accountingAudit.filter((entry) => entry.documentId?.startsWith(kind === "credit" ? "CN-" : "DN-")).slice().reverse().map((entry, index) => <div key={`${entry.documentId}-${entry.at}-${index}`} className="grid gap-1 border-b border-slate-100 py-2 text-xs sm:grid-cols-[180px_160px_1fr_180px]"><span>{entry.at}</span><b>{entry.documentNumber}</b><span>{entry.action}{entry.reason ? ` · ${entry.reason}` : ""}</span><span>{entry.actor}</span></div>)}
        {accountingAudit.filter((entry) => entry.documentId?.startsWith(kind === "credit" ? "CN-" : "DN-")).length === 0 && <p className="py-6 text-center text-sm text-slate-400">{t("No audit events yet.", "لا توجد أحداث تدقيق بعد.")}</p>}
      </div>
    </Card>

    {selectedNote && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(""); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="adjustment-title" className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 id="adjustment-title" className="text-lg font-bold text-navy">{selectedNote.number}</h2><p className="text-xs text-slate-500">{selectedNote.counterparty} · {selectedNote.status}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => window.print()}><Printer size={15} />{t("Print / Save PDF", "طباعة / حفظ PDF")}</Button><Button type="button" variant="ghost" aria-label={t("Close", "إغلاق")} onClick={() => setSelectedId("")}><X size={17} /></Button></div></div>
        <div className="grid gap-2 bg-slate-50 p-3 text-xs sm:grid-cols-3"><p>{t("Issue date", "تاريخ الإصدار")}: {selectedNote.issueDate}</p><p>{t("Direction", "الاتجاه")}: {selectedNote.direction}</p><p>{t("Account impact", "الأثر المحاسبي")}: {selectedNote.accountDirection}</p><p>{t("Original invoice", "الفاتورة الأصلية")}: {selectedNote.originalInvoiceNumber || "—"}</p><p>{t("Reason", "السبب")}: {selectedNote.reason}</p><p>{t("VAT number", "الرقم الضريبي")}: {selectedNote.taxNumber || "—"}</p></div>
        <table className="mt-4 w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border p-2 text-start">{t("Item", "الصنف")}</th><th className="border p-2">{t("Qty", "الكمية")}</th><th className="border p-2">{t("Unit price", "سعر الوحدة")}</th><th className="border p-2">{t("Discount", "الخصم")}</th><th className="border p-2">{t("VAT rate", "نسبة الضريبة")}</th></tr></thead><tbody>{selectedNote.lines.map((line, index) => <tr key={`${selectedNote.id}-${index}`}><td className="border p-2">{line.description}</td><td className="border p-2">{line.quantity} {line.unit}</td><td className="border p-2">{line.unitPrice}</td><td className="border p-2">{line.discountPercent}%</td><td className="border p-2">{line.vatRate}%</td></tr>)}</tbody></table>
        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm"><p className="flex justify-between"><span>{t("Subtotal", "المجموع الفرعي")}</span><b>{formatMoney(selectedNote.subtotal)}</b></p><p className="flex justify-between"><span>{t("Discount", "الخصم")}</span><b>{formatMoney(selectedNote.discount)}</b></p><p className="flex justify-between"><span>{t("Taxable amount", "المبلغ الخاضع للضريبة")}</span><b>{formatMoney(selectedNote.taxable)}</b></p><p className="flex justify-between"><span>{t("VAT", "الضريبة")}</span><b>{formatMoney(selectedNote.vat)}</b></p><p className="flex justify-between border-t pt-2 font-bold"><span>{t("Total", "الإجمالي")}</span><b>{formatMoney(selectedNote.total)}</b></p></div>
        {selectedNote.attachments?.map((file, index) => <p key={`${file.name}-${index}`} className="mt-2 text-xs text-slate-500">{t("Attachment", "مرفق")}: {file.name}</p>)}
        <h3 className="mt-5 font-semibold">{t("Document history", "سجل المستند")}</h3>
        {selectedNote.history.map((entry, index) => <p key={`${entry.at}-${index}`} className="mt-2 text-xs text-slate-600">{entry.at} · {entry.actor} · {entry.action}{entry.reason ? ` · ${entry.reason}` : ""}</p>)}
      </section>
    </div>}

    {pendingAction && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="action-reason-title" className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl">
        <h2 id="action-reason-title" className="font-bold text-navy">{t(`${pendingAction.action} ${kind} note`, `${pendingAction.action} إشعار`)}</h2>
        <p className="mt-1 text-xs text-slate-500">{pendingAction.note.number}</p>
        <label className="mt-4 flex flex-col gap-1.5 text-xs font-medium text-slate-500"><span>{t("Reason (required)", "السبب (مطلوب)")}</span><textarea value={actionReason} onChange={(event) => setActionReason(event.target.value)} required rows={3} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-800" /></label>
        <div className="mt-4 flex gap-2"><Button type="button" disabled={!actionReason.trim()} onClick={() => runAction(pendingAction.note, pendingAction.action, actionReason)}>{t("Confirm", "تأكيد")}</Button><Button type="button" variant="outline" onClick={() => { setPendingAction(null); setActionReason(""); }}>{t("Cancel", "إلغاء")}</Button></div>
      </section>
    </div>}

    {importPreview && <div className="sr-only" aria-live="polite">{importPreview.length}</div>}
  </div>;
}
