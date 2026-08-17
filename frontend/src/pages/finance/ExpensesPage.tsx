import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, TrendingDown, Receipt } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getExpenses } from '@/api/expenses'
import { format, parseISO } from 'date-fns'

export default function ExpensesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: expenses = [], isLoading } = useQuery({ 
    queryKey: ['expenses'], 
    queryFn: getExpenses 
  })
  
  const filtered = expenses.filter(e => {
    const term = search.toLowerCase()
    return e.description.toLowerCase().includes(term) || 
           e.expenseNumber.toLowerCase().includes(term) ||
           (e.payee && e.payee.toLowerCase().includes(term)) ||
           (e.category?.name && e.category.name.toLowerCase().includes(term))
  })

  // Calculate this month's expenses
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  
  const thisMonthExpenses = expenses.filter(e => {
    const d = parseISO(e.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })
  
  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track shop expenses and operational costs</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/expenses/new')} style={{ gap: 8 }}>
          <Plus size={18} /> Record Expense
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>This Month Expenses</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                LKR {thisMonthTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--hover)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Records</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                {expenses.length}
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
              placeholder="Search by description, payee or category..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No expenses found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Expense No</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payee</th>
                <th style={{ textAlign: 'right' }}>Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="table-row-hover">
                  <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(e.date), 'MMM dd, yyyy')}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text)' }}>{e.expenseNumber}</td>
                  <td style={{ fontWeight: 500 }}>{e.description}</td>
                  <td>
                    {e.category ? (
                      <span className="badge badge-outline">{e.category.name}</span>
                    ) : '-'}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.payee || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {Number(e.amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
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
