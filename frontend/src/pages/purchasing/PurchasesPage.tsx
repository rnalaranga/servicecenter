import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, ShoppingCart, Calendar, Building2, CheckCircle2, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getPurchases } from '@/api/purchases'
import { format, parseISO } from 'date-fns'

export default function PurchasesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: purchases = [], isLoading } = useQuery({ queryKey: ['purchases'], queryFn: getPurchases })

  const filtered = purchases.filter(p => {
    const term = search.toLowerCase()
    return p.purchaseNumber.toLowerCase().includes(term) || 
           p.vendor?.name.toLowerCase().includes(term)
  })

  const totalPurchases = purchases.length
  const completedPurchases = purchases.filter(p => p.status === 'COMPLETED').length
  const draftPurchases = totalPurchases - completedPurchases

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Manage purchase orders and vendor bills</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/purchases/new')} style={{ gap: 8 }}>
          <Plus size={16} /> New Purchase
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingCart size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Purchases</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{totalPurchases}</div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{completedPurchases}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Drafts</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{draftPurchases}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box" style={{ width: 350 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search PO number or vendor..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No purchases found. Click "New Purchase" to create one.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total (LKR)</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="table-row-hover" onClick={() => navigate(`/purchases/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{p.purchaseNumber}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                      <Calendar size={14} />
                      {format(parseISO(p.date), 'MMM dd, yyyy')}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      {p.vendor?.name}
                    </div>
                  </td>
                  <td>
                    {p.status === 'COMPLETED' 
                      ? <span className="badge badge-success">Completed</span>
                      : <span className="badge badge-warning">Draft</span>
                    }
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    {Number(p.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <Link to={`/purchases/${p.id}`} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
