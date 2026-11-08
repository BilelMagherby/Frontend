import { useLocation } from "react-router-dom";
import { Bell, Globe2, Menu, Search } from "lucide-react";
import { useLanguage } from "../../hooks/useLanguage";
import { Button } from "../ui/Primitives";

export default function Topbar({ onMenu }) {
  const { t, isArabic, toggleLanguage } = useLanguage();
  const { pathname } = useLocation();
  const pageTitle = pathname === "/bank-statement" ? t("Bank statement", "كشف الحساب البنكي") : t("Overview", "نظرة عامة");
  return <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm md:px-8">
    <div className="flex items-center gap-3"><Button variant="ghost" className="px-2 lg:hidden" aria-label={t("Open menu", "فتح القائمة")} onClick={onMenu}><Menu size={20} /></Button>
      <div className="hidden items-center gap-2 text-sm text-slate-400 md:flex"><Search size={15} /><span>{t("Finance workspace", "مساحة العمل المالية")}</span><span className="text-slate-300">/</span><span className="font-semibold text-slate-700">{pageTitle}</span></div>
      <div className="md:hidden text-sm font-bold text-navy">NATHEEL</div>
    </div>
    <div className="flex items-center gap-2">
      <Button variant="ghost" className="px-2.5" aria-label={t("Notifications", "الإشعارات")}><Bell size={18} /></Button>
      <Button variant="outline" className="h-9 px-3" onClick={toggleLanguage}><Globe2 size={15} /><span>{isArabic ? "English" : "العربية"}</span></Button>
    </div>
  </header>;
}
