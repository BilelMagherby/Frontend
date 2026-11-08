import KPISummary from "../components/sections/KPISummary";
import MonthlySummaryChart from "../components/sections/MonthlySummaryChart";
import CashTransactions from "../components/sections/CashTransactions";
import BankMovements from "../components/sections/BankMovements";
import PurchaseRegister from "../components/sections/PurchaseRegister";
import AttendanceKPIs from "../components/sections/AttendanceKPIs";
import TasksKPIs from "../components/sections/TasksKPIs";
import ApprovalQueue from "../components/sections/ApprovalQueue";
import OdooExportStatus from "../components/sections/OdooExportStatus";
import NotificationsPanel from "../components/sections/NotificationsPanel";
import BranchBreakdown from "../components/sections/BranchBreakdown";
import AuditLog from "../components/sections/AuditLog";
import TaxReturnReminder from "../components/sections/TaxReturnReminder";

export default function DashboardPage() {
  return <div className="space-y-6">
    <KPISummary />
    <TaxReturnReminder />
    <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]"><MonthlySummaryChart /><BranchBreakdown /></div>
    <div className="grid gap-5 xl:grid-cols-2"><ApprovalQueue /><AttendanceKPIs /><TasksKPIs /></div>
    <div className="grid gap-5 xl:grid-cols-2"><NotificationsPanel /><OdooExportStatus /></div>
    <CashTransactions compact />
    <BankMovements compact />
    <PurchaseRegister compact />
    <AuditLog />
  </div>;
}
