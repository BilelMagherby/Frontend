import { useEffect, useState } from "react";
import { AlertTriangle, BellRing, CalendarClock, CalendarDays, CheckCircle2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useLanguage } from "../../hooks/useLanguage";
import {
  addDays,
  addMonthsClamped,
  daysBetween,
  formatDateOnly,
  getLocalDateOnly,
  isValidDateOnly,
  TAX_RETURN_PREPARATION_LEAD_DAYS,
} from "../../utils/taxReturnSchedule";
import { Button, Card, Field, SectionTitle } from "../ui/Primitives";

export default function TaxReturnReminder() {
  const { t, language } = useLanguage();
  const {
    taxReturnLastSubmittedDate,
    taxReturnStorageError,
    setTaxReturnLastSubmittedDate,
  } = useApp();
  const [dateDraft, setDateDraft] = useState(taxReturnLastSubmittedDate ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const today = getLocalDateOnly();

  useEffect(() => setDateDraft(taxReturnLastSubmittedDate ?? ""), [taxReturnLastSubmittedDate]);

  const hasSubmittedDate = Boolean(taxReturnLastSubmittedDate);
  const readyByDate = hasSubmittedDate ? addMonthsClamped(taxReturnLastSubmittedDate, 3) : "";
  const reminderStartsOn = hasSubmittedDate ? addDays(readyByDate, -TAX_RETURN_PREPARATION_LEAD_DAYS) : "";
  const daysUntilReady = hasSubmittedDate ? daysBetween(today, readyByDate) : null;
  const daysUntilReminder = hasSubmittedDate ? daysBetween(today, reminderStartsOn) : null;
  const overdue = daysUntilReady < 0;
  const dueToday = daysUntilReady === 0;
  const reminderActive = daysUntilReminder <= 0;
  const tone = overdue || dueToday
    ? { panel: "border-rose-200 bg-rose-50/60", icon: "bg-rose-100 text-rose-700", text: "text-rose-800" }
    : reminderActive
      ? { panel: "border-amber-200 bg-amber-50/60", icon: "bg-amber-100 text-amber-700", text: "text-amber-800" }
      : { panel: "border-sky-200 bg-sky-50/60", icon: "bg-sky-100 text-accent", text: "text-sky-900" };

  const saveDate = () => {
    if (!isValidDateOnly(dateDraft)) {
      setError(t("Enter a valid submission date.", "أدخل تاريخ تقديم صحيحاً."));
      setMessage("");
      return;
    }
    if (dateDraft > today) {
      setError(t("The last-submitted date cannot be in the future.", "لا يمكن أن يكون تاريخ آخر تقديم في المستقبل."));
      setMessage("");
      return;
    }
    try {
      setTaxReturnLastSubmittedDate(dateDraft);
      setError("");
      setMessage(t("Last-submitted date saved. The next reminder has been recalculated.", "تم حفظ تاريخ آخر تقديم وإعادة حساب التذكير القادم."));
    } catch (saveError) {
      setError(saveError.message);
      setMessage("");
    }
  };

  const markSubmittedToday = () => {
    try {
      setTaxReturnLastSubmittedDate(today);
      setDateDraft(today);
      setError("");
      setMessage(t("Return marked submitted today. Your next three-month cycle is now scheduled.", "تم تسجيل تقديم الإقرار اليوم. تمت جدولة الدورة القادمة لثلاثة أشهر."));
    } catch (saveError) {
      setError(saveError.message);
      setMessage("");
    }
  };

  let notice;
  if (overdue) {
    notice = t(
      `The report should have been ready ${Math.abs(daysUntilReady)} day${Math.abs(daysUntilReady) === 1 ? "" : "s"} ago. Please prepare it as soon as possible.`,
      `كان من المفترض تجهيز التقرير منذ ${Math.abs(daysUntilReady)} يوم. يرجى إعداده في أقرب وقت.`,
    );
  } else if (dueToday) {
    notice = t("The report should be ready today.", "يجب أن يكون التقرير جاهزاً اليوم.");
  } else if (reminderActive) {
    notice = t(
      `Preparation reminder: the report should be ready in ${daysUntilReady} day${daysUntilReady === 1 ? "" : "s"}.`,
      `تذكير بالتجهيز: يجب أن يكون التقرير جاهزاً خلال ${daysUntilReady} يوم.`,
    );
  } else {
    notice = t(
      `Your next preparation reminder starts in ${daysUntilReminder} days.`,
      `يبدأ تذكير التجهيز القادم خلال ${daysUntilReminder} يوم.`,
    );
  }

  const NoticeIcon = overdue ? AlertTriangle : dueToday ? CheckCircle2 : reminderActive ? BellRing : CalendarClock;
  const relativeDate = overdue
    ? t(`${Math.abs(daysUntilReady)} days overdue`, `متأخر ${Math.abs(daysUntilReady)} يوم`)
    : dueToday
      ? t("Due today", "مستحق اليوم")
      : hasSubmittedDate
        ? t(`In ${daysUntilReady} days`, `خلال ${daysUntilReady} يوم`)
        : t("Not scheduled", "غير مجدول");

  return <Card className="p-5">
    <SectionTitle
      title={t("Tax return reminder", "تذكير الإقرار الضريبي")}
      subtitle={t("Company-wide internal preparation schedule · all four branches", "جدول التجهيز الداخلي للشركة · جميع الفروع الأربعة")}
      action={<span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.text} ${tone.icon}`}><NoticeIcon size={13} />{overdue ? t("Overdue", "متأخر") : dueToday ? t("Ready today", "جاهز اليوم") : reminderActive ? t("Reminder active", "التذكير فعال") : t("Scheduled", "مجدول")}</span>}
    />

    {hasSubmittedDate ? <>
      <div role={overdue || dueToday || reminderActive ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border p-4 ${tone.panel}`}>
        <span className={`mt-0.5 rounded-lg p-2 ${tone.icon}`}><NoticeIcon size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${tone.text}`}>{notice}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {t("Based on the last submitted date and a three-calendar-month cycle.", "محسوب من تاريخ آخر تقديم وبفاصل ثلاثة أشهر تقويمية.")}
          </p>
        </div>
        <span className="hidden whitespace-nowrap rounded-lg bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 sm:inline">{relativeDate}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-[11px] font-medium text-slate-500">{t("Last return submitted", "تاريخ آخر إقرار مقدم")}</p>
          <p className="mt-1.5 text-sm font-bold text-slate-800">{formatDateOnly(taxReturnLastSubmittedDate, language)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-[11px] font-medium text-slate-500">{t("Start preparing by", "ابدأ التجهيز في")}</p>
          <p className="mt-1.5 text-sm font-bold text-slate-800">{formatDateOnly(reminderStartsOn, language)}</p>
          <p className="mt-1 text-[10px] text-slate-400">{t(`${TAX_RETURN_PREPARATION_LEAD_DAYS} days before ready date`, `${TAX_RETURN_PREPARATION_LEAD_DAYS} يوماً قبل تاريخ الجاهزية`)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 p-3">
          <p className="text-[11px] font-medium text-slate-500">{t("Report should be ready by", "موعد جاهزية التقرير")}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-slate-800"><CalendarDays size={15} className="text-accent" />{formatDateOnly(readyByDate, language)}</p>
        </div>
      </div>
    </> : <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      {t("Enter the last submitted date to calculate the next preparation reminder.", "أدخل تاريخ آخر تقديم لحساب موعد التذكير القادم بالتجهيز.")}
    </div>}

    <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <Field
        label={t("Last-submitted date", "تاريخ آخر تقديم")}
        aria-label={t("Last-submitted date", "تاريخ آخر تقديم")}
        type="date"
        value={dateDraft}
        max={today}
        onChange={(event) => { setDateDraft(event.target.value); setError(""); setMessage(""); }}
        className="w-full sm:max-w-56"
      />
      <Button type="button" onClick={saveDate}>{t("Save date", "حفظ التاريخ")}</Button>
      <Button type="button" variant="outline" onClick={markSubmittedToday}>{t("Mark submitted today", "تم التقديم اليوم")}</Button>
    </div>
    <p className="mt-3 text-[11px] leading-5 text-slate-500">
      {t("This is an internal three-month planning reminder, not a ZATCA filing deadline. Verify the official due date for each return.", "هذا تذكير داخلي للتخطيط كل ثلاثة أشهر وليس موعداً نظامياً للإيداع لدى هيئة الزكاة والضريبة والجمارك. يرجى التحقق من الموعد الرسمي لكل إقرار.")}
    </p>
    {(error || taxReturnStorageError || message) && <p role={error || taxReturnStorageError ? "alert" : "status"} className={`mt-2 text-xs ${error || taxReturnStorageError ? "text-rose-700" : "text-emerald-700"}`}>{error || taxReturnStorageError || message}</p>}
  </Card>;
}
