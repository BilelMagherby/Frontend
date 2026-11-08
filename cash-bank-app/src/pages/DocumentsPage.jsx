import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Paperclip, Plus, Search, Upload, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { branches } from "../data/branches";
import { useBranchFilter } from "../hooks/useBranchFilter";
import { useLanguage } from "../hooks/useLanguage";
import StatusBadge from "../components/ui/StatusBadge";
import { Button, Card, Field, SectionTitle, SelectField } from "../components/ui/Primitives";
import { displayBranch, exportCsv } from "../components/ui/DataTable";

const DOCUMENT_TYPES = {
  invoice: {
    title: "Invoices",
    titleAr: "الفواتير",
    singular: "Invoice",
    singularAr: "فاتورة",
    prefix: "INV",
    icon: FileText,
    description: "Record supplier invoices with VAT and payment details.",
    descriptionAr: "سجل فواتير الموردين مع تفاصيل الضريبة والدفع.",
  },
  debitNote: {
    title: "Debit notes",
    titleAr: "إشعارات مدينة",
    singular: "Debit note",
    singularAr: "إشعار مدين",
    prefix: "DN",
    icon: FileSpreadsheet,
    description: "Record additional charges and adjustments linked to an original invoice.",
    descriptionAr: "سجل الرسوم الإضافية والتعديلات المرتبطة بفاتورة أصلية.",
  },
  creditNote: {
    title: "Credit notes",
    titleAr: "إشعارات دائنة",
    singular: "Credit note",
    singularAr: "إشعار دائن",
    prefix: "CN",
    icon: FileSpreadsheet,
    description: "Record returns, refunds, and reductions linked to an original invoice.",
    descriptionAr: "سجل المرتجعات والمبالغ المستردة والتخفيضات المرتبطة بفاتورة أصلية.",
  },
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const money = (value) => `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;

function blankForm(branch, dateFrom) {
  return {
    number: "",
    issueDate: dateFrom || new Date().toISOString().slice(0, 10),
    dueDate: "",
    branch: branch === "all" ? "hajiss" : branch,
    direction: "supplier",
    counterparty: "",
    taxNumber: "",
    referenceInvoice: "",
    description: "",
    subtotal: "",
    vat: "",
    total: "",
    currency: "SAR",
    paymentTerms: "",
    status: "Pending",
  };
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (cell.length || row.length) {
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one document row.");

  const aliases = {
    documentnumber: "number", number: "number", docno: "number",
    issuedate: "issueDate", date: "issueDate",
    duedate: "dueDate",
    branch: "branch",
    counterparty: "counterparty", supplier: "counterparty", customer: "counterparty", suppliercustomer: "counterparty",
    taxnumber: "taxNumber", vatnumber: "taxNumber", vatregistrationnumber: "taxNumber",
    referenceinvoice: "referenceInvoice", originalinvoice: "referenceInvoice", invoicereference: "referenceInvoice",
    description: "description",
    subtotal: "subtotal", netamount: "subtotal",
    vat: "vat", vatamount: "vat",
    total: "total", totalamount: "total",
    currency: "currency", direction: "direction", paymentterms: "paymentTerms", status: "status",
  };
  const headers = rows[0].map((header) => aliases[header.replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z]/g, "")] ?? "");
  const required = ["number", "issueDate", "branch", "counterparty", "description", "subtotal", "vat", "total"];
  const missing = required.filter((key) => !headers.includes(key));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}.`);
  return rows.slice(1).map((cells, rowIndex) => {
    const values = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (!validDate(values.issueDate.trim())) throw new Error(`Invalid issue date in CSV row ${rowIndex + 2}; use YYYY-MM-DD.`);
    if (values.dueDate.trim() && !validDate(values.dueDate.trim())) throw new Error(`Invalid due date in CSV row ${rowIndex + 2}; use YYYY-MM-DD.`);
    const branchName = values.branch.trim().toLowerCase();
    const selectedBranch = branches.slice(1).find((item) =>
      item.id === branchName || item.name.toLowerCase() === branchName || item.nameAr === values.branch.trim(),
    );
    if (!selectedBranch) throw new Error(`Unknown branch "${values.branch}" in CSV row ${rowIndex + 2}. Use Hajiss, Ghalia, Odun, or Natheel.`);
    const amount = (input, field) => {
      const parsed = Number(String(input ?? "0").replace(/[,SAR\s]/gi, ""));
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid ${field} in CSV row ${rowIndex + 2}.`);
      return Number(parsed.toFixed(2));
    };
    const subtotal = amount(values.subtotal, "subtotal");
    const vat = amount(values.vat, "VAT");
    const total = amount(values.total, "total");
    const direction = values.direction.trim().toLowerCase() || "supplier";
    if (!["customer", "supplier"].includes(direction)) throw new Error(`Invalid direction in CSV row ${rowIndex + 2}; use customer or supplier.`);
    if (Math.abs(subtotal + vat - total) > 0.02) throw new Error(`Subtotal plus VAT must equal total in CSV row ${rowIndex + 2}.`);
    return {
      number: values.number.trim(),
      issueDate: values.issueDate.trim(),
      dueDate: values.dueDate.trim(),
      branch: selectedBranch.id,
      counterparty: values.counterparty.trim(),
      taxNumber: values.taxNumber.trim(),
      referenceInvoice: values.referenceInvoice.trim(),
      description: values.description.trim(),
      subtotal,
      vat,
      total,
      currency: values.currency.trim() || "SAR",
      direction,
      paymentTerms: values.paymentTerms.trim(),
      status: values.status.trim() || "Pending",
    };
  });
}

function validateCsvFile(file) {
  if (!file.name.toLowerCase().endsWith(".csv")) throw new Error("Choose a .csv file to import records.");
  if (file.size > 5 * 1024 * 1024) throw new Error("CSV files must be 5 MB or smaller.");
}

function readPdf(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the selected PDF."));
    reader.readAsDataURL(file);
  });
}

export default function DocumentsPage({ kind }) {
  const config = DOCUMENT_TYPES[kind];
  const { t, isArabic } = useLanguage();
  const { branch: activeBranch, dateFrom, addDocuments, documents: allDocuments, documentStorageReady, documentStorageError } = useApp();
  const rows = useBranchFilter(allDocuments.filter((document) => document.type === kind));
  const [form, setForm] = useState(() => blankForm(activeBranch, dateFrom));
  const [pdf, setPdf] = useState(null);
  const [message, setMessage] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => !query || [row.number, row.counterparty, row.referenceInvoice, row.description, row.taxNumber].some((value) => String(value ?? "").toLowerCase().includes(query)));
  }, [rows, search]);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const pageRows = visibleRows.slice((page - 1) * pageSize, page * pageSize);
  const subtotalTotal = rows.reduce((sum, row) => sum + Number(row.subtotal || 0), 0);
  const vatTotal = rows.reduce((sum, row) => sum + Number(row.vat || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const Icon = config.icon;

  if (!documentStorageReady) return <Card className="p-6 text-sm text-slate-500">{t("Loading saved documents…", "جارٍ تحميل المستندات المحفوظة…")}</Card>;

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const handlePdfUpload = async (file) => {
    if (!file) return;
    setPdf(null);
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      setMessage({ error: t("Only PDF attachments are accepted here. For bulk import, choose a CSV file.", "يُقبل إرفاق ملفات PDF فقط. للاستيراد الجماعي، اختر ملف CSV.") });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage({ error: t("PDF files must be 8 MB or smaller.", "يجب ألا يتجاوز حجم ملف PDF ‏8 ميغابايت.") });
      return;
    }
    try {
      const signature = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
      if (signature !== "%PDF-") {
        setMessage({ error: t("The selected file is not a valid PDF document.", "الملف المحدد ليس مستند PDF صالحاً.") });
        return;
      }
      setPdf({ name: file.name, size: file.size, dataUrl: await readPdf(file) });
      setMessage({ success: t("PDF attached. Save the document to keep it with this record.", "تم إرفاق ملف PDF. احفظ المستند للاحتفاظ به مع هذا السجل.") });
    } catch (error) {
      setMessage({ error: error.message || t("Could not read the selected PDF.", "تعذرت قراءة ملف PDF المحدد.") });
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".csv")) {
      try {
        validateCsvFile(file);
        const imported = parseCsv(await file.text());
        const existingNumbers = new Set(allDocuments.filter((document) => document.type === kind).map((document) => document.number.toLowerCase()));
        for (const document of imported) {
          if (existingNumbers.has(document.number.toLowerCase())) throw new Error(`Document number "${document.number}" already exists.`);
          existingNumbers.add(document.number.toLowerCase());
        }
        await addDocuments(kind, imported.map((document) => ({ ...document, attachment: null })));
        setPage(1);
        setMessage({ success: t(`Imported ${imported.length} ${config.title.toLowerCase()} from ${file.name}.`, `تم استيراد ${imported.length} من ${config.titleAr} من ${file.name}.`) });
      } catch (error) {
        setMessage({ error: error.message });
      }
      return;
    }
    await handlePdfUpload(file);
  };

  const saveDocument = async (event) => {
    event.preventDefault();
    const subtotal = Number(form.subtotal);
    const vat = Number(form.vat || 0);
    const total = Number(form.total || subtotal + vat);
    if (!form.counterparty.trim() || !form.description.trim() || !form.issueDate || !Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(vat) || vat < 0 || !Number.isFinite(total) || total < 0) {
      setMessage({ error: t("Complete the required fields and enter valid non-negative amounts.", "أكمل الحقول المطلوبة وأدخل مبالغ صحيحة غير سالبة.") });
      return;
    }
    if (Math.abs(subtotal + vat - total) > 0.02) {
      setMessage({ error: t("Subtotal plus VAT must equal the total.", "يجب أن يساوي الإجمالي المجموع الفرعي مضافاً إليه الضريبة.") });
      return;
    }
    if (kind !== "invoice" && !form.referenceInvoice.trim()) {
      setMessage({ error: t("Enter the original invoice number for this note.", "أدخل رقم الفاتورة الأصلية لهذا الإشعار.") });
      return;
    }
    const number = form.number.trim() || `${config.prefix}-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${String(rows.length + 1).padStart(3, "0")}`;
    if (allDocuments.some((document) => document.type === kind && document.number.toLowerCase() === number.toLowerCase())) {
      setMessage({ error: t("A document with this number already exists.", "يوجد مستند بهذا الرقم بالفعل.") });
      return;
    }
    try {
      await addDocuments(kind, [{
        ...form,
        number,
        subtotal: Number(subtotal.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        total: Number(total.toFixed(2)),
        attachment: pdf,
      }]);
    } catch (error) {
      setMessage({ error: error.message });
      return;
    }
    setForm(blankForm(activeBranch, dateFrom));
    setPdf(null);
    setPage(1);
    setMessage({ success: t(`${config.singular} saved successfully.`, `تم حفظ ${config.singularAr} بنجاح.`) });
  };

  const exportRows = [
    { key: "number", label: t("Document number", "رقم المستند") },
    { key: "issueDate", label: t("Issue date", "تاريخ الإصدار") },
    { key: "dueDate", label: t("Due date", "تاريخ الاستحقاق") },
    { key: "branch", label: t("Branch", "الفرع"), exportValue: (row) => branches.find((item) => item.id === row.branch)?.name },
    { key: "counterparty", label: t("Supplier / customer", "المورد / العميل") },
    { key: "taxNumber", label: t("VAT registration number", "الرقم الضريبي") },
    { key: "referenceInvoice", label: t("Original invoice", "الفاتورة الأصلية") },
    { key: "description", label: t("Description", "الوصف") },
    { key: "subtotal", label: t("Subtotal", "المجموع الفرعي") },
    { key: "vat", label: t("VAT", "الضريبة") },
    { key: "total", label: t("Total", "الإجمالي") },
    { key: "currency", label: t("Currency", "العملة") },
    { key: "direction", label: t("Direction", "الاتجاه") },
    { key: "paymentTerms", label: t("Payment terms", "شروط الدفع") },
    { key: "status", label: t("Status", "الحالة") },
  ];

  return <div className="space-y-5">
    <Card className="p-5">
      <SectionTitle
        title={t(config.title, config.titleAr)}
        subtitle={t(config.description, config.descriptionAr)}
        action={<span className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><Icon size={16} className="text-accent" />{rows.length} {t("documents", "مستندات")}</span>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[{ label: t("Subtotal", "المجموع الفرعي"), value: money(subtotalTotal) }, { label: t("VAT amount", "مبلغ الضريبة"), value: money(vatTotal) }, { label: t("Total amount", "الإجمالي"), value: money(totalAmount) }].map((item) => <div key={item.label} className="rounded-lg bg-slate-50 px-4 py-3"><p className="text-xs text-slate-500">{item.label}</p><p className="mt-1 text-base font-bold text-slate-800">{item.value}</p></div>)}
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-accent/40 bg-sky-50/50 p-4">
        <div className="flex items-start gap-3"><span className="rounded-lg bg-white p-2 text-accent shadow-sm"><Upload size={18} /></span><div><p className="text-sm font-semibold text-slate-800">{t("Upload document files", "رفع ملفات المستندات")}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t("Attach a PDF to the form or import multiple documents from a CSV. CSV columns are documented in the template.", "أرفق ملف PDF بالنموذج أو استورد عدة مستندات من CSV. أعمدة CSV موضحة في النموذج.")}</p><button className="mt-1 text-xs font-semibold text-accent hover:underline" onClick={() => exportCsv(`${kind}-template.csv`, [], exportRows)}>{t("Download CSV template", "تنزيل نموذج CSV")}</button></div></div>
        <label className={`inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white ${documentStorageError ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-[#294d76]"}`}><Upload size={16} />{t("Choose PDF or CSV", "اختيار PDF أو CSV")}<input type="file" accept=".pdf,.csv,application/pdf,text/csv" className="sr-only" disabled={Boolean(documentStorageError)} onChange={handleUpload} /></label>
      </div>
      {message && <div role={message.error ? "alert" : "status"} className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm ${message.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}><span>{message.error || message.success}</span><button aria-label={t("Dismiss", "إغلاق")} onClick={() => setMessage(null)}><X size={15} /></button></div>}
      {documentStorageError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{documentStorageError}</p>}

      <details className="group rounded-xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden"><span><span className="flex items-center gap-2 text-sm font-semibold text-navy"><Plus size={16} />{t("Add document manually", "إضافة مستند يدوياً")}</span><span className="mt-1 block text-xs text-slate-500">{t("Enter the complete document and tax details below.", "أدخل بيانات المستند والضريبة كاملة أدناه.")}</span></span><span className="text-xs font-semibold text-accent group-open:hidden">{t("Open form", "فتح النموذج")}</span></summary>
        <form onSubmit={saveDocument} className="grid gap-4 border-t border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label={t("Document number (optional)", "رقم المستند (اختياري)")} value={form.number} onChange={(event) => setField("number", event.target.value)} placeholder={`${config.prefix}-YYYY-0001`} />
          <Field label={t("Issue date *", "تاريخ الإصدار *")} type="date" required value={form.issueDate} onChange={(event) => setField("issueDate", event.target.value)} />
          <Field label={t("Due date", "تاريخ الاستحقاق")} type="date" value={form.dueDate} onChange={(event) => setField("dueDate", event.target.value)} />
          <SelectField label={t("Branch *", "الفرع *")} value={form.branch} required onChange={(event) => setField("branch", event.target.value)}>{branches.slice(1).map((item) => <option value={item.id} key={item.id}>{isArabic ? item.nameAr : item.name}</option>)}</SelectField>
          <Field label={t("Supplier / customer *", "المورد / العميل *")} required value={form.counterparty} onChange={(event) => setField("counterparty", event.target.value)} />
          {kind === "invoice" && <SelectField label={t("Invoice direction *", "اتجاه الفاتورة *")} value={form.direction} onChange={(event) => setField("direction", event.target.value)}><option value="supplier">{t("Supplier purchase", "مشتريات من مورد")}</option><option value="customer">{t("Customer sale", "مبيعات لعميل")}</option></SelectField>}
          <Field label={t("VAT registration number", "الرقم الضريبي")} value={form.taxNumber} onChange={(event) => setField("taxNumber", event.target.value)} placeholder="310000000000003" />
          <Field label={kind === "invoice" ? t("Purchase order / reference", "أمر الشراء / المرجع") : t("Original invoice number *", "رقم الفاتورة الأصلية *")} required={kind !== "invoice"} value={form.referenceInvoice} onChange={(event) => setField("referenceInvoice", event.target.value)} />
          <Field label={t("Description *", "الوصف *")} required value={form.description} onChange={(event) => setField("description", event.target.value)} />
          <Field label={t("Subtotal (SAR) *", "المجموع الفرعي (ريال) *")} required type="number" min="0" step="0.01" value={form.subtotal} onChange={(event) => setField("subtotal", event.target.value)} />
          <Field label={t("VAT amount (SAR)", "مبلغ الضريبة (ريال)")} type="number" min="0" step="0.01" value={form.vat} onChange={(event) => setField("vat", event.target.value)} />
          <Field label={t("Total amount (SAR) *", "الإجمالي (ريال) *")} required type="number" min="0" step="0.01" value={form.total} onChange={(event) => setField("total", event.target.value)} />
          <Field label={t("Payment terms", "شروط الدفع")} value={form.paymentTerms} onChange={(event) => setField("paymentTerms", event.target.value)} placeholder="Net 30" />
          <SelectField label={t("Currency", "العملة")} value={form.currency} onChange={(event) => setField("currency", event.target.value)}><option value="SAR">SAR · ر.س</option></SelectField>
          <SelectField label={t("Status", "الحالة")} value={form.status} onChange={(event) => setField("status", event.target.value)}>{["Pending", "Approved", "Paid", "Rejected"].map((status) => <option key={status}>{status}</option>)}</SelectField>
          <div className="flex items-end gap-3 sm:col-span-2 xl:col-span-4">
            {pdf && <span className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><Paperclip size={14} className="shrink-0" /><span className="max-w-48 truncate">{pdf.name}</span><button type="button" aria-label={t("Remove PDF", "إزالة ملف PDF")} onClick={() => setPdf(null)}><X size={14} /></button></span>}
            <Button type="submit" disabled={Boolean(documentStorageError)}><Plus size={15} />{t(`Save ${config.singular}`, `حفظ ${config.singularAr}`)}</Button>
          </div>
        </form>
      </details>
    </Card>

    <Card className="p-5">
      <SectionTitle title={t("Document register", "سجل المستندات")} subtitle={t("All records are filtered by the selected branch and date range.", "تتم تصفية جميع السجلات حسب الفرع والفترة المحددين.")} action={<Button variant="outline" onClick={() => exportCsv(`${kind}-register.csv`, rows, exportRows)}><Download size={15} />{t("Export CSV", "تصدير CSV")}</Button>} />
      <div className="relative mb-4 max-w-sm"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("Search number, supplier, reference...", "ابحث بالرقم أو المورد أو المرجع...")} className="h-10 w-full rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-sm outline-none focus:border-accent" /></div>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[1250px] border-collapse text-start text-xs">
          <thead><tr className="border-y border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">{[
            ["number", t("Document no.", "رقم المستند")], ["issueDate", t("Issue date", "تاريخ الإصدار")], ["branch", t("Branch", "الفرع")], ["counterparty", t("Supplier / customer", "المورد / العميل")], ["taxNumber", t("VAT number", "الرقم الضريبي")], ["referenceInvoice", t("Invoice reference", "مرجع الفاتورة")], ["description", t("Description", "الوصف")], ["subtotal", t("Subtotal", "المجموع الفرعي")], ["vat", t("VAT", "الضريبة")], ["total", t("Total", "الإجمالي")], ["dueDate", t("Due date", "الاستحقاق")], ["status", t("Status", "الحالة")],
          ].map(([key, label]) => <th key={key} className="whitespace-nowrap px-3 py-3 text-start font-semibold">{label}</th>)}<th className="px-3 py-3">{t("Details", "التفاصيل")}</th></tr></thead>
          <tbody>{pageRows.map((row) => <DocumentRow key={row.id} row={row} expanded={expandedId === row.id} onToggle={() => setExpandedId((current) => current === row.id ? null : row.id)} isArabic={isArabic} t={t} />)}
            {pageRows.length === 0 && <tr><td colSpan={13} className="px-4 py-12 text-center text-sm text-slate-400">{t("No documents match this branch, date range, or search.", "لا توجد مستندات تطابق الفرع أو الفترة أو البحث.")}</td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot><tr className="bg-slate-50 font-bold text-slate-700"><td className="px-3 py-3" colSpan={7}>{t("TOTAL", "الإجمالي")}</td><td className="px-3 py-3">{money(subtotalTotal)}</td><td className="px-3 py-3">{money(vatTotal)}</td><td className="px-3 py-3">{money(totalAmount)}</td><td colSpan={3} /></tr></tfoot>}
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs text-slate-500"><span>{t("Showing", "عرض")} {visibleRows.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, visibleRows.length)} {t("of", "من")} {visibleRows.length}</span><div className="flex items-center gap-2"><Button variant="outline" disabled={page <= 1} className="h-8 px-3" onClick={() => setPage((current) => Math.max(1, current - 1))}>{t("Previous", "السابق")}</Button><span>{page} / {pageCount}</span><Button variant="outline" disabled={page >= pageCount} className="h-8 px-3" onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>{t("Next", "التالي")}</Button></div></div>
    </Card>
  </div>;
}

function DocumentRow({ row, expanded, onToggle, isArabic, t }) {
  const showMoney = (value) => money(value);
  const details = [
    [t("Document number", "رقم المستند"), row.number],
    [t("Supplier / customer", "المورد / العميل"), row.counterparty],
    [t("VAT registration number", "الرقم الضريبي"), row.taxNumber || "—"],
    [t("Purchase order / original invoice", "أمر الشراء / الفاتورة الأصلية"), row.referenceInvoice || "—"],
    [t("Description", "الوصف"), row.description],
    [t("Issue date", "تاريخ الإصدار"), row.issueDate],
    [t("Due date", "تاريخ الاستحقاق"), row.dueDate || "—"],
    [t("Branch", "الفرع"), displayBranch(row.branch, isArabic)],
    [t("Subtotal", "المجموع الفرعي"), showMoney(row.subtotal)],
    [t("VAT", "الضريبة"), showMoney(row.vat)],
    [t("Total", "الإجمالي"), showMoney(row.total)],
    [t("Currency", "العملة"), row.currency || "SAR"],
    [t("Payment terms", "شروط الدفع"), row.paymentTerms || "—"],
  ];
  return <>
    <tr className="border-b border-slate-100 hover:bg-slate-50/70">
      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{row.number}</td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.issueDate}</td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{displayBranch(row.branch, isArabic)}</td>
      <td className="px-3 py-3 text-slate-600">{row.counterparty}</td>
      <td className="px-3 py-3 text-slate-600">{row.taxNumber || "—"}</td>
      <td className="px-3 py-3 text-slate-600">{row.referenceInvoice || "—"}</td>
      <td className="max-w-48 truncate px-3 py-3 text-slate-600" title={row.description}>{row.description}</td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{showMoney(row.subtotal)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{showMoney(row.vat)}</td>
      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-800">{showMoney(row.total)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.dueDate || "—"}</td>
      <td className="px-3 py-3"><StatusBadge status={row.status} /></td>
      <td className="px-3 py-3"><button onClick={onToggle} className="whitespace-nowrap font-semibold text-accent hover:underline">{expanded ? t("Hide", "إخفاء") : t("View details", "عرض التفاصيل")}</button></td>
    </tr>
    {expanded && <tr className="border-b border-slate-100 bg-sky-50/40"><td colSpan={13} className="p-4"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">{details.map(([label, value]) => <div key={label}><dt className="text-[10px] font-medium text-slate-400">{label}</dt><dd className="mt-1 break-words text-xs font-medium text-slate-700">{value}</dd></div>)}<div><dt className="text-[10px] font-medium text-slate-400">{t("Attachment", "المرفق")}</dt><dd className="mt-1 text-xs font-medium">{row.attachment?.dataUrl ? <a href={row.attachment.dataUrl} download={row.attachment.name} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><FileText size={13} />{row.attachment.name}</a> : <span className="text-slate-400">{t("No file attached", "لا يوجد ملف مرفق")}</span>}</dd></div></dl></td></tr>}
  </>;
}
