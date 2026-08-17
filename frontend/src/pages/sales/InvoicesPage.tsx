import { useState } from 'react'
import { Search, Eye, Loader2, FileText, DollarSign, AlertCircle, TrendingUp, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getInvoices } from '@/api/invoices'
import { format, parseISO } from 'date-fns'

function fmtLKR(n: number) {
  return `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    UNPAID: 'badge-draft',
    PARTIAL: 'badge-progress',
    PAID: 'badge-completed',
  }
  return <span className={`badge ${map[s] || 'badge-normal'}`}>{s}</span>
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: getInvoices
  })

  const filtered = invoices.filter(i => {
    const q = search.toLowerCase().trim()
    const matchSearch = !q || i.invoiceNumber.toLowerCase().includes(q) || i.customer?.name.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'ALL' || i.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalReceivables = invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.balance), 0)
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.amountPaid), 0)
  const unpaidCount = invoices.filter(i => i.status === 'UNPAID').length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices & Billing</h1>
          <p className="page-subtitle">
            Manage customer invoices, payments, and receivables
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
          <Plus size={15} /> New Invoice
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Total Invoices</div>
            <FileText size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{invoices.length}</div>
          <div className="kpi-change neutral">All time</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Total Revenue</div>
            <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-success)', fontSize: 20 }}>
            {fmtLKR(totalRevenue)}
          </div>
          <div className="kpi-change neutral">Collected payments</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Total Receivables</div>
            <DollarSign size={14} style={{ color: 'var(--color-gold-primary)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-gold-primary)', fontSize: 20 }}>
            {fmtLKR(totalReceivables)}
          </div>
          <div className="kpi-change neutral">Outstanding balances</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Unpaid Invoices</div>
            <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-danger)' }}>{unpaidCount}</div>
          <div className="kpi-change neutral">Requires attention</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search invoices by number or customer..."
                className="form-input"
                style={{ height: '34px' }}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            <select 
              className="form-input" 
              style={{ width: 160, height: 34, appearance: 'auto' }}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="ALL">All Status</option>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th style={{ textAlign: 'right' }}>Total (LKR)</th>
              <th style={{ textAlign: 'right' }}>Paid (LKR)</th>
              <th style={{ textAlign: 'right' }}>Balance (LKR)</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 size={24} className="spinner" style={{ margin: '0 auto', color: 'var(--color-gold-primary)' }} />
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><FileText size={20} /></div>
                    <div className="empty-state-title">No invoices found</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(inv => (
              <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 12 }}>
                    {inv.invoiceNumber}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {format(parseISO(inv.date), 'MMM dd, yyyy')}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{inv.customer?.name}</div>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                  {Number(inv.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>
                  {Number(inv.amountPaid).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: Number(inv.balance) > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                  {Number(inv.balance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <StatusBadge s={inv.status} />
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/invoices/${inv.id}`)}>
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} invoices
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`btn btn-sm ${page === p ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="btn btn-secondary btn-sm" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
