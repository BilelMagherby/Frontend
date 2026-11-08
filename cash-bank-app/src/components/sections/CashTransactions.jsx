import { useMemo, useState } from "react";
import { cashTransactions } from "../../data/cashTransactions";
import { useBranchFilter } from "../../hooks/useBranchFilter";
import { useLanguage } from "../../hooks/useLanguage";
import DataTable, { displayBranch } from "../ui/DataTable";
import { Card, SectionTitle, SelectField } from "../ui/Primitives";

export default function CashTransactions({ compact = false }) {
  const baseRows = useBranchFilter(cashTransactions);
  const { t, isArabic } = useLanguage();
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");
  const [category, setCategory] = useState("All");
  const rows = useMemo(() => baseRows.filter((row) => (status === "All" || row.status === status) && (type === "All" || row.type === type) && (category === "All" || row.category === category)), [baseRows, status, type, category]);
  const columns = [
    { key: "id", label: t("Transaction ID", "رقم المعاملة"), emphasis: true },
    { key: "date", label: t("Date", "التاريخ"), sortable: true },
    { key: "branch", label: t("Branch", "الفرع"), render: (row) => displayBranch(row.branch, isArabic) },
    { key: "voucher", label: t("Voucher No.", "رقم السند") },
    { key: "type", label: t("Type", "النوع") },
    { key: "category", label: t("Category", "التصنيف") },
    { key: "description", label: t("Description", "الوصف"), render: (row) => isArabic ? row.descriptionAr : row.description },
    { key: "cashIn", label: t("Cash In", "وارد"), sortable: true, render: (row) => <span className="font-semibold text-emerald-600">{row.cashIn ? `+${row.cashIn.toLocaleString()} SAR` : "—"}</span> },
    { key: "cashOut", label: t("Cash Out", "صادر"), sortable: true, render: (row) => <span className="font-semibold text-rose-600">{row.cashOut ? `-${row.cashOut.toLocaleString()} SAR` : "—"}</span> },
    { key: "balance", label: t("Balance", "الرصيد"), sortable: true, render: (row) => <span className={`font-bold ${row.balance < 0 ? "text-rose-600" : "text-slate-800"}`}>{row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: "status", label: t("Status", "الحالة"), status: true },
    { key: "createdBy", label: t("Created By", "أنشأها") },
  ];
  const sumIn = rows.reduce((sum, row) => sum + row.cashIn, 0);
  const sumOut = rows.reduce((sum, row) => sum + row.cashOut, 0);
  return <Card className="p-5">
    <SectionTitle title={t("Cash transactions", "المعاملات النقدية")} subtitle={t("Track vouchers and branch cash balances", "متابعة السندات والأرصدة النقدية للفروع")} />
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <SelectField label={t("Status", "الحالة")} value={status} onChange={(event) => setStatus(event.target.value)}>{["All", "Submitted", "Approved", "Rejected"].map((value) => <option key={value} value={value}>{t(value, ({ All: "الكل", Submitted: "مرسل", Approved: "معتمد", Rejected: "مرفوض" })[value])}</option>)}</SelectField>
      <SelectField label={t("Transaction type", "نوع المعاملة")} value={type} onChange={(event) => setType(event.target.value)}>{["All", "Cash Withdrawal", "Cash Payment Voucher"].map((value) => <option key={value} value={value}>{value === "All" ? t("All types", "كل الأنواع") : value}</option>)}</SelectField>
      <SelectField label={t("Category", "التصنيف")} value={category} onChange={(event) => setCategory(event.target.value)}>{["All", ...new Set(cashTransactions.map((row) => row.category))].map((value) => <option key={value}>{value === "All" ? t("All categories", "كل التصنيفات") : value}</option>)}</SelectField>
    </div>
    <DataTable columns={columns} rows={compact ? rows.slice(0, 8) : rows} searchKeys={["id", "description", "descriptionAr"]} filename="cash-transactions.csv" highlightNegative summary={<><td className="px-4 py-3" colSpan={7}>{t("TOTAL", "الإجمالي")}</td><td className="px-4 py-3 text-emerald-700">{sumIn.toLocaleString()} SAR</td><td className="px-4 py-3 text-rose-700">{sumOut.toLocaleString()} SAR</td><td className="px-4 py-3">{(sumIn - sumOut).toLocaleString()} SAR</td><td colSpan={3} /></>} />
  </Card>;
}
