import { CalendarDays, Filter } from "lucide-react";
import { branches } from "../../data/branches";
import { useApp } from "../../context/AppContext";
import { useLanguage } from "../../hooks/useLanguage";
import { SelectField } from "./Primitives";

export default function BranchFilter() {
  const { branch, setBranch, fiscalYear, setFiscalYear, dateFrom, setDateFrom, dateTo, setDateTo } = useApp();
  const { isArabic, t } = useLanguage();
  return <div className="sticky top-[68px] z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-8">
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-end gap-3">
      <div className="me-1 hidden items-center gap-2 pb-2 text-sm font-semibold text-slate-600 lg:flex"><Filter size={16} className="text-accent" />{t("Filters", "تصفية")}</div>
      <SelectField className="min-w-[180px] flex-1 sm:flex-none sm:w-56" label={t("Branch", "الفرع")} value={branch} onChange={(event) => setBranch(event.target.value)}>
        {branches.map((item) => <option key={item.id} value={item.id}>{isArabic ? item.nameAr : item.name}</option>)}
      </SelectField>
      <SelectField className="w-28" label={t("Fiscal year", "السنة المالية")} value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)}>
        {["2026", "2025", "2024"].map((year) => <option key={year}>{year}</option>)}
      </SelectField>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500"><span>{t("From", "من")}</span><span className="relative"><CalendarDays size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={t("From date", "من تاريخ")} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-xs text-slate-700 outline-none focus:border-accent" /></span></label>
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500"><span>{t("To", "إلى")}</span><span className="relative"><CalendarDays size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={t("To date", "إلى تاريخ")} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white ps-9 pe-3 text-xs text-slate-700 outline-none focus:border-accent" /></span></label>
    </div>
  </div>;
}
