import { useState } from 'react'
import { Printer, TrendingUp, TrendingDown, DollarSign, ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getFinancialReports } from '@/api/reports'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'

export default function FinancialReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  const { data, isLoading } = useQuery({ 
    queryKey: ['financial-report', dateRange.start, dateRange.end], 
    queryFn: () => getFinancialReports(dateRange.start, dateRange.end) 
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }} className="hide-print">
        <div>
          <h1 className="page-title">Financial Reports</h1>
          <p className="page-subtitle">High-level view of Cash Flow and Outstanding Balances</p>
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
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>FINANCIAL OVERVIEW STATEMENT</h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Period: {format(new Date(dateRange.start), 'MMM dd, yyyy')} to {format(new Date(dateRange.end), 'MMM dd, yyyy')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Cash In</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-success)', fontFamily: 'monospace' }}>
                    LKR {data.cashIn.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingDown size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Cash Out</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                    LKR {data.cashOut.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--hover)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scale size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Net Cash Flow</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: data.netCashFlow >= 0 ? 'var(--text)' : 'var(--color-danger)', fontFamily: 'monospace' }}>
                    LKR {data.netCashFlow.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            
            {/* CASH FLOW BREAKDOWN */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DollarSign size={18} color="var(--color-gold-primary)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Cash Flow Breakdown</h3>
              </div>
              <table className="table" style={{ borderTop: 'none' }}>
                <tbody>
                  <tr style={{ backgroundColor: 'var(--hover)' }}>
                    <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      INFLOWS
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>Customer Payments Received</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)', fontFamily: 'monospace' }}>
                      + {data.cashIn.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ backgroundColor: 'var(--hover)' }}>
                    <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      OUTFLOWS
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>Payments to Suppliers</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                      - {data.vendorCashOut.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 500 }}>Operating Expenses (Rent, Bills)</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                      - {data.expenseCashOut.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>NET CASH IN HAND</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 18, fontFamily: 'monospace', color: data.netCashFlow >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      LKR {data.netCashFlow.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OUTSTANDING BALANCES */}
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Scale size={18} color="var(--color-gold-primary)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Outstanding Debt & Credits</h3>
              </div>
              <div style={{ padding: 24 }}>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowDownRight size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accounts Receivable</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Money owed to you by customers</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)', fontFamily: 'monospace', paddingLeft: 52 }}>
                    LKR {data.accountsReceivable.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowUpRight size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Accounts Payable</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Money you owe to suppliers</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-danger)', fontFamily: 'monospace', paddingLeft: 52 }}>
                    LKR {data.accountsPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

          </div>
          
        </div>
      ) : null}
    </div>
  )
}
