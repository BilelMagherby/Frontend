const DAY_MS = 24 * 60 * 60 * 1000;

export const TAX_RETURN_PREPARATION_LEAD_DAYS = 30;

export function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function addMonthsClamped(dateOnly, months) {
  if (!isValidDateOnly(dateOnly)) throw new Error("A valid YYYY-MM-DD date is required.");
  const [year, month, day] = dateOnly.split("-").map(Number);
  const monthIndex = month - 1 + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${String(targetMonthIndex + 1).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

export function addDays(dateOnly, days) {
  if (!isValidDateOnly(dateOnly)) throw new Error("A valid YYYY-MM-DD date is required.");
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromDate, toDate) {
  if (!isValidDateOnly(fromDate) || !isValidDateOnly(toDate)) throw new Error("Both dates must use YYYY-MM-DD.");
  return (Date.parse(`${toDate}T00:00:00.000Z`) - Date.parse(`${fromDate}T00:00:00.000Z`)) / DAY_MS;
}

export function getLocalDateOnly(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateOnly(dateOnly, language = "en") {
  if (!isValidDateOnly(dateOnly)) return dateOnly;
  const locale = language === "ar" ? "ar-SA" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${dateOnly}T00:00:00.000Z`));
}
