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
        <Route index element={<DashboardPage />} />

        {/* Workshop */}
        <Route path="job-cards" element={<JobCardsPage />} />
        <Route path="job-cards/new" element={<JobCardFormPage />} />
        <Route path="job-cards/:id" element={<JobCardProfilePage />} />
        <Route path="job-cards/:id/edit" element={<JobCardFormPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/new" element={<VehicleFormPage />} />
        <Route path="vehicles/:id" element={<VehicleProfilePage />} />
        <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/new" element={<ServiceFormPage />} />
        <Route path="services/:id/edit" element={<ServiceFormPage />} />

        {/* Sales */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CustomerFormPage />} />
        <Route path="customers/:id" element={<CustomerProfilePage />} />
        <Route path="customers/:id/edit" element={<CustomerFormPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<InvoiceFormPage />} />
        <Route path="invoices/:id" element={<InvoiceProfilePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="payments/new" element={<PaymentFormPage />} />

        {/* Inventory */}
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id" element={<ProductProfilePage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="stock/adjust" element={<StockAdjustmentPage />} />
        <Route path="stock-movements" element={<StockMovementsPage />} />

        {/* Purchasing */}
        <Route path="vendors" element={<VendorsPage />} />
        <Route path="vendors/new" element={<VendorFormPage />} />
        <Route path="vendors/:id" element={<VendorProfilePage />} />
        <Route path="vendors/:id/edit" element={<VendorFormPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<PurchaseFormPage />} />
        <Route path="purchases/:id" element={<PurchaseProfilePage />} />
        <Route path="vendor-payments" element={<VendorPaymentsPage />} />
        <Route path="vendor-payments/new" element={<VendorPaymentFormPage />} />

        {/* Finance */}
        <Route path="customer-ledger" element={<CustomerLedgerPage />} />
        <Route path="customer-ledger/:id" element={<CustomerStatementPage />} />
        <Route path="vendor-ledger" element={<VendorLedgerPage />} />
        <Route path="vendor-ledger/:id" element={<VendorStatementPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="expenses/new" element={<ExpenseFormPage />} />

        {/* Reports */}
        <Route path="reports/sales" element={<SalesReportsPage />} />
        <Route path="reports/inventory" element={<InventoryReportsPage />} />
        <Route path="reports/profitability" element={<ProfitabilityReportsPage />} />
        <Route path="reports/financial" element={<FinancialReportsPage />} />

        {/* System */}
        <Route path="users" element={<UsersPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="categories" element={<CategoriesSettingsPage />} />
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
