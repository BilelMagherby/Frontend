import { useState } from "react";
import { Printer, Plus, Trash2, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { branches } from "../../data/branches";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import DataTable, { displayBranch } from "../ui/DataTable";
import { Button, Card, Field, SectionTitle, SelectField } from "../ui/Primitives";
import { getLocalDateOnly } from "../../utils/taxReturnSchedule";

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const formatBillMoney = (value, currency = "SAR") => `${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const newLine = () => ({ description: "", quantity: "1", unitPrice: "", account: "600000", tax: "15" });
const expenseAccounts = [
  ["500000", "Cost of Revenue"],
  ["600000", "Operating Expenses"],
  ["610000", "Office Expenses"],
  ["620000", "Utilities"],
  ["630000", "Repairs & Maintenance"],
];
function blankBill(branch, dateFrom) {
  const date = dateFrom || getLocalDateOnly();
  return {
    vendorReference: "",
    billDate: date,
    accountingDate: getLocalDateOnly(),
    dueDate: "",
    branch: branch === "all" ? branches[1].id : branch,
    supplier: "",
    supplierAddress: "",
    supplierVatNumber: "",
    paymentTerms: "",
    currency: "SAR",
    lines: [newLine()],
  };
}

function getTotals(lines) {
  return lines.reduce((totals, line) => {
    const base = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    const tax = line.tax === "15" ? roundCurrency(base * 0.15) : 0;
    totals.amount += base;
    totals.vat += tax;
    return totals;
  }, { amount: 0, vat: 0 });
}

export default function PurchaseRegister({ compact = false }) {
  const { purchases, addPurchase, updatePurchase, branch, dateFrom, purchaseStorageError } = useApp();
  const rows = useBranchFilter(purchases);
  const { t, isArabic } = useLanguage();
  const [form, setForm] = useState(() => blankBill(branch, dateFrom));
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [printPreviewBill, setPrintPreviewBill] = useState(null);
  const totals = getTotals(form.lines);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const updateLine = (index, field, value) => setForm((current) => ({
    ...current,
    lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line),
  }));

  const saveBill = (event) => {
    event.preventDefault();
    const billReference = form.vendorReference.trim();
    if (billReference && purchases.some((purchase) => purchase.vendorReference?.toLowerCase() === billReference.toLowerCase())) {
      setError(t("A bill with this vendor reference already exists.", "توجد فاتورة بهذا المرجع بالفعل."));
      return;
    }
    if (!form.lines.length || form.lines.some((line) => !line.description.trim() || Number(line.quantity) <= 0 || line.unitPrice === "")) {
      setError(t("Add at least one complete bill line with a description, quantity, and unit price.", "أضف بند فاتورة مكتملاً واحداً على الأقل يتضمن الوصف والكمية وسعر الوحدة."));
      return;
    }
    const status = new FormData(event.currentTarget).get("action") === "post" ? "Posted" : "Draft";
    try {
      addPurchase({
        id: `BILL-${Date.now()}`,
        vendorReference: billReference,
        date: form.billDate,
        accountingDate: form.accountingDate,
        dueDate: form.dueDate,
        branch: form.branch,
        supplier: form.supplier.trim(),
        supplierAddress: form.supplierAddress.trim(),
        supplierVatNumber: form.supplierVatNumber.trim(),
        description: form.lines.map((line) => line.description.trim()).join("; "),
        descriptionAr: form.lines.map((line) => line.description.trim()).join("; "),
        lines: form.lines.map((line) => ({
          description: line.description.trim(),
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          account: line.account,
          tax: line.tax,
        })),
        amount: roundCurrency(totals.amount),
        vat: roundCurrency(totals.vat),
        total: roundCurrency(totals.amount + totals.vat),
        currency: form.currency,
        paymentTerms: form.paymentTerms.trim(),
        status,
      });
    } catch (saveError) {
      setError(saveError.message);
      return;
    }
    setForm(blankBill(branch, dateFrom));
    setError("");
    setFormOpen(false);
  };

  const postSelectedBill = () => {
    try {
      updatePurchase(selectedBill.id, { status: "Posted" });
      setSelectedBill((current) => ({ ...current, status: "Posted" }));
      setError("");
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const columns = [
    { key: "vendorReference", label: t("Bill reference", "مرجع الفاتورة"), emphasis: true, render: (row) => row.vendorReference || row.id },
    { key: "date", label: t("Bill date", "تاريخ الفاتورة"), sortable: true },
    { key: "dueDate", label: t("Due date", "تاريخ الاستحقاق"), render: (row) => row.dueDate || "—" },
    { key: "branch", label: t("Branch", "الفرع"), render: (row) => displayBranch(row.branch, isArabic) },
    { key: "supplier", label: t("Vendor", "المورد") },
    { key: "description", label: t("Bill lines", "بنود الفاتورة"), render: (row) => row.lines?.length ? `${row.lines.length} ${t("lines", "بنود")}` : (isArabic ? row.descriptionAr : row.description) },
    { key: "amount", label: t("Untaxed", "قبل الضريبة"), sortable: true, render: (row) => `${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${row.currency || "SAR"}` },
    { key: "vat", label: t("Tax", "الضريبة"), render: (row) => `${row.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${row.currency || "SAR"}` },
    { key: "total", label: t("Total", "الإجمالي"), render: (row) => `${(row.total ?? row.amount + row.vat).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${row.currency || "SAR"}` },
    { key: "status", label: t("Status", "الحالة"), status: true },
  ];

  return <Card className="p-5">
    <SectionTitle
      title={t("Purchase register", "سجل المشتريات")}
      subtitle={t("Vendor bills, invoice lines, and tax tracking", "فواتير الموردين وبنود الفاتورة ومتابعة الضريبة")}
      action={!compact && <Button type="button" onClick={() => { setForm(blankBill(branch, dateFrom)); setError(""); setFormOpen(true); }}><Plus size={15} />{t("Create bill", "إنشاء فاتورة")}</Button>}
    />
    {!compact && formOpen && <form onSubmit={saveBill} className="mb-5 rounded-lg border border-slate-200 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">{t("New vendor bill", "فاتورة مورد جديدة")}</h3>
          <p className="mt-1 text-xs text-slate-500">{t("Enter the vendor details and the bill lines, then save as draft or post.", "أدخل بيانات المورد وبنود الفاتورة، ثم احفظ كمسودة أو رحّل الفاتورة.")}</p>
        </div>
        <Button type="button" variant="ghost" className="px-2" aria-label={t("Close form", "إغلاق النموذج")} onClick={() => setFormOpen(false)}><X size={17} /></Button>
      </div>

      <div className="mb-5 grid gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label={t("Vendor *", "المورد *")} required value={form.supplier} onChange={(event) => setField("supplier", event.target.value)} />
        <Field label={t("Vendor address", "عنوان المورد")} value={form.supplierAddress} onChange={(event) => setField("supplierAddress", event.target.value)} />
        <Field label={t("Vendor VAT registration number", "الرقم الضريبي للمورد")} value={form.supplierVatNumber} onChange={(event) => setField("supplierVatNumber", event.target.value)} />
        <Field label={t("Bill reference", "مرجع الفاتورة")} value={form.vendorReference} onChange={(event) => setField("vendorReference", event.target.value)} placeholder={t("Vendor's invoice number", "رقم فاتورة المورد")} />
        <Field label={t("Bill date *", "تاريخ الفاتورة *")} type="date" required value={form.billDate} onChange={(event) => setField("billDate", event.target.value)} />
        <Field label={t("Accounting date *", "تاريخ القيد *")} type="date" required value={form.accountingDate} onChange={(event) => setField("accountingDate", event.target.value)} />
        <Field label={t("Due date", "تاريخ الاستحقاق")} type="date" value={form.dueDate} onChange={(event) => setField("dueDate", event.target.value)} />
        <Field label={t("Payment terms", "شروط الدفع")} value={form.paymentTerms} onChange={(event) => setField("paymentTerms", event.target.value)} placeholder={t("e.g. 30 days", "مثال: 30 يوماً")} />
        <SelectField label={t("Journal", "دفتر اليومية")} value="vendor-bills" disabled><option value="vendor-bills">{t("Vendor Bills", "فواتير الموردين")}</option></SelectField>
        <SelectField label={t("Branch / analytic account", "الفرع / الحساب التحليلي")} required value={form.branch} onChange={(event) => setField("branch", event.target.value)}>{branches.slice(1).map((item) => <option key={item.id} value={item.id}>{isArabic ? item.nameAr : item.name}</option>)}</SelectField>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-800">{t("Invoice lines", "بنود الفاتورة")}</h4>
        <Button type="button" variant="outline" className="px-2.5 py-1.5 text-xs" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, newLine()] }))}><Plus size={14} />{t("Add a line", "إضافة بند")}</Button>
      </div>
      <div className="space-y-3">
        {form.lines.map((line, index) => <div key={index} className="grid items-end gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-[minmax(160px,2fr)_minmax(85px,0.7fr)_minmax(110px,1fr)_minmax(150px,1.4fr)_minmax(140px,1fr)_minmax(110px,1fr)_auto]">
          <Field label={t("Description", "الوصف")} required value={line.description} onChange={(event) => updateLine(index, "description", event.target.value)} />
          <Field label={t("Quantity", "الكمية")} required type="number" min="0.001" step="any" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} />
          <Field label={t("Unit price", "سعر الوحدة")} required type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(index, "unitPrice", event.target.value)} />
          <SelectField label={t("Expense account", "حساب المصروف")} required value={line.account} onChange={(event) => updateLine(index, "account", event.target.value)}>
            {expenseAccounts.map(([code, account]) => <option key={code} value={code}>{code} · {t(account, ({
              "Cost of Revenue": "تكلفة الإيرادات",
              "Operating Expenses": "مصروفات تشغيلية",
              "Office Expenses": "مصروفات مكتبية",
              Utilities: "مرافق",
              "Repairs & Maintenance": "إصلاح وصيانة",
            })[account])}</option>)}
          </SelectField>
          <SelectField label={t("Taxes", "الضرائب")} value={line.tax} onChange={(event) => updateLine(index, "tax", event.target.value)}>
            <option value="15">{t("VAT 15%", "ضريبة ١٥٪")}</option>
            <option value="0">{t("VAT 0% (zero-rated)", "ضريبة ٠٪ (نسبة صفرية)")}</option>
            <option value="exempt">{t("Exempt", "معفى")}</option>
          </SelectField>
          <div className="flex h-10 items-center justify-between gap-2 text-sm"><span className="text-xs text-slate-500">{t("Subtotal", "المجموع")}</span><strong>{((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></div>
          <Button type="button" variant="ghost" className="px-2 text-rose-600" aria-label={t("Remove line", "حذف البند")} disabled={form.lines.length === 1} onClick={() => setForm((current) => ({ ...current, lines: current.lines.filter((_, lineIndex) => lineIndex !== index) }))}><Trash2 size={16} /></Button>
        </div>)}
      </div>

      <div className="mt-5 flex justify-end">
        <div className="w-full space-y-2 border-t border-slate-200 pt-3 text-sm sm:max-w-xs">
          <div className="flex justify-between"><span className="text-slate-500">{t("Untaxed amount", "المبلغ دون الضريبة")}</span><span>{totals.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {form.currency}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">{t("Taxes", "الضرائب")}</span><span>{totals.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} {form.currency}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold"><span>{t("Total", "الإجمالي")}</span><span>{(totals.amount + totals.vat).toLocaleString(undefined, { minimumFractionDigits: 2 })} {form.currency}</span></div>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
      {purchaseStorageError && <p role="alert" className="mt-3 text-xs text-rose-700">{purchaseStorageError}</p>}
      <p className="mt-3 text-[11px] text-slate-400">{t("Bills are stored in this browser only; this form is not connected to an Odoo server.", "تُحفظ الفواتير في هذا المتصفح فقط؛ هذا النموذج غير متصل بخادم أودو.")}</p>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" name="action" value="draft">{t("Save as Draft", "حفظ كمسودة")}</Button>
        <Button type="submit" name="action" value="post">{t("Post", "ترحيل")}</Button>
        <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t("Cancel", "إلغاء")}</Button>
      </div>
    </form>}
    <DataTable columns={columns} rows={compact ? rows.slice(0, 5) : rows} searchKeys={["id", "vendorReference", "supplier", "description", "descriptionAr"]} filename="purchase-register.csv" onView={setSelectedBill} />
    {selectedBill && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedBill(null); setError(""); } }}>
      <section role="dialog" aria-modal="true" aria-labelledby="bill-details-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><h3 id="bill-details-title" className="text-lg font-bold text-navy">{t("Vendor bill", "فاتورة مورد")}</h3><p className="mt-1 text-xs text-slate-500">{selectedBill.vendorReference || selectedBill.id} · {selectedBill.supplier}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setPrintPreviewBill(selectedBill)}><Printer size={15} />{t("Print bill", "طباعة الفاتورة")}</Button>
            {selectedBill.status === "Draft" && <Button type="button" onClick={postSelectedBill}>{t("Post bill", "ترحيل الفاتورة")}</Button>}
            <Button type="button" variant="ghost" className="px-2" aria-label={t("Close bill details", "إغلاق تفاصيل الفاتورة")} onClick={() => { setSelectedBill(null); setError(""); }}><X size={17} /></Button>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <p><span className="text-slate-500">{t("Status", "الحالة")}: </span><b>{selectedBill.status}</b></p>
          <p><span className="text-slate-500">{t("Bill date", "تاريخ الفاتورة")}: </span><b>{selectedBill.date || "—"}</b></p>
          <p><span className="text-slate-500">{t("Accounting date", "تاريخ القيد")}: </span><b>{selectedBill.accountingDate || "—"}</b></p>
          <p><span className="text-slate-500">{t("Due date", "تاريخ الاستحقاق")}: </span><b>{selectedBill.dueDate || "—"}</b></p>
          <p><span className="text-slate-500">{t("Vendor VAT number", "الرقم الضريبي للمورد")}: </span><b>{selectedBill.supplierVatNumber || "—"}</b></p>
          <p><span className="text-slate-500">{t("Payment terms", "شروط الدفع")}: </span><b>{selectedBill.paymentTerms || "—"}</b></p>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead><tr className="border-y bg-slate-50 text-start text-xs text-slate-500"><th className="px-3 py-2">{t("Description", "الوصف")}</th><th className="px-3 py-2">{t("Quantity", "الكمية")}</th><th className="px-3 py-2">{t("Unit price", "سعر الوحدة")}</th><th className="px-3 py-2">{t("Expense account", "حساب المصروف")}</th><th className="px-3 py-2">{t("Tax", "الضريبة")}</th></tr></thead>
            <tbody>{(selectedBill.lines ?? [{ description: selectedBill.description, quantity: 1, unitPrice: selectedBill.amount, tax: selectedBill.vat ? "15" : "0" }]).map((line, index) => <tr key={`${selectedBill.id}-${index}`} className="border-b border-slate-100"><td className="px-3 py-2">{line.description}</td><td className="px-3 py-2">{line.quantity}</td><td className="px-3 py-2">{Number(line.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedBill.currency || "SAR"}</td><td className="px-3 py-2">{line.account || "—"}</td><td className="px-3 py-2">{line.tax === "15" ? "15%" : line.tax === "exempt" ? t("Exempt", "معفى") : "0%"}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="mt-4 ml-auto max-w-xs space-y-2 border-t border-slate-200 pt-3 text-sm">
          <p className="flex justify-between"><span>{t("Untaxed", "قبل الضريبة")}</span><b>{selectedBill.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedBill.currency || "SAR"}</b></p>
          <p className="flex justify-between"><span>{t("Tax", "الضريبة")}</span><b>{selectedBill.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedBill.currency || "SAR"}</b></p>
          <p className="flex justify-between border-t border-slate-200 pt-2 text-base"><span>{t("Total", "الإجمالي")}</span><b>{(selectedBill.total ?? selectedBill.amount + selectedBill.vat).toLocaleString(undefined, { minimumFractionDigits: 2 })} {selectedBill.currency || "SAR"}</b></p>
        </div>
        {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
        {purchaseStorageError && <p role="alert" className="mt-3 text-xs text-rose-700">{purchaseStorageError}</p>}
      </section>
    </div>}
    {printPreviewBill && <div className="bill-print-view">
      <article className="bill-print-paper w-full max-w-[210mm] rounded-lg border border-slate-200 bg-white p-8 shadow-xl">
        <div className="bill-print-actions mb-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setPrintPreviewBill(null)}>{t("Back to bill", "العودة إلى الفاتورة")}</Button>
          <Button type="button" onClick={() => window.print()}><Printer size={15} />{t("Print", "طباعة")}</Button>
        </div>
        <header className="mb-5 flex items-start justify-between gap-4 border-b-2 border-navy pb-4">
          <div><h2 className="text-2xl font-bold text-navy">Vendor Bill · فاتورة مورد</h2><p className="mt-1 text-xs text-slate-500">{t("Internal copy of the vendor bill record", "نسخة داخلية من سجل فاتورة المورد")}</p></div>
          <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold">{printPreviewBill.status}</span>
        </header>
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <section className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-2 font-bold text-navy">{t("Vendor", "المورد")}</h3>
            <p className="font-semibold">{printPreviewBill.supplier}</p>
            {printPreviewBill.supplierAddress && <p>{printPreviewBill.supplierAddress}</p>}
            {printPreviewBill.supplierVatNumber && <p>{t("Vendor VAT registration number", "الرقم الضريبي للمورد")}: {printPreviewBill.supplierVatNumber}</p>}
          </section>
          <section className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-2 font-bold text-navy">{t("Company", "الشركة")}</h3>
            <p className="font-semibold">Ibrahim Abdulkarim Al-Rabian Trading Est.</p>
            <p>{displayBranch(printPreviewBill.branch, isArabic)}</p>
            <p>{t("Currency", "العملة")}: {printPreviewBill.currency || "SAR"}</p>
          </section>
        </div>
        <div className="mb-5 grid gap-2 rounded-md bg-slate-50 p-3 text-sm sm:grid-cols-2">
          <p>{t("Vendor reference", "مرجع المورد")}: <b>{printPreviewBill.vendorReference || "—"}</b></p>
          <p>{t("Internal reference", "المرجع الداخلي")}: <b>{printPreviewBill.id}</b></p>
          <p>{t("Bill date", "تاريخ الفاتورة")}: <b>{printPreviewBill.date || "—"}</b></p>
          <p>{t("Accounting date", "تاريخ القيد")}: <b>{printPreviewBill.accountingDate || "—"}</b></p>
          <p>{t("Due date", "تاريخ الاستحقاق")}: <b>{printPreviewBill.dueDate || "—"}</b></p>
          <p>{t("Payment terms", "شروط الدفع")}: <b>{printPreviewBill.paymentTerms || "—"}</b></p>
        </div>
        <h3 className="mb-2 font-bold text-navy">{t("Bill lines", "بنود الفاتورة")}</h3>
        <div className="overflow-x-auto">
          <table className="bill-print-lines w-full min-w-[680px] border-collapse text-xs">
            <thead><tr className="bg-slate-100 text-start"><th className="border border-slate-300 p-2">{t("Description", "الوصف")}</th><th className="border border-slate-300 p-2">{t("Quantity", "الكمية")}</th><th className="border border-slate-300 p-2">{t("Unit price", "سعر الوحدة")}</th><th className="border border-slate-300 p-2">{t("Tax rate", "نسبة الضريبة")}</th><th className="border border-slate-300 p-2">{t("Untaxed", "قبل الضريبة")}</th><th className="border border-slate-300 p-2">{t("Tax", "الضريبة")}</th><th className="border border-slate-300 p-2">{t("Total", "الإجمالي")}</th></tr></thead>
            <tbody>{(printPreviewBill.lines?.length ? printPreviewBill.lines : [{ description: printPreviewBill.description, quantity: 1, unitPrice: printPreviewBill.amount, tax: printPreviewBill.vat ? "15" : "0" }]).map((line, index) => {
              const base = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
              const tax = line.tax === "15" ? roundCurrency(base * 0.15) : 0;
              return <tr key={`${printPreviewBill.id}-print-${index}`}><td className="border border-slate-300 p-2">{line.description}</td><td className="border border-slate-300 p-2">{line.quantity}</td><td className="border border-slate-300 p-2">{formatBillMoney(line.unitPrice, printPreviewBill.currency)}</td><td className="border border-slate-300 p-2">{line.tax === "15" ? "15%" : line.tax === "exempt" ? t("Exempt", "معفى") : "0%"}</td><td className="border border-slate-300 p-2">{formatBillMoney(base, printPreviewBill.currency)}</td><td className="border border-slate-300 p-2">{formatBillMoney(tax, printPreviewBill.currency)}</td><td className="border border-slate-300 p-2">{formatBillMoney(base + tax, printPreviewBill.currency)}</td></tr>;
            })}</tbody>
          </table>
        </div>
        <div className="ml-auto mt-5 max-w-xs space-y-2 border-t border-slate-300 pt-3 text-sm">
          <p className="flex justify-between"><span>{t("Untaxed amount", "المبلغ دون الضريبة")}</span><b>{formatBillMoney(printPreviewBill.amount, printPreviewBill.currency)}</b></p>
          <p className="flex justify-between"><span>{t("Tax total", "إجمالي الضريبة")}</span><b>{formatBillMoney(printPreviewBill.vat, printPreviewBill.currency)}</b></p>
          <p className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold"><span>{t("Total due", "الإجمالي المستحق")}</span><b>{formatBillMoney(printPreviewBill.total ?? printPreviewBill.amount + printPreviewBill.vat, printPreviewBill.currency)}</b></p>
        </div>
        <footer className="mt-7 border-t border-slate-300 pt-3 text-[10px] leading-5 text-slate-500">
          {t("Internal vendor-bill record only. This is not a tax invoice issued or certified by ZATCA. Retain the supplier's original invoice as the supporting tax document.", "سجل داخلي لفاتورة مورد، وليس فاتورة ضريبية صادرة أو معتمدة من هيئة الزكاة والضريبة والجمارك. احتفظ بفاتورة المورد الأصلية كمستند ضريبي.")}
        </footer>
      </article>
    </div>}
  </Card>;
}
