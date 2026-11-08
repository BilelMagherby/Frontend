import { NavLink } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, Banknote, Building2, CalendarClock, ClipboardList, CreditCard, FileCheck2, FileSpreadsheet, FileText, LayoutDashboard, Settings, Users, WalletCards } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";

const navItems = [
  ["/", LayoutDashboard, "Dashboard", "لوحة التحكم"],
  ["/cash", Banknote, "Cash transactions", "المعاملات النقدية"],
  ["/bank", CreditCard, "Bank movements", "حركة البنك"],
  ["/bank-statement", FileSpreadsheet, "Bank statement", "كشف الحساب البنكي"],
  ["/purchases", FileText, "Purchases", "المشتريات"],
  ["/invoices", FileText, "Invoices", "الفواتير"],
  ["/debit-notes", FileCheck2, "Debit notes", "إشعارات مدينة"],
  ["/credit-notes", FileCheck2, "Credit notes", "إشعارات دائنة"],
  ["/attendance", Users, "Attendance", "الحضور"],
  ["/tasks", ClipboardList, "Tasks", "المهام"],
  ["/vat", FileCheck2, "VAT control", "التحكم بالضريبة"],
  ["/tax-reminder", CalendarClock, "Tax return reminder", "تذكير الإقرار الضريبي"],
  ["/odoo", Activity, "Odoo exports", "تصدير أودو"],
  ["/settings", Settings, "Settings", "الإعدادات"],
];

export default function Sidebar({ open, onClose }) {
  const { t, isArabic } = useLanguage();
  return <>
    {open && <button aria-label={t("Close navigation", "إغلاق القائمة")} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={onClose} />}
    <aside className={`fixed inset-y-0 start-0 z-40 flex w-[258px] flex-col bg-navy text-white transition-transform duration-200 lg:!translate-x-0 ${open ? "translate-x-0" : isArabic ? "translate-x-full" : "-translate-x-full"}`}>
      <div className="flex h-[68px] items-center gap-3 border-b border-white/10 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><WalletCards size={21} /></div>
        <div><p className="text-sm font-bold tracking-wide">NATHEEL</p><p className="text-[10px] text-blue-200">Cash Control</p></div>
      </div>
      <div className="px-5 pb-3 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">{t("Workspace", "مساحة العمل")}</div>
      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3">
        {navItems.map(([to, Icon, en, ar]) => <NavLink key={to} to={to} end={to === "/"} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${isActive ? "bg-white/15 font-semibold text-white shadow-sm" : "text-blue-100/80 hover:bg-white/10 hover:text-white"}`}>
          <Icon size={17} strokeWidth={1.8} /><span>{t(en, ar)}</span>
        </NavLink>)}
      </nav>
      <button
        className="mx-3 mb-1 flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2.5 text-start text-[13px] font-semibold text-blue-100 transition hover:bg-white/10 hover:text-white"
        onClick={() => {
          onClose();
          window.location.assign("/");
        }}
        type="button"
      >
        {isArabic ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}
        <span>{t("Back to main dashboard", "العودة إلى لوحة التحكم الرئيسية")}</span>
      </button>
      <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-3.5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Building2 size={15} />{t("Company", "الشركة")}</div>
        <p className="text-[11px] leading-5 text-blue-100/70">{t("Ibrahim Abdulkarim Al-Rabian Trading Est.", "مؤسسة إبراهيم عبدالكريم الربيعان التجارية")}</p>
      </div>
      <div className="border-t border-white/10 px-5 py-3 text-[10px] text-blue-200/60">Natheel Finance · v1.0</div>
    </aside>
  </>;
}
