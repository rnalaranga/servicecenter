import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Edit, Trash2, Building2, Phone, Mail, MapPin, Hash,
  CheckCircle2, XCircle, Plus, DollarSign, FileText, Receipt,
  BookOpen, CreditCard, ShoppingBag, AlertTriangle, Printer
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVendor, deleteVendor } from '@/api/vendors'
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

export default function VendorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'ledger' | 'purchases' | 'payments' | 'info'>('ledger')

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => getVendor(id!),
    enabled: !!id,
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteVendor(id!),
    onSuccess: (res) => {
      alert(res.message || 'Vendor updated successfully')
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      navigate('/vendors')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete vendor')
    }
  })

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete or deactivate this supplier?')) {
      deleteMut.mutate()
    }
  }

  if (isLoading) {
    return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" /></div>
  }

  if (!vendor) {
    return (
      <div className="card" style={{ maxWidth: 600, margin: '40px auto', textAlign: 'center', padding: 40 }}>
        <h3>Vendor Not Found</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>The requested supplier could not be found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/vendors')}>Back to Vendors</button>
      </div>
    )
  }

  const purchases = vendor.purchases || []
  const payments = vendor.vendorPayments || []
  const ledger = vendor.ledger || []
  const totalPurchases = Number(vendor.totalPurchases || 0)
  const totalPaid = Number(vendor.totalPaid || 0)
  const currentBalance = Number(vendor.currentBalance ?? vendor.balance ?? vendor.openingBalance ?? 0)
  const openingBal = Number(vendor.openingBalance || 0)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Top Bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')} style={{ gap: 6 }}>
          <ArrowLeft size={15} /> Back to Suppliers
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()} style={{ gap: 6 }}>
            <Printer size={14} /> Print Statement
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/purchases/new?vendorId=${vendor.id}`)} style={{ gap: 6 }}>
            <Plus size={14} /> New Purchase
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/vendor-payments/new?vendorId=${vendor.id}`)} style={{ gap: 6 }}>
            <CreditCard size={14} /> Record Payment
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/vendors/${id}/edit`)} style={{ gap: 6 }}>
            <Edit size={14} /> Edit
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleDelete} style={{ color: 'var(--color-danger)', gap: 6 }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {/* ── Vendor Header Hero ── */}
      <div className="card" style={{ marginBottom: 20, padding: 24, borderTop: '4px solid var(--color-gold-primary)' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72, borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.08))',
            border: '1px solid rgba(212,175,55,0.3)',
            color: 'var(--color-gold-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Building2 size={36} />
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{vendor.name}</h1>
              <span className="badge badge-outline" style={{ fontFamily: 'monospace', fontSize: 12 }}>{vendor.code}</span>
              {vendor.isActive ? (
                <span className="badge badge-success" style={{ gap: 4 }}><CheckCircle2 size={12} /> Active Supplier</span>
              ) : (
                <span className="badge badge-danger" style={{ gap: 4 }}><XCircle size={12} /> Inactive</span>
              )}
            </div>

            {vendor.companyName && (
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>{vendor.companyName}</div>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)' }}>
              {vendor.contactPerson && (
                <div><strong>Contact:</strong> {vendor.contactPerson}</div>
              )}
              {vendor.mobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} /> {vendor.mobile}</div>
              )}
              {vendor.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13} /> {vendor.email}</div>
              )}
              {vendor.creditTerms !== null && vendor.creditTerms !== undefined && (
                <div><strong>Credit Terms:</strong> {vendor.creditTerms > 0 ? `${vendor.creditTerms} Days` : 'Cash on Delivery'}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── 4 Financial KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderLeft: '3px solid var(--color-gold-primary)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Total Purchases</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>
              {fmtLKR(totalPurchases)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{purchases.length} bills recorded</div>
          </div>

          <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderLeft: '3px solid var(--color-success)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Total Paid</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-success)' }}>
              {fmtLKR(totalPaid)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>{payments.length} payments made</div>
          </div>

          <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderLeft: `3px solid ${currentBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)'}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Outstanding Balance</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: currentBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {fmtLKR(currentBalance)}
            </div>
            <div style={{ fontSize: 11, color: currentBalance > 0 ? 'var(--color-danger)' : 'var(--text-subtle)', marginTop: 2 }}>
              {currentBalance > 0 ? 'Payable to supplier' : 'Settled in full'}
            </div>
          </div>

          <div className="card" style={{ padding: '14px 18px', background: 'var(--surface)', borderLeft: '3px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>Opening Balance</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-muted)' }}>
              {fmtLKR(openingBal)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Initial balance b/f</div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button
          className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <BookOpen size={14} /> Supplier Ledger
          <span className="badge badge-outline" style={{ fontSize: 10, padding: '1px 6px' }}>{ledger.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setActiveTab('purchases')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <ShoppingBag size={14} /> Purchases / Bills
          <span className="badge badge-outline" style={{ fontSize: 10, padding: '1px 6px' }}>{purchases.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <CreditCard size={14} /> Payments History
          <span className="badge badge-outline" style={{ fontSize: 10, padding: '1px 6px' }}>{payments.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Building2 size={14} /> Supplier Info & Contact
        </button>
      </div>

      {/* ── Tab Content ── */}

      {/* 1. LEDGER TAB */}
      {activeTab === 'ledger' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Supplier Statement & Running Ledger</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()} style={{ gap: 6 }}>
              <Printer size={13} /> Print Ledger
            </button>
          </div>

          {ledger.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <BookOpen size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>No ledger entries found for this supplier.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'right' }}>Debit (Paid)</th>
                    <th style={{ textAlign: 'right' }}>Credit (Billed)</th>
                    <th style={{ textAlign: 'right' }}>Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l: any) => {
                    const dr = Number(l.debit || 0)
                    const cr = Number(l.credit || 0)
                    const bal = Number(l.balance || 0)
                    return (
                      <tr key={l.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(l.date)}</td>
                        <td>
                          <span className={`badge ${
                            l.type === 'PURCHASE' ? 'badge-open' :
                            l.type === 'PAYMENT' ? 'badge-paid' :
                            l.type === 'OPENING_BALANCE' ? 'badge-draft' : 'badge-gold'
                          }`}>
                            {l.type === 'OPENING_BALANCE' ? 'Opening Bal' : l.type}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--color-gold-primary)' }}>
                            {l.refNumber || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text)' }}>{l.description || '—'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: dr > 0 ? 'var(--color-success)' : 'var(--text-subtle)' }}>
                          {dr > 0 ? fmtLKR(dr) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: cr > 0 ? 'var(--color-danger)' : 'var(--text-subtle)' }}>
                          {cr > 0 ? fmtLKR(cr) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: bal > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {fmtLKR(bal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--hover)' }}>
                    <td colSpan={4} style={{ fontWeight: 700, fontSize: 12 }}>Summary Totals</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-success)' }}>
                      {fmtLKR(ledger.reduce((s: number, l: any) => s + Number(l.debit || 0), 0))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                      {fmtLKR(ledger.reduce((s: number, l: any) => s + Number(l.credit || 0), 0))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: currentBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {fmtLKR(currentBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. PURCHASES TAB */}
      {activeTab === 'purchases' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Purchase Bills & Orders</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/purchases/new?vendorId=${vendor.id}`)} style={{ gap: 6 }}>
              <Plus size={13} /> New Purchase Bill
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShoppingBag size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>No purchase bills recorded for this supplier.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Items</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Paid</th>
                    <th style={{ textAlign: 'right' }}>Balance</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p: any) => {
                    const pTotal = Number(p.total || 0)
                    const pPaid = Number(p.amountPaid || 0)
                    const pBal = Number(p.balance ?? (pTotal - pPaid))
                    return (
                      <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/purchases/${p.id}`)}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--color-gold-primary)' }}>
                            {p.purchaseNumber || `PO-${p.id}`}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.date)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.dueDate)}</td>
                        <td style={{ fontSize: 12 }}>{p.items?.length || 0} items</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{fmtLKR(pTotal)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: 12, color: 'var(--color-success)' }}>{fmtLKR(pPaid)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: pBal > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {fmtLKR(pBal)}
                        </td>
                        <td>
                          <span className={`badge ${
                            p.status === 'COMPLETED' ? 'badge-completed' :
                            p.status === 'RECEIVED' ? 'badge-paid' :
                            p.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-draft'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/purchases/${p.id}`); }}>
                            <FileText size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. PAYMENTS TAB */}
      {activeTab === 'payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Payments Made to Supplier</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/vendor-payments/new?vendorId=${vendor.id}`)} style={{ gap: 6 }}>
              <Plus size={13} /> Record Vendor Payment
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <CreditCard size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>No payments recorded for this supplier.</div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pay: any) => (
                    <tr key={pay.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: 'var(--color-gold-primary)' }}>
                          {pay.paymentNumber || `VP-${pay.id}`}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(pay.date)}</td>
                      <td>
                        <span className="badge badge-open">{pay.method}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pay.reference || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', fontSize: 12, color: 'var(--color-success)' }}>
                        {fmtLKR(pay.amount)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pay.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. SUPPLIER INFO TAB */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Contact Information</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CONTACT PERSON</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor.contactPerson || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY MOBILE / PHONE</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor.mobile || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL ADDRESS</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor.email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PHYSICAL ADDRESS</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor.address || '—'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Commercial & Tax Details</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TAX ID / BUSINESS REGISTRATION (BRN)</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor.taxId || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CREDIT TERMS</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{vendor.creditTerms ? `${vendor.creditTerms} Days` : 'Cash on Delivery (COD)'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>INITIAL OPENING BALANCE</div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'monospace' }}>{fmtLKR(vendor.openingBalance)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED DATE</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{formatDate(vendor.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>

          {vendor.notes && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header">
                <h3 className="card-title">Supplier Notes</h3>
              </div>
              <div className="card-body" style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: 'var(--text)' }}>
                {vendor.notes}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
