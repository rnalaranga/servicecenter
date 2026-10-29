import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, AlertCircle, Search, Check, Loader2, Car, User, Plus, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobCardById, createJobCard, updateJobCard, type JobCard } from '@/api/jobcards'
import { getCustomers, createCustomer, type Customer } from '@/api/customers'
import { getVehicles, getVehiclesByCustomerId, createVehicle, type Vehicle } from '@/api/vehicles'

interface FormData {
  customerId: string;
  vehicleId: string;
  date: string;
  odometer: string;
  complaint: string;
  priority: string;
  status?: string;
}

const emptyForm: FormData = {
  customerId: '', vehicleId: '', date: new Date().toISOString().split('T')[0],
  odometer: '', complaint: '', priority: 'NORMAL'
}

interface FieldError { [k: string]: string }

export default function JobCardFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState<FormData>(emptyForm)
  const [errors, setErrors] = useState<FieldError>({})
  
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const custDropdownRef = useRef<HTMLDivElement>(null)

  // Quick Add Customer State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    mobile: '',
    email: '',
    address: '',
    vehicleReg: '',
    vehicleMake: '',
    vehicleModel: '',
  })
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  // Quick Add Vehicle State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false)
  const [newVehicle, setNewVehicle] = useState({
    registration: '',
    make: '',
    model: '',
    year: '',
    colour: '',
    mileage: ''
  })
  const [creatingVehicle, setCreatingVehicle] = useState(false)

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  })

  // Fetch all vehicles for search matching
  const { data: allVehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles
  })

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (custDropdownRef.current && !custDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch Vehicles based on selected customer
  const { data: customerVehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles', 'customer', form.customerId],
    queryFn: () => getVehiclesByCustomerId(form.customerId),
    enabled: !!form.customerId
  })

  // Load existing data on edit
  const { data: existingJob, isLoading: isLoadingJob } = useQuery({
    queryKey: ['jobcards', id],
    queryFn: () => getJobCardById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (isEdit && existingJob) {
      setForm({
        customerId: String(existingJob.customerId),
        vehicleId: String(existingJob.vehicleId),
        date: new Date(existingJob.date).toISOString().split('T')[0],
        odometer: existingJob.odometer ? String(existingJob.odometer) : '',
        complaint: existingJob.complaint || '',
        priority: existingJob.priority || 'NORMAL',
        status: existingJob.status
      })
      const cust = customers.find(c => c.id === existingJob.customerId)
      if (cust) setCustomerSearch(`${cust.name} (${cust.mobile})`)
    }
  }, [isEdit, existingJob, customers])

  const searchQ = customerSearch.toLowerCase().trim()
  const matchingVehicles = allVehicles.filter(v => v.registration.toLowerCase().includes(searchQ))
  const matchingCustomerIds = new Set(matchingVehicles.map(v => v.customerId))

  const filteredCustomers = customers.filter(c => {
    if (!searchQ) return true
    return (
      c.name.toLowerCase().includes(searchQ) ||
      c.mobile.replace(/\s/g, '').includes(searchQ.replace(/\s/g, '')) ||
      c.code.toLowerCase().includes(searchQ) ||
      matchingCustomerIds.has(c.id)
    )
  })

  const handleSelectCustomer = (c: Customer) => {
    set('customerId', String(c.id))
    set('vehicleId', '') // reset vehicle when customer changes
    setCustomerSearch(`${c.name} (${c.mobile})`)
    setShowCustomerDropdown(false)
  }

  function set(key: keyof FormData, value: any) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: FieldError = {}
    if (!form.customerId) e.customerId = 'Select a customer'
    if (!form.vehicleId) e.vehicleId = 'Select a vehicle'
    if (!form.date) e.date = 'Date is required'
    if (form.odometer && isNaN(Number(form.odometer))) e.odometer = 'Must be a valid number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: createJobCard,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobcards'] })
      success('Job Card Created', `Job ${data.jobNumber} has been created successfully.`)
      navigate(`/job-cards/${data.id}`)
    },
    onError: () => error('Save Failed', 'Unable to create job card. Please try again.')
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => updateJobCard(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards'] })
      success('Job Card Updated', `Job card has been updated successfully.`)
      navigate(`/job-cards/${id}`)
    },
    onError: () => error('Save Failed', 'Unable to update job card. Please try again.')
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      ...form,
      customerId: Number(form.customerId),
      vehicleId: Number(form.vehicleId),
      odometer: form.odometer ? Number(form.odometer) : null
    }

    if (isEdit) {
      updateMut.mutate(payload)
    } else {
      createMut.mutate(payload)
    }
  }

  const handleQuickAddCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newCustomer.name.trim()) {
      error('Name Required', 'Please enter customer name.')
      return
    }
    if (!newCustomer.mobile.trim()) {
      error('Mobile Required', 'Please enter customer mobile number.')
      return
    }

    setCreatingCustomer(true)
    try {
      const createdCust = await createCustomer({
        name: newCustomer.name.trim(),
        mobile: newCustomer.mobile.trim(),
        email: newCustomer.email?.trim() || null,
        address: newCustomer.address?.trim() || null,
        city: null,
        companyName: null,
        secondaryMobile: null,
        nicTaxId: null,
        customerType: 'INDIVIDUAL',
        creditLimit: 0,
        openingBalance: 0,
        notes: null,
        isActive: true,
      })

      let createdVehId: string | null = null
      if (newCustomer.vehicleReg.trim()) {
        const createdV = await createVehicle({
          customerId: createdCust.id,
          registration: newCustomer.vehicleReg.trim().toUpperCase(),
          make: newCustomer.vehicleMake.trim() || 'General',
          model: newCustomer.vehicleModel.trim() || 'Vehicle',
          year: null,
          colour: null,
          mileage: null,
          isActive: true
        } as any)
        createdVehId = String(createdV.id)
      }

      await queryClient.invalidateQueries({ queryKey: ['customers'] })
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] })

      // Auto-select in form
      set('customerId', String(createdCust.id))
      setCustomerSearch(`${createdCust.name} (${createdCust.mobile})`)
      if (createdVehId) {
        set('vehicleId', createdVehId)
      }
      setShowCustomerDropdown(false)
      setShowAddCustomerModal(false)
      setNewCustomer({
        name: '',
        mobile: '',
        email: '',
        address: '',
        vehicleReg: '',
        vehicleMake: '',
        vehicleModel: '',
      })
      success('Customer Added', `${createdCust.name} has been created and selected.`)
    } catch (err: any) {
      console.error(err)
      error('Creation Failed', err.response?.data?.error || 'Unable to create customer.')
    } finally {
      setCreatingCustomer(false)
    }
  }

  const handleQuickAddVehicle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!form.customerId) {
      error('Customer Required', 'Please select a customer first.')
      return
    }
    if (!newVehicle.registration.trim()) {
      error('Registration Required', 'Please enter a vehicle registration number.')
      return
    }
    setCreatingVehicle(true)
    try {
      const created = await createVehicle({
        customerId: Number(form.customerId),
        registration: newVehicle.registration.trim().toUpperCase(),
        make: newVehicle.make.trim() || 'Unknown',
        model: newVehicle.model.trim() || 'Unknown',
        year: newVehicle.year ? Number(newVehicle.year) : null,
        colour: newVehicle.colour.trim() || null,
        mileage: newVehicle.mileage ? Number(newVehicle.mileage) : null,
        isActive: true
      } as any)

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'customer', form.customerId] })

      // Auto-select this vehicle
      set('vehicleId', String(created.id))
      if (newVehicle.mileage && !form.odometer) {
        set('odometer', String(newVehicle.mileage))
      }

      success('Vehicle Added', `Vehicle ${created.registration} has been added and selected.`)
      setShowAddVehicleModal(false)
      setNewVehicle({ registration: '', make: '', model: '', year: '', colour: '', mileage: '' })
    } catch (err: any) {
      error('Vehicle Save Failed', err?.response?.data?.error || err.message || 'Could not create vehicle')
    } finally {
      setCreatingVehicle(false)
    }
  }

  const hasError = (k: keyof FormData) => !!errors[k]
  const isPending = createMut.isPending || updateMut.isPending

  if (isEdit && isLoadingJob) {
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(isEdit ? `/job-cards/${id}` : '/job-cards')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> {isEdit ? 'Back to Job Card' : 'Back to Job Cards'}
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(isEdit ? `/job-cards/${id}` : '/job-cards')}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : <><Save size={13} /> {isEdit ? 'Save Changes' : 'Create Job Card'}</>}
        </button>
      </div>

      <div className="form-layout-grid">

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
                  <FileText size={16} style={{ color: '#0F1115' }} />
                </div>
                <div>
                  <div className="card-title">{isEdit ? `Edit ${existingJob?.jobNumber}` : 'New Job Card'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isEdit ? 'Update job details' : 'Open a new job for a customer vehicle'}
                  </div>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                
                {/* ── Customer & Vehicle ── */}
                <div className="grid-2">
                  <div className="form-group" ref={custDropdownRef} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label required" style={{ margin: 0 }}>Customer</label>
                      {!isEdit && (
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: 'var(--color-gold-primary)', padding: '2px 8px', height: 'auto', gap: 4 }}
                          onClick={() => {
                            setNewCustomer(p => ({ ...p, name: customerSearch }))
                            setShowAddCustomerModal(true)
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <Plus size={12} /> + Add Customer
                        </button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className={`form-input ${hasError('customerId') ? 'error' : ''}`}
                        placeholder="Search by customer name, mobile, or vehicle plate..."
                        value={customerSearch}
                        disabled={isEdit}
                        onChange={e => {
                          setCustomerSearch(e.target.value)
                          setShowCustomerDropdown(true)
                          if (form.customerId) {
                            set('customerId', '')
                            set('vehicleId', '') // reset vehicle when customer changes
                          }
                        }}
                        onFocus={() => !isEdit && setShowCustomerDropdown(true)}
                        style={{ paddingLeft: 30 }}
                      />
                      {form.customerId && (
                        <Check size={14} style={{ position: 'absolute', right: 10, top: 10, color: 'var(--color-success)', pointerEvents: 'none' }} />
                      )}

                      {!isEdit && showCustomerDropdown && (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                          maxHeight: 260, overflowY: 'auto', zIndex: 50,
                        }}>
                          {filteredCustomers.length === 0 ? (
                            <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                              No customers found matching "{customerSearch}".
                            </div>
                          ) : (
                            filteredCustomers.map(c => (
                              <div
                                key={c.id}
                                onMouseDown={(e) => {
                                  e.preventDefault() // Instant single click selection!
                                  handleSelectCustomer(c)
                                }}
                                onClick={() => handleSelectCustomer(c)}
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
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {c.mobile} {c.companyName ? `· ${c.companyName}` : ''}
                                  </div>
                                </div>
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>{c.code}</span>
                              </div>
                            ))
                          )}

                          {/* Quick Add Button inside Dropdown */}
                          <div 
                            onMouseDown={(e) => {
                              e.preventDefault()
                              setNewCustomer(p => ({ ...p, name: customerSearch }))
                              setShowAddCustomerModal(true)
                              setShowCustomerDropdown(false)
                            }}
                            onClick={() => {
                              setNewCustomer(p => ({ ...p, name: customerSearch }))
                              setShowAddCustomerModal(true)
                              setShowCustomerDropdown(false)
                            }}
                            style={{
                              padding: '12px 14px', cursor: 'pointer', background: 'var(--hover)',
                              color: 'var(--color-gold-primary)', fontSize: 12, fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)'
                            }}
                          >
                            <Plus size={14} /> + Add New Customer {customerSearch ? `"${customerSearch}"` : ''}
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.customerId && <span className="form-error"><AlertCircle size={11} /> {errors.customerId}</span>}
                  </div>

                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <label className="form-label required" style={{ margin: 0 }}>Vehicle</label>
                      {form.customerId && !isEdit && (
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: 'var(--color-gold-primary)', padding: '2px 8px', height: 'auto', gap: 4 }}
                          onClick={() => setShowAddVehicleModal(true)}
                        >
                          <Plus size={12} /> + Add Vehicle
                        </button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Car size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <select 
                        className={`form-input ${hasError('vehicleId') ? 'error' : ''}`}
                        value={form.vehicleId} 
                        onChange={e => set('vehicleId', e.target.value)} 
                        style={{ paddingLeft: 30, appearance: 'auto' }}
                        disabled={isEdit || !form.customerId || loadingVehicles}
                      >
                        <option value="">
                          {!form.customerId 
                            ? 'Select a customer first...' 
                            : loadingVehicles 
                              ? 'Loading vehicles...' 
                              : customerVehicles.length === 0 
                                ? 'No vehicles found (Click + Add Vehicle)' 
                                : 'Select a vehicle...'}
                        </option>
                        {customerVehicles.map((v: Vehicle) => (
                          <option key={v.id} value={v.id}>{v.registration} - {v.make} {v.model}</option>
                        ))}
                      </select>
                    </div>
                    {errors.vehicleId && <span className="form-error"><AlertCircle size={11} /> {errors.vehicleId}</span>}
                    {form.customerId && !loadingVehicles && customerVehicles.length === 0 && (
                      <div style={{
                        marginTop: 8, padding: '10px 14px', background: 'rgba(212, 175, 55, 0.08)',
                        border: '1px dashed var(--color-gold-primary)', borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--text)' }}>
                          This customer has no vehicles registered yet.
                        </div>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, padding: '4px 10px', height: 'auto' }}
                          onClick={() => setShowAddVehicleModal(true)}
                        >
                          <Plus size={12} /> Add Vehicle Now
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="divider" />

                {/* ── Job Details ── */}
                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label required">Date In</label>
                    <input type="date" className={`form-input ${hasError('date') ? 'error' : ''}`} value={form.date} onChange={e => set('date', e.target.value)} />
                    {errors.date && <span className="form-error"><AlertCircle size={11} /> {errors.date}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-input" value={form.priority} onChange={e => set('priority', e.target.value)} style={{ appearance: 'auto' }}>
                      <option value="LOW">Low</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Current Odometer (km)</label>
                    <input type="number" className={`form-input ${hasError('odometer') ? 'error' : ''}`} placeholder="e.g. 68000" value={form.odometer} onChange={e => set('odometer', e.target.value)} />
                    {errors.odometer && <span className="form-error"><AlertCircle size={11} /> {errors.odometer}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Complaint / Request</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Enter what the customer wants to be done..." 
                    value={form.complaint} 
                    onChange={e => set('complaint', e.target.value)} 
                    style={{ minHeight: 80, resize: 'vertical' }} 
                  />
                </div>

                {isEdit && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-input" value={form.status} onChange={e => set('status', e.target.value)} style={{ appearance: 'auto' }}>
                      <option value="DRAFT">Draft</option>
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="WAITING_FOR_PARTS">Waiting for Parts</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* ── Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={14} style={{ color: 'var(--color-gold-primary)' }} /> Customer Info
            </h3>
            {form.customerId ? (
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {customers.find(c => String(c.id) === form.customerId)?.name}
                </div>
                <div style={{ color: 'var(--text-muted)' }}>
                  {customers.find(c => String(c.id) === form.customerId)?.mobile}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No customer selected</div>
            )}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={14} style={{ color: 'var(--color-gold-primary)' }} /> Vehicle Info
            </h3>
            {form.vehicleId ? (
              <div style={{ fontSize: 13 }}>
                {(() => {
                  const v = customerVehicles.find((v: Vehicle) => String(v.id) === form.vehicleId)
                  if (!v) return null
                  return (
                    <>
                      <div style={{ display: 'inline-block', marginBottom: 8, padding: '2px 8px', background: '#FACC15', color: '#000', fontFamily: 'monospace', fontWeight: 700, fontSize: 12, borderRadius: 4, letterSpacing: '0.05em' }}>
                        {v.registration}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{v.make} {v.model}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v.year} {v.colour && `· ${v.colour}`}</div>
                    </>
                  )
                })()}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No vehicle selected</div>
            )}
          </div>
        </div>

      </div>

      {/* Quick Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Car size={18} style={{ color: 'var(--color-gold-primary)' }} />
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Add Vehicle for {customers.find(c => String(c.id) === form.customerId)?.name || 'Customer'}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn btn-ghost btn-icon btn-sm" 
                onClick={() => setShowAddVehicleModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickAddVehicle}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label required">Vehicle Registration / Plate Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. WP CAB-1234, CAR-5566, CP GA-4545"
                    style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em' }}
                    value={newVehicle.registration}
                    onChange={e => setNewVehicle(p => ({ ...p, registration: e.target.value.toUpperCase() }))}
                    autoFocus
                    required
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Enter the official license plate number.
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Make / Brand</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Toyota, Honda, Nissan"
                      value={newVehicle.make}
                      onChange={e => setNewVehicle(p => ({ ...p, make: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Model</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Prius, Civic, Axio"
                      value={newVehicle.model}
                      onChange={e => setNewVehicle(p => ({ ...p, model: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 2018"
                      value={newVehicle.year}
                      onChange={e => setNewVehicle(p => ({ ...p, year: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Colour</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Pearl White"
                      value={newVehicle.colour}
                      onChange={e => setNewVehicle(p => ({ ...p, colour: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mileage (km)</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g. 54000"
                      value={newVehicle.mileage}
                      onChange={e => setNewVehicle(p => ({ ...p, mileage: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowAddVehicleModal(false)}
                  disabled={creatingVehicle}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm" 
                  disabled={creatingVehicle || !newVehicle.registration.trim()}
                >
                  {creatingVehicle ? (
                    <><Loader2 size={13} className="spinner" /> Saving...</>
                  ) : (
                    <><Check size={13} /> Save & Select Vehicle</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Add Customer Modal ── */}
      {showAddCustomerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 520, boxShadow: '0 20px 50px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} style={{ color: 'var(--color-gold-primary)' }} />
                <div className="card-title" style={{ fontSize: 14 }}>Quick Add Customer</div>
              </div>
              <button 
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setShowAddCustomerModal(false)}
                disabled={creatingCustomer}
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleQuickAddCustomer}>
              <div className="card-body" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label required">Customer Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Kasun Jayawardena"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                    autoFocus
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label required">Mobile Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 0771234567"
                      value={newCustomer.mobile}
                      onChange={e => setNewCustomer(p => ({ ...p, mobile: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email (Optional)</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="customer@email.com"
                      value={newCustomer.email}
                      onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Address (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Colombo 07"
                    value={newCustomer.address}
                    onChange={e => setNewCustomer(p => ({ ...p, address: e.target.value }))}
                  />
                </div>

                {/* Optional Vehicle Details Section */}
                <div style={{
                  background: 'var(--hover)',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-gold-primary)' }}>
                    <Car size={13} /> Add Initial Vehicle (Optional)
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Vehicle Registration Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. WP CAB-1234"
                      value={newCustomer.vehicleReg}
                      onChange={e => setNewCustomer(p => ({ ...p, vehicleReg: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="grid-2">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Make / Brand</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Toyota"
                        value={newCustomer.vehicleMake}
                        onChange={e => setNewCustomer(p => ({ ...p, vehicleMake: e.target.value }))}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 11 }}>Model</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Premio"
                        value={newCustomer.vehicleModel}
                        onChange={e => setNewCustomer(p => ({ ...p, vehicleModel: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowAddCustomerModal(false)}
                  disabled={creatingCustomer}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm" 
                  disabled={creatingCustomer || !newCustomer.name.trim() || !newCustomer.mobile.trim()}
                >
                  {creatingCustomer ? (
                    <><Loader2 size={13} className="spinner" /> Saving...</>
                  ) : (
                    <><Check size={13} /> Save & Select Customer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
