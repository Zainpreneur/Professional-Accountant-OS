import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppShell } from "@/components/layout/AppShell";
import { ClientShell } from "@/components/layout/ClientShell";
import { LandingPage } from "@/routes/LandingPage";
import { LoginPage } from "@/routes/LoginPage";
import { RegisterPage } from "@/routes/RegisterPage";
import { DashboardPage } from "@/routes/DashboardPage";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { ClientOverviewPage } from "@/routes/client/ClientOverviewPage";
import AccountsPage from "@/routes/client/AccountsPage";
import AiAgentsPage from "@/routes/client/AiAgentsPage";
import BankingPage from "@/routes/client/BankingPage";
import BillsPage from "@/routes/client/BillsPage";
import CompliancePage from "@/routes/client/CompliancePage";
import CustomersPage from "@/routes/client/CustomersPage";
import EmployeesPage from "@/routes/client/EmployeesPage";
import EngagementsPage from "@/routes/client/EngagementsPage";
import EngagementDetailPage from "@/routes/client/EngagementDetailPage";
import ExpensesPage from "@/routes/client/ExpensesPage";
import FixedAssetsPage from "@/routes/client/FixedAssetsPage";
import InventoryPage from "@/routes/client/InventoryPage";
import InvoicesPage from "@/routes/client/InvoicesPage";
import JournalsPage from "@/routes/client/JournalsPage";
import JudgmentPage from "@/routes/client/JudgmentPage";
import PayrollPage from "@/routes/client/PayrollPage";
import ReportsPage from "@/routes/client/ReportsPage";
import SuppliersPage from "@/routes/client/SuppliersPage";
import VatPage from "@/routes/client/VatPage";
import WhtPage from "@/routes/client/WhtPage";
import ZakatPage from "@/routes/client/ZakatPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<AppShell />}>
          <Route index element={<DashboardPage />} />

          <Route path="clients/:clientId" element={<ClientShell />}>
            <Route index element={<ClientOverviewPage />} />
            <Route path="accounts" element={<AccountsPage />} />
            <Route path="ai-agents" element={<AiAgentsPage />} />
            <Route path="banking" element={<BankingPage />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="engagements" element={<EngagementsPage />} />
            <Route path="engagements/:engagementId" element={<EngagementDetailPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="fixed-assets" element={<FixedAssetsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="journals" element={<JournalsPage />} />
            <Route path="judgment" element={<JudgmentPage />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="vat" element={<VatPage />} />
            <Route path="wht" element={<WhtPage />} />
            <Route path="zakat" element={<ZakatPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
