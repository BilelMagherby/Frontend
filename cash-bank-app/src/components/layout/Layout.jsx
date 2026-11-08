import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BranchFilter from "../ui/BranchFilter";
import { useLanguage } from "../../hooks/useLanguage";

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { direction, t } = useLanguage();
  return <div dir={direction} className="min-h-screen bg-canvas">
    <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    <div className="min-h-screen lg:ps-[258px]">
      <Topbar onMenu={() => setMenuOpen(true)} />
      <BranchFilter />
      <main className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-accent">{t("Natheel finance", "مالية نخيل")}</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-navy">{t("Saudi Cash Control Dashboard", "لوحة التحكم النقدي السعودي")}</h1><p className="mt-1 text-sm text-slate-500">{t("Ibrahim Abdulkarim Al-Rabian Trading Est.", "مؤسسة إبراهيم عبدالكريم الربيعان التجارية")}</p></div>
        </div>
        {children}
        <footer className="mt-8 border-t border-slate-200 py-4 text-center text-xs text-slate-400">{t(`© ${new Date().getFullYear()} Natheel · All amounts in Saudi Riyal (SAR)`, `© ${new Date().getFullYear()} نخيل · جميع المبالغ بالريال السعودي`)}</footer>
      </main>
    </div>
  </div>;
}
