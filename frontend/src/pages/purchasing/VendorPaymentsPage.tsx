import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, CreditCard, Building2, Calendar, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getVendorPayments } from '@/api/vendor-payments'
import { format, parseISO } from 'date-fns'

export default function VendorPaymentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['vendor-payments'], queryFn: getVendorPayments })

  const filtered = payments.filter(p => {
    const term = search.toLowerCase()
    return p.paymentNumber.toLowerCase().includes(term) || 
           p.vendor?.name.toLowerCase().includes(term) ||
           p.reference?.toLowerCase().includes(term)
  })

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Vendor Payments</h1>
          <p className="page-subtitle">Track payments made to your suppliers</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/vendor-payments/new')} style={{ gap: 8 }}>
          <Plus size={16} /> Make Payment
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Paid</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                LKR {totalPaid.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
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
              placeholder="Search by vendor, receipt, or reference..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No vendor payments found. Click "Make Payment" to record one.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Method</th>
                <th>Reference</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="table-row-hover">
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{p.paymentNumber}</td>
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
                    {p.purchase && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <FileText size={10} /> Bill: {p.purchase.purchaseNumber}
                      </div>
                    )}
                  </td>
                  <td><span className="badge badge-outline">{p.method}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{p.reference || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-success)' }}>
                    {Number(p.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
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
