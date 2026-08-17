import { useState } from 'react'
import { Plus, Search, Eye, Filter, Loader2, ClipboardList, Clock, AlertTriangle, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { getJobCards, type JobCard } from '@/api/jobcards'
import { format, parseISO } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtLKR(n: number) {
  if (!n) return <span style={{ color: 'var(--text-subtle)' }}>—</span>
  return `LKR ${Number(n).toLocaleString('en-LK')}`
}

type SortKey = 'date' | 'jobNumber' | 'customer' | 'status' | 'total'

export default function JobCardsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: jobCards = [], isLoading } = useQuery({
    queryKey: ['jobcards'],
    queryFn: () => getJobCards()
  })

  // Filter + sort
  const filtered = jobCards
    .filter(j => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        j.jobNumber.toLowerCase().includes(q) ||
        j.customer?.name.toLowerCase().includes(q) ||
        j.vehicle?.registration.toLowerCase().includes(q) ||
        (j.complaint && j.complaint.toLowerCase().includes(q))
      
      const matchStatus = statusFilter === 'ALL' || j.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      let av: any, bv: any
      if (sortKey === 'date') { av = a.date; bv = b.date }
      else if (sortKey === 'jobNumber') { av = a.jobNumber; bv = b.jobNumber }
      else if (sortKey === 'customer') { av = a.customer?.name || ''; bv = b.customer?.name || '' }
      else if (sortKey === 'status') { av = a.status; bv = b.status }
      else { av = a.total; bv = b.total }
      
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeCount = jobCards.filter(j => ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'INSPECTION'].includes(j.status)).length

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir(key === 'date' ? 'desc' : 'asc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ color: 'var(--text-subtle)', fontSize: 10 }}>⇅</span>
    return <span style={{ color: 'var(--color-gold-primary)', fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

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

  function PriBadge({ p }: { p: string }) {
    const m: Record<string, string> = { LOW: 'badge-low', NORMAL: 'badge-normal', HIGH: 'badge-high', URGENT: 'badge-urgent' }
    return <span className={`badge ${m[p] || 'badge-normal'}`}>{p}</span>
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Job Cards</h1>
          <p className="page-subtitle">
            {activeCount} active jobs · {jobCards.length} total records
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/job-cards/new')}>
          <Plus size={15} /> New Job Card
        </button>
      </div>

      {/* ── Summary KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Active Jobs', value: activeCount.toString(), sub: 'In workshop', color: false, icon: Clock },
          { label: 'Completed Today', value: jobCards.filter(j => j.status === 'COMPLETED' && new Date(j.updatedAt).toDateString() === new Date().toDateString()).length.toString(), sub: 'Ready for delivery', color: false, icon: FileText },
          { label: 'High Priority', value: jobCards.filter(j => (j.priority === 'HIGH' || j.priority === 'URGENT') && ['OPEN', 'IN_PROGRESS'].includes(j.status)).length.toString(), sub: 'Requires attention', color: true, icon: AlertTriangle },
          { label: 'Total Value (Active)', value: fmtLKR(jobCards.filter(j => ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'INSPECTION'].includes(j.status)).reduce((s, j) => s + Number(j.total), 0)), sub: 'WIP Revenue', color: false, icon: ClipboardList },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.label} className="kpi-card" style={{ padding: '14px 16px' }}>
              <div className="kpi-card-accent" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="kpi-label">{k.label}</div>
                <Icon size={14} style={{ color: k.color ? 'var(--color-danger)' : 'var(--text-muted)' }} />
              </div>
              <div className="kpi-value" style={{ fontSize: 20, color: k.color ? 'var(--color-danger)' : 'var(--text)' }}>{k.value}</div>
              <div className="kpi-change neutral">{k.sub}</div>
            </div>
          )
        })}
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search job number, customer, vehicle..."
                className="form-input"
                style={{ height: '34px' }}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={clsx('btn btn-sm', statusFilter === s ? 'btn-primary' : 'btn-secondary')}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('jobNumber')}>
                  Job Number <SortIcon k="jobNumber" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('date')}>
                  Date <SortIcon k="date" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('customer')}>
                  Customer & Vehicle <SortIcon k="customer" />
                </button>
              </th>
              <th>Complaint / Note</th>
              <th>Priority</th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('status')}>
                  Status <SortIcon k="status" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('total')}>
                  Value <SortIcon k="total" />
                </button>
              </th>
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
                    <div className="empty-state-icon"><ClipboardList size={20} /></div>
                    <div className="empty-state-title">No job cards found</div>
                    <div className="empty-state-desc">Try adjusting your search or filter</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(j => (
              <tr
                key={j.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/job-cards/${j.id}`)}
              >
                <td>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 12 }}>
                    {j.jobNumber}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {format(parseISO(j.date), 'MMM dd, yyyy')}
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{j.customer?.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>{j.vehicle?.registration}</span>
                      <span>· {j.vehicle?.make} {j.vehicle?.model}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="truncate" style={{ maxWidth: 200, fontSize: 12, color: 'var(--text-muted)' }}>
                    {j.complaint || '—'}
                  </div>
                </td>
                <td><PriBadge p={j.priority} /></td>
                <td><JobStatusBadge s={j.status} /></td>
                <td>
                  <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 13, color: 'var(--text)' }}>
                    {fmtLKR(j.total)}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" title="View Details" onClick={() => navigate(`/job-cards/${j.id}`)}>
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderTop: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} jobs
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
