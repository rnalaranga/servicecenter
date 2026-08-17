import { useState } from 'react'
import { Printer, TrendingUp, TrendingDown, DollarSign, PieChart, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getProfitabilityReports } from '@/api/reports'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'

export default function ProfitabilityReportsPage() {
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  })

  const { data, isLoading } = useQuery({ 
    queryKey: ['profitability-report', dateRange.start, dateRange.end], 
    queryFn: () => getProfitabilityReports(dateRange.start, dateRange.end) 
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
          <h1 className="page-title">Profitability Reports</h1>
          <p className="page-subtitle">Analyze net profit, margins, and operating costs</p>
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
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>PROFIT & LOSS STATEMENT</h1>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Gross Revenue</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                    LKR {data.totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Net Profit</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: data.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontFamily: 'monospace' }}>
                    LKR {data.netProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--hover)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Profit Margin</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {data.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
            <div className="card">
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <PieChart size={18} color="var(--color-gold-primary)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Profit & Loss Breakdown</h3>
              </div>
              
              <table className="table" style={{ borderTop: 'none' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600, fontSize: 15 }}>Sales & Revenue</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 15, fontFamily: 'monospace' }}>
                      LKR {data.totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  
                  <tr style={{ backgroundColor: 'var(--hover)' }}>
                    <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Direct Costs (COGS)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: 32, color: 'var(--text-muted)' }}>Cost of Products / Materials Sold</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                      - {data.totalCogs.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ backgroundColor: 'var(--hover)' }}>
                    <td style={{ fontWeight: 600 }}>Gross Profit</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                      LKR {(data.totalRevenue - data.totalCogs).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ backgroundColor: 'var(--hover)' }}>
                    <td colSpan={2} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Operating Expenses
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingLeft: 32, color: 'var(--text-muted)' }}>Overhead & General Expenses</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                      - {data.totalExpenses.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>

                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', padding: '24px 16px' }}>NET PROFIT</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 22, padding: '24px 16px', fontFamily: 'monospace', color: data.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      LKR {data.netProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      ) : null}
    </div>
  )
}
