import { auditLog } from "../../data/auditLog";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, SectionTitle } from "../ui/Primitives";
import { displayBranch } from "../ui/DataTable";

export default function AuditLog() {
  const rows = useBranchFilter(auditLog);
  const { t, isArabic } = useLanguage();
  return <Card className="p-5"><SectionTitle title={t("Recent audit activity", "أحدث أنشطة التدقيق")} subtitle={t("A traceable history of finance operations", "سجل قابل للتتبع للعمليات المالية")} />
    <div className="scrollbar-thin overflow-x-auto"><table className="w-full min-w-[600px] text-sm"><thead><tr className="border-y bg-slate-50 text-start text-xs text-slate-500"><th className="px-4 py-3">{t("Date & time", "التاريخ والوقت")}</th><th className="px-4 py-3">{t("User", "المستخدم")}</th><th className="px-4 py-3">{t("Action", "الإجراء")}</th><th className="px-4 py-3">{t("Reference", "المرجع")}</th><th className="px-4 py-3">{t("Branch", "الفرع")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="px-4 py-3 text-xs text-slate-500">{row.date}</td><td className="px-4 py-3 font-medium">{row.user}</td><td className="px-4 py-3 text-slate-600">{isArabic ? row.actionAr : row.action}</td><td className="px-4 py-3 font-mono text-xs">{row.reference}</td><td className="px-4 py-3 text-slate-500">{displayBranch(row.branch, isArabic)}</td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">{t("No audit activity.", "لا يوجد نشاط تدقيق.")}</td></tr>}</tbody></table></div>
  </Card>;
}
