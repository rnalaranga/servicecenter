import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, TrendingDown, Receipt, Trash2, Filter } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenses, getExpenseCategories, deleteExpense } from '@/api/expenses'
import { format, parseISO } from 'date-fns'

const fmtLKR = (val: number | string | undefined | null) => {
  const n = Number(val || 0)
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ExpensesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: getExpenseCategories
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete expense')
    }
  })

  const handleDelete = (id: number, expenseNo: string) => {
    if (confirm(`Are you sure you want to delete expense record ${expenseNo}?`)) {
      deleteMut.mutate(id)
    }
  }

  const filtered = expenses.filter(e => {
    const term = search.toLowerCase()
    const matchesSearch =
      e.description.toLowerCase().includes(term) ||
      e.expenseNumber.toLowerCase().includes(term) ||
      (e.payee && e.payee.toLowerCase().includes(term)) ||
      (e.reference && e.reference.toLowerCase().includes(term)) ||
      (e.category?.name && e.category.name.toLowerCase().includes(term))

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (e.category && String(e.category.id) === selectedCategory)

    return matchesSearch && matchesCategory
  })

  // Calculate this month's expenses
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const thisMonthExpenses = expenses.filter(e => {
    try {
      const d = parseISO(e.date)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    } catch {
      return false
    }
  })

  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalAllTime = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Track shop expenses, overheads, and operational costs</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/expenses/new')} style={{ gap: 8 }}>
          <Plus size={18} /> Record Expense
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>This Month Expenses</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                {fmtLKR(thisMonthTotal)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{thisMonthExpenses.length} entries this month</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--hover)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Expenses (All Time)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                {fmtLKR(totalAllTime)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{expenses.length} total records</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-box" style={{ width: 320 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Search description, payee, reference..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={15} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ fontSize: 13, width: 200 }}
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing <strong>{filtered.length}</strong> of {expenses.length} records
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No expenses found matching filters.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Expense #</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Method</th>
                  <th>Payee / Ref</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="table-row-hover">
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {format(parseISO(e.date), 'MMM dd, yyyy')}
                    </td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>
                      {e.expenseNumber}
                    </td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>
                      {e.description}
                      {e.notes && <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{e.notes}</div>}
                    </td>
                    <td>
                      {e.category ? (
                        <span className="badge badge-outline">{e.category.name}</span>
                      ) : <span style={{ color: 'var(--text-subtle)' }}>—</span>}
                    </td>
                    <td>
                      <span className="badge badge-open" style={{ fontSize: 10 }}>{e.method}</span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <div>{e.payee || '—'}</div>
                      {e.reference && <div style={{ fontSize: 11, fontFamily: 'monospace' }}>Ref: {e.reference}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                      {fmtLKR(e.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--color-danger)' }}
                        title="Delete expense"
                        onClick={() => handleDelete(e.id, e.expenseNumber)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
