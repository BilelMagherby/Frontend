import { CheckCheck, CircleDashed, ListTodo } from "lucide-react";
import { tasks } from "../../data/tasks";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, SectionTitle } from "../ui/Primitives";
import StatusBadge from "../ui/StatusBadge";

export default function TasksKPIs() {
  const rows = useBranchFilter(tasks);
  const { t, isArabic } = useLanguage();
  const pending = rows.filter((task) => task.status !== "Completed").length;
  return <Card className="p-5"><SectionTitle title={t("Tasks & follow-ups", "المهام والمتابعات")} subtitle={t("Operational actions assigned to your branches", "الإجراءات التشغيلية المسندة إلى الفروع")} />
    <div className="mb-4 flex gap-3"><div className="flex flex-1 items-center gap-2 rounded-lg bg-amber-50 p-3"><CircleDashed size={17} className="text-amber-600" /><div><p className="text-lg font-bold">{pending}</p><p className="text-[11px] text-slate-500">{t("Open", "مفتوح")}</p></div></div><div className="flex flex-1 items-center gap-2 rounded-lg bg-emerald-50 p-3"><CheckCheck size={17} className="text-emerald-600" /><div><p className="text-lg font-bold">{rows.length - pending}</p><p className="text-[11px] text-slate-500">{t("Completed", "مكتمل")}</p></div></div><ListTodo size={0} /></div>
    {rows.length ? <div className="space-y-3">{rows.slice(0, 4).map((task) => <div key={task.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><div className="min-w-0"><p className="truncate text-xs font-semibold">{isArabic ? task.titleAr : task.title}</p><p className="mt-1 text-[10px] text-slate-400">{task.owner} · {task.due}</p></div><StatusBadge status={task.status} /></div>)}</div> : <p className="py-4 text-center text-sm text-slate-400">{t("No tasks for this selection.", "لا توجد مهام لهذا الاختيار.")}</p>}
  </Card>;
}
