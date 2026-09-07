import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/api/system'
import {
  LayoutDashboard, Car, ClipboardList, Wrench, Package, Warehouse,
  Users, ShoppingCart, Receipt, CreditCard, BookOpen, DollarSign,
  BarChart2, Settings, Shield, Bell, ChevronRight,
  Layers, TrendingUp, FileText, Building2, Truck,
  AlertCircle
} from 'lucide-react'
import clsx from 'clsx'

interface NavGroup {
  label: string
  items: NavItem[]
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  badge?: number
}

const navGroups: NavGroup[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Workshop',
    items: [
      { label: 'Job Cards', href: '/job-cards', icon: ClipboardList, badge: 5 },
      { label: 'Vehicles', href: '/vehicles', icon: Car },
      { label: 'Services', href: '/services', icon: Wrench },
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', href: '/customers', icon: Users },
      { label: 'Invoices', href: '/invoices', icon: Receipt },
      { label: 'Payments', href: '/payments', icon: CreditCard },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', href: '/products', icon: Package },
      { label: 'Stock', href: '/stock', icon: Warehouse },
      { label: 'Stock Movements', href: '/stock-movements', icon: Layers },
    ]
  },
  {
    label: 'Purchases',
    items: [
      { label: 'Vendors', href: '/vendors', icon: Building2 },
      { label: 'Purchases', href: '/purchases', icon: Truck },
      { label: 'Vendor Payments', href: '/vendor-payments', icon: CreditCard },
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Customer Ledger', href: '/customer-ledger', icon: BookOpen },
      { label: 'Vendor Ledger', href: '/vendor-ledger', icon: BookOpen },
      { label: 'Expenses', href: '/expenses', icon: DollarSign },
    ]
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales Reports', href: '/reports/sales', icon: BarChart2 },
      { label: 'Inventory Reports', href: '/reports/inventory', icon: Package },
      { label: 'Profitability', href: '/reports/profitability', icon: TrendingUp },
      { label: 'Financial', href: '/reports/financial', icon: DollarSign },
    ]
  },
  {
    label: 'System',
    items: [
      { label: 'Users & Roles', href: '/users', icon: Shield },
      { label: 'Audit Logs', href: '/audit-logs', icon: FileText },
      { label: 'Settings', href: '/settings', icon: Settings },
      { label: 'Categories', href: '/categories', icon: Layers },
    ]
  }
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  
  const { data: settings } = useQuery({ 
    queryKey: ['settings'], 
    queryFn: getSettings 
  })
  
  const companyName = settings?.companyName || 'Golden Auto Detail'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={clsx('sidebar', isOpen && 'open')}>
        {/* Logo */}
        <div className="sidebar-logo" style={{ padding: '16px 20px', minHeight: 64, display: 'flex', alignItems: 'center' }}>
          {settings?.logoDark ? (
            <img src={settings.logoDark} alt="Logo" style={{ height: 40, width: '100%', objectFit: 'contain', objectPosition: 'left center' }} />
          ) : (
            <>
              <div className="sidebar-logo-icon">{companyName.charAt(0).toUpperCase()}</div>
              <div className="sidebar-logo-text">
                <span className="sidebar-logo-name">{companyName}</span>
                <span className="sidebar-logo-sub">ERP System</span>
              </div>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navGroups.map((group, gi) => (
            <div key={gi} className="nav-section">
              {group.label && (
                <div className="nav-section-label">{group.label}</div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/'
                  ? location.pathname === '/'
                  : (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`))

                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    className={clsx('nav-item', isActive && 'active')}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose()
                    }}
                  >
                    <Icon size={16} className="nav-icon" />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{
            fontSize: '11px',
            color: 'var(--sidebar-muted)',
            textAlign: 'center',
            letterSpacing: '0.03em'
          }}>
            v1.0.0 · {companyName} ERP
          </div>
        </div>
      </aside>
    </>
  )
}
