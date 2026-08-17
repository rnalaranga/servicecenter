import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenseCategories, createExpense, createExpenseCategory } from '@/api/expenses'
import { useToast } from '@/contexts/ToastContext'
import { format } from 'date-fns'

export default function ExpenseFormPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    description: '',
    amount: '',
    method: 'CASH',
    payee: '',
    reference: '',
    notes: ''
  })
  
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const { data: categories = [] } = useQuery({ queryKey: ['expense-categories'], queryFn: getExpenseCategories })

  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      addToast('Expense recorded successfully', 'success')
      navigate('/expenses')
    },
    onError: (error: any) => {
      addToast(error.response?.data?.error || 'Failed to record expense', 'error')
    }
  })

  const createCategoryMutation = useMutation({
    mutationFn: createExpenseCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      setFormData({ ...formData, categoryId: String(data.id) })
      setIsAddingCategory(false)
      setNewCategoryName('')
      addToast('Category added', 'success')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.description || !formData.amount) {
      addToast('Please fill all required fields', 'error')
      return
    }

    createMutation.mutate({
      ...formData,
      categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
      amount: Number(formData.amount)
    })
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    createCategoryMutation.mutate({ name: newCategoryName })
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/expenses')} style={{ padding: 8 }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="page-title">Record Expense</h1>
          <p className="page-subtitle">Add a new operational expense or overhead</p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="card-body" style={{ padding: 32 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label required">Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Amount (LKR)</label>
                <input 
                  type="number" 
                  min="0.01"
                  step="0.01"
                  className="form-input"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label required">Description</label>
              <input 
                type="text" 
                className="form-input"
                required
                placeholder="e.g., Office Stationery, Electricity Bill for July"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                {!isAddingCategory ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select 
                      className="form-input"
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    >
                      <option value="">No Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" className="btn btn-outline" onClick={() => setIsAddingCategory(true)} style={{ padding: '0 12px' }}>
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="New Category Name"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAddCategory} disabled={createCategoryMutation.isPending}>Add</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsAddingCategory(false)}>Cancel</button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Payee (Paid To)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g., CEB, Supplier Name"
                  value={formData.payee}
                  onChange={e => setFormData({ ...formData, payee: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select 
                  className="form-input"
                  value={formData.method}
                  onChange={e => setFormData({ ...formData, method: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Credit/Debit Card</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference No. (Cheque / Transfer ID)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Optional reference"
                  value={formData.reference}
                  onChange={e => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Additional Notes</label>
              <textarea 
                className="form-input"
                rows={3}
                placeholder="Any other details..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

          </div>
          <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/expenses')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={createMutation.isPending} style={{ gap: 8 }}>
              <Save size={16} /> {createMutation.isPending ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
