import { useState } from 'react'
import { Plus, Search, Download, Eye, Edit, Phone, Mail, Car, Building2, User, TrendingDown, Filter, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { getCustomers, type Customer } from '@/api/customers'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtLKR(n: number) {
  if (n === 0) return <span style={{ color: 'var(--text-subtle)' }}>—</span>
  const formatted = `LKR ${n.toLocaleString('en-LK')}`
  return formatted
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  ['#D4AF37', '#B8860B'],
  ['#2563EB', '#1D4ED8'],
  ['#7C3AED', '#6D28D9'],
  ['#059669', '#047857'],
  ['#DC2626', '#B91C1C'],
  ['#0891B2', '#0E7490'],
]

function avatarColor(id: number) {
  const c = AVATAR_COLORS[id % AVATAR_COLORS.length]
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`
}

// ── Component ─────────────────────────────────────────────────────────────────
type SortKey = 'name' | 'outstanding' | 'vehicles' | 'lastVisit'

export default function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INDIVIDUAL' | 'BUSINESS'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  })

  // Filter + sort
  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ||
        c.code.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
      const matchType = typeFilter === 'ALL' || c.customerType === typeFilter
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && c.isActive) ||
        (statusFilter === 'INACTIVE' && !c.isActive)
      return matchSearch && matchType && matchStatus
    })
    .sort((a, b) => {
      let av: any, bv: any
      if (sortKey === 'name') { av = a.name; bv = b.name }
      else if (sortKey === 'outstanding') { av = a.outstanding; bv = b.outstanding }
      else if (sortKey === 'vehicles') { av = a.vehicles; bv = b.vehicles }
      else { av = a.code; bv = b.code } // Fallback to code since lastVisit not there yet
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalOutstanding = customers.reduce((s, c) => s + (Number(c.outstanding) || 0), 0)
  const activeCount = customers.filter(c => c.isActive).length

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span style={{ color: 'var(--text-subtle)', fontSize: 10 }}>⇅</span>
    return <span style={{ color: 'var(--color-gold-primary)', fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            {activeCount} active · {customers.length} total customers
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/customers/new')}>
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* ── Summary KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Total Customers', value: customers.length.toString(), sub: `${activeCount} active`, color: false },
          { label: 'Total Outstanding', value: `LKR ${totalOutstanding.toLocaleString()}`, sub: 'Receivable balance', color: true },
          { label: 'Business Accounts', value: customers.filter(c => c.customerType === 'BUSINESS').length.toString(), sub: 'Corporate clients', color: false },
          { label: 'Total Vehicles', value: customers.reduce((s, c) => s + (c.vehicles || 0), 0).toString(), sub: 'Registered vehicles', color: false },
        ].map(k => (
          <div key={k.label} className="kpi-card" style={{ padding: '14px 16px' }}>
            <div className="kpi-card-accent" />
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize: 20, color: k.color ? 'var(--color-danger)' : 'var(--text)' }}>{k.value}</div>
            <div className="kpi-change neutral">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search name, mobile, code, company..."
                className="form-input"
                style={{ height: '34px' }}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            {/* Type filter */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'INDIVIDUAL', 'BUSINESS'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTypeFilter(t); setPage(1) }}
                  className={clsx('btn btn-sm', typeFilter === t ? 'btn-primary' : 'btn-secondary')}
                >
                  {t === 'ALL' ? 'All' : t === 'INDIVIDUAL' ? 'Individual' : 'Business'}
                </button>
              ))}
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={clsx('btn btn-sm', statusFilter === s ? 'btn-primary' : 'btn-secondary')}
                >
                  {s === 'ALL' ? 'All Status' : s}
                </button>
              ))}
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <button className="btn btn-secondary btn-sm">
                <Download size={13} /> Export CSV
              </button>
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
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('name')}>
                  Customer <SortIcon k="name" />
                </button>
              </th>
              <th>Contact</th>
              <th>Type</th>
              <th>City</th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('vehicles')}>
                  Vehicles <SortIcon k="vehicles" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('outstanding')}>
                  Outstanding <SortIcon k="outstanding" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('lastVisit')}>
                  Last Visit <SortIcon k="lastVisit" />
                </button>
              </th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 size={24} className="spinner" style={{ margin: '0 auto', color: 'var(--color-gold-primary)' }} />
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Search size={20} /></div>
                    <div className="empty-state-title">No customers found</div>
                    <div className="empty-state-desc">Try adjusting your search or filter</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(c => (
              <tr
                key={c.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/customers/${c.id}`)}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar avatar-sm" style={{ background: avatarColor(c.id) }}>
                      {initials(c.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{c.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{c.code}</span>
                        {c.companyName && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {c.companyName}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text)' }}>
                      <Phone size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      {c.mobile}
                    </div>
                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
                        <Mail size={11} style={{ flexShrink: 0 }} />
                        {c.email}
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${c.customerType === 'BUSINESS' ? 'badge-gold' : 'badge-open'}`}>
                    {c.customerType === 'BUSINESS'
                      ? <><Building2 size={10} /> Business</>
                      : <><User size={10} /> Individual</>}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.city}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
                    <Car size={13} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 600 }}>{c.vehicles}</span>
                  </div>
                </td>
                <td>
                  {c.outstanding && c.outstanding > 0
                    ? <span style={{ fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace', fontSize: 13 }}>LKR {Number(c.outstanding).toLocaleString()}</span>
                    : <span style={{ color: 'var(--text-subtle)', fontSize: 12 }}>—</span>
                  }
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>N/A</td>
                <td>
                  <span className={`badge ${c.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="View Profile" onClick={() => navigate(`/customers/${c.id}`)}>
                      <Eye size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                      <Edit size={13} />
                    </button>
                  </div>
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
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} customers
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
