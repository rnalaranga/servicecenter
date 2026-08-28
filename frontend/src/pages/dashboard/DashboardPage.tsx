import {
  TrendingUp, TrendingDown, Car, ClipboardList, Users, Package,
  DollarSign, AlertTriangle, Plus, ChevronRight, Circle,
  CheckCircle, Clock, Wrench, ArrowUpRight, ArrowDownRight,
  BarChart2, Loader2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { getDashboardData } from '../../api/dashboard'
import { format } from 'date-fns'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT: 'badge-draft', OPEN: 'badge-open', INSPECTION: 'badge-inspection',
    APPROVED: 'badge-approved', IN_PROGRESS: 'badge-progress',
    WAITING_FOR_PARTS: 'badge-waiting', WAITING_FOR_CUSTOMER: 'badge-waiting',
    COMPLETED: 'badge-completed', DELIVERED: 'badge-delivered', CANCELLED: 'badge-cancelled',
    PAID: 'badge-paid', UNPAID: 'badge-unpaid', PARTIALLY_PAID: 'badge-partial',
  }
  const labels: Record<string, string> = {
    DRAFT: 'Draft', OPEN: 'Open', INSPECTION: 'Inspection',
    APPROVED: 'Approved', IN_PROGRESS: 'In Progress',
    WAITING_FOR_PARTS: 'Waiting Parts', WAITING_FOR_CUSTOMER: 'Waiting Customer',
    COMPLETED: 'Completed', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
    PAID: 'Paid', UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partial',
  }
  return <span className={`badge ${map[status] || 'badge-draft'}`}>{labels[status] || status}</span>
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    LOW: 'badge-low', NORMAL: 'badge-normal', HIGH: 'badge-high', URGENT: 'badge-urgent'
  }
  return <span className={`badge ${map[priority] || 'badge-normal'}`}>{priority}</span>
}

function formatLKR(n: number) {
  return 'LKR ' + n.toLocaleString('en-LK')
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: getDashboardData,
    refetchInterval: 5000
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={32} color="var(--text-muted)" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="page-header">
        <h1 className="page-title text-danger">Failed to load dashboard data</h1>
      </div>
    )
  }

  const {
    kpis,
    salesData,
    jobStatusData,
    serviceRevenueData,
    recentJobs,
    recentInvoices,
    lowStockItems
  } = data

  const todayStr = format(new Date(), 'EEEE, d MMMM yyyy')

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{todayStr} · Good morning, Admin</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/job-cards/new')}>
            <Plus size={13} /> New Job Card
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/invoices/new')}>
            <Plus size={13} /> New Invoice
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        <KpiCard
          label="Today's Sales"
          value={formatLKR(kpis.todaySales)}
          change="Real-time"
          positive={kpis.todaySales > 0}
          neutral={kpis.todaySales === 0}
          icon={<TrendingUp size={22} />}
          accent
        />
        <KpiCard
          label="Open Job Cards"
          value={kpis.openJobCardsCount.toString()}
          change="In shop"
          neutral
          icon={<ClipboardList size={22} />}
        />
        <KpiCard
          label="Customer Outstanding"
          value={formatLKR(kpis.customerOutstanding)}
          change="To be collected"
          neutral
          icon={<DollarSign size={22} />}
        />
        <KpiCard
          label="Vehicles In Shop"
          value={kpis.vehiclesInShopCount.toString()}
          change="Current"
          neutral
          icon={<Car size={22} />}
        />
      </div>

      <div className="grid-4" style={{ marginBottom: '20px' }}>
        <KpiCard 
          label="Today's Payments" 
          value={formatLKR(kpis.todaysPaymentsTotal)} 
          change="Received today" 
          positive={kpis.todaysPaymentsTotal > 0} 
          neutral={kpis.todaysPaymentsTotal === 0}
          icon={<TrendingUp size={22} />} 
        />
        <KpiCard 
          label="Completed Today" 
          value={`${kpis.completedTodayCount} Jobs`} 
          change="Finished" 
          positive={kpis.completedTodayCount > 0} 
          neutral={kpis.completedTodayCount === 0}
          icon={<CheckCircle size={22} />} 
        />
        <KpiCard 
          label="Vendor Outstanding" 
          value={formatLKR(kpis.vendorOutstanding)} 
          change="To pay" 
          neutral 
          icon={<Package size={22} />} 
        />
        <KpiCard 
          label="Low Stock Items" 
          value={`${kpis.lowStockCount} Items`} 
          change="Reorder needed" 
          negative={kpis.lowStockCount > 0} 
          neutral={kpis.lowStockCount === 0}
          icon={<AlertTriangle size={22} />} 
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', marginBottom: '20px' }}>
        {/* Sales Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Weekly Revenue & Cost</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: '#D4AF37' }} />
                Revenue
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--border)' }} />
                Cost
              </div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="sales" stroke="#D4AF37" strokeWidth={2} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="cost" stroke="var(--border)" strokeWidth={1.5} fill="transparent" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job Status Pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Job Card Status</span>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {jobStatusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={jobStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {jobStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {jobStatusData.map(item => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13 }}>
                No active jobs
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Revenue Bar + Recent Jobs */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', marginBottom: '20px' }}>
        {/* Service Revenue */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue by Service</span>
          </div>
          <div className="card-body" style={{ paddingTop: 12 }}>
            {serviceRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={serviceRevenueData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`LKR ${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '220px', color: 'var(--text-muted)', fontSize: 13 }}>
                No revenue data
              </div>
            )}
          </div>
        </div>

        {/* Recent Job Cards */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Job Cards</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/job-cards')} style={{ gap: 4 }}>
              View All <ChevronRight size={13} />
            </button>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Customer · Vehicle</th>
                  <th>Service</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.length > 0 ? recentJobs.map(job => (
                  <tr key={job.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${job.id}`)}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-gold-primary)', fontFamily: 'monospace', fontSize: 12 }}>
                        {job.id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{job.customer}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{job.vehicle}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 160 }} className="truncate">
                      {job.service}
                    </td>
                    <td><PriorityBadge priority={job.priority} /></td>
                    <td><StatusBadge status={job.status} /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{job.time}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No recent job cards
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 320px', gap: '16px' }}>
        {/* Recent Invoices */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Invoices</span>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ gap: 4 }}>
              View All <ChevronRight size={13} />
            </button>
          </div>
          <div className="table-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length > 0 ? recentInvoices.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--color-gold-primary)', fontFamily: 'monospace', fontSize: 12 }}>
                        {inv.id}
                      </span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{inv.date}</div>
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{inv.customer}</td>
                    <td style={{ fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>
                      {formatLKR(inv.amount)}
                    </td>
                    <td><StatusBadge status={inv.status} /></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No recent invoices
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'New Customer', icon: Users, href: '/customers/new', color: '#2563EB' },
                { label: 'New Vehicle', icon: Car, href: '/vehicles/new', color: '#7C3AED' },
                { label: 'New Job Card', icon: ClipboardList, href: '/job-cards/new', color: '#D97706' },
                { label: 'New Invoice', icon: BarChart2, href: '/invoices/new', color: '#D4AF37' },
                { label: 'Add Stock', icon: Package, href: '/stock/adjust', color: '#16A34A' },
                { label: 'Receive Payment', icon: DollarSign, href: '/payments/new', color: '#0891B2' },
              ].map(action => {
                const Icon = action.icon
                return (
                  <button
                    key={action.href}
                    onClick={() => navigate(action.href)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      background: 'var(--hover)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = action.color
                      e.currentTarget.style.background = `${action.color}10`
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = 'var(--border)'
                      e.currentTarget.style.background = 'var(--hover)'
                    }}
                  >
                    <Icon size={15} style={{ color: action.color, flexShrink: 0 }} />
                    {action.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Low Stock Alerts</span>
            <span className="badge badge-urgent">{kpis.lowStockCount}</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {lowStockItems.length > 0 ? lowStockItems.map(item => (
              <div key={item.name} style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'rgba(220,38,38,0.05)',
                border: '1px solid rgba(220,38,38,0.15)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Min: {item.min} {item.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-danger)' }}>
                      {item.stock}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-danger)', fontWeight: 500 }}>
                      {item.unit}
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: 8,
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--border)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min((item.stock / item.min) * 100, 100)}%`,
                    background: 'var(--color-danger)',
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }} />
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)', fontSize: 13 }}>
                All stock levels are optimal
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/stock')} style={{ width: '100%' }}>
              View All Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  change: string
  positive?: boolean
  negative?: boolean
  neutral?: boolean
  icon: React.ReactNode
  accent?: boolean
}

function KpiCard({ label, value, change, positive, negative, neutral, icon, accent }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-accent" style={accent ? {} : { background: 'var(--border)' }} />
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${accent ? 'gold' : ''}`}>{value}</div>
      <div className={`kpi-change ${positive ? 'positive' : negative ? 'negative' : 'neutral'}`}>
        {positive && <ArrowUpRight size={12} />}
        {negative && <ArrowDownRight size={12} />}
        {change}
      </div>
      <div className="kpi-icon" style={{
        background: accent ? 'var(--color-gold-primary)' : 'var(--text-muted)',
      }}>
        {icon}
      </div>
    </div>
  )
}
