import { useApp } from "../context/AppContext";
import { normalizeBranchId } from "../data/branches";

export function useBranchFilter(rows) {
  const { branch, dateFrom, dateTo } = useApp();
  return rows.filter((row) => {
    if (branch !== "all" && normalizeBranchId(row.branch) !== branch) return false;
    const rowDate = row.date ?? row.issueDate;
    if (!rowDate) return true;
    const date = String(rowDate).slice(0, 10);
    return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  });
}
