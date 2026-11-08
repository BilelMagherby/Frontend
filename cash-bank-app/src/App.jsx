import { Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense } from "react";
import Layout from "./components/layout/Layout";
import DashboardPage from "./pages/DashboardPage";
import CashPage from "./pages/CashPage";
import BankPage from "./pages/BankPage";
import PurchasesPage from "./pages/PurchasesPage";
import AttendancePage from "./pages/AttendancePage";
import TasksPage from "./pages/TasksPage";
import VATPage from "./pages/VATPage";
import OdooPage from "./pages/OdooPage";
import SettingsPage from "./pages/SettingsPage";
import DocumentsPage from "./pages/DocumentsPage";
import TaxReturnReminderPage from "./pages/TaxReturnReminderPage";
import AdjustmentNotesPage from "./pages/AdjustmentNotesPage";

const BankStatementPage = lazy(() => import("./pages/BankStatementPage"));

export default function App() {
  return <Layout><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/cash" element={<CashPage />} />
    <Route path="/bank" element={<BankPage />} />
    <Route path="/bank-statement" element={<Suspense fallback={<div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">Loading bank statement workspace…</div>}><BankStatementPage /></Suspense>} />
    <Route path="/purchases" element={<PurchasesPage />} />
    <Route path="/invoices" element={<DocumentsPage kind="invoice" />} />
    <Route path="/debit-notes" element={<AdjustmentNotesPage kind="debit" />} />
    <Route path="/credit-notes" element={<AdjustmentNotesPage kind="credit" />} />
    <Route path="/attendance" element={<AttendancePage />} />
    <Route path="/tasks" element={<TasksPage />} />
    <Route path="/vat" element={<VATPage />} />
    <Route path="/tax-reminder" element={<TaxReturnReminderPage />} />
    <Route path="/odoo" element={<OdooPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Layout>;
}
