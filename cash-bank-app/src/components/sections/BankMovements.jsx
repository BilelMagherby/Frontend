import { bankMovements } from "../../data/bankMovements";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import DataTable, { displayBranch } from "../ui/DataTable";
import { Card, SectionTitle } from "../ui/Primitives";

export default function BankMovements({ compact = false }) {
  const rows = useBranchFilter(bankMovements);
  const { t, isArabic } = useLanguage();
  const columns = [
    { key: "id", label: t("Movement ID", "رقم الحركة"), emphasis: true },
    { key: "date", label: t("Date", "التاريخ"), sortable: true },
    { key: "account", label: t("Bank account", "الحساب البنكي") },
    { key: "branch", label: t("Branch", "الفرع"), render: (row) => displayBranch(row.branch, isArabic) },
    { key: "type", label: t("Movement type", "نوع الحركة") },
    { key: "description", label: t("Description", "الوصف"), render: (row) => isArabic ? row.descriptionAr : row.description },
    { key: "amount", label: t("Amount (SAR)", "المبلغ (ريال)"), sortable: true, render: (row) => <span className={`font-semibold ${row.amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>{row.amount < 0 ? "" : "+"}{row.amount.toLocaleString()} SAR</span> },
    { key: "status", label: t("Status", "الحالة"), status: true },
  ];
  return <Card className="p-5"><SectionTitle title={t("Bank movements", "حركة البنك")} subtitle={t("Imported bank statement activity", "حركات كشف الحساب المستورد")} /><DataTable columns={columns} rows={compact ? rows.slice(0, 7) : rows} searchKeys={["id", "description", "descriptionAr", "type"]} filename="bank-movements.csv" /></Card>;
}
