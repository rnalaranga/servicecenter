import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, User, Building2, Phone, Mail, MapPin, Shield, CreditCard, FileText, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomerById, createCustomer, updateCustomer } from '@/api/customers'

interface FormData {
  name: string
  companyName: string
  mobile: string
  secondaryMobile: string
  email: string
  address: string
  city: string
  nicTaxId: string
  customerType: 'INDIVIDUAL' | 'BUSINESS'
  creditLimit: string
  openingBalance: string
  notes: string
  isActive: boolean
}

const emptyForm: FormData = {
  name: '', companyName: '', mobile: '', secondaryMobile: '', email: '',
  address: '', city: '', nicTaxId: '', customerType: 'INDIVIDUAL',
  creditLimit: '0', openingBalance: '0', notes: '', isActive: true,
}

interface FieldError { [k: string]: string }

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<FieldError>({})
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'basic' | 'financial' | 'notes'>('basic')

  const queryClient = useQueryClient()

  // Load existing data on edit
  const { data: existingCustomer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomerById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (isEdit && existingCustomer) {
      setForm({
        name: existingCustomer.name, companyName: existingCustomer.companyName || '',
        mobile: existingCustomer.mobile, secondaryMobile: existingCustomer.secondaryMobile || '',
        email: existingCustomer.email || '', address: existingCustomer.address || '', city: existingCustomer.city || '',
        nicTaxId: existingCustomer.nicTaxId || '', customerType: existingCustomer.customerType as any,
        creditLimit: String(existingCustomer.creditLimit), openingBalance: String(existingCustomer.openingBalance),
        notes: existingCustomer.notes || '', isActive: existingCustomer.isActive,
      })
    }
  }, [isEdit, existingCustomer])

  const createMut = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      success('Customer Created', `${form.name} has been added successfully.`)
      navigate('/customers')
    },
    onError: () => error('Save Failed', 'Unable to create customer. Please try again.')
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => updateCustomer(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      success('Customer Updated', `${form.name} has been updated successfully.`)
      navigate(`/customers/${id}`)
    },
    onError: () => error('Save Failed', 'Unable to update customer. Please try again.')
  })

  function set(key: keyof FormData, value: any) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: FieldError = {}
    if (!form.name.trim()) e.name = 'Customer name is required'
    if (!form.mobile.trim()) e.mobile = 'Mobile number is required'
    if (form.mobile && !/^0[0-9]{9}$/.test(form.mobile.replace(/\s/g, ''))) e.mobile = 'Enter a valid Sri Lankan mobile number'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address'
    if (form.creditLimit && isNaN(Number(form.creditLimit))) e.creditLimit = 'Must be a valid number'
    if (form.openingBalance && isNaN(Number(form.openingBalance))) e.openingBalance = 'Must be a valid number'
    if (Number(form.creditLimit) < 0) e.creditLimit = 'Credit limit cannot be negative'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      // Jump to first tab with error
      if (errors.name || errors.mobile || errors.email) setTab('basic')
      else if (errors.creditLimit || errors.openingBalance) setTab('financial')
      return
    }
    if (isEdit) {
      updateMut.mutate(form as any)
    } else {
      createMut.mutate(form as any)
    }
  }

  const hasError = (k: keyof FormData) => !!errors[k]
  const isPending = createMut.isPending || updateMut.isPending

  if (isEdit && isLoadingCustomer) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-gold-primary)' }} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(isEdit ? `/customers/${id}` : '/customers')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> {isEdit ? 'Back to Profile' : 'Back to Customers'}
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(isEdit ? `/customers/${id}` : '/customers')}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Customer'}</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Main Form ── */}
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <User size={16} style={{ color: '#0F1115' }} />
                </div>
                <div>
                  <div className="card-title">{isEdit ? 'Edit Customer' : 'New Customer'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isEdit ? `Editing ${form.name}` : 'Fill in customer details below'}
                  </div>
                </div>
              </div>

              {/* Tab navigation */}
              <div style={{ display: 'flex', gap: 4 }}>
                {([
                  { key: 'basic', label: 'Basic Info' },
                  { key: 'financial', label: 'Financial' },
                  { key: 'notes', label: 'Notes' },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-body">

              {/* ── Basic Info ── */}
              {tab === 'basic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {/* Customer Type */}
                  <div className="form-group">
                    <label className="form-label required">Customer Type</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {([
                        { val: 'INDIVIDUAL', label: 'Individual', icon: User },
                        { val: 'BUSINESS', label: 'Business / Company', icon: Building2 },
                      ] as const).map(t => {
                        const Icon = t.icon
                        const active = form.customerType === t.val
                        return (
                          <button
                            key={t.val}
                            type="button"
                            onClick={() => set('customerType', t.val)}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                              padding: '12px 16px', borderRadius: 8,
                              border: `2px solid ${active ? 'var(--color-gold-primary)' : 'var(--border)'}`,
                              background: active ? 'rgba(212,175,55,0.08)' : 'var(--surface)',
                              cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                            }}
                          >
                            <div style={{
                              width: 32, height: 32, borderRadius: 7,
                              background: active ? 'var(--color-gold-primary)' : 'var(--hover)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Icon size={15} style={{ color: active ? '#0F1115' : 'var(--text-muted)' }} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                              <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--color-gold-primary)' : 'var(--text)' }}>{t.label}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {t.val === 'INDIVIDUAL' ? 'Personal vehicle owner' : 'Fleet / company account'}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="divider" />

                  {/* Name row */}
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label required">Full Name</label>
                      <input
                        type="text" className={`form-input ${hasError('name') ? 'error' : ''}`}
                        placeholder="e.g. Kasun Perera"
                        value={form.name} onChange={e => set('name', e.target.value)}
                        style={hasError('name') ? { borderColor: 'var(--color-danger)' } : {}}
                      />
                      {errors.name && <span className="form-error"><AlertCircle size={11} /> {errors.name}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Company Name</label>
                      <input type="text" className="form-input" placeholder="e.g. Silva Motors Ltd" value={form.companyName} onChange={e => set('companyName', e.target.value)} />
                      <span className="form-hint">Optional – for business accounts</span>
                    </div>
                  </div>

                  {/* Contact row */}
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label required">Mobile Number</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          type="tel" className="form-input"
                          placeholder="0771 234 567"
                          value={form.mobile} onChange={e => set('mobile', e.target.value)}
                          style={{ paddingLeft: 30, ...(hasError('mobile') ? { borderColor: 'var(--color-danger)' } : {}) }}
                        />
                      </div>
                      {errors.mobile && <span className="form-error"><AlertCircle size={11} /> {errors.mobile}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Secondary Mobile</label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input type="tel" className="form-input" placeholder="0112 456 789" value={form.secondaryMobile} onChange={e => set('secondaryMobile', e.target.value)} style={{ paddingLeft: 30 }} />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="email" className="form-input"
                        placeholder="kasun@email.com"
                        value={form.email} onChange={e => set('email', e.target.value)}
                        style={{ paddingLeft: 30, ...(hasError('email') ? { borderColor: 'var(--color-danger)' } : {}) }}
                      />
                    </div>
                    {errors.email && <span className="form-error"><AlertCircle size={11} /> {errors.email}</span>}
                  </div>

                  <div className="divider" />

                  {/* Address */}
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <textarea
                        className="form-textarea" rows={2}
                        placeholder="Street address..."
                        value={form.address} onChange={e => set('address', e.target.value)}
                        style={{ paddingLeft: 30, resize: 'vertical' }}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input type="text" className="form-input" placeholder="e.g. Colombo 03" value={form.city} onChange={e => set('city', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">NIC / Tax ID</label>
                      <div style={{ position: 'relative' }}>
                        <Shield size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input type="text" className="form-input" placeholder="852456789V or PV123456" value={form.nicTaxId} onChange={e => set('nicTaxId', e.target.value)} style={{ paddingLeft: 30 }} />
                      </div>
                      <span className="form-hint">NIC for individuals, VAT Reg. for businesses</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Financial Tab ── */}
              {tab === 'financial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.2)',
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                  }}>
                    <strong style={{ color: 'var(--color-gold-primary)' }}>Note:</strong> Opening balance is applied only once when the customer account is created. Credit limit controls the maximum outstanding allowed.
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Credit Limit (LKR)</label>
                      <div style={{ position: 'relative' }}>
                        <CreditCard size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          type="number" className="form-input" min="0" step="1000"
                          placeholder="0"
                          value={form.creditLimit} onChange={e => set('creditLimit', e.target.value)}
                          style={{ paddingLeft: 30, ...(hasError('creditLimit') ? { borderColor: 'var(--color-danger)' } : {}) }}
                        />
                      </div>
                      {errors.creditLimit && <span className="form-error"><AlertCircle size={11} /> {errors.creditLimit}</span>}
                      <span className="form-hint">Set to 0 to disable credit</span>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Opening Balance (LKR)</label>
                      <div style={{ position: 'relative' }}>
                        <CreditCard size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          type="number" className="form-input" step="0.01"
                          placeholder="0"
                          value={form.openingBalance} onChange={e => set('openingBalance', e.target.value)}
                          style={{ paddingLeft: 30, ...(hasError('openingBalance') ? { borderColor: 'var(--color-danger)' } : {}) }}
                          disabled={isEdit}
                        />
                      </div>
                      {errors.openingBalance && <span className="form-error"><AlertCircle size={11} /> {errors.openingBalance}</span>}
                      {isEdit && <span className="form-hint">Opening balance cannot be changed after account creation</span>}
                      {!isEdit && <span className="form-hint">Balance brought forward from previous system</span>}
                    </div>
                  </div>

                  <div className="divider" />

                  <div className="form-group">
                    <label className="form-label">Account Status</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {([
                        { val: true, label: 'Active', color: 'var(--color-success)', desc: 'Can create jobs and invoices' },
                        { val: false, label: 'Inactive', color: 'var(--color-danger)', desc: 'Account suspended / disabled' },
                      ]).map(s => (
                        <button
                          key={String(s.val)}
                          type="button"
                          onClick={() => set('isActive', s.val)}
                          style={{
                            flex: 1, padding: '10px 14px', borderRadius: 8, textAlign: 'left',
                            border: `2px solid ${form.isActive === s.val ? s.color : 'var(--border)'}`,
                            background: form.isActive === s.val ? `${s.color}10` : 'var(--surface)',
                            cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 600, color: form.isActive === s.val ? s.color : 'var(--text)' }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Notes Tab ── */}
              {tab === 'notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Internal Notes</label>
                    <div style={{ position: 'relative' }}>
                      <FileText size={13} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <textarea
                        className="form-textarea" rows={6}
                        placeholder="Add any internal notes about this customer (visible to staff only)..."
                        value={form.notes} onChange={e => set('notes', e.target.value)}
                        style={{ paddingLeft: 30, resize: 'vertical' }}
                      />
                    </div>
                    <span className="form-hint">Notes are for internal use only and not shown on invoices or customer documents.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* ── Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Summary card */}
          <div className="card">
            <div className="card-header"><span className="card-title">Summary</span></div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SidebarRow label="Name" value={form.name || '—'} />
              <SidebarRow label="Type" value={form.customerType === 'BUSINESS' ? 'Business' : 'Individual'} />
              <SidebarRow label="Mobile" value={form.mobile || '—'} />
              <SidebarRow label="City" value={form.city || '—'} />
              <SidebarRow label="Credit Limit" value={form.creditLimit ? `LKR ${Number(form.creditLimit).toLocaleString()}` : 'None'} />
              <SidebarRow label="Status" value={form.isActive ? 'Active' : 'Inactive'} highlight={form.isActive ? 'success' : 'danger'} />
            </div>
          </div>

          {/* Tips */}
          <div className="card" style={{ border: '1px solid rgba(212,175,55,0.2)', background: 'rgba(212,175,55,0.04)' }}>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gold-primary)' }}>Tips</div>
              <ul style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 16, lineHeight: 1.6 }}>
                <li>Customer code is auto-generated</li>
                <li>Set credit limit to control outstanding amounts</li>
                <li>Business accounts support fleet vehicles</li>
                <li>NIC is important for VAT invoices</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarRow({ label, value, highlight }: { label: string; value: string; highlight?: 'success' | 'danger' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{
        fontSize: 12, color: highlight === 'success' ? 'var(--color-success)' : highlight === 'danger' ? 'var(--color-danger)' : 'var(--text)',
        fontWeight: highlight ? 600 : 400, textAlign: 'right', maxWidth: 160,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  )
}
