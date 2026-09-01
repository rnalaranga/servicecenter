import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Package, Tag, Box, AlertTriangle, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getProductById } from '@/api/products'

function fmtLKR(n: number) {
  if (!n) return <span style={{ color: 'var(--text-subtle)' }}>—</span>
  return `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ProductProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: product, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id!)
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-gold-primary)' }} />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-title">Product not found</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/products')}>Back to Inventory</button>
        </div>
      </div>
    )
  }

  const isLowStock = (product.currentStock || 0) <= Number(product.minStock)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/products/${product.id}/edit`)}>
          <Edit2 size={13} /> Edit Product
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Main Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 12,
                  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Package size={28} style={{ color: '#0F1115' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{product.name}</h1>
                    <span className={`badge ${product.isActive ? 'badge-completed' : 'badge-draft'}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-gold-primary)', fontWeight: 600 }}>{product.sku}</span>
                    <span>·</span>
                    <span>{product.brand || 'No Brand'}</span>
                    <span>·</span>
                    <span>{product.category?.name || 'Uncategorized'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 40, marginTop: 30, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Selling Price</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                  {fmtLKR(Number(product.sellingPrice))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Cost Price</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-subtle)', fontFamily: 'monospace', marginTop: 3 }}>
                  {fmtLKR(Number(product.purchaseCost))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 4 }}>Margin</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-success)', fontFamily: 'monospace', marginTop: 3 }}>
                  {Number(product.sellingPrice) > 0 ? `${(((Number(product.sellingPrice) - Number(product.purchaseCost)) / Number(product.sellingPrice)) * 100).toFixed(1)}%` : '0%'}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Stock Movements</div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div className="empty-state" style={{ padding: '30px' }}>
                <Box size={20} style={{ color: 'var(--text-subtle)', marginBottom: 8 }} />
                <div className="empty-state-desc">Stock transaction history will appear here once implemented.</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Sidebar - Stock Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className="card" style={{ padding: 20, border: isLowStock ? '1px solid var(--color-danger)' : undefined }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Box size={15} style={{ color: isLowStock ? 'var(--color-danger)' : 'var(--color-gold-primary)' }} /> 
              Current Inventory
            </h3>
            
            <div style={{ textAlign: 'center', padding: '20px 0', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: isLowStock ? 'var(--color-danger)' : 'var(--text)', fontFamily: 'monospace', lineHeight: 1 }}>
                {product.currentStock}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600 }}>
                {product.unit?.name || 'Units'} In Stock
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Minimum Stock Alert:</span>
                <span style={{ fontWeight: 600 }}>{product.minStock}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Value:</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {fmtLKR(Number(product.purchaseCost) * (product.currentStock || 0))}
                </span>
              </div>
            </div>

            {isLowStock && (
              <div style={{ marginTop: 20, padding: 12, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: 'var(--color-danger)', lineHeight: 1.4 }}>
                  <strong>Low Stock Alert</strong><br />
                  Current stock is at or below the minimum requirement. Consider reordering soon.
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={15} style={{ color: 'var(--color-gold-primary)' }} /> Tags & Classification
            </h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {product.brand && <span className="badge badge-normal">{product.brand}</span>}
              {product.category && <span className="badge badge-open">{product.category.name}</span>}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
