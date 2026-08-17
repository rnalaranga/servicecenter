import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, Package, AlertTriangle, ArrowUpDown, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getStockLevels } from '@/api/stock'

export default function StockPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')

  const { data: stockLevels = [], isLoading } = useQuery({ queryKey: ['stock'], queryFn: getStockLevels })

  const filtered = stockLevels.filter(s => {
    const matchesSearch = s.product?.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.product?.sku.toLowerCase().includes(search.toLowerCase())
    
    if (!matchesSearch) return false
    
    if (filter === 'LOW') {
      return Number(s.quantity) <= Number(s.product?.minStock || 0) && Number(s.quantity) > 0
    }
    if (filter === 'OUT') {
      return Number(s.quantity) <= 0
    }
    return true
  })

  // KPIs
  const totalValue = stockLevels.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.product?.avgCost || 0)), 0)
  const lowStockCount = stockLevels.filter(s => Number(s.quantity) <= Number(s.product?.minStock || 0) && Number(s.quantity) > 0).length
  const outOfStockCount = stockLevels.filter(s => Number(s.quantity) <= 0).length

  const fmtLKR = (val: number | string) => Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Stock Levels</h1>
          <p className="page-subtitle">Monitor current physical inventory across all locations</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/stock-movements')} style={{ gap: 8 }}>
            <ArrowUpDown size={16} /> Movements
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/stock/adjust')} style={{ gap: 8 }}>
            <TrendingUp size={16} /> Adjust Stock
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Inventory Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>LKR {fmtLKR(totalValue)}</div>
            </div>
          </div>
        </div>
        <div className="card" onClick={() => setFilter('LOW')} style={{ cursor: 'pointer', border: filter === 'LOW' ? '2px solid var(--color-warning)' : undefined }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Low Stock Items</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706', fontFamily: 'monospace' }}>{lowStockCount}</div>
            </div>
          </div>
        </div>
        <div className="card" onClick={() => setFilter('OUT')} style={{ cursor: 'pointer', border: filter === 'OUT' ? '2px solid var(--color-danger)' : undefined }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Out of Stock</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>{outOfStockCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="search-box" style={{ width: 300 }}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search by SKU or Name..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 150, appearance: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="ALL">All Items</option>
              <option value="LOW">Low Stock</option>
              <option value="OUT">Out of Stock</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No stock levels found matching your criteria.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Location</th>
                <th>Avg Cost</th>
                <th>Selling Price</th>
                <th style={{ textAlign: 'right' }}>Qty in Stock</th>
                <th style={{ textAlign: 'right' }}>Total Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const qty = Number(s.quantity)
                const min = Number(s.product?.minStock || 0)
                let status = 'In Stock'
                let statusClass = 'badge-outline'
                
                if (qty <= 0) {
                  status = 'Out of Stock'
                  statusClass = 'badge-danger'
                } else if (qty <= min) {
                  status = 'Low Stock'
                  statusClass = 'badge-warning'
                }

                return (
                  <tr key={s.id} className="table-row-hover">
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                        <Link to={`/products/${s.productId}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {s.product?.name}
                        </Link>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {s.product?.sku}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{s.warehouse?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.warehouse?.code}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>LKR {fmtLKR(s.product?.avgCost || 0)}</td>
                    <td style={{ fontFamily: 'monospace' }}>LKR {fmtLKR(s.product?.sellingPrice || 0)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 15, color: qty <= 0 ? 'var(--color-danger)' : 'var(--text)' }}>
                      {qty}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      LKR {fmtLKR(qty * Number(s.product?.avgCost || 0))}
                    </td>
                    <td>
                      <span className={`badge ${statusClass}`}>{status}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
