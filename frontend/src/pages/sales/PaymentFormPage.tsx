import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle, Search, Check, DollarSign } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createPayment } from '@/api/payments'
import { getCustomers } from '@/api/customers'
import { useToast } from '@/contexts/ToastContext'

export default function PaymentFormPage() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const custWrapperRef = useRef<HTMLDivElement>(null)

  const [type, setType] = useState<'RECEIPT' | 'REFUND'>('RECEIPT')
  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState('CASH')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (custWrapperRef.current && !custWrapperRef.current.contains(event.target as Node)) {
        setShowCustDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!customerId) e.customerId = 'Customer is required'
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) e.amount = 'Valid amount is required'
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: createPayment,
    onSuccess: (pay) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      success('Payment Recorded', `Receipt ${pay.paymentNumber} generated successfully.`)
      navigate('/payments')
    },
    onError: (err: any) => error('Save Failed', err.response?.data?.error || 'Could not record payment.')
  })

  function handleSubmit() {
    if (!validate()) return
    createMut.mutate({ 
      customerId: Number(customerId), 
      amount: Number(amount),
      method,
      type,
      reference,
      notes
    })
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    c.mobile.includes(customerSearch) ||
    c.code.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const selectedCustomer = customers.find(c => String(c.id) === customerId)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/payments')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: type === 'RECEIPT' ? '#e0e7ff' : '#fee2e2', 
                color: type === 'RECEIPT' ? '#4f46e5' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div className="card-title" style={{ fontSize: 16, marginBottom: 2 }}>{type === 'RECEIPT' ? 'Receive Payment' : 'Issue Refund'}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {type === 'RECEIPT' ? 'Record an incoming payment from a customer' : 'Record a refund given back to a customer'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', background: 'var(--hover)', padding: 4, borderRadius: 8, gap: 4, border: '1px solid var(--border)' }}>
              <button 
                className={`btn btn-sm ${type === 'RECEIPT' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setType('RECEIPT')}
                style={{ padding: '6px 16px', borderRadius: 6 }}
              >
                Receive
              </button>
              <button 
                className={`btn btn-sm ${type === 'REFUND' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 16px', borderRadius: 6, ...(type === 'REFUND' ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}) }}
                onClick={() => setType('REFUND')}
              >
                Refund
              </button>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: '32px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* Customer Selection */}
            <div className="form-group" ref={custWrapperRef} style={{ position: 'relative' }}>
              <label className="form-label required">Customer</label>
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className={`form-input ${errors.customerId ? 'error' : ''}`} 
                  placeholder="Search by name, mobile, or code..."
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value)
                    setCustomerId('')
                    setShowCustDropdown(true)
                  }}
                  onFocus={() => setShowCustDropdown(true)}
                />
              </div>
              {errors.customerId && <span className="form-error"><AlertCircle size={11} /> {errors.customerId}</span>}

              {showCustDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 250, overflowY: 'auto',
                  marginTop: 4
                }}>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No customers found.</div>
                  ) : filteredCustomers.map(c => (
                    <div 
                      key={c.id}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => {
                        setCustomerId(String(c.id))
                        setCustomerSearch(`${c.name} (${c.mobile})`)
                        setShowCustDropdown(false)
                        if (errors.customerId) setErrors(e => { const n={...e}; delete n.customerId; return n })
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {customerId === String(c.id) ? <Check size={14} style={{ color: 'var(--color-success)' }}/> : <div style={{width: 14}}/>}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.mobile}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: Number(c.outstanding) > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                        Bal: LKR {Number(c.outstanding).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Current Outstanding Balance</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: Number(selectedCustomer.outstanding) > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontFamily: 'monospace' }}>
                    LKR {Number(selectedCustomer.outstanding).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {(Number(selectedCustomer.outstanding) > 0 && type === 'RECEIPT') && (
                  <button className="btn btn-outline btn-sm" onClick={() => setAmount(String(selectedCustomer.outstanding))}>
                    Pay Full Balance
                  </button>
                )}
                {(Number(selectedCustomer.outstanding) < 0 && type === 'REFUND') && (
                  <button className="btn btn-outline btn-sm" onClick={() => setAmount(String(Math.abs(Number(selectedCustomer.outstanding))))}>
                    Refund Full Credit
                  </button>
                )}
              </div>
            )}

            {/* Payment Details */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label required">Amount (LKR)</label>
                <input 
                  type="number" 
                  className={`form-input ${errors.amount ? 'error' : ''}`} 
                  placeholder="0.00" 
                  min="0.01" step="any"
                  value={amount} 
                  onChange={e => setAmount(e.target.value)} 
                />
                {errors.amount && <span className="form-error"><AlertCircle size={11} /> {errors.amount}</span>}
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label required">Method</label>
                <select className="form-input" style={{ appearance: 'auto' }} value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reference (Optional)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Cheque Number, Bank Txn ID"
                value={reference} 
                onChange={e => setReference(e.target.value)} 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea 
                className="form-input" 
                placeholder="Any additional details..."
                rows={2}
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
              />
            </div>

          </div>
        </div>

        <div className="card-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/payments')}>Cancel</button>
          <button 
            className="btn btn-primary" 
            style={type === 'REFUND' ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}}
            onClick={handleSubmit} 
            disabled={createMut.isPending}
          >
            {createMut.isPending ? 'Processing...' : <><Save size={16} /> Record {type === 'RECEIPT' ? 'Payment' : 'Refund'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
