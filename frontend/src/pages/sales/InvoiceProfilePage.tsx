import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, CreditCard, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoiceById, recordPayment } from '@/api/invoices'
import { getSettings } from '@/api/system'
import { format, parseISO } from 'date-fns'
import { useToast } from '@/contexts/ToastContext'

export default function InvoiceProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
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

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!invoice) return <div>Invoice not found</div>

  const isPaid = invoice.status === 'PAID'

  return (
    <>
      <div className="no-print" style={{ maxWidth: 800, margin: '0 auto', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
      </div>

      <div className="invoice-paper">
        <div className="print-header">
          <div className="print-header-left">Invoice</div>
          <div className="print-header-right">
            <div className="print-logo">
              <svg width="40" height="12" viewBox="0 0 100 30" style={{ fill: '#fff', verticalAlign: 'middle', marginRight: 8, display: 'inline-block' }}>
                <path d="M10,20 Q20,10 40,10 L60,10 Q80,10 90,20 L95,30 L5,30 Z" opacity="0.8"/>
                <circle cx="25" cy="30" r="5" fill="#fff"/>
                <circle cx="75" cy="30" r="5" fill="#fff"/>
              </svg>
              {settings?.companyName || 'AUTO ELEVATE'}
            </div>
            <div className="print-address">{settings?.companyAddress || 'No.4, Thudella, Ja Ela'}</div>
          </div>
        </div>
        
        <div className="print-content">
          <div className="print-info">
            <div className="print-info-left">
              <div className="print-label">ISSUED TO: {invoice.customer?.code || ''}</div>
              <div className="print-value">{invoice.customer?.name}</div>
              <div className="print-value">Contact No. {invoice.customer?.mobile}</div>
            </div>
            <div className="print-info-right">
              <div className="print-label">INVOICE NO:</div>
              <div className="print-value" style={{ fontWeight: 700, fontSize: 14 }}>#{invoice.invoiceNumber}</div>
              <div className="print-value" style={{ marginTop: 16, color: '#555' }}>{format(parseISO(invoice.date), 'dd.MM.yyyy')}</div>
            </div>
          </div>

          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '10%', textAlign: 'left' }}>ORDER</th>
                <th style={{ width: '70%', textAlign: 'left' }}>SERVICE</th>
                <th style={{ width: '20%', textAlign: 'right' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, index: number) => (
                <tr key={item.id}>
                  <td style={{ verticalAlign: 'top', fontWeight: 500, paddingTop: 30 }}>{index + 1}</td>
                  <td style={{ textAlign: 'left', paddingRight: 20, paddingTop: 30 }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {item.description}
                    </div>
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'right', fontWeight: 500, fontSize: '14px', paddingTop: 30 }}>
                    {Number(item.total).toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-totals">
            <div className="print-totals-row">
              <span>TOTAL {Number(invoice.discountAmount) > 0 ? '(SPECIAL OFFERS)' : ''}</span>
              <span>{Number(invoice.total).toLocaleString('en-US')}</span>
            </div>
            <div className="print-totals-final">
              <span style={{ letterSpacing: 1, marginTop: 6 }}>Total</span>
              <div className="print-totals-final-value">
                <div style={{ fontSize: 12, marginBottom: 4, letterSpacing: 1 }}>LKR</div>
                {Number(invoice.total).toLocaleString('en-US')}
              </div>
            </div>
          </div>

          <div className="print-conditions">
            
            
            <div className="print-signature">
              thank<br/>You
            </div>
          </div>
        </div>
      </div>

      {showPayModal && (
        <div className="modal-overlay no-print">
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:ital@0;1&family=Great+Vibes&display=swap');

        .invoice-paper {
          background: #fff;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          font-family: 'Montserrat', sans-serif;
          color: #000;
          position: relative;
          overflow: hidden;
        }
        .print-header {
          background: #000; color: #fff; padding: 40px 50px;
          display: flex; justify-content: space-between; align-items: center;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .print-header-left { font-family: 'Playfair Display', serif; font-size: 44px; letter-spacing: 2px; }
        .print-header-right { text-align: right; }
        .print-logo {
          font-size: 16px; font-weight: 700; letter-spacing: 4px;
          text-transform: uppercase; margin-bottom: 4px;
        }
        .print-address { font-size: 12px; color: #ccc; letter-spacing: 1px; }
        .print-content { padding: 50px; position: relative; min-height: 800px; }
        .print-info {
          display: flex; justify-content: space-between; margin-bottom: 60px;
          font-size: 13px; line-height: 1.8;
        }
        .print-info-left { flex: 1; }
        .print-info-right { text-align: right; }
        .print-label { font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .print-value { color: #333; font-weight: 500; }
        .print-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        .print-table th {
          border-top: 1px solid #000; border-bottom: 1px solid #000;
          padding: 12px 0; font-weight: 700; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
        }
        .print-table td { padding: 30px 0; border-bottom: 1px solid #eee; }
        .print-totals { border-top: 1px solid #000; margin-bottom: 60px; padding-top: 20px; }
        .print-totals-row {
          display: flex; justify-content: space-between;
          font-weight: 700; font-size: 14px; letter-spacing: 1px;
          margin-bottom: 24px; border-bottom: 1px solid #000; padding-bottom: 20px;
        }
        .print-totals-final {
          display: flex; justify-content: flex-end; gap: 40px;
          font-size: 14px; align-items: flex-start;
        }
        .print-totals-final-value { text-align: right; font-size: 18px; font-weight: 500; letter-spacing: 1px; }
        .print-conditions-title { font-weight: 700; font-size: 13px; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; }
        .print-conditions-list { margin: 0; padding-left: 16px; font-size: 11px; line-height: 1.6; color: #111; }
        .print-conditions-list li { margin-bottom: 12px; }
        .print-conditions-list strong { font-weight: 600; }
        .print-signature {
          position: absolute; bottom: 50px; right: 50px;
          font-family: 'Great Vibes', cursive; font-size: 64px; line-height: 0.9; color: #333;
          transform: rotate(-5deg); text-align: center;
        }

        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .invoice-paper, .invoice-paper * { visibility: visible; }
          .invoice-paper {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none; max-width: 100%;
          }
        }
`}</style>
    </>
  )
}
