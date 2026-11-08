import { AlertTriangle, BadgeCheck, ReceiptText } from "lucide-react";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import { useApp } from "../../context/AppContext";
import { Card, SectionTitle } from "../ui/Primitives";
import StatusBadge from "../ui/StatusBadge";
import { getVatAdjustmentCents, toMinorUnits } from "../../utils/accountingEngine";
import { isAdjustmentEffective } from "../../utils/adjustmentNotes";

export default function VATControl() {
  const { purchases, accountingNotes } = useApp();
  const rows = useBranchFilter(purchases);
  const noteRows = useBranchFilter(accountingNotes.filter(isAdjustmentEffective));
  const { t } = useLanguage();
  const postedBills = rows.filter((row) => row.status === "Posted" || row.status === "Reviewed");
  const supplierNotes = noteRows.filter((note) => note.direction === "supplier");
  const customerNotes = noteRows.filter((note) => note.direction === "customer");
  const supplierVatAdjustments = supplierNotes.reduce((sum, note) => sum + getVatAdjustmentCents(note), 0);
  const customerVatAdjustments = customerNotes.reduce((sum, note) => sum + getVatAdjustmentCents(note), 0);
  const vatTotal = postedBills.reduce((sum, row) => sum + toMinorUnits(row.vat), 0) + supplierVatAdjustments;
  const reviewed = rows.filter((row) => row.status === "Posted" || row.status === "Reviewed").length;
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: t("Bills tracked", "الفواتير المتابعة"), value: rows.length, icon: ReceiptText, tone: "text-accent bg-sky-50" }, { label: t("Input VAT incl. notes", "ضريبة المدخلات مع الإشعارات"), value: `${(vatTotal / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`, icon: BadgeCheck, tone: "text-emerald-600 bg-emerald-50" }, { label: t("Output VAT note adjustments", "تعديلات ضريبة المخرجات"), value: `${(customerVatAdjustments / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`, icon: BadgeCheck, tone: "text-sky-600 bg-sky-50" }, { label: t("Draft bills to review", "فواتير مسودة للمراجعة"), value: rows.filter((row) => row.status === "Draft" || row.status === "Needs Review").length, icon: AlertTriangle, tone: "text-amber-600 bg-amber-50" }].map((item) => <Card key={item.label} className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-slate-500">{item.label}</p><p className="mt-2 text-xl font-bold">{item.value}</p></div><span className={`rounded-xl p-2.5 ${item.tone}`}><item.icon size={20} /></span></div></Card>)}
    </div>
    <Card className="p-5"><SectionTitle title={t("VAT control", "التحكم بضريبة القيمة المضافة")} subtitle={t("Saudi VAT invoice readiness and input tax status", "جاهزية الفواتير الضريبية وحالة ضريبة المدخلات")} />
      <div className="mb-4 flex flex-wrap gap-3 rounded-lg bg-slate-50 p-4 text-sm"><span>{t("Posted", "مرحّل")}: <b className="text-emerald-700">{reviewed}</b></span><span>{t("Draft / needs review", "مسودة / تحتاج مراجعة")}: <b className="text-amber-700">{rows.length - reviewed}</b></span></div>
      {(supplierNotes.length > 0 || customerNotes.length > 0) && <p className="mb-4 text-xs text-slate-500">{t("Issued, non-cancelled local adjustment notes are included in these note adjustment totals. They are not submitted tax returns.", "تُدرج الإشعارات المحلية الصادرة وغير الملغاة ضمن إجماليات التعديلات. وهي ليست إقرارات ضريبية مقدمة.")}</p>}
      <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-y bg-slate-50 text-start text-xs text-slate-500"><th className="px-4 py-3">{t("Bill reference", "مرجع الفاتورة")}</th><th className="px-4 py-3">{t("Vendor", "المورد")}</th><th className="px-4 py-3">{t("Net amount", "المبلغ قبل الضريبة")}</th><th className="px-4 py-3">{t("Input VAT", "ضريبة المدخلات")}</th><th className="px-4 py-3">{t("Status", "الحالة")}</th></tr></thead><tbody>{rows.map((row) => <tr className="border-b border-slate-100" key={row.id}><td className="px-4 py-3 font-semibold">{row.vendorReference || row.id}</td><td className="px-4 py-3 text-slate-600">{row.supplier}</td><td className="px-4 py-3">{row.amount.toLocaleString()} {row.currency || "SAR"}</td><td className="px-4 py-3">{row.vat.toLocaleString()} {row.currency || "SAR"}</td><td className="px-4 py-3"><StatusBadge status={row.status === "Draft" ? t("Needs Review", "تحتاج مراجعة") : row.status === "Posted" ? t("Reviewed", "تمت المراجعة") : row.status} /></td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">{t("No bills for this selection.", "لا توجد فواتير لهذا الاختيار.")}</td></tr>}</tbody></table></div>
    </Card>
  </div>;
}
