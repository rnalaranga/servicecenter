import { useState, useMemo } from 'react'
import { Plus, Search, Download, Eye, Edit, Car, Gauge, Droplet, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { getVehicles, type Vehicle } from '@/api/vehicles'

// ── Helpers ───────────────────────────────────────────────────────────────────
type SortKey = 'registration' | 'make' | 'customer' | 'jobCount' | 'lastService'
const FUEL_LABELS: Record<string, string> = { PETROL: 'Petrol', DIESEL: 'Diesel', HYBRID: 'Hybrid', ELECTRIC: 'Electric', OTHER: 'Other' }

export default function VehiclesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [makeFilter, setMakeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('lastService')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  // Unique makes for filter
  const uniqueMakes = useMemo(() => {
    return Array.from(new Set(vehicles.map(v => v.make))).sort()
  }, [vehicles])

  // Filter + sort
  const filtered = vehicles
    .filter(v => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        v.registration.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.customerName || "").toLowerCase().includes(q)
      const matchMake = makeFilter === 'ALL' || v.make === makeFilter
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && v.isActive) ||
        (statusFilter === 'INACTIVE' && !v.isActive)
      return matchSearch && matchMake && matchStatus
    })
    .sort((a, b) => {
      let av: any, bv: any
      if (sortKey === 'registration') { av = a.registration; bv = b.registration }
      else if (sortKey === 'make') { av = a.make; bv = b.make }
      else if (sortKey === 'customer') { av = a.customerName || ''; bv = b.customerName || '' }
      else if (sortKey === 'jobCount') { av = a.jobCount || 0; bv = b.jobCount || 0 }
      else { av = a.code; bv = b.code }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
          <h1 className="page-title">Vehicles</h1>
          <p className="page-subtitle">
            {vehicles.filter(v => v.isActive).length} active · {vehicles.length} total vehicles
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/vehicles/new')}>
          <Plus size={15} /> Add Vehicle
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search */}
            <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search reg no, make, model, customer..."
                className="form-input"
                style={{ height: '34px' }}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            {/* Make filter */}
            <select
              className="form-input"
              style={{ height: '34px', width: 140 }}
              value={makeFilter}
              onChange={e => { setMakeFilter(e.target.value); setPage(1) }}
            >
              <option value="ALL">All Makes</option>
              {uniqueMakes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

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
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('registration')}>
                  Registration <SortIcon k="registration" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('make')}>
                  Vehicle <SortIcon k="make" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('customer')}>
                  Customer <SortIcon k="customer" />
                </button>
              </th>
              <th>Specs</th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('jobCount')}>
                  Jobs <SortIcon k="jobCount" />
                </button>
              </th>
              <th>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'inherit' }} onClick={() => toggleSort('lastService')}>
                  Last Service <SortIcon k="lastService" />
                </button>
              </th>
              <th>Status</th>
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
                    <div className="empty-state-icon"><Car size={20} /></div>
                    <div className="empty-state-title">No vehicles found</div>
                    <div className="empty-state-desc">Try adjusting your search or filter</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(v => (
              <tr
                key={v.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/vehicles/${v.id}`)}
              >
                <td>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 12 }}>
                    {v.registration}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.08))',
                      border: '1px solid rgba(212,175,55,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Car size={16} style={{ color: 'var(--color-gold-primary)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{v.make} {v.model}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.year}</span>
                        {v.variant && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>· {v.variant}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div
                    style={{ fontSize: 13, color: 'var(--color-gold-primary)', fontWeight: 600, cursor: 'pointer' }}
                    onClick={e => { e.stopPropagation(); navigate(`/customers/${v.customerId}`) }}
                  >
                    {v.customerName}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 160 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                      <Droplet size={10} /> {v.colour || 'N/A'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                      <Gauge size={10} /> {v.fuelType ? (FUEL_LABELS[v.fuelType] || v.fuelType) : 'N/A'}
                    </span>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{v.jobCount || 0}</span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.lastService || 'N/A'}</td>
                <td>
                  <span className={`badge ${v.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="View Profile" onClick={() => navigate(`/vehicles/${v.id}`)}>
                      <Eye size={13} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => navigate(`/vehicles/${v.id}/edit`)}>
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
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} vehicles
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
