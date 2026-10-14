import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Phone, Mail, MapPin, Building2, User, Car,
  ClipboardList, Receipt, CreditCard, BookOpen, AlertTriangle,
  Plus, Eye, ChevronRight, Clock, CheckCircle, TrendingUp,
  DollarSign, FileText, MoreVertical, Shield, Calendar, Loader2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getCustomerById } from '@/api/customers'
import { getVehiclesByCustomerId } from '@/api/vehicles'

const formatDate = (d?: string | null) => {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-GB')
  } catch {
    return d
  }
}

// ── Status helpers ────────────────────────────────────────────────────────────
function JobStatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    DRAFT: 'badge-draft', OPEN: 'badge-open', IN_PROGRESS: 'badge-progress',
    COMPLETED: 'badge-completed', DELIVERED: 'badge-delivered', CANCELLED: 'badge-cancelled',
    WAITING_FOR_PARTS: 'badge-waiting', INSPECTION: 'badge-inspection', APPROVED: 'badge-approved',
  }
  const labels: Record<string, string> = {
    DRAFT: 'Draft', OPEN: 'Open', IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
    WAITING_FOR_PARTS: 'Waiting Parts', INSPECTION: 'Inspection', APPROVED: 'Approved',
  }
  return <span className={`badge ${map[s] || 'badge-draft'}`}>{labels[s] || s}</span>
}

function InvStatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = { PAID: 'badge-paid', UNPAID: 'badge-unpaid', PARTIALLY_PAID: 'badge-partial', CANCELLED: 'badge-cancelled' }
  const labels: Record<string, string> = { PAID: 'Paid', UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partial', CANCELLED: 'Cancelled' }
  return <span className={`badge ${map[s] || 'badge-draft'}`}>{labels[s] || s}</span>
}

function PriBadge({ p }: { p: string }) {
  const m: Record<string, string> = { LOW: 'badge-low', NORMAL: 'badge-normal', HIGH: 'badge-high', URGENT: 'badge-urgent' }
  return <span className={`badge ${m[p] || 'badge-normal'}`}>{p}</span>
}

function MethodBadge({ m }: { m: string }) {
  const labels: Record<string, string> = { CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank Transfer', CHEQUE: 'Cheque', OTHER: 'Other' }
  return <span className="badge badge-open">{labels[m] || m}</span>
}

function fmtLKR(n: number) { return 'LKR ' + n.toLocaleString('en-LK') }

const AVATAR_COLORS = [
  ['#D4AF37', '#B8860B'], ['#2563EB', '#1D4ED8'],
  ['#7C3AED', '#6D28D9'], ['#059669', '#047857'],
  ['#DC2626', '#B91C1C'], ['#0891B2', '#0E7490'],
]
function avatarColor(id: number) {
  const c = AVATAR_COLORS[id % AVATAR_COLORS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}
function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const FUEL_LABELS: Record<string, string> = { PETROL: 'Petrol', DIESEL: 'Diesel', HYBRID: 'Hybrid', ELECTRIC: 'Electric', OTHER: 'Other' }
const TRANS_LABELS: Record<string, string> = { MANUAL: 'Manual', AUTOMATIC: 'Automatic', CVT: 'CVT', OTHER: 'Other' }

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'vehicles' | 'jobs' | 'invoices' | 'payments' | 'ledger'>('vehicles')

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomerById(id!),
  })

  const { data: customerVehicles } = useQuery({
    queryKey: ['vehicles', 'customer', id],
    queryFn: () => getVehiclesByCustomerId(id!),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-gold-primary)' }} />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-title">Customer not found</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/customers')}>Back to Customers</button>
        </div>
      </div>
    )
  }

  const vehicles: any[] = (customer.vehicles && Array.isArray(customer.vehicles) && customer.vehicles.length > 0) ? customer.vehicles : (customerVehicles || [])
  const jobs: any[] = customer.jobCards || []
  const invoices: any[] = customer.invoices || []
  const payments: any[] = customer.payments || []
  const ledger: any[] = customer.ledger || []

  const tabs = [
    { key: 'vehicles', label: 'Vehicles', icon: Car, count: vehicles.length },
    { key: 'jobs', label: 'Job History', icon: ClipboardList, count: jobs.length },
    { key: 'invoices', label: 'Invoices', icon: Receipt, count: invoices.length },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: payments.length },
    { key: 'ledger', label: 'Ledger', icon: BookOpen, count: null },
  ] as const

  return (
    <div>
      {/* ── Back + Actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customers')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Customers
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/customers/${id}/edit`)}>
          <Edit size={13} /> Edit Customer
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/job-cards/new')}>
          <Plus size={13} /> New Job Card
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Left: Customer Info Card ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Profile */}
          <div className="card">
            <div className="card-body">
              {/* Avatar + name */}
              <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                <div
                  style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: avatarColor(customer.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 800, color: '#fff',
                    margin: '0 auto 12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {initials(customer.name)}
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>{customer.name}</div>
                {customer.companyName && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{customer.companyName}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{customer.code}</span>
                  <span className={`badge ${customer.customerType === 'BUSINESS' ? 'badge-gold' : 'badge-open'}`}>
                    {customer.customerType === 'BUSINESS' ? 'Business' : 'Individual'}
                  </span>
                  <span className={`badge ${customer.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Contact details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <InfoRow icon={<Phone size={13} />} label="Mobile" value={customer.mobile} />
                {customer.secondaryMobile && <InfoRow icon={<Phone size={13} />} label="Alt Mobile" value={customer.secondaryMobile} />}
                {customer.email && <InfoRow icon={<Mail size={13} />} label="Email" value={customer.email} />}
                {customer.address && <InfoRow icon={<MapPin size={13} />} label="Address" value={`${customer.address}, ${customer.city}`} />}
                {customer.nicTaxId && <InfoRow icon={<Shield size={13} />} label="NIC / Tax ID" value={customer.nicTaxId} />}
                <InfoRow icon={<Calendar size={13} />} label="Last Visit" value={customer.lastVisit || 'N/A'} />
                <InfoRow icon={<Calendar size={13} />} label="Member Since" value={customer.createdAt || 'N/A'} />
              </div>

              {customer.notes && (
                <div style={{
                  marginTop: 14, padding: '10px 12px',
                  background: 'var(--hover)', borderRadius: 7,
                  fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                }}>
                  {customer.notes}
                </div>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Financial Summary</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <FinRow label="Total Sales" value={fmtLKR(customer.totalSales || 0)} />
              <FinRow label="Total Paid" value={fmtLKR(customer.totalPaid || 0)} positive />
              <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
              <FinRow
                label="Outstanding Balance"
                value={(customer.outstanding || 0) > 0 ? fmtLKR(customer.outstanding || 0) : '—'}
                danger={(customer.outstanding || 0) > 0}
                bold
              />
              <FinRow label="Credit Limit" value={fmtLKR(Number(customer.creditLimit) || 0)} />
              {(Number(customer.creditLimit) || 0) > 0 && (customer.outstanding || 0) > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span>Credit Used</span>
                    <span>{Math.round(((customer.outstanding || 0) / (Number(customer.creditLimit) || 1)) * 100)}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(((customer.outstanding || 0) / (Number(customer.creditLimit) || 1)) * 100, 100)}%`,
                      background: (customer.outstanding || 0) / (Number(customer.creditLimit) || 1) > 0.8 ? 'var(--color-danger)' : 'var(--color-gold-primary)',
                      borderRadius: 3, transition: 'width 0.4s',
                    }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'New Job Card', icon: ClipboardList, href: '/job-cards/new', color: '#D97706' },
                { label: 'New Invoice', icon: Receipt, href: '/invoices/new', color: '#D4AF37' },
                { label: 'Receive Payment', icon: CreditCard, href: '/payments/new', color: '#059669' },
                { label: 'View Ledger', icon: BookOpen, onClick: () => setActiveTab('ledger'), color: '#2563EB' },
              ].map(a => {
                const Icon = a.icon
                return (
                  <button
                    key={a.label}
                    onClick={() => a.onClick ? a.onClick() : navigate(a.href!)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '9px 12px', borderRadius: 7,
                      background: 'var(--hover)', border: '1px solid var(--border)',
                      cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      color: 'var(--text)', transition: 'all 0.15s', fontFamily: 'inherit',
                    }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `${a.color}12` }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--hover)' }}
                  >
                    <Icon size={14} style={{ color: a.color, flexShrink: 0 }} />
                    {a.label}
                    <ChevronRight size={12} style={{ marginLeft: 'auto', color: 'var(--text-subtle)' }} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ── */}
        <div>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: 0 }}>
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`tab ${activeTab === t.key ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Icon size={13} />
                  {t.label}
                  {t.count !== null && (
                    <span style={{
                      background: activeTab === t.key ? 'var(--color-gold-primary)' : 'var(--hover)',
                      color: activeTab === t.key ? '#0F1115' : 'var(--text-muted)',
                      fontSize: 10, fontWeight: 700, borderRadius: 10,
                      padding: '1px 6px', minWidth: 18, textAlign: 'center',
                    }}>{t.count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div style={{ marginTop: 16 }}>

            {/* ── VEHICLES TAB ── */}
            {activeTab === 'vehicles' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/vehicles/new')}>
                    <Plus size={13} /> Add Vehicle
                  </button>
                </div>
                {vehicles.length === 0 ? (
                  <EmptyState icon={<Car size={22} />} title="No vehicles registered" desc="Add the first vehicle for this customer" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {vehicles.map((v: any) => (
                      <div key={v.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/vehicles/${v.id}`)}>
                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                            {/* Car icon box */}
                            <div style={{
                              width: 44, height: 44, borderRadius: 10,
                              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.08))',
                              border: '1px solid rgba(212,175,55,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <Car size={20} style={{ color: 'var(--color-gold-primary)' }} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                                  {v.make} {v.model}
                                </span>
                                {v.variant && (
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.variant}</span>
                                )}
                                <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                                  {v.registration}
                                </span>
                                <span className={`badge ${v.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                                  {v.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <VehicleStat label="Year" value={v.year || 'N/A'} />
                                <VehicleStat label="Colour" value={v.colour || 'N/A'} />
                                <VehicleStat label="Fuel" value={v.fuelType ? (FUEL_LABELS[v.fuelType] || v.fuelType) : 'N/A'} />
                                <VehicleStat label="Trans" value={v.transmission ? (TRANS_LABELS[v.transmission] || v.transmission) : 'N/A'} />
                                <VehicleStat label="Mileage" value={v.mileage ? `${v.mileage.toLocaleString()} km` : 'N/A'} />
                              </div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{v.jobCount || 0}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>jobs</div>
                              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4 }}>
                                Last: {v.lastService || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── JOB HISTORY TAB ── */}
            {activeTab === 'jobs' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/job-cards/new')}>
                    <Plus size={13} /> New Job Card
                  </button>
                </div>
                {jobs.length === 0 ? (
                  <EmptyState icon={<ClipboardList size={22} />} title="No job cards yet" desc="Create the first job card for this customer" />
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Job #</th>
                          <th>Date</th>
                          <th>Vehicle</th>
                          <th>Services</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Revenue</th>
                          <th>Profit</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobs.map((j: any) => {
                          const vehText = j.vehicle ? `${j.vehicle.make || ''} ${j.vehicle.model || ''} · ${j.vehicle.registration || ''}` : '—'
                          const total = Number(j.totalAmount ?? j.total ?? 0)
                          const cost = Number(j.totalCost ?? j.cost ?? 0)
                          return (
                          <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${j.id}`)}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{j.jobNumber || j.id}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(j.date)}</td>
                            <td style={{ fontSize: 12 }}>{vehText}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }} className="truncate">{j.notes || j.services || 'Service Job'}</td>
                            <td><PriBadge p={j.priority || 'NORMAL'} /></td>
                            <td><JobStatusBadge s={j.status} /></td>
                            <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{fmtLKR(total)}</td>
                            <td>
                              {j.status === 'DELIVERED' ? (
                                <span style={{ fontWeight: 600, color: 'var(--color-success)', fontFamily: 'monospace', fontSize: 12 }}>
                                  {fmtLKR(total - cost)}
                                </span>
                              ) : <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>}
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); navigate(`/job-cards/${j.id}`) }}>
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--hover)' }}>
                          <td colSpan={6} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', paddingLeft: 14 }}>Total ({jobs.length} jobs)</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{fmtLKR(jobs.reduce((s: number, j: any) => s + Number(j.totalAmount ?? j.total ?? 0), 0))}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-success)' }}>
                            {fmtLKR(jobs.filter((j: any) => j.status === 'DELIVERED').reduce((s: number, j: any) => s + (Number(j.totalAmount ?? j.total ?? 0) - Number(j.totalCost ?? j.cost ?? 0)), 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── INVOICES TAB ── */}
            {activeTab === 'invoices' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/invoices/new')}>
                    <Plus size={13} /> New Invoice
                  </button>
                </div>
                {invoices.length === 0 ? (
                  <EmptyState icon={<Receipt size={22} />} title="No invoices yet" desc="Invoices will appear here after job completion" />
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Date</th>
                          <th>Job Card</th>
                          <th>Due Date</th>
                          <th>Total</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Status</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv: any) => {
                          const invTotal = Number(inv.total || 0)
                          const invPaid = Number(inv.amountPaid ?? inv.paid ?? 0)
                          const invBal = Number(inv.balance ?? (invTotal - invPaid))
                          const jcRef = inv.jobCards?.map((jc: any) => jc.jobCard?.jobNumber || `JC-${jc.jobCardId}`).join(', ') || '—'
                          return (
                          <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{inv.invoiceNumber || inv.id}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(inv.date)}</td>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{jcRef}</span></td>
                            <td style={{ fontSize: 12, color: inv.status === 'UNPAID' ? 'var(--color-danger)' : 'var(--text-muted)' }}>{formatDate(inv.dueDate)}</td>
                            <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{fmtLKR(invTotal)}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-success)' }}>{fmtLKR(invPaid)}</td>
                            <td>
                              {invBal > 0
                                ? <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: 'var(--color-danger)' }}>{fmtLKR(invBal)}</span>
                                : <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>
                              }
                            </td>
                            <td><InvStatusBadge s={inv.status} /></td>
                            <td>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); navigate(`/invoices/${inv.id}`) }}>
                                <Eye size={13} />
                              </button>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--hover)' }}>
                          <td colSpan={4} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', paddingLeft: 14 }}>Total ({invoices.length} invoices)</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>{fmtLKR(invoices.reduce((s: number, i: any) => s + Number(i.total || 0), 0))}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-success)' }}>{fmtLKR(invoices.reduce((s: number, i: any) => s + Number(i.amountPaid ?? i.paid ?? 0), 0))}</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-danger)' }}>
                            {fmtLKR(invoices.reduce((s: number, i: any) => s + Number(i.balance ?? (Number(i.total || 0) - Number(i.amountPaid ?? i.paid ?? 0))), 0))}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PAYMENTS TAB ── */}
            {activeTab === 'payments' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/payments/new')}>
                    <Plus size={13} /> Receive Payment
                  </button>
                </div>
                {payments.length === 0 ? (
                  <EmptyState icon={<CreditCard size={22} />} title="No payments recorded" desc="Payment receipts will appear here" />
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Receipt #</th>
                          <th>Date</th>
                          <th>Invoice</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Amount</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p: any) => {
                          const pAmount = Number(p.amount || 0)
                          const invRef = p.invoice?.invoiceNumber || (p.invoiceId ? `INV-${p.invoiceId}` : '—')
                          return (
                          <tr key={p.id}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{p.paymentNumber || p.id}</span></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.date)}</td>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{invRef}</span></td>
                            <td><MethodBadge m={p.method} /></td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                            <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-success)' }}>{fmtLKR(pAmount)}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.notes || '—'}</td>
                          </tr>
                        )})}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--hover)' }}>
                          <td colSpan={5} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', paddingLeft: 14 }}>Total Received</td>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 13, color: 'var(--color-success)' }}>{fmtLKR(payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0))}</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── LEDGER TAB ── */}
            {activeTab === 'ledger' && (
              <div>
                {/* Ledger Summary Bar */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10,
                  marginBottom: 14,
                }}>
                  <div className="card" style={{ padding: '12px 16px', borderLeft: '3px solid var(--color-danger)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Total Debits</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                      {fmtLKR(ledger.reduce((s: number, l: any) => s + Number(l.debit || 0), 0))}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '12px 16px', borderLeft: '3px solid var(--color-success)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Total Credits</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-success)' }}>
                      {fmtLKR(ledger.reduce((s: number, l: any) => s + Number(l.credit || 0), 0))}
                    </div>
                  </div>
                  <div className="card" style={{ padding: '12px 16px', borderLeft: `3px solid ${(Number(customer.outstanding || 0)) > 0 ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Current Balance</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: (Number(customer.outstanding || 0)) > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {(Number(customer.outstanding || 0)) > 0 ? fmtLKR(customer.outstanding || 0) : 'Nil'}
                    </div>
                  </div>
                </div>

                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Reference</th>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Debit (Dr)</th>
                        <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                        <th style={{ textAlign: 'right' }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((l: any) => {
                        const dr = Number(l.debit || 0)
                        const cr = Number(l.credit || 0)
                        const bal = Number(l.balance || 0)
                        return (
                        <tr key={l.id}>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(l.date)}</td>
                          <td>
                            <span className={`badge ${l.type === 'INVOICE' ? 'badge-open' : l.type === 'PAYMENT' ? 'badge-paid' : 'badge-draft'}`}>
                              {l.type === 'INVOICE' ? 'Invoice' : l.type === 'PAYMENT' ? 'Payment' : l.type === 'OPENING_BALANCE' ? 'Opening Bal' : l.type}
                            </span>
                          </td>
                          <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{l.refNumber || l.ref || '—'}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.description || '—'}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: dr > 0 ? 'var(--color-danger)' : 'var(--text-subtle)' }}>
                            {dr > 0 ? fmtLKR(dr) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: cr > 0 ? 'var(--color-success)' : 'var(--text-subtle)' }}>
                            {cr > 0 ? fmtLKR(cr) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: bal > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                            {bal === 0 ? 'Nil' : fmtLKR(bal)}
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                  <div style={{
                    padding: '10px 16px', borderTop: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'flex-end',
                  }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                      <FileText size={13} /> Print Statement
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--text-muted)', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  )
}

function FinRow({ label, value, positive, danger, bold }: { label: string; value: string; positive?: boolean; danger?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{
        fontSize: bold ? 13 : 12, fontWeight: bold ? 700 : 500,
        fontFamily: 'monospace',
        color: danger ? 'var(--color-danger)' : positive ? 'var(--color-success)' : 'var(--text)',
      }}>{value}</span>
    </div>
  )
}

function VehicleStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-icon">{icon}</div>
        <div className="empty-state-title">{title}</div>
        <div className="empty-state-desc">{desc}</div>
      </div>
    </div>
  )
}
