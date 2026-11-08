import { Bell, CircleAlert } from "lucide-react";
import { notifications } from "../../data/notifications";
import { useLanguage } from "../../hooks/useLanguage";
import { Card, SectionTitle } from "../ui/Primitives";

const tones = { success: "bg-emerald-50 text-emerald-600", warning: "bg-amber-50 text-amber-600", danger: "bg-rose-50 text-rose-600" };

export default function NotificationsPanel() {
  const { t, isArabic } = useLanguage();
  return <Card className="p-5"><SectionTitle title={t("Notifications", "الإشعارات")} action={<Bell size={17} className="text-slate-400" />} />
    {notifications.length ? <div className="space-y-4">{notifications.map((item) => <div key={item.id} className="flex gap-3"><span className={`mt-0.5 rounded-lg p-2 ${tones[item.tone]}`}><CircleAlert size={16} /></span><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="text-xs font-semibold">{isArabic ? item.titleAr : item.title}</p><span className="whitespace-nowrap text-[10px] text-slate-400">{item.time}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{isArabic ? item.detailAr : item.detail}</p></div></div>)}</div> : <p className="py-8 text-center text-sm text-slate-400">{t("No notifications.", "لا توجد إشعارات.")}</p>}
  </Card>;
}
