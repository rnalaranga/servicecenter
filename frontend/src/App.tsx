import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import CustomersPage from '@/pages/customers/CustomersPage'
import CustomerProfilePage from '@/pages/customers/CustomerProfilePage'
import CustomerFormPage from '@/pages/customers/CustomerFormPage'
import VehiclesPage from '@/pages/vehicles/VehiclesPage'
import VehicleProfilePage from '@/pages/vehicles/VehicleProfilePage'
import VehicleFormPage from '@/pages/vehicles/VehicleFormPage'
import JobCardsPage from '@/pages/job-cards/JobCardsPage'
import JobCardFormPage from '@/pages/job-cards/JobCardFormPage'
import JobCardProfilePage from '@/pages/job-cards/JobCardProfilePage'
import ProductsPage from '@/pages/inventory/ProductsPage'
import ProductFormPage from '@/pages/inventory/ProductFormPage'
import ProductProfilePage from '@/pages/inventory/ProductProfilePage'
import ServicesPage from '@/pages/services/ServicesPage'
import ServiceFormPage from '@/pages/services/ServiceFormPage'
import InvoicesPage from '@/pages/sales/InvoicesPage'
import InvoiceProfilePage from '@/pages/sales/InvoiceProfilePage'
import InvoiceFormPage from '@/pages/sales/InvoiceFormPage'
import PaymentsPage from '@/pages/sales/PaymentsPage'
import PaymentFormPage from '@/pages/sales/PaymentFormPage'
import StockPage from '@/pages/inventory/StockPage'
import StockAdjustmentPage from '@/pages/inventory/StockAdjustmentPage'
import StockMovementsPage from '@/pages/inventory/StockMovementsPage'
import VendorsPage from '@/pages/purchasing/VendorsPage'
import VendorFormPage from '@/pages/purchasing/VendorFormPage'
import VendorProfilePage from '@/pages/purchasing/VendorProfilePage'
import PurchasesPage from '@/pages/purchasing/PurchasesPage'
import PurchaseFormPage from '@/pages/purchasing/PurchaseFormPage'
import PurchaseProfilePage from '@/pages/purchasing/PurchaseProfilePage'
import VendorPaymentsPage from '@/pages/purchasing/VendorPaymentsPage'
import VendorPaymentFormPage from '@/pages/purchasing/VendorPaymentFormPage'
import CustomerLedgerPage from '@/pages/finance/CustomerLedgerPage'
import CustomerStatementPage from '@/pages/finance/CustomerStatementPage'
import VendorLedgerPage from '@/pages/finance/VendorLedgerPage'
import VendorStatementPage from '@/pages/finance/VendorStatementPage'
import ExpensesPage from '@/pages/finance/ExpensesPage'
import ExpenseFormPage from '@/pages/finance/ExpenseFormPage'
import ChartOfAccountsPage from '@/pages/finance/ChartOfAccountsPage'
import JournalEntriesPage from '@/pages/finance/JournalEntriesPage'
import RemindersPage from '@/pages/workshop/RemindersPage'
import SalesReportsPage from '@/pages/reports/SalesReportsPage'
import InventoryReportsPage from '@/pages/reports/InventoryReportsPage'
import ProfitabilityReportsPage from '@/pages/reports/ProfitabilityReportsPage'
import FinancialReportsPage from '@/pages/reports/FinancialReportsPage'
import UsersPage from '@/pages/system/UsersPage'
import AuditLogsPage from '@/pages/system/AuditLogsPage'
import SettingsPage from '@/pages/system/SettingsPage'
import CategoriesSettingsPage from '@/pages/system/CategoriesSettingsPage'
import PlaceholderPage from '@/pages/PlaceholderPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)',
      }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdvisorRestrictedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (user?.role === 'SERVICE_ADVISOR') {
    return <Navigate to="/job-cards" replace />
  }
  return <>{children}</>
}

function DashboardOrAdvisor() {
  const { user } = useAuth()
  if (user?.role === 'SERVICE_ADVISOR') {
    return <Navigate to="/job-cards" replace />
  }
  return <DashboardPage />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        {/* Dashboard */}
        <Route index element={<DashboardOrAdvisor />} />

        {/* Workshop */}
        <Route path="job-cards" element={<JobCardsPage />} />
        <Route path="job-cards/new" element={<JobCardFormPage />} />
        <Route path="job-cards/:id" element={<JobCardProfilePage />} />
        <Route path="job-cards/:id/edit" element={<JobCardFormPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/new" element={<VehicleFormPage />} />
        <Route path="vehicles/:id" element={<VehicleProfilePage />} />
        <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
        <Route path="services" element={<AdvisorRestrictedRoute><ServicesPage /></AdvisorRestrictedRoute>} />
        <Route path="services/new" element={<AdvisorRestrictedRoute><ServiceFormPage /></AdvisorRestrictedRoute>} />
        <Route path="services/:id/edit" element={<AdvisorRestrictedRoute><ServiceFormPage /></AdvisorRestrictedRoute>} />
        <Route path="reminders" element={<RemindersPage />} />

        {/* Sales */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CustomerFormPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="invoices" element={<AdvisorRestrictedRoute><InvoicesPage /></AdvisorRestrictedRoute>} />
        <Route path="invoices/new" element={<AdvisorRestrictedRoute><InvoiceFormPage /></AdvisorRestrictedRoute>} />
        <Route path="invoices/:id" element={<AdvisorRestrictedRoute><InvoiceProfilePage /></AdvisorRestrictedRoute>} />
        <Route path="payments" element={<AdvisorRestrictedRoute><PaymentsPage /></AdvisorRestrictedRoute>} />
        <Route path="payments/new" element={<AdvisorRestrictedRoute><PaymentFormPage /></AdvisorRestrictedRoute>} />

        {/* Inventory */}
        <Route path="products" element={<AdvisorRestrictedRoute><ProductsPage /></AdvisorRestrictedRoute>} />
        <Route path="products/new" element={<AdvisorRestrictedRoute><ProductFormPage /></AdvisorRestrictedRoute>} />
        <Route path="products/:id" element={<AdvisorRestrictedRoute><ProductProfilePage /></AdvisorRestrictedRoute>} />
        <Route path="products/:id/edit" element={<AdvisorRestrictedRoute><ProductFormPage /></AdvisorRestrictedRoute>} />
        <Route path="stock" element={<AdvisorRestrictedRoute><StockPage /></AdvisorRestrictedRoute>} />
        <Route path="stock/adjust" element={<AdvisorRestrictedRoute><StockAdjustmentPage /></AdvisorRestrictedRoute>} />
        <Route path="stock-movements" element={<AdvisorRestrictedRoute><StockMovementsPage /></AdvisorRestrictedRoute>} />

        {/* Purchasing */}
        <Route path="vendors" element={<AdvisorRestrictedRoute><VendorsPage /></AdvisorRestrictedRoute>} />
        <Route path="vendors/new" element={<AdvisorRestrictedRoute><VendorFormPage /></AdvisorRestrictedRoute>} />
        <Route path="vendors/:id" element={<AdvisorRestrictedRoute><VendorProfilePage /></AdvisorRestrictedRoute>} />
        <Route path="vendors/:id/edit" element={<AdvisorRestrictedRoute><VendorFormPage /></AdvisorRestrictedRoute>} />
        <Route path="purchases" element={<AdvisorRestrictedRoute><PurchasesPage /></AdvisorRestrictedRoute>} />
        <Route path="purchases/new" element={<AdvisorRestrictedRoute><PurchaseFormPage /></AdvisorRestrictedRoute>} />
        <Route path="purchases/:id" element={<AdvisorRestrictedRoute><PurchaseProfilePage /></AdvisorRestrictedRoute>} />
        <Route path="vendor-payments" element={<AdvisorRestrictedRoute><VendorPaymentsPage /></AdvisorRestrictedRoute>} />
        <Route path="vendor-payments/new" element={<AdvisorRestrictedRoute><VendorPaymentFormPage /></AdvisorRestrictedRoute>} />

        {/* Finance */}
        <Route path="customer-ledger" element={<AdvisorRestrictedRoute><CustomerLedgerPage /></AdvisorRestrictedRoute>} />
        <Route path="customer-ledger/:id" element={<AdvisorRestrictedRoute><CustomerStatementPage /></AdvisorRestrictedRoute>} />
        <Route path="vendor-ledger" element={<AdvisorRestrictedRoute><VendorLedgerPage /></AdvisorRestrictedRoute>} />
        <Route path="vendor-ledger/:id" element={<AdvisorRestrictedRoute><VendorStatementPage /></AdvisorRestrictedRoute>} />
        <Route path="expenses" element={<AdvisorRestrictedRoute><ExpensesPage /></AdvisorRestrictedRoute>} />
        <Route path="expenses/new" element={<AdvisorRestrictedRoute><ExpenseFormPage /></AdvisorRestrictedRoute>} />
        <Route path="chart-of-accounts" element={<AdvisorRestrictedRoute><ChartOfAccountsPage /></AdvisorRestrictedRoute>} />
        <Route path="journal-entries" element={<AdvisorRestrictedRoute><JournalEntriesPage /></AdvisorRestrictedRoute>} />

        {/* Reports */}
        <Route path="reports/sales" element={<AdvisorRestrictedRoute><SalesReportsPage /></AdvisorRestrictedRoute>} />
        <Route path="reports/inventory" element={<AdvisorRestrictedRoute><InventoryReportsPage /></AdvisorRestrictedRoute>} />
        <Route path="reports/profitability" element={<AdvisorRestrictedRoute><ProfitabilityReportsPage /></AdvisorRestrictedRoute>} />
        <Route path="reports/financial" element={<AdvisorRestrictedRoute><FinancialReportsPage /></AdvisorRestrictedRoute>} />

        {/* System */}
        <Route path="users" element={<AdvisorRestrictedRoute><UsersPage /></AdvisorRestrictedRoute>} />
        <Route path="audit-logs" element={<AdvisorRestrictedRoute><AuditLogsPage /></AdvisorRestrictedRoute>} />
        <Route path="settings" element={<AdvisorRestrictedRoute><SettingsPage /></AdvisorRestrictedRoute>} />
        <Route path="categories" element={<AdvisorRestrictedRoute><CategoriesSettingsPage /></AdvisorRestrictedRoute>} />
        <Route path="profile" element={<PlaceholderPage title="My Profile" />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
