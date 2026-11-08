import { Card } from "./Primitives";

export default function KPICard({ title, titleAr, value, icon: Icon, color = "blue", subLabel, alert = false, language = "en" }) {
  const colors = {
    blue: "bg-blue-50 text-[#2E86AB]",
    green: "bg-emerald-50 text-[#27AE60]",
    red: "bg-rose-50 text-[#E74C3C]",
    amber: "bg-amber-50 text-[#F39C12]",
  };
  return <Card className={`p-4 ${alert ? "border-rose-300 ring-1 ring-rose-100" : ""}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{language === "ar" ? titleAr : title}</p>
        <p className="mt-3 text-2xl font-bold tracking-tight text-slate-800">{value}</p>
        {subLabel && <p className="mt-1 text-xs text-slate-400">{subLabel}</p>}
      </div>
      <span className={`rounded-xl p-2.5 ${colors[color]}`}><Icon size={20} /></span>
    </div>
  </Card>;
}
