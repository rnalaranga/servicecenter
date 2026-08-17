import { useState } from 'react'
import { Plus, Search, Eye, Loader2, Sparkles, AlertTriangle, Layers, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getServices, getServiceCategories } from '@/api/services'

function fmtLKR(n: number) {
  return `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
}

export default function ServicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: getServices
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['service_categories'],
    queryFn: getServiceCategories
  })

  const filtered = services.filter(s => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q)
    
    const matchCat = catFilter === 'ALL' || String(s.categoryId) === catFilter
    return matchSearch && matchCat
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const highMarginCount = services.filter(s => s.sellingPrice > 0 && ((s.sellingPrice - s.estimatedCost) / s.sellingPrice) >= 0.7).length
  const avgDuration = services.length ? Math.round(services.reduce((acc, s) => acc + (s.estimatedDuration || 0), 0) / services.length) : 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Master</h1>
          <p className="page-subtitle">
            {services.length} services · {categories.length} categories
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/services/new')}>
          <Plus size={15} /> Add Service
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Total Services</div>
            <Sparkles size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{services.length}</div>
          <div className="kpi-change neutral">Active in catalog</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Categories</div>
            <Layers size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{categories.length}</div>
          <div className="kpi-change neutral">Service groups</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">High Margin Services</div>
            <AlertTriangle size={14} style={{ color: 'var(--color-success)' }} />
          </div>
          <div className="kpi-value" style={{ color: 'var(--color-success)' }}>{highMarginCount}</div>
          <div className="kpi-change neutral">&ge; 70% Gross Margin</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Avg. Service Time</div>
            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{avgDuration} min</div>
          <div className="kpi-change neutral">Estimated duration</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search services by code or name..."
                className="form-input"
                style={{ height: '34px' }}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>

            <select 
              className="form-input" 
              style={{ width: 200, height: 34, appearance: 'auto' }}
              value={catFilter}
              onChange={e => { setCatFilter(e.target.value); setPage(1) }}
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Service Code</th>
              <th>Service Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Selling Price</th>
              <th style={{ textAlign: 'right' }}>Est. Cost</th>
              <th style={{ textAlign: 'center' }}>Duration</th>
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
                    <div className="empty-state-icon"><Sparkles size={20} /></div>
                    <div className="empty-state-title">No services found</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(s => (
              <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/services/${s.id}/edit`)}>
                <td>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 12 }}>
                    {s.code}
                  </span>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{s.name}</div>
                  {s.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200 }} className="truncate">
                      {s.description}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {s.category?.name || '—'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                  {fmtLKR(s.sellingPrice)}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>
                  {fmtLKR(s.estimatedCost)}
                </td>
                <td style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  {s.estimatedDuration ? `${s.estimatedDuration} min` : '—'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${s.isActive ? 'badge-completed' : 'badge-draft'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/services/${s.id}/edit`)}>
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
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} services
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
