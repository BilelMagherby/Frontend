import { useApp } from "../context/AppContext";
import { useLanguage } from "../hooks/useLanguage";
import { Card, SectionTitle } from "../components/ui/Primitives";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { language, toggleLanguage } = useApp();
  return <Card className="max-w-2xl p-6"><SectionTitle title={t("Settings", "الإعدادات")} subtitle={t("Dashboard preferences", "تفضيلات لوحة التحكم")} />
    <div className="flex items-center justify-between border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{t("Display language", "لغة العرض")}</p><p className="mt-1 text-xs text-slate-500">{t("Choose your preferred dashboard language and layout direction.", "اختر لغة لوحة التحكم واتجاه العرض المفضل.")}</p></div><button onClick={toggleLanguage} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-navy hover:bg-slate-50">{language === "en" ? "العربية · RTL" : "English · LTR"}</button></div>
    <div className="flex items-center justify-between border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{t("Currency", "العملة")}</p><p className="mt-1 text-xs text-slate-500">{t("Reporting currency for all branches", "عملة التقارير لجميع الفروع")}</p></div><span className="rounded-lg bg-slate-50 px-4 py-2 text-sm font-semibold">SAR · ر.س</span></div>
    <div className="flex items-center justify-between border-t border-slate-100 py-4"><div><p className="text-sm font-semibold">{t("Company", "الشركة")}</p><p className="mt-1 text-xs text-slate-500">مؤسسة إبراهيم عبدالكريم الربيعان التجارية</p></div><span className="text-sm font-medium text-slate-600">Natheel</span></div>
  </Card>;
}
