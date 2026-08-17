import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2, AlertCircle, X, Check, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createDirectInvoice } from '@/api/invoices'
import { getCustomers, createCustomer, type Customer } from '@/api/customers'
import { createVehicle, updateVehicle } from '@/api/vehicles'
import { getProducts } from '@/api/products'
import { getServices } from '@/api/services'
import { useToast } from '@/contexts/ToastContext'

// --- Autocomplete for Items ---
function ItemAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  suggestions 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  onSelect: (item: { name: string, price: number }) => void,
  suggestions: { id: string, name: string, price: number, type: string }[] 
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filtered = suggestions.filter(s => s.name.toLowerCase().includes(value.toLowerCase()))

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input 
        type="text" 
        className="form-input" 
        placeholder="e.g. Wash & Wax or type custom item..." 
        value={value} 
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && value && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto',
          marginTop: 4
        }}>
          {filtered.map(s => (
            <div 
              key={s.id}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => { onSelect(s); setOpen(false) }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, textTransform: 'uppercase' }}>{s.type}</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>LKR {s.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export default function InvoiceFormPage() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const custWrapperRef = useRef<HTMLDivElement>(null)

  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAdd, setQuickAdd] = useState({ name: '', mobile: '', vehicleReg: '' })
  const [transferVehicleId, setTransferVehicleId] = useState<number | null>(null)

  const [notes, setNotes] = useState('')
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0, discount: 0 }])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => import('@/api/vehicles').then(m => m.getVehicles()) })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: getServices })

  const allSuggestions = [
    ...products.map(p => ({ id: `p_${p.id}`, name: p.name, price: Number(p.sellingPrice), type: 'Product' })),
    ...services.map(s => ({ id: `s_${s.id}`, name: s.name, price: Number(s.sellingPrice), type: 'Service' }))
  ]

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (custWrapperRef.current && !custWrapperRef.current.contains(event.target as Node)) {
        setShowCustDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function addItem() {
    setItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, discount: 0 }])
  }

  function updateItem(index: number, field: string, value: any) {
    setItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  function removeItem(index: number) {
    if (items.length === 1) return
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!customerId) e.customerId = 'Customer is required'
    
    let hasValidItem = false
    items.forEach((item, idx) => {
      if (item.description.trim()) {
        hasValidItem = true
        if (item.quantity <= 0) e[`item_${idx}`] = 'Quantity must be > 0'
        if (item.unitPrice < 0) e[`item_${idx}`] = 'Price cannot be negative'
      }
    })

    if (!hasValidItem) e.items = 'Add at least one valid item to the invoice'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: createDirectInvoice,
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      success('Invoice Created', `Invoice ${inv.invoiceNumber} has been successfully generated.`)
      navigate(`/invoices/${inv.id}`)
    },
    onError: (err: any) => error('Save Failed', err.response?.data?.error || 'Could not create invoice.')
  })

  function handleSubmit() {
    if (!validate()) return
    const validItems = items.filter(i => i.description.trim()).map(i => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPrice: Number(i.unitPrice),
      discount: Number(i.discount)
    }))

    createMut.mutate({ 
      customerId: Number(customerId), 
      notes, 
      globalDiscount: Number(globalDiscount) || 0,
      paymentAmount: Number(paymentAmount) || 0,
      paymentMethod,
      items: validItems 
    })
  }

  const handleQuickAdd = async () => {
    if (!quickAdd.name || !quickAdd.mobile) {
      error('Missing Fields', 'Name and Mobile are required.')
      return
    }
    try {
      const newCust = await createCustomer({
        name: quickAdd.name,
        mobile: quickAdd.mobile,
        customerType: 'INDIVIDUAL',
        isActive: true,
        creditLimit: 0,
        openingBalance: 0,
      } as any)
      
      if (quickAdd.vehicleReg) {
        if (transferVehicleId) {
          await updateVehicle(String(transferVehicleId), { customerId: newCust.id })
        } else {
          await createVehicle({
            registration: quickAdd.vehicleReg,
            customerId: newCust.id,
            make: 'Unknown', 
            model: 'Unknown',
            isActive: true,
            year: null, 
            mileage: null,
          } as any)
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      success('Customer Added', `${quickAdd.name} has been added successfully.`)
      setCustomerId(String(newCust.id))
      setCustomerSearch(`${newCust.name} (${newCust.mobile})`)
      setShowQuickAdd(false)
      setQuickAdd({ name: '', mobile: '', vehicleReg: '' })
      setTransferVehicleId(null)
    } catch (e: any) {
      error('Error', e.response?.data?.error || 'Failed to quick add customer')
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const itemDiscounts = items.reduce((sum, item) => sum + Number(item.discount), 0)
  const totalDiscount = itemDiscounts + (Number(globalDiscount) || 0)
  const total = Math.max(0, subtotal - totalDiscount)
  const balanceDue = Math.max(0, total - (Number(paymentAmount) || 0))

  const searchQ = customerSearch.toLowerCase()
  const matchingVehicles = vehicles.filter(v => v.registration.toLowerCase().includes(searchQ))
  const matchingCustomerIds = new Set(matchingVehicles.map(v => v.customerId))

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQ) || 
    c.mobile.includes(searchQ) ||
    matchingCustomerIds.has(c.id)
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={createMut.isPending}>
          {createMut.isPending ? 'Generating...' : <><Save size={13} /> Generate Invoice</>}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={16} style={{ color: '#0F1115' }} />
            </div>
            <div>
              <div className="card-title">New Direct Invoice</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Create an invoice without a job card
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div className="form-group" ref={custWrapperRef} style={{ position: 'relative', maxWidth: 400 }}>
              <label className="form-label required">Customer</label>
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className={`form-input ${errors.customerId ? 'error' : ''}`} 
                  placeholder="Search by name or mobile..."
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
                  {filteredCustomers.map(c => (
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
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.mobile}</div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Quick Add Button inside Dropdown */}
                  <div 
                    style={{ padding: '10px 12px', cursor: 'pointer', background: '#f8fafc', color: 'var(--color-gold-primary)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => {
                      setQuickAdd(p => ({ ...p, name: customerSearch }))
                      setShowQuickAdd(true)
                      setShowCustDropdown(false)
                    }}
                  >
                    <Plus size={14} /> Add New Customer {customerSearch ? `"${customerSearch}"` : ''}
                  </div>
                </div>
              )}
            </div>

            <div className="divider" />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Line Items</h4>
              <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={13} /> Add Item</button>
            </div>
            {errors.items && <div className="form-error"><AlertCircle size={11} /> {errors.items}</div>}

            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Item Description</th>
                  <th style={{ width: '12%' }}>Qty</th>
                  <th style={{ width: '18%' }}>Unit Price (LKR)</th>
                  <th style={{ width: '15%' }}>Discount (LKR)</th>
                  <th style={{ width: '10%' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <ItemAutocomplete
                        value={item.description}
                        onChange={(val) => updateItem(idx, 'description', val)}
                        onSelect={(s) => {
                          updateItem(idx, 'description', s.name)
                          updateItem(idx, 'unitPrice', s.price)
                        }}
                        suggestions={allSuggestions}
                      />
                    </td>
                    <td>
                      <input type="number" className={`form-input ${errors[`item_${idx}`] ? 'error' : ''}`} min="0.1" step="any" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="form-input" min="0" step="any" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" className="form-input" min="0" step="any" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)} />
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeItem(idx)} disabled={items.length === 1} style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                  <td colSpan={3} style={{ textAlign: 'right', fontSize: 14, fontFamily: 'monospace' }}>LKR {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
                {itemDiscounts > 0 && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600 }}>Item Discounts:</td>
                    <td colSpan={3} style={{ textAlign: 'right', fontSize: 14, color: 'var(--color-danger)', fontFamily: 'monospace' }}>- LKR {itemDiscounts.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>Global Discount (LKR):</td>
                  <td colSpan={3} style={{ textAlign: 'right' }}>
                    <input 
                      type="number" 
                      className="form-input" 
                      style={{ width: 140, marginLeft: 'auto', textAlign: 'right', color: 'var(--color-danger)', fontWeight: 600 }}
                      min="0" step="any"
                      value={globalDiscount || ''} 
                      onChange={e => setGlobalDiscount(Number(e.target.value))} 
                      placeholder="0.00"
                    />
                  </td>
                </tr>
                <tr>
                  <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, paddingTop: 16 }}>Total Amount:</td>
                  <td colSpan={3} style={{ textAlign: 'right', paddingTop: 16, fontSize: 20, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                    LKR {total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="divider" />
            
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: '1 1 300px' }}>
                <label className="form-label">Notes / Remarks</label>
                <textarea 
                  className="form-input" 
                  placeholder="Add any notes or payment instructions..." 
                  rows={4}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div style={{ flex: '1 1 300px', background: '#f8fafc', padding: 20, borderRadius: 8, border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Record Initial Payment</h4>
                <div className="form-group">
                  <label className="form-label">Amount Paid (LKR)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder={`e.g. ${total}`}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Payment Method</label>
                  <select className="form-input" style={{ appearance: 'auto' }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Credit/Debit Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                {Number(paymentAmount) > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                    <span>Balance Due:</span>
                    <span style={{ color: balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontFamily: 'monospace' }}>
                      LKR {balanceDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Quick Add Customer</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowQuickAdd(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Customer Name</label>
                <input type="text" className="form-input" value={quickAdd.name} onChange={e => setQuickAdd(p => ({...p, name: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label required">Mobile Number</label>
                <input type="text" className="form-input" value={quickAdd.mobile} onChange={e => setQuickAdd(p => ({...p, mobile: e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Registration (Optional)</label>
                <input type="text" className="form-input" placeholder="e.g. CAA-1234" value={quickAdd.vehicleReg} onChange={e => setQuickAdd(p => ({...p, vehicleReg: e.target.value}))} />
              </div>
              
              {/* Suggestions */}
              {(() => {
                if (!quickAdd.mobile && !quickAdd.vehicleReg) return null;
                
                const mobileSuggestions = quickAdd.mobile && quickAdd.mobile.length >= 3 
                  ? customers.filter(c => c.mobile.includes(quickAdd.mobile))
                  : [];
                  
                const vehicleSuggestions = quickAdd.vehicleReg && quickAdd.vehicleReg.length >= 2
                  ? vehicles.filter(v => v.registration.toLowerCase().includes(quickAdd.vehicleReg.toLowerCase()))
                  : [];

                if (mobileSuggestions.length === 0 && vehicleSuggestions.length === 0) return null;

                return (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Suggestions / Existing</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 150, overflowY: 'auto' }}>
                      
                      {mobileSuggestions.map(c => (
                        <div key={`m_${c.id}`} style={{ padding: 10, background: 'var(--hover)', border: '1px solid var(--border)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-danger)', fontWeight: 600 }}>Mobile Matches: {c.mobile}</div>
                          </div>
                          <button className="btn btn-primary btn-sm" onClick={() => {
                            setCustomerId(String(c.id)); setCustomerSearch(`${c.name} (${c.mobile})`); setShowQuickAdd(false); setQuickAdd({ name: '', mobile: '', vehicleReg: '' }); setTransferVehicleId(null);
                          }}>Select</button>
                        </div>
                      ))}

                      {vehicleSuggestions.map(v => {
                        const owner = customers.find(c => c.id === v.customerId);
                        if (!owner) return null;
                        return (
                          <div key={`v_${v.id}`} style={{ padding: 10, background: 'var(--hover)', border: '1px solid var(--border)', borderRadius: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-gold-primary)' }}>{v.registration}</div>
                                <div style={{ fontSize: 11, color: 'var(--text)' }}>Owned by: {owner.name} ({owner.mobile})</div>
                              </div>
                              <button className="btn btn-secondary btn-sm" onClick={() => {
                                setCustomerId(String(owner.id)); setCustomerSearch(`${owner.name} (${owner.mobile})`); setShowQuickAdd(false); setQuickAdd({ name: '', mobile: '', vehicleReg: '' }); setTransferVehicleId(null);
                              }}>Select Owner</button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                              <button className={`btn btn-sm ${transferVehicleId === v.id ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, fontSize: 11 }} onClick={() => setTransferVehicleId(transferVehicleId === v.id ? null : v.id)}>
                                {transferVehicleId === v.id ? <><Check size={12} /> Transfer Ready</> : 'Transfer to New Owner'}
                              </button>
                            </div>
                            {transferVehicleId === v.id && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Saving will transfer {v.registration} to the new customer.</div>}
                          </div>
                        )
                      })}
                      
                    </div>
                  </div>
                )
              })()}

            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowQuickAdd(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleQuickAdd}>Save & Select</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
