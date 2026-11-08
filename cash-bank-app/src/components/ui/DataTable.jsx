import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search, Download } from "lucide-react";
import { Button, Field } from "./Primitives";
import { useLanguage } from "../../hooks/useLanguage";
import StatusBadge from "./StatusBadge";
import { branchName, normalizeBranchId } from "../../data/branches";

export function exportCsv(filename, rows, columns) {
  const escape = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns.map((column) => escape(column.label)).join(","), ...rows.map((row) => columns.map((column) => escape(column.exportValue ? column.exportValue(row) : row[column.key])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function DataTable({ columns, rows, searchKeys = [], filename = "report.csv", highlightNegative = false, summary, actions = true, onView, pageSize = 10 }) {
  const { t, isArabic } = useLanguage();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "", direction: "asc" });
  useEffect(() => setPage(1), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = rows.filter((row) => !needle || searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)));
    if (sort.key) result.sort((a, b) => {
      const first = a[sort.key] ?? "";
      const second = b[sort.key] ?? "";
      const comparison = typeof first === "number" && typeof second === "number" ? first - second : String(first).localeCompare(String(second));
      return sort.direction === "asc" ? comparison : -comparison;
    });
    return result;
  }, [rows, query, searchKeys, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (key) => {
    setPage(1);
    setSort((old) => ({ key, direction: old.key === key && old.direction === "asc" ? "desc" : "asc" }));
  };
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-sm"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" /><Field aria-label={t("Search records", "بحث في السجلات")} placeholder={t("Search records...", "البحث في السجلات...")} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="w-full [&_input]:ps-9" /></div>
      <Button variant="outline" onClick={() => exportCsv(filename, filtered, columns)}><Download size={15} />{t("Export CSV", "تصدير CSV")}</Button>
    </div>
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse text-start text-sm">
        <thead><tr className="border-y border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
          {columns.map((column) => <th key={column.key} className={`whitespace-nowrap px-4 py-3 font-semibold ${column.sortable ? "cursor-pointer select-none hover:text-navy" : ""}`} onClick={() => column.sortable && toggleSort(column.key)}>{column.label}{sort.key === column.key ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}</th>)}
          {actions && <th className="px-4 py-3 font-semibold">{t("Action", "الإجراء")}</th>}
        </tr></thead>
        <tbody>{shown.map((row, index) => <tr key={row.id ?? index} className={`border-b border-slate-100 transition hover:bg-slate-50/70 ${highlightNegative && row.balance < 0 ? "bg-rose-50/70" : ""}`}>
          {columns.map((column) => {
            const value = column.render ? column.render(row) : row[column.key];
            return <td key={column.key} className={`whitespace-nowrap px-4 py-3 text-slate-600 ${column.emphasis ? "font-semibold text-slate-800" : ""}`}>{column.status ? <StatusBadge status={value} /> : value}</td>;
          })}
          {actions && <td className="px-4 py-3"><button type="button" onClick={() => onView?.(row)} aria-label={`${t("View", "عرض")} ${row.id ?? ""}`} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-navy"><Eye size={14} />{t("View", "عرض")}</button></td>}
        </tr>)}
          {shown.length === 0 && <tr><td colSpan={columns.length + Number(actions)} className="px-4 py-10 text-center text-sm text-slate-400">{t("No matching records", "لا توجد سجلات مطابقة")}</td></tr>}
        </tbody>
        {summary && <tfoot><tr className="bg-slate-50 text-sm font-bold text-slate-700">{summary}</tr></tfoot>}
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-slate-500">
      <span>{t("Showing", "عرض")} {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} {t("of", "من")} {filtered.length}</span>
      <div className="flex items-center gap-2"><Button variant="outline" className="h-8 px-2" disabled={page <= 1} aria-label={t("Previous page", "الصفحة السابقة")} onClick={() => setPage((current) => Math.max(1, current - 1))}>{isArabic ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</Button><span>{page} / {pageCount}</span><Button variant="outline" className="h-8 px-2" disabled={page >= pageCount} aria-label={t("Next page", "الصفحة التالية")} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>{isArabic ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}</Button></div>
    </div>
  </div>;
}

export function displayBranch(branch, isArabic = false) {
  const normalized = normalizeBranchId(branch);
  if (!isArabic) return branchName(normalized);
  return ({ hajiss: "هاجس", ghalia: "غاليا", odun: "أودون", natheel: "نخيل" })[normalized] ?? "كل الفروع";
}
