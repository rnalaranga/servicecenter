import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FileText, ArrowUpRight, DollarSign, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getPayments } from '@/api/payments'
import { format, parseISO, isToday, isThisMonth } from 'date-fns'

export default function PaymentsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: payments = [], isLoading } = useQuery({ queryKey: ['payments'], queryFn: getPayments })

  const filtered = payments.filter(p => {
    const matchesSearch = p.paymentNumber.toLowerCase().includes(search.toLowerCase()) || 
                          p.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.customer?.mobile.includes(search)
    
    if (!matchesSearch) return false
    if (statusFilter !== 'ALL' && p.method !== statusFilter) return false
    return true
  })

  // KPIs
  const todayTotal = payments.filter(p => isToday(parseISO(p.date))).reduce((acc, curr) => acc + Number(curr.amount), 0)
  const monthTotal = payments.filter(p => isThisMonth(parseISO(p.date))).reduce((acc, curr) => acc + Number(curr.amount), 0)

  const fmtLKR = (val: number | string) => Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2 })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Customer Payments</h1>
          <p className="page-subtitle">View and manage all incoming payments and receipts</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/payments/new')} style={{ gap: 8 }}>
          <Plus size={16} /> Receive Payment
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Received Today</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>LKR {fmtLKR(todayTotal)}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Received This Month</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>LKR {fmtLKR(monthTotal)}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Receipts</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{payments.length}</div>
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
                placeholder="Search by customer or receipt no..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 150, appearance: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No payments found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Method</th>
                <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(payment => (
                <tr key={payment.id} className="table-row-hover">
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {payment.paymentNumber}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {format(parseISO(payment.date), 'MMM dd, yyyy h:mm a')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{payment.customer?.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{payment.customer?.mobile}</div>
                  </td>
                  <td>
                    <span className="badge badge-outline">{payment.method}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-success)', fontFamily: 'monospace' }}>
                    +{fmtLKR(payment.amount)}
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
