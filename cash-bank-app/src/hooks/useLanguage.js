import { useApp } from "../context/AppContext";

export function useLanguage() {
  const { language, direction, toggleLanguage } = useApp();
  const isArabic = language === "ar";
  const t = (en, ar) => (isArabic ? ar : en);
  return { language, direction, isArabic, t, toggleLanguage };
}
