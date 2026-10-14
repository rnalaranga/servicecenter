import { useState } from 'react'
import { Plus, Search, BookOpen, Trash2, Eye, Calendar, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJournalEntries, createJournalEntry, deleteJournalEntry } from '@/api/journals'
import type { JournalEntry, CreateJournalPayload } from '@/api/journals'
import { getAccounts } from '@/api/accounts'
import { format, parseISO } from 'date-fns'

const fmtLKR = (val: number | string | undefined | null) => {
  const n = Number(val || 0)
  return 'LKR ' + n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (d?: string | null) => {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : format(dt, 'yyyy-MM-dd')
  } catch {
    return d
  }
}

export default function JournalEntriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)

  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formRef, setFormRef] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [lines, setLines] = useState<
    { accountId: number; description: string; debit: number; credit: number }[]
  >([
    { accountId: 0, description: '', debit: 0, credit: 0 },
    { accountId: 0, description: '', debit: 0, credit: 0 },
  ])

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journalEntries'],
    queryFn: () => getJournalEntries(),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
  })

  const createMut = useMutation({
    mutationFn: (payload: CreateJournalPayload) => createJournalEntry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setIsModalOpen(false)
      resetForm()
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to create journal entry')
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteJournalEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journalEntries'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete journal entry')
    }
  })

  const resetForm = () => {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setFormRef('')
    setFormDesc('')
    setLines([
      { accountId: 0, description: '', debit: 0, credit: 0 },
      { accountId: 0, description: '', debit: 0, credit: 0 },
    ])
  }

  const handleAddLine = () => {
    setLines([...lines, { accountId: 0, description: '', debit: 0, credit: 0 }])
  }

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 2) {
      alert('A journal entry must have at least two lines')
      return
    }
    setLines(lines.filter((_, i) => i !== idx))
  }

  const updateLine = (idx: number, field: string, val: any) => {
    const copy = [...lines]
    copy[idx] = { ...copy[idx], [field]: val }
    setLines(copy)
  }

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0)
  const difference = Math.abs(totalDebit - totalCredit)
  const isBalanced = difference < 0.01 && totalDebit > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDesc.trim()) {
      alert('Please enter a description for this journal voucher')
      return
    }

    const invalidLine = lines.find(l => !l.accountId || (l.debit === 0 && l.credit === 0))
    if (invalidLine) {
      alert('Please select an account and specify debit or credit for all lines')
      return
    }

    if (!isBalanced) {
      alert(`Journal entry is not balanced. Total Debit: ${fmtLKR(totalDebit)}, Total Credit: ${fmtLKR(totalCredit)}`)
      return
    }

    createMut.mutate({
      date: formDate,
      reference: formRef,
      description: formDesc,
      status: 'POSTED',
      lines: lines.map(l => ({
        accountId: Number(l.accountId),
        description: l.description,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }))
    })
  }

  const handleDelete = (entry: JournalEntry) => {
    if (confirm(`Are you sure you want to delete journal voucher ${entry.entryNumber}? Account balances will be automatically reversed.`)) {
      deleteMut.mutate(entry.id)
    }
  }

  const filteredEntries = entries.filter(e => {
    const term = search.toLowerCase()
    return (
      e.entryNumber.toLowerCase().includes(term) ||
      e.description.toLowerCase().includes(term) ||
      (e.reference && e.reference.toLowerCase().includes(term))
    )
  })

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Journal Entries (Vouchers)</h1>
          <p className="page-subtitle">Double-entry bookkeeping vouchers for manual adjustments, depreciations, and transfers</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setIsModalOpen(true); }} style={{ gap: 8 }}>
          <Plus size={18} /> New Journal Entry
        </button>
      </div>

      {/* ── Table Card ── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div className="search-box" style={{ width: 320 }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-input"
              placeholder="Search voucher #, description, ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Total <strong>{filteredEntries.length}</strong> vouchers
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No journal entries recorded yet.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 120 }}>Voucher #</th>
                  <th style={{ width: 110 }}>Date</th>
                  <th>Description</th>
                  <th style={{ width: 130 }}>Reference</th>
                  <th style={{ textAlign: 'right', width: 140 }}>Amount</th>
                  <th style={{ width: 100 }}>Status</th>
                  <th style={{ width: 90, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(e => {
                  const entryTotal = e.lines?.reduce((sum, l) => sum + Number(l.debit || 0), 0) || 0
                  return (
                    <tr key={e.id} className="table-row-hover">
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--color-gold-primary)' }}>
                          {e.entryNumber}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(e.date)}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{e.description}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{e.lines?.length || 0} ledger lines</div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {e.reference || '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                        {fmtLKR(entryTotal)}
                      </td>
                      <td>
                        <span className="badge badge-success">{e.status}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="View Voucher"
                            onClick={() => setViewingEntry(e)}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete Voucher"
                            onClick={() => handleDelete(e)}
                          >
                            <Trash2 size={14} />
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

      {/* ── View Voucher Modal ── */}
      {viewingEntry && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 700, width: '100%', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                  {viewingEntry.entryNumber}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Date: {formatDate(viewingEntry.date)} | Ref: {viewingEntry.reference || 'None'}</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setViewingEntry(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 16, background: 'var(--hover)', padding: '10px 14px', borderRadius: 8 }}>
              {viewingEntry.description}
            </div>

            <table className="table" style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Debit</th>
                  <th style={{ textAlign: 'right' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {viewingEntry.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{l.account?.code} - {l.account?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{l.account?.type}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.description || '—'}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: Number(l.debit) > 0 ? 'var(--color-danger)' : 'var(--text-subtle)' }}>
                      {Number(l.debit) > 0 ? fmtLKR(l.debit) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: Number(l.credit) > 0 ? 'var(--color-success)' : 'var(--text-subtle)' }}>
                      {Number(l.credit) > 0 ? fmtLKR(l.credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--hover)' }}>
                  <td colSpan={2} style={{ fontWeight: 700 }}>Total</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {fmtLKR(viewingEntry.lines.reduce((s, l) => s + Number(l.debit || 0), 0))}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                    {fmtLKR(viewingEntry.lines.reduce((s, l) => s + Number(l.credit || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewingEntry(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Journal Entry Modal ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 850, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Double-Entry Journal Voucher</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 160px 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label required">Voucher Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reference #</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. JV-ADJ-01"
                    value={formRef}
                    onChange={e => setFormRef(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label required">Description / Narration</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Month-end adjustment, transfer, or depreciation"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="table-container" style={{ marginBottom: 16 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 260 }}>Account</th>
                      <th>Line Description</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Debit (LKR)</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Credit (LKR)</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          <select
                            className="form-select"
                            style={{ fontSize: 13 }}
                            value={line.accountId}
                            onChange={e => updateLine(idx, 'accountId', Number(e.target.value))}
                            required
                          >
                            <option value={0}>-- Select Account --</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>
                                {acc.code} - {acc.name} ({acc.type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: 13 }}
                            placeholder="Optional note"
                            value={line.description}
                            onChange={e => updateLine(idx, 'description', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}
                            value={line.debit || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              updateLine(idx, 'debit', val)
                              if (val > 0) updateLine(idx, 'credit', 0)
                            }}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="form-input"
                            style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}
                            value={line.credit || ''}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0
                              updateLine(idx, 'credit', val)
                              if (val > 0) updateLine(idx, 'debit', 0)
                            }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => handleRemoveLine(idx)}
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--hover)' }}>
                      <td colSpan={2}>
                        <button type="button" className="btn btn-outline btn-xs" onClick={handleAddLine} style={{ gap: 4 }}>
                          <Plus size={12} /> Add Line
                        </button>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                        {fmtLKR(totalDebit)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 13 }}>
                        {fmtLKR(totalCredit)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Balance Validation Bar */}
              <div style={{
                padding: '12px 16px', borderRadius: 8, marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: isBalanced ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isBalanced ? (
                    <>
                      <CheckCircle2 size={16} color="var(--color-success)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-success)' }}>
                        Balanced (Debit = Credit: {fmtLKR(totalDebit)})
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} color="var(--color-danger)" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-danger)' }}>
                        Out of Balance: Difference of {fmtLKR(difference)}
                      </span>
                    </>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Total Debits: {fmtLKR(totalDebit)} | Total Credits: {fmtLKR(totalCredit)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isBalanced || createMut.isPending}
                >
                  {createMut.isPending ? 'Posting...' : 'Post Journal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
