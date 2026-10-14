import { useState } from 'react'
import { Plus, Search, BookOpen, Layers, Edit2, Trash2, Check, X, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAccounts, createAccount, updateAccount, deleteAccount } from '@/api/accounts'
import type { Account, AccountType } from '@/api/accounts'

const fmtLKR = (val: number | string | undefined | null) => {
  const n = Number(val || 0)
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const ACCOUNT_TYPES: { type: AccountType; label: string; color: string; desc: string }[] = [
  { type: 'ASSET', label: 'Assets', color: '#10b981', desc: 'Cash, bank accounts, receivables, equipment & stock' },
  { type: 'LIABILITY', label: 'Liabilities', color: '#f59e0b', desc: 'Accounts payable, loans, accrued obligations' },
  { type: 'EQUITY', label: 'Equity', color: '#6366f1', desc: "Owner's capital, retained earnings, owner drawings" },
  { type: 'REVENUE', label: 'Revenue', color: '#06b6d4', desc: 'Detailing income, product sales, service fees' },
  { type: 'EXPENSE', label: 'Expenses', color: '#ef4444', desc: 'COGS, salaries, rent, utilities, consumables' },
]

export default function ChartOfAccountsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'ASSET' as AccountType,
    description: '',
    balance: 0,
    isActive: true,
  })

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })

  const createMut = useMutation({
    mutationFn: (payload: any) => createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to create account')
    }
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsModalOpen(false)
      setEditingAccount(null)
      resetForm()
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to update account')
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: (res) => {
      alert(res.message || 'Account removed/deactivated')
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete account')
    }
  })

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      type: 'ASSET',
      description: '',
      balance: 0,
      isActive: true,
    })
  }

  const handleOpenCreate = () => {
    setEditingAccount(null)
    resetForm()
    setIsModalOpen(true)
  }

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc)
    setForm({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      description: acc.description || '',
      balance: Number(acc.balance || 0),
      isActive: acc.isActive,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) {
      alert('Please fill in Account Code and Name')
      return
    }

    if (editingAccount) {
      updateMut.mutate({ id: editingAccount.id, payload: form })
    } else {
      createMut.mutate(form)
    }
  }

  const handleDelete = (acc: Account) => {
    if (confirm(`Are you sure you want to delete or deactivate account "${acc.code} - ${acc.name}"?`)) {
      deleteMut.mutate(acc.id)
    }
  }

  const filteredAccounts = accounts.filter(acc => {
    const term = search.toLowerCase()
    const matchesSearch = acc.code.toLowerCase().includes(term) ||
      acc.name.toLowerCase().includes(term) ||
      (acc.description && acc.description.toLowerCase().includes(term))

    const matchesType = selectedType === 'ALL' || acc.type === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Chart of Accounts (COA)</h1>
          <p className="page-subtitle">Master ledger accounts for financial reporting, bookkeeping, and balance sheets</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate} style={{ gap: 8 }}>
          <Plus size={18} /> Add Account
        </button>
      </div>

      {/* ── Summary Type Badges / Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {ACCOUNT_TYPES.map(t => {
          const typeAccounts = accounts.filter(a => a.type === t.type)
          const totalBal = typeAccounts.reduce((sum, a) => sum + Number(a.balance || 0), 0)
          const isSelected = selectedType === t.type
          return (
            <div
              key={t.type}
              className="card"
              onClick={() => setSelectedType(isSelected ? 'ALL' : t.type)}
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                borderLeft: `4px solid ${t.color}`,
                background: isSelected ? 'var(--hover)' : 'var(--surface)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: t.color }}>{t.label}</span>
                <span className="badge badge-outline" style={{ fontSize: 10 }}>{typeAccounts.length}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>
                {fmtLKR(totalBal)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{t.desc}</div>
            </div>
          )
        })}
      </div>

      {/* ── Main Accounts Table Card ── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ width: 320 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Search account code, name, description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                className={`btn btn-xs ${selectedType === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSelectedType('ALL')}
              >
                All ({accounts.length})
              </button>
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.type}
                  className={`btn btn-xs ${selectedType === t.type ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setSelectedType(t.type)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing <strong>{filteredAccounts.length}</strong> accounts
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filteredAccounts.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No accounts found matching your filter criteria.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Code</th>
                  <th>Account Name</th>
                  <th style={{ width: 120 }}>Type</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right', width: 160 }}>Balance</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map(acc => {
                  const typeDef = ACCOUNT_TYPES.find(t => t.type === acc.type)
                  const bal = Number(acc.balance || 0)
                  return (
                    <tr key={acc.id} className="table-row-hover">
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--color-gold-primary)' }}>
                          {acc.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{acc.name}</div>
                        {acc._count?.journalLines ? (
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{acc._count.journalLines} journal entries</div>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${typeDef?.color || '#cbd5e1'}20`,
                            color: typeDef?.color || 'inherit',
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        >
                          {acc.type}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{acc.description || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                        {fmtLKR(bal)}
                      </td>
                      <td>
                        <span className={`badge ${acc.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {acc.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit Account"
                            onClick={() => handleOpenEdit(acc)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete or Deactivate"
                            onClick={() => handleDelete(acc)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                {editingAccount ? 'Edit Account' : 'New Chart of Account'}
              </h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label required">Code</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 1040"
                      value={form.code}
                      onChange={e => setForm({ ...form, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Account Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Petty Cash / BOC Current"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label required">Account Classification</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as AccountType })}
                  >
                    {ACCOUNT_TYPES.map(t => (
                      <option key={t.type} value={t.type}>{t.label} ({t.type})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Description / Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Short description of this account"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                {!editingAccount && (
                  <div className="form-group">
                    <label className="form-label">Initial Balance (LKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={form.balance}
                      onChange={e => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="form-hint">Initial starting balance for this ledger account</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="isActive"
                        checked={form.isActive}
                        onChange={() => setForm({ ...form, isActive: true })}
                      /> Active
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input
                        type="radio"
                        name="isActive"
                        checked={!form.isActive}
                        onChange={() => setForm({ ...form, isActive: false })}
                      /> Inactive
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
