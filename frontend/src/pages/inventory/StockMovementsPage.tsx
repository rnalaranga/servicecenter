import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getStockMovements } from '@/api/stock'
import { format, parseISO } from 'date-fns'

export default function StockMovementsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: movements = [], isLoading } = useQuery({ queryKey: ['stock-movements'], queryFn: getStockMovements })

  const filtered = movements.filter(m => {
    const term = search.toLowerCase()
    return m.txnNumber.toLowerCase().includes(term) || 
           m.product?.name.toLowerCase().includes(term) ||
           m.product?.sku.toLowerCase().includes(term)
  })

  const fmtLKR = (val: number | string) => Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/stock')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Stock
        </button>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Stock Movements</h1>
        <p className="page-subtitle">Complete audit trail of all inventory in and out transactions</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box" style={{ width: 350 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by Txn Number, SKU, or Product Name..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No stock movements found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Txn No</th>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Product</th>
                <th>Location</th>
                <th style={{ textAlign: 'right' }}>Quantity</th>
                <th style={{ textAlign: 'right' }}>Total Value</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const isOut = m.type === 'OUT' || Number(m.quantity) < 0
                return (
                  <tr key={m.id} className="table-row-hover">
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                      {m.txnNumber}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {format(parseISO(m.createdAt), 'MMM dd, yyyy h:mm a')}
                    </td>
                    <td>
                      <span className={`badge ${isOut ? 'badge-danger' : 'badge-success'}`}>
                        {m.type === 'OUT' ? 'STOCK OUT' : 'STOCK IN'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{m.product?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {m.product?.sku}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {m.warehouse?.name}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 15, color: isOut ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {isOut ? '' : '+'}{m.quantity}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                      LKR {fmtLKR(m.totalCost)}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={m.notes || ''}>
                      {m.notes || '-'}
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
