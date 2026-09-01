import { useState } from 'react'
import { Plus, Search, Eye, Filter, Loader2, Package, AlertTriangle, Box } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useQuery } from '@tanstack/react-query'
import { getProducts, getProductCategories, type Product } from '@/api/products'

function fmtLKR(n: number) {
  return `LKR ${Number(n).toLocaleString('en-LK')}`
}

export default function ProductsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['product_categories'],
    queryFn: getProductCategories
  })

  const filtered = products.filter(p => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    
    const matchCat = catFilter === 'ALL' || String(p.categoryId) === catFilter
    return matchSearch && matchCat
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const lowStockCount = products.filter(p => (p.currentStock || 0) <= Number(p.minStock)).length
  const totalValue = products.reduce((sum, p) => sum + (Number(p.purchaseCost) * (p.currentStock || 0)), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Inventory</h1>
          <p className="page-subtitle">
            {products.length} products · {lowStockCount} low stock items
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/products/new')}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Total Items</div>
            <Package size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value">{products.length}</div>
          <div className="kpi-change neutral">In catalog</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Low Stock</div>
            <AlertTriangle size={14} style={{ color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value" style={{ color: lowStockCount > 0 ? 'var(--color-danger)' : 'var(--text)' }}>
            {lowStockCount}
          </div>
          <div className="kpi-change neutral">Needs reordering</div>
        </div>

        <div className="kpi-card" style={{ padding: '14px 16px' }}>
          <div className="kpi-card-accent" />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="kpi-label">Total Inventory Value</div>
            <Box size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="kpi-value" style={{ fontSize: 20 }}>{fmtLKR(totalValue)}</div>
          <div className="kpi-change neutral">Based on purchase cost</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '14px' }}>
        <div className="card-body" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search products by SKU, name or brand..."
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
              <th>SKU</th>
              <th>Product Details</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Price (LKR)</th>
              <th style={{ textAlign: 'right' }}>Stock Level</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  <Loader2 size={24} className="spinner" style={{ margin: '0 auto', color: 'var(--color-gold-primary)' }} />
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Package size={20} /></div>
                    <div className="empty-state-title">No products found</div>
                  </div>
                </td>
              </tr>
            ) : paged.map(p => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/products/${p.id}`)}>
                <td>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 12 }}>
                    {p.sku}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {p.brand ? p.brand : 'No Brand'} {p.unit ? `· ${p.unit.name}` : ''}
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {p.category?.name || '—'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>
                  {Number(p.sellingPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: (p.currentStock || 0) <= Number(p.minStock) ? 'var(--color-danger)' : 'var(--text)' }}>
                      {p.currentStock} {p.unit?.symbol}
                    </span>
                    {(p.currentStock || 0) <= Number(p.minStock) && (
                      <span style={{ fontSize: 10, color: 'var(--color-danger)', fontWeight: 600 }}>LOW STOCK</span>
                    )}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${p.isActive ? 'badge-completed' : 'badge-draft'}`}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/products/${p.id}`)}>
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
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} products
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
