import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, CreditCard, CheckCircle2, DollarSign, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoiceById, recordPayment } from '@/api/invoices'
import { format, parseISO } from 'date-fns'
import { useToast } from '@/contexts/ToastContext'

function fmtLKR(n: number) {
  return `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvoiceProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => getInvoiceById(id!)
  })

  const payMut = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      success('Payment Recorded', 'The payment has been successfully recorded.')
      setShowPayModal(false)
      setPayAmount('')
    },
    onError: () => error('Payment Failed', 'Could not record the payment.')
  })

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  }
  if (!invoice) return <div>Invoice not found</div>

  const isPaid = invoice.status === 'PAID'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Invoices
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={13} /> Print
        </button>
        {!isPaid && (
          <button className="btn btn-primary btn-sm" onClick={() => {
            setPayAmount(String(invoice.balance))
            setShowPayModal(true)
          }}>
            <CreditCard size={13} /> Record Payment
          </button>
        )}
      </div>

      <div className="card invoice-document" style={{ padding: 40, background: '#fff', color: '#333' }}>
        
        {/* Invoice Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #D4AF37', paddingBottom: 20, marginBottom: 30 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#D4AF37', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>INVOICE</h1>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Invoice No: <strong style={{ color: '#000' }}>{invoice.invoiceNumber}</strong></div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Date: <strong style={{ color: '#000' }}>{format(parseISO(invoice.date), 'MMMM dd, yyyy')}</strong></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>Golden Auto Detail ERP</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>123 Detailing Avenue, Colombo</div>
            <div style={{ fontSize: 13, color: '#666' }}>Phone: +94 77 123 4567</div>
          </div>
        </div>

        {/* Billing Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Billed To</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{invoice.customer?.name}</div>
            <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{invoice.customer?.mobile}</div>
            {invoice.customer?.email && <div style={{ fontSize: 13, color: '#555' }}>{invoice.customer.email}</div>}
          </div>
          
          <div style={{ textAlign: 'right', padding: '16px 24px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #eee' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total Amount</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#D4AF37', fontFamily: 'monospace' }}>
              {fmtLKR(invoice.total)}
            </div>
            <div style={{ marginTop: 8 }}>
              {isPaid ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12, fontWeight: 700, padding: '4px 8px', background: '#ecfdf5', borderRadius: 4 }}>
                  <CheckCircle2 size={14} /> FULLY PAID
                </span>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
                  Balance Due: {fmtLKR(invoice.balance)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Description</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Unit Price</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Discount</th>
              <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, color: '#666', textTransform: 'uppercase' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '16px 8px', fontSize: 14, color: '#222', fontWeight: 500 }}>{item.description}</td>
                <td style={{ textAlign: 'right', padding: '16px 8px', fontSize: 14, color: '#555' }}>{Number(item.quantity)}</td>
                <td style={{ textAlign: 'right', padding: '16px 8px', fontSize: 14, color: '#555', fontFamily: 'monospace' }}>{fmtLKR(item.unitPrice)}</td>
                <td style={{ textAlign: 'right', padding: '16px 8px', fontSize: 14, color: Number(item.discount) > 0 ? '#ef4444' : '#555', fontFamily: 'monospace' }}>
                  {Number(item.discount) > 0 ? `-${fmtLKR(item.discount)}` : '-'}
                </td>
                <td style={{ textAlign: 'right', padding: '16px 8px', fontSize: 14, color: '#111', fontWeight: 600, fontFamily: 'monospace' }}>{fmtLKR(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Notes */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: 40 }}>
            {invoice.notes && (
              <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: 8, borderLeft: '4px solid #D4AF37' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes / Remarks</div>
                <div style={{ fontSize: 14, color: '#333', whiteSpace: 'pre-wrap' }}>{invoice.notes}</div>
              </div>
            )}
          </div>
          <div style={{ width: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
              <span style={{ color: '#666' }}>Subtotal</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{fmtLKR(invoice.subtotal)}</span>
            </div>
            {Number(invoice.discountAmount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
                <span style={{ color: '#666' }}>Discount</span>
                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#ef4444' }}>-{fmtLKR(invoice.discountAmount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '2px solid #D4AF37', fontSize: 18, fontWeight: 800 }}>
              <span>Total</span>
              <span style={{ fontFamily: 'monospace', color: '#D4AF37' }}>{fmtLKR(invoice.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
              <span style={{ color: '#666' }}>Amount Paid</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace', color: '#10b981' }}>{fmtLKR(invoice.amountPaid)}</span>
            </div>
          </div>
        </div>

        {/* Payments History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 12 }}>Payment History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {invoice.payments.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8f9fa', borderRadius: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{p.method} Payment</div>
                      <div style={{ fontSize: 11, color: '#666' }}>{format(parseISO(p.date), 'MMM dd, yyyy h:mm a')} • {p.paymentNumber}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                    +{fmtLKR(p.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Payment Modal */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Record Payment</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPayModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Amount to Pay (LKR)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)}
                  max={Number(invoice.balance)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-input" style={{ appearance: 'auto' }} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) return error('Invalid Amount', 'Please enter a valid amount')
                payMut.mutate({ invoiceId: invoice.id, amount: Number(payAmount), method: payMethod })
              }} disabled={payMut.isPending}>
                {payMut.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Basic print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .invoice-document, .invoice-document * { visibility: visible; }
          .invoice-document { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
        }
      `}</style>
    </div>
  )
}
