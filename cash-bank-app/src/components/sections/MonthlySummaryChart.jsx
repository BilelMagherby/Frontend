import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, SectionTitle } from "../ui/Primitives";
import { useLanguage } from "../../hooks/useLanguage";
import { cashTransactions } from "../../data/cashTransactions";
import { useBranchFilter } from "../../hooks/useBranchFilter";

export default function MonthlySummaryChart() {
  const { t } = useLanguage();
  const transactions = useBranchFilter(cashTransactions);
  const monthlyTotals = transactions.reduce((months, row) => {
    const month = row.date.slice(0, 7);
    const totals = months.get(month) ?? { month, cashIn: 0, cashOut: 0 };
    totals.cashIn += row.cashIn;
    totals.cashOut += row.cashOut;
    months.set(month, totals);
    return months;
  }, new Map());
  const chartData = [...monthlyTotals.values()].sort((first, second) => first.month.localeCompare(second.month));
  return <Card className="p-5"><SectionTitle title={t("Monthly cash summary", "ملخص النقد الشهري")} subtitle={t("Cash in vs. cash out · SAR", "النقد الوارد مقابل الصادر · ريال سعودي")} />
    {chartData.length ? <div className="h-[270px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barGap={5}>
      <CartesianGrid stroke="#eef1f5" vertical={false} /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#6b7280", fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(value) => `${value / 1000}k`} /><Tooltip formatter={(value) => [`${Number(value).toLocaleString()} SAR`]} contentStyle={{ borderRadius: 10, border: "1px solid #e8edf2", fontSize: 12 }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 10 }} /><Bar dataKey="cashIn" name={t("Cash in", "النقد الوارد")} fill="#27AE60" radius={[4, 4, 0, 0]} /><Bar dataKey="cashOut" name={t("Cash out", "النقد الصادر")} fill="#2E86AB" radius={[4, 4, 0, 0]} />
    </BarChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-400">{t("No cash transactions for this selection.", "لا توجد معاملات نقدية لهذا الاختيار.")}</p>}
  </Card>;
}
