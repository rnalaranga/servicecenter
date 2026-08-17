import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Calendar, TrendingUp, CheckCircle2, AlertTriangle, FileText } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSalesReports } from '@/api/reports'
import { format, parseISO, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'

export default function SalesReportsPage() {
  const navigate = useNavigate()
  
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  const { data, isLoading } = useQuery({ 
    queryKey: ['sales-report', dateRange.start, dateRange.end], 
    queryFn: () => getSalesReports(dateRange.start, dateRange.end) 
  })

  const setPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    if (preset === 'thisMonth') {
      setDateRange({ start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') })
    } else if (preset === 'lastMonth') {
      const lastMonth = subMonths(now, 1);
      setDateRange({ start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') })
    } else if (preset === 'thisYear') {
      setDateRange({ start: format(startOfYear(now), 'yyyy-MM-dd'), end: format(endOfYear(now), 'yyyy-MM-dd') })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return <span className="badge badge-success">Paid</span>
      case 'PARTIAL': return <span className="badge badge-warning">Partial</span>
      case 'UNPAID': return <span className="badge badge-error">Unpaid</span>
      default: return <span className="badge badge-outline">{status}</span>
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }} className="hide-print">
        <div>
          <h1 className="page-title">Sales Reports</h1>
          <p className="page-subtitle">Analyze shop revenue and collections</p>
        </div>
        <button className="btn btn-outline" onClick={() => window.print()} style={{ gap: 8 }}>
          <Printer size={16} /> Print Report
        </button>
      </div>

      <div className="card hide-print" style={{ marginBottom: 24, padding: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="date" 
                className="form-input" 
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <span style={{ color: 'var(--text-muted)' }}>to</span>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input 
                type="date" 
                className="form-input" 
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreset('thisMonth')}>This Month</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreset('lastMonth')}>Last Month</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setPreset('thisYear')}>This Year</button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
      ) : data ? (
        <div className="print-document">
          <div className="print-only" style={{ marginBottom: 30 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>SALES REPORT</h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Period: {format(new Date(dateRange.start), 'MMM dd, yyyy')} to {format(new Date(dateRange.end), 'MMM dd, yyyy')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Billed Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                    LKR {data.summary.totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Amount Collected</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)', fontFamily: 'monospace' }}>
                    LKR {data.summary.totalCollected.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Pending / Outstanding</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                    LKR {data.summary.totalOutstanding.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Invoices</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {data.summary.invoiceCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            {data.invoices.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                No invoices found for the selected period.
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Total (LKR)</th>
                    <th style={{ textAlign: 'right' }}>Paid (LKR)</th>
                    <th style={{ textAlign: 'right' }}>Balance (LKR)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map(inv => (
                    <tr key={inv.id} className="table-row-hover" onClick={() => navigate(`/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
                      <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(inv.date), 'MMM dd, yyyy')}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text)' }}>{inv.invoiceNumber}</td>
                      <td style={{ fontWeight: 500 }}>{inv.customer?.name || '-'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        {Number(inv.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)', fontFamily: 'monospace' }}>
                        {Number(inv.amountPaid).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', color: Number(inv.balance) > 0 ? 'var(--color-danger)' : 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {Number(inv.balance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </td>
                      <td>{getStatusBadge(inv.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
