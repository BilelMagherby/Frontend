import { odooExports } from "../../data/odooExports";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, SectionTitle } from "../ui/Primitives";
import StatusBadge from "../ui/StatusBadge";

export default function OdooExportStatus() {
  const { t } = useLanguage();
  return <Card className="p-5"><SectionTitle title={t("Odoo export status", "حالة تصدير أودو")} subtitle={t("Accounting integration activity", "نشاط التكامل المحاسبي")} />
    {odooExports.length ? <div className="space-y-3">{odooExports.slice(0, 3).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div><p className="text-xs font-semibold">{item.type}</p><p className="mt-1 text-[10px] text-slate-400">{item.date} · {item.records} {t("records", "سجل")}</p></div><StatusBadge status={item.status} /></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">{t("No export activity.", "لا يوجد نشاط تصدير.")}</p>}
  </Card>;
}
