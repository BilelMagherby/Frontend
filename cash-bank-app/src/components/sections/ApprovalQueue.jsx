import { ArrowUpRight, CircleCheck, CircleX } from "lucide-react";
import { cashTransactions } from "../../data/cashTransactions";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, SectionTitle } from "../ui/Primitives";
import { displayBranch } from "../ui/DataTable";

export default function ApprovalQueue() {
  const rows = useBranchFilter(cashTransactions).filter((row) => row.status === "Submitted");
  const { t, isArabic } = useLanguage();
  return <Card className="p-5"><SectionTitle title={t("Approval queue", "قائمة الاعتمادات")} action={<span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">{rows.length} {t("pending", "معلق")}</span>} />
    {rows.length ? <div className="space-y-3">{rows.slice(0, 4).map((row) => <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"><div><p className="text-xs font-semibold">{row.voucher} · {displayBranch(row.branch, isArabic)}</p><p className="mt-1 text-[11px] text-slate-500">{row.description} · {row.cashOut.toLocaleString()} SAR</p></div><div className="flex gap-1"><button title={t("Approve", "اعتماد")} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"><CircleCheck size={18} /></button><button title={t("Reject", "رفض")} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"><CircleX size={18} /></button></div></div>)}</div> : <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">{t("All caught up — no pending approvals.", "تمت مراجعة جميع الطلبات — لا توجد اعتمادات معلقة.")}</div>}
    <button className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent">{t("Review all requests", "مراجعة جميع الطلبات")} <ArrowUpRight size={14} /></button>
  </Card>;
}
