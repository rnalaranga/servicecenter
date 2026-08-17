import { useNavigate } from 'react-router-dom'
import { Printer, Package, AlertTriangle, AlertCircle, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getInventoryReports } from '@/api/reports'
import { format } from 'date-fns'

export default function InventoryReportsPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({ 
    queryKey: ['inventory-report'], 
    queryFn: getInventoryReports 
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }} className="hide-print">
        <div>
          <h1 className="page-title">Inventory Reports</h1>
          <p className="page-subtitle">Analyze stock levels and valuation</p>
        </div>
        <button className="btn btn-outline" onClick={() => window.print()} style={{ gap: 8 }}>
          <Printer size={16} /> Print Report
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
      ) : data ? (
        <div className="print-document">
          <div className="print-only" style={{ marginBottom: 30 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>INVENTORY REPORT</h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Date Generated: {format(new Date(), 'MMM dd, yyyy - hh:mm a')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Inventory Value</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                    LKR {data.summary.totalInventoryValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Out of Stock Items</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                    {data.summary.outOfStockCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Low Stock Items</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'monospace' }}>
                    {data.summary.lowStockCount}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--hover)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Products Tracked</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {data.summary.totalItems}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            {data.inventory.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                No products found in inventory.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>SKU / Code</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Current Stock</th>
                    <th style={{ textAlign: 'right' }}>Avg Cost (LKR)</th>
                    <th style={{ textAlign: 'right' }}>Total Value (LKR)</th>
                    <th style={{ width: 80, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.inventory.map(item => {
                    const isOutOfStock = item.currentStock === 0;
                    const isLowStock = item.currentStock > 0 && item.currentStock <= item.reorderLevel;
                    
                    return (
                      <tr key={item.id} className="table-row-hover" onClick={() => navigate(`/inventory/products/${item.id}`)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{item.sku || item.code}</td>
                        <td style={{ fontWeight: 500 }}>{item.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{item.category}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: isOutOfStock ? 'var(--color-danger)' : (isLowStock ? 'var(--color-warning)' : 'inherit') }}>
                          {item.currentStock}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {Number(item.avgCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                          {Number(item.totalValue).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {isOutOfStock ? (
                            <span className="badge badge-error">Out</span>
                          ) : isLowStock ? (
                            <span className="badge badge-warning">Low</span>
                          ) : (
                            <span className="badge badge-success">OK</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
