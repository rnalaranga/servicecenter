import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, Building2, Package, Search, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts } from '@/api/products'
import { createPurchase } from '@/api/purchases'
import { getVendors } from '@/api/vendors'
import { useToast } from '@/contexts/ToastContext'
import ProductSearchInput from '@/components/ui/ProductSearchInput'
import VendorSearchInput from '@/components/ui/VendorSearchInput'

interface PurchaseItemInput {
  id: string; // temp id for UI
  productId: string;
  quantity: string;
  unitCost: string;
  discount: string;
  taxRate: string;
}

export default function PurchaseFormPage() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    vendorId: '',
    warehouseId: '1', // Hardcode MAIN warehouse for now, can be dynamic later
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    status: 'DRAFT' as 'DRAFT' | 'COMPLETED',
  })

  const [items, setItems] = useState<PurchaseItemInput[]>([])
  
  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: getVendors })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts })

  const addItem = () => {
    setItems([...items, {
      id: Math.random().toString(36).substr(2, 9),
      productId: '',
      quantity: '1',
      unitCost: '0',
      discount: '0',
      taxRate: '0'
    }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof PurchaseItemInput, value: string) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, [field]: value }
        // Auto-fill cost if product selected
        if (field === 'productId') {
          const p = products.find(prod => String(prod.id) === value)
          if (p) updated.unitCost = String(p.purchaseCost || 0)
        }
        return updated
      }
      return i
    }))
  }

  const totals = useMemo(() => {
    let subtotal = 0
    let discount = 0
    let tax = 0

    items.forEach(item => {
      const q = Number(item.quantity) || 0
      const c = Number(item.unitCost) || 0
      const d = Number(item.discount) || 0
      const tr = Number(item.taxRate) || 0

      const lineGross = q * c
      const lineNet = lineGross - d
      const lineTax = lineNet * (tr / 100)

      subtotal += lineGross
      discount += d
      tax += lineTax
    })

    return {
      subtotal,
      discount,
      tax,
      total: subtotal - discount + tax
    }
  }, [items])

  const saveMut = useMutation({
    mutationFn: (data: any) => createPurchase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-ledger'] })
      success('Success', `Purchase created successfully`)
      navigate('/purchases')
    },
    onError: (err: any) => {
      error('Error', err.response?.data?.error || 'Failed to save purchase')
    }
  })

  function handleSubmit(status: 'DRAFT' | 'COMPLETED') {
    if (!formData.vendorId) return error('Validation Error', 'Please select a vendor')
    if (items.length === 0) return error('Validation Error', 'Please add at least one item')
    
    // validate items
    const invalidItems = items.some(i => !i.productId || Number(i.quantity) <= 0 || Number(i.unitCost) < 0)
    if (invalidItems) return error('Validation Error', 'Please fill all item fields properly')

    saveMut.mutate({
      vendorId: Number(formData.vendorId),
      warehouseId: Number(formData.warehouseId),
      date: formData.date,
      dueDate: formData.dueDate || undefined,
      status,
      notes: formData.notes,
      items: items.map(i => ({
        productId: Number(i.productId),
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        discount: Number(i.discount) || 0,
        taxRate: Number(i.taxRate) || 0,
      }))
    })
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/purchases')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Purchases
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
          <h2 className="card-title">Create Purchase Bill</h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enter vendor details and products purchased</div>
        </div>

        <div className="card-body" style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div className="form-group">
              <label className="form-label required">Vendor</label>
              <VendorSearchInput 
                vendors={vendors}
                value={formData.vendorId}
                onChange={val => setFormData({ ...formData, vendorId: val })}
                placeholder="Search vendor..."
              />
            </div>

            <div className="form-group">
              <label className="form-label required">Purchase Date</label>
              <input 
                type="date" 
                className="form-input"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Due Date (Optional)</label>
              <input 
                type="date" 
                className="form-input"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Items</h3>
          
          <table className="table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Product</th>
                <th style={{ width: '12%' }}>Qty</th>
                <th style={{ width: '15%' }}>Unit Cost</th>
                <th style={{ width: '12%' }}>Discount</th>
                <th style={{ width: '12%' }}>Tax %</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Total</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const lineTotal = ((Number(item.quantity) * Number(item.unitCost)) - Number(item.discount)) * (1 + (Number(item.taxRate) / 100))
                
                return (
                  <tr key={item.id}>
                    <td style={{ minWidth: 250 }}>
                      <ProductSearchInput
                        products={products}
                        value={item.productId}
                        onChange={val => updateItem(item.id, 'productId', val)}
                      />
                    </td>
                    <td>
                      <input type="number" min="0.01" step="0.01" className="form-input" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" className="form-input" value={item.unitCost} onChange={e => updateItem(item.id, 'unitCost', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" className="form-input" value={item.discount} onChange={e => updateItem(item.id, 'discount', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" className="form-input" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', verticalAlign: 'middle' }}>
                      {lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => removeItem(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <button className="btn btn-outline btn-sm" onClick={addItem} style={{ gap: 6, marginBottom: 32 }}>
            <Plus size={14} /> Add Line Item
          </button>

          <div style={{ display: 'flex', gap: 40 }}>
            <div style={{ flex: 1 }}>
              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <textarea 
                  className="form-input" 
                  rows={3} 
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for this purchase..."
                />
              </div>
            </div>
            <div style={{ width: 300, background: 'var(--hover)', padding: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{totals.subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Discount</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-danger)' }}>- {totals.discount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottom: '1px dashed var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax</span>
                <span style={{ fontFamily: 'monospace' }}>+ {totals.tax.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>LKR {totals.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            <strong>Note:</strong> Marking as 'Completed' will immediately update inventory stock and vendor ledger.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => handleSubmit('DRAFT')} disabled={saveMut.isPending}>
              Save as Draft
            </button>
            <button className="btn btn-primary" onClick={() => handleSubmit('COMPLETED')} disabled={saveMut.isPending}>
              <CheckCircle2 size={16} /> Complete Purchase
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
