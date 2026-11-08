import { Users, UserCheck, UserX, Timer } from "lucide-react";
import { attendance } from "../../data/attendance";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, SectionTitle } from "../ui/Primitives";
import { displayBranch } from "../ui/DataTable";

export default function AttendanceKPIs() {
  const rows = useBranchFilter(attendance);
  const { t, isArabic } = useLanguage();
  const totals = rows.reduce((sum, row) => ({ employees: sum.employees + row.employees, present: sum.present + row.present, late: sum.late + row.late, absent: sum.absent + row.absent }), { employees: 0, present: 0, late: 0, absent: 0 });
  const cards = [{ label: t("Employees", "الموظفون"), value: totals.employees, icon: Users, tone: "text-accent" }, { label: t("Present today", "حاضر اليوم"), value: totals.present, icon: UserCheck, tone: "text-emerald-600" }, { label: t("Absent", "غائب"), value: totals.absent, icon: UserX, tone: "text-rose-600" }, { label: t("Late", "متأخر"), value: totals.late, icon: Timer, tone: "text-amber-600" }];
  return <Card className="p-5"><SectionTitle title={t("Attendance overview", "نظرة عامة على الحضور")} subtitle={t("Today's attendance across branches", "حضور اليوم عبر الفروع")} />
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="rounded-lg bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="text-xs text-slate-500">{card.label}</span><card.icon size={17} className={card.tone} /></div><p className="mt-2 text-xl font-bold">{card.value}</p></div>)}</div>
    {rows.length ? <div className="space-y-3">{rows.map((row) => <div key={row.branch} className="flex items-center gap-3 text-xs"><span className="w-28 truncate font-medium text-slate-600">{displayBranch(row.branch, isArabic)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.present / row.employees * 100}%` }} /></div><span className="w-12 text-end text-slate-500">{row.present}/{row.employees}</span></div>)}</div> : <p className="text-center text-sm text-slate-400">{t("No attendance records for this selection.", "لا توجد سجلات حضور لهذا الاختيار.")}</p>}
  </Card>;
}
