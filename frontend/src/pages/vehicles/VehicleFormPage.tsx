import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Car, User, AlertCircle, Hash, Shield, Droplet, Gauge, Settings, Wrench, Search, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVehicleById, createVehicle, updateVehicle } from '@/api/vehicles'
import { getCustomers } from '@/api/customers'

interface FormData {
  customerId: string
  registration: string
  make: string
  model: string
  variant: string
  year: string
  colour: string
  fuelType: 'PETROL' | 'DIESEL' | 'HYBRID' | 'ELECTRIC' | 'OTHER'
  transmission: 'MANUAL' | 'AUTOMATIC' | 'CVT' | 'OTHER'
  engineNo: string
  chassisNo: string
  mileage: string
  notes: string
  isActive: boolean
}

const emptyForm: FormData = {
  customerId: '', registration: '', make: '', model: '', variant: '',
  year: '', colour: '', fuelType: 'PETROL', transmission: 'AUTOMATIC',
  engineNo: '', chassisNo: '', mileage: '', notes: '', isActive: true,
}

interface FieldError { [k: string]: string }

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<FieldError>({})
  const [saving, setSaving] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const queryClient = useQueryClient()

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  })

  // Load existing data on edit
  const { data: existingVehicle, isLoading: isLoadingVehicle } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicleById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (isEdit && existingVehicle) {
      setForm({
        customerId: String(existingVehicle.customerId), registration: existingVehicle.registration,
        make: existingVehicle.make, model: existingVehicle.model, variant: existingVehicle.variant || '',
        year: existingVehicle.year ? String(existingVehicle.year) : '', colour: existingVehicle.colour || '',
        fuelType: existingVehicle.fuelType as any || 'PETROL', transmission: existingVehicle.transmission as any || 'AUTOMATIC',
        engineNo: existingVehicle.engineNumber || '', chassisNo: existingVehicle.vin || '', mileage: existingVehicle.mileage ? String(existingVehicle.mileage) : '',
        notes: existingVehicle.notes || '', isActive: existingVehicle.isActive,
      })
      const cust = customers.find(c => c.id === existingVehicle.customerId)
      if (cust) setCustomerSearch(cust.name)
    }
  }, [isEdit, existingVehicle, customers])

  const createMut = useMutation({
    mutationFn: createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      success('Vehicle Added', `${form.registration} has been added successfully.`)
      navigate('/vehicles')
    },
    onError: () => error('Save Failed', 'Unable to save vehicle. Please try again.')
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => updateVehicle(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      success('Vehicle Updated', `${form.registration} has been updated successfully.`)
      navigate(`/vehicles/${id}`)
    },
    onError: () => error('Save Failed', 'Unable to save vehicle. Please try again.')
  })

  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase().trim()
    return !q || c.name.toLowerCase().includes(q) || c.mobile.replace(/\s/g, '').includes(q.replace(/\s/g, '')) || c.code.toLowerCase().includes(q)
  })

  function set(key: keyof FormData, value: any) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: FieldError = {}
    if (!form.customerId) e.customerId = 'Select a customer'
    if (!form.registration.trim()) e.registration = 'Registration number is required'
    if (!form.make.trim()) e.make = 'Make is required'
    if (!form.model.trim()) e.model = 'Model is required'
    if (form.year && (isNaN(Number(form.year)) || Number(form.year) < 1900 || Number(form.year) > new Date().getFullYear() + 1)) e.year = 'Invalid year'
    if (form.mileage && isNaN(Number(form.mileage))) e.mileage = 'Must be a valid number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    if (isEdit) {
      updateMut.mutate({ ...form, vin: form.chassisNo, engineNumber: form.engineNo } as any)
    } else {
      createMut.mutate({ ...form, vin: form.chassisNo, engineNumber: form.engineNo } as any)
    }
  }

  const hasError = (k: keyof FormData) => !!errors[k]
  const isPending = createMut.isPending || updateMut.isPending

  if (isEdit && isLoadingVehicle) {
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(isEdit ? `/vehicles/${id}` : '/vehicles')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> {isEdit ? 'Back to Profile' : 'Back to Vehicles'}
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(isEdit ? `/vehicles/${id}` : '/vehicles')}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Add Vehicle'}</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'flex-start' }}>

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
                  <Car size={16} style={{ color: '#0F1115' }} />
                </div>
                <div>
                  <div className="card-title">{isEdit ? 'Edit Vehicle' : 'New Vehicle'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isEdit ? `Editing ${form.registration}` : 'Enter vehicle details'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                
                {/* ── Owner ── */}
                <div className="form-group">
                  <label className="form-label required">Owner (Customer)</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className={`form-input ${hasError('customerId') ? 'error' : ''}`}
                      placeholder="Search customer by name, mobile, or code..."
                      value={customerSearch}
                      onChange={e => {
                        setCustomerSearch(e.target.value)
                        setShowCustomerDropdown(true)
                        if (form.customerId) set('customerId', '') // Reset ID if typing
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                      style={{ paddingLeft: 30 }}
                    />
                    {/* Selected Indicator */}
                    {form.customerId && (
                      <Check size={14} style={{ position: 'absolute', right: 10, top: 10, color: 'var(--color-success)', pointerEvents: 'none' }} />
                    )}

                    {/* Dropdown Menu */}
                    {showCustomerDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                        maxHeight: 220, overflowY: 'auto', zIndex: 10,
                      }}>
                        {filteredCustomers.length === 0 ? (
                          <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No customers found.</div>
                        ) : (
                          filteredCustomers.map(c => (
                            <div
                              key={c.id}
                              onClick={() => {
                                set('customerId', String(c.id))
                                setCustomerSearch(c.name)
                                setShowCustomerDropdown(false)
                              }}
                              style={{
                                padding: '10px 12px', borderBottom: '1px solid var(--border)',
                                cursor: 'pointer', transition: 'background 0.15s',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'var(--hover)'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.mobile}</div>
                              </div>
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>{c.code}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {errors.customerId && <span className="form-error"><AlertCircle size={11} /> {errors.customerId}</span>}
                </div>

                <div className="divider" />

                {/* ── Identification ── */}
                <div className="form-group">
                  <label className="form-label required">Registration Number</label>
                  <div style={{ position: 'relative', width: '50%' }}>
                    <Hash size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text" className={`form-input ${hasError('registration') ? 'error' : ''}`}
                      placeholder="e.g. CAB-1234 or WP CAA-0000"
                      value={form.registration} onChange={e => set('registration', e.target.value.toUpperCase())}
                      style={{ paddingLeft: 30, textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}
                    />
                  </div>
                  {errors.registration && <span className="form-error"><AlertCircle size={11} /> {errors.registration}</span>}
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Make</label>
                    <input type="text" className={`form-input ${hasError('make') ? 'error' : ''}`} placeholder="e.g. Toyota" value={form.make} onChange={e => set('make', e.target.value)} />
                    {errors.make && <span className="form-error"><AlertCircle size={11} /> {errors.make}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Model</label>
                    <input type="text" className={`form-input ${hasError('model') ? 'error' : ''}`} placeholder="e.g. Corolla" value={form.model} onChange={e => set('model', e.target.value)} />
                    {errors.model && <span className="form-error"><AlertCircle size={11} /> {errors.model}</span>}
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Variant</label>
                    <input type="text" className="form-input" placeholder="e.g. 1.8 Altis" value={form.variant} onChange={e => set('variant', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Manufacture Year</label>
                    <input type="number" className={`form-input ${hasError('year') ? 'error' : ''}`} placeholder="e.g. 2019" value={form.year} onChange={e => set('year', e.target.value)} />
                    {errors.year && <span className="form-error"><AlertCircle size={11} /> {errors.year}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Colour</label>
                    <div style={{ position: 'relative' }}>
                      <Droplet size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input type="text" className="form-input" placeholder="e.g. Pearl White" value={form.colour} onChange={e => set('colour', e.target.value)} style={{ paddingLeft: 30 }} />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                {/* ── Specs ── */}
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Fuel Type</label>
                    <div style={{ position: 'relative' }}>
                      <Gauge size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <select className="form-input" value={form.fuelType} onChange={e => set('fuelType', e.target.value)} style={{ paddingLeft: 30, appearance: 'auto' }}>
                        <option value="PETROL">Petrol</option>
                        <option value="DIESEL">Diesel</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="ELECTRIC">Electric</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Transmission</label>
                    <div style={{ position: 'relative' }}>
                      <Settings size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <select className="form-input" value={form.transmission} onChange={e => set('transmission', e.target.value)} style={{ paddingLeft: 30, appearance: 'auto' }}>
                        <option value="AUTOMATIC">Automatic</option>
                        <option value="MANUAL">Manual</option>
                        <option value="CVT">CVT</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Mileage (km)</label>
                  <div style={{ position: 'relative', width: '50%' }}>
                    <Wrench size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input type="number" className={`form-input ${hasError('mileage') ? 'error' : ''}`} placeholder="e.g. 68000" value={form.mileage} onChange={e => set('mileage', e.target.value)} style={{ paddingLeft: 30 }} />
                  </div>
                  {errors.mileage && <span className="form-error"><AlertCircle size={11} /> {errors.mileage}</span>}
                  <span className="form-hint">Will be automatically updated from job cards later.</span>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Engine Number</label>
                    <div style={{ position: 'relative' }}>
                      <Shield size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input type="text" className="form-input" placeholder="" value={form.engineNo} onChange={e => set('engineNo', e.target.value.toUpperCase())} style={{ paddingLeft: 30 }} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Chassis Number / VIN</label>
                    <div style={{ position: 'relative' }}>
                      <Shield size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input type="text" className="form-input" placeholder="" value={form.chassisNo} onChange={e => set('chassisNo', e.target.value.toUpperCase())} style={{ paddingLeft: 30 }} />
                    </div>
                  </div>
                </div>

                <div className="divider" />

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} style={{ accentColor: 'var(--color-gold-primary)', width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>Active vehicle</span>
                  </label>
                </div>

              </div>
            </div>
          </div>
        </form>

        {/* ── Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Live Preview */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '24px 16px', background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(184,134,11,0.02))', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
               <div style={{
                  width: 56, height: 56, borderRadius: 12, margin: '0 auto 12px',
                  background: 'var(--surface)', border: '1px solid rgba(212,175,55,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Car size={24} style={{ color: 'var(--color-gold-primary)' }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                  {form.make || 'Make'} {form.model || 'Model'}
                </div>
                <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px', background: '#FACC15', color: '#000', fontFamily: 'monospace', fontWeight: 800, fontSize: 13, borderRadius: 4, letterSpacing: '0.05em', border: '2px solid #000' }}>
                  {form.registration || 'REG-NO'}
                </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SidebarRow label="Owner" value={customers.find(c => String(c.id) === form.customerId)?.name || 'Not selected'} />
              <SidebarRow label="Year" value={form.year || '—'} />
              <SidebarRow label="Colour" value={form.colour || '—'} />
              <SidebarRow label="Fuel" value={form.fuelType} />
              <SidebarRow label="Trans" value={form.transmission} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text)', textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
    </div>
  )
}
