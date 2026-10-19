import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, AlertCircle, Search, Check, Loader2, Car, User, Plus, X } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobCardById, createJobCard, updateJobCard, type JobCard } from '@/api/jobcards'
import { getCustomers, type Customer } from '@/api/customers'
import { getVehiclesByCustomerId, createVehicle, type Vehicle } from '@/api/vehicles'

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
      if (cust) setCustomerSearch(cust.name)
    }
  }, [isEdit, existingJob, customers])

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
                  <div className="form-group">
                    <label className="form-label required">Customer</label>
                    <div style={{ position: 'relative' }}>
                      <Search size={13} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className={`form-input ${hasError('customerId') ? 'error' : ''}`}
                        placeholder="Search customer..."
                        value={customerSearch}
                        disabled={isEdit} // Do not allow changing customer on edit
                        onChange={e => {
                          setCustomerSearch(e.target.value)
                          setShowCustomerDropdown(true)
                          if (form.customerId) {
                            set('customerId', '')
                            set('vehicleId', '') // reset vehicle when customer changes
                          }
                        }}
                        onFocus={() => !isEdit && setShowCustomerDropdown(true)}
                        onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                        style={{ paddingLeft: 30 }}
                      />
                      {form.customerId && (
                        <Check size={14} style={{ position: 'absolute', right: 10, top: 10, color: 'var(--color-success)', pointerEvents: 'none' }} />
                      )}

                      {!isEdit && showCustomerDropdown && (
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
                              </div>
                            ))
                          )}
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
    </div>
  )
}
