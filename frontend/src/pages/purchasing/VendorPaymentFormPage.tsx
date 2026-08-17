import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Building2, CreditCard, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createVendorPayment } from '@/api/vendor-payments'
import { getVendors } from '@/api/vendors'
import { useToast } from '@/contexts/ToastContext'
import VendorSearchInput from '@/components/ui/VendorSearchInput'

export default function VendorPaymentFormPage() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    vendorId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    method: 'CASH',
    reference: '',
    notes: '',
  })

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors })
  
  const selectedVendor = vendors.find(v => String(v.id) === formData.vendorId)
  
  // Calculate how much we owe the vendor based on their ledger/purchases
  // For now, we will fetch their true balance via an API, but since we don't have a vendor ledger API yet,
  // we will just show a UI note to the user. (Ideally, the API returns `currentBalance` for the vendor).

  const saveMut = useMutation({
    mutationFn: (data: any) => createVendorPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payments'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-ledger'] })
      success('Success', `Payment recorded successfully`)
      navigate('/vendor-payments')
    },
    onError: (err: any) => {
      error('Error', err.response?.data?.error || 'Failed to record payment')
    }
  })

  function handleSubmit() {
    if (!formData.vendorId) return error('Validation Error', 'Please select a vendor')
    if (Number(formData.amount) <= 0) return error('Validation Error', 'Please enter a valid amount')

    saveMut.mutate({
      vendorId: Number(formData.vendorId),
      date: formData.date,
      amount: Number(formData.amount),
      method: formData.method,
      reference: formData.reference,
      notes: formData.notes,
    })
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendor-payments')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Payments
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="card-title" style={{ fontSize: 18, marginBottom: 2 }}>Record Vendor Payment</h2>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Settle outstanding bills for suppliers</div>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: 32 }}>
          
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label required">Select Vendor</label>
            <VendorSearchInput 
              vendors={vendors}
              value={formData.vendorId}
              onChange={val => setFormData({ ...formData, vendorId: val })}
              placeholder="Search vendor by name, code or mobile..."
            />
            
            {selectedVendor && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: 'var(--hover)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)' }}>
                <AlertCircle size={14} color="var(--color-gold-primary)" />
                <span style={{ fontSize: 13 }}>Make sure to check the Vendor's Ledger to verify the exact outstanding balance before making a payment.</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div className="form-group">
              <label className="form-label required">Payment Date</label>
              <input 
                type="date" 
                className="form-input"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Payment Method</label>
              <select 
                className="form-input"
                value={formData.method}
                onChange={e => setFormData({ ...formData, method: e.target.value })}
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Amount Paid (LKR)</label>
              <input 
                type="number" 
                min="0.01" step="0.01"
                className="form-input"
                style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-success)', height: 'auto', padding: '12px 16px' }}
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Cheque No / Transfer Ref"
                value={formData.reference}
                onChange={e => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea 
                className="form-input" 
                rows={3} 
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this payment..."
              />
            </div>
          </div>
        </div>
        
        <div className="card-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/vendor-payments')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Processing...' : <><Save size={16} /> Record Payment</>}
          </button>
        </div>
      </div>
    </div>
  )
}
