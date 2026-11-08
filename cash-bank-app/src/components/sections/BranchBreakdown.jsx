import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { branches, normalizeBranchId } from "../../data/branches";
import { attendance } from "../../data/attendance";
import { useLanguage } from "../../hooks/useLanguage";
import { useApp } from "../../context/AppContext";
import { Card, SectionTitle } from "../ui/Primitives";

const colors = ["#2E86AB", "#1E3A5F", "#27AE60", "#F39C12"];

export default function BranchBreakdown() {
  const { t, isArabic } = useLanguage();
  const { branch: selectedBranch } = useApp();
  const data = branches.slice(1).map((branch, index) => ({
    id: branch.id,
    name: isArabic ? branch.nameAr : branch.name,
    value: attendance.filter((row) => normalizeBranchId(row.branch) === branch.id).reduce((total, row) => total + row.employees, 0),
    color: colors[index],
  })).filter((item) => selectedBranch === "all" || item.id === selectedBranch);
  return <Card className="p-5"><SectionTitle title={t("Branch breakdown", "توزيع الفروع")} subtitle={t("Active employees by branch", "الموظفون النشطون حسب الفرع")} />
    {attendance.length ? <div className="flex flex-col items-center gap-3 sm:flex-row"><div className="h-[175px] w-full max-w-[210px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3} stroke="none">{data.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="grid w-full grid-cols-2 gap-x-3 gap-y-2">{data.map((item) => <div key={item.name} className="flex items-center gap-2 text-[10px] text-slate-500"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span><b className="ms-auto text-slate-700">{item.value}</b></div>)}</div></div> : <p className="py-8 text-center text-sm text-slate-400">{t("No attendance records.", "لا توجد سجلات حضور.")}</p>}
  </Card>;
}
