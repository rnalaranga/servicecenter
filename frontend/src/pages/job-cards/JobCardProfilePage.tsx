import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, CheckCircle2, PackagePlus, Trash2, Printer, Plus, AlertTriangle, Car, User, FileText, Loader2, Play, ShoppingCart, Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobCardById, updateJobCard, addServiceToJobCard, removeServiceFromJobCard, deleteJobCard, getServices, type JobCard } from '@/api/jobcards'
import { getVendors } from '@/api/vendors'
import { createPurchase } from '@/api/purchases'
import { generateInvoiceFromJobCard } from '@/api/invoices'
import { getReminders, type MaintenanceReminder } from '@/api/reminders'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

function fmtLKR(n: number) {
  if (!n) return <span style={{ color: 'var(--text-subtle)' }}>—</span>
  return `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function JobCardProfilePage() {
  const { user } = useAuth()
  const isAdvisor = user?.role === 'SERVICE_ADVISOR'
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  const [showAddService, setShowAddService] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [serviceQty, setServiceQty] = useState('1')

  const [showAddExtPurchase, setShowAddExtPurchase] = useState(false)
  const [extVendorId, setExtVendorId] = useState('')
  const [extDesc, setExtDesc] = useState('')
  const [extAmount, setExtAmount] = useState('')

  const { data: job, isLoading } = useQuery({
    queryKey: ['jobcards', id],
    queryFn: () => getJobCardById(id!)
  })

  const { data: allServices = [] } = useQuery({
    queryKey: ['services'],
    queryFn: getServices
  })

  const { data: allVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors
  })

  const { data: jobReminders = [] } = useQuery<MaintenanceReminder[]>({
    queryKey: ['reminders', { jobCardId: Number(id) }],
    queryFn: () => getReminders({ jobCardId: Number(id) }),
    enabled: !!id,
  })

  const updateMut = useMutation({
    mutationFn: (status: string) => updateJobCard(id!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards', id] })
      success('Status Updated', 'Job card status has been updated.')
    },
    onError: () => error('Update Failed', 'Could not update status.')
  })

  const invMut = useMutation({
    mutationFn: generateInvoiceFromJobCard,
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['jobcards', id] })
      success('Invoice Generated', `Invoice ${inv.invoiceNumber} has been created.`)
      navigate(`/invoices/${inv.id}`)
    },
    onError: (err: any) => error('Generation Failed', err.response?.data?.error || 'Could not generate invoice.')
  })

  const addServiceMut = useMutation({
    mutationFn: () => addServiceToJobCard(id!, selectedServiceId, Number(serviceQty)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards', id] })
      success('Service Added', 'Service added to the job card successfully.')
      setShowAddService(false)
      setSelectedServiceId('')
      setServiceQty('1')
    },
    onError: () => error('Add Failed', 'Could not add service.')
  })

  const removeServiceMut = useMutation({
    mutationFn: (serviceId: string) => removeServiceFromJobCard(id!, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards', id] })
      success('Service Removed', 'Service removed from job card.')
    },
    onError: () => error('Remove Failed', 'Could not remove service.')
  })

  const addExtPurchaseMut = useMutation({
    mutationFn: () => createPurchase({
      vendorId: Number(extVendorId),
      jobCardId: Number(id),
      isExternal: true,
      status: 'COMPLETED',
      date: new Date().toISOString(),
      items: [{
        description: extDesc,
        quantity: 1,
        unitCost: Number(extAmount)
      }]
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobcards', id] })
      success('Purchase Added', 'External purchase recorded for this job.')
      setShowAddExtPurchase(false)
      setExtVendorId('')
      setExtDesc('')
      setExtAmount('')
    },
    onError: () => error('Add Failed', 'Could not record external purchase.')
  })

  const deleteJobMut = useMutation({
    mutationFn: () => deleteJobCard(id!),
    onSuccess: () => {
      success('Job Card Deleted', 'Job card has been deleted successfully.')
      queryClient.invalidateQueries({ queryKey: ['jobcards'] })
      navigate('/job-cards')
    },
    onError: (err: any) => {
      error('Delete Failed', err.response?.data?.error || 'Could not delete job card.')
    }
  })

  const handleDeleteJob = () => {
    if (confirm(`Are you sure you want to delete job card ${job?.jobNumber}? This action cannot be undone.`)) {
      deleteJobMut.mutate()
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-gold-primary)' }} />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-title">Job Card not found</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/job-cards')}>Back to List</button>
        </div>
      </div>
    )
  }

  const v = job.vehicle
  const c = job.customer
  const services = job.services || []

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/job-cards')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        
        {job.status === 'OPEN' && (
          <button className="btn btn-primary btn-sm" onClick={() => updateMut.mutate('IN_PROGRESS')} disabled={updateMut.isPending}>
            <Play size={13} /> Start Work
          </button>
        )}
        {job.status === 'IN_PROGRESS' && (
          <button className="btn btn-success btn-sm" onClick={() => updateMut.mutate('COMPLETED')} disabled={updateMut.isPending}>
            <CheckCircle2 size={13} /> Mark Completed
          </button>
        )}

        {!isAdvisor && job.status === 'COMPLETED' && (!job.invoices || job.invoices.length === 0) && (
          <button className="btn btn-primary btn-sm" onClick={() => invMut.mutate(id!)} disabled={invMut.isPending}>
            {invMut.isPending ? 'Generating...' : 'Generate Invoice'}
          </button>
        )}
        {!isAdvisor && job.invoices && job.invoices.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/invoices/${job.invoices![0].id}`)}>
            View Invoice
          </button>
        )}

        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            const sName = job.services?.[0]?.service?.name || 'Ceramic Coating Warranty Maintenance'
            const sDate = job.date ? format(parseISO(job.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
            navigate(`/reminders?action=new&jobCardId=${job.id}&customerId=${job.customerId}&vehicleId=${job.vehicleId}&serviceName=${encodeURIComponent(sName)}&startDate=${sDate}`)
          }}
          style={{ gap: 6, borderColor: 'var(--color-gold-primary)', color: 'var(--color-gold-primary)' }}
        >
          <Bell size={13} /> {jobReminders.length > 0 ? `Warranty Reminders (${jobReminders.length})` : 'Set Warranty Reminders'}
        </button>

        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/job-cards/${job.id}/edit`)}>
          <Edit2 size={13} /> Edit Details
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>
          <Printer size={13} /> Print
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: 'var(--color-danger)', gap: 6 }}
          onClick={handleDeleteJob}
          disabled={deleteJobMut.isPending}
        >
          <Trash2 size={13} /> Delete Job
        </button>
      </div>

      <div className="profile-grid">
        
        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Main Job Info */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FileText size={22} style={{ color: '#0F1115' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{job.jobNumber}</h1>
                    <span className={`badge ${job.status === 'OPEN' ? 'badge-open' : job.status === 'IN_PROGRESS' ? 'badge-progress' : job.status === 'COMPLETED' ? 'badge-completed' : 'badge-draft'}`}>
                      {job.status.replace('_', ' ')}
                    </span>
                    <span className={clsx('badge', job.priority === 'URGENT' || job.priority === 'HIGH' ? 'badge-high' : 'badge-normal')}>
                      {job.priority} Priority
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                    Opened on {format(parseISO(job.date), 'MMMM dd, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
                Customer Complaint / Request
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {job.complaint || <span style={{ color: 'var(--text-subtle)' }}>No notes provided.</span>}
              </p>
            </div>
          </div>

          {/* Services Section */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Requested Services</div>
              {job.status !== 'COMPLETED' && job.status !== 'DELIVERED' && (
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAddService(!showAddService)}>
                  <Plus size={13} /> Add Service
                </button>
              )}
            </div>

            {/* Add Service Inline Form */}
            {showAddService && (
              <div style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 200px', marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Select Service</label>
                  <select className="form-input" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} style={{ appearance: 'auto' }}>
                    <option value="">-- Choose --</option>
                    {allServices.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{!isAdvisor ? ` - LKR ${s.sellingPrice}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ width: 80, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Qty</label>
                  <input type="number" className="form-input" min="1" value={serviceQty} onChange={e => setServiceQty(e.target.value)} />
                </div>
                <button 
                  className="btn btn-primary" 
                  disabled={!selectedServiceId || addServiceMut.isPending}
                  onClick={() => addServiceMut.mutate()}
                  style={{ height: '34px' }}
                >
                  {addServiceMut.isPending ? 'Adding...' : 'Add'}
                </button>
                <button className="btn btn-secondary btn-icon" onClick={() => setShowAddService(false)} style={{ height: '34px' }}>
                  ×
                </button>
              </div>
            )}

            <div className="card-body table-responsive" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Service</th>
                    {!isAdvisor && <th style={{ textAlign: 'right' }}>Unit Price</th>}
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    {!isAdvisor && <th style={{ textAlign: 'right' }}>Total</th>}
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={isAdvisor ? 3 : 5}>
                        <div className="empty-state" style={{ padding: '24px' }}>
                          <PackagePlus size={20} style={{ color: 'var(--text-subtle)' }} />
                          <div className="empty-state-title" style={{ fontSize: 13, marginTop: 8 }}>No services added</div>
                        </div>
                      </td>
                    </tr>
                  ) : services.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{s.service?.name}</div>
                      </td>
                      {!isAdvisor && (
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtLKR(s.unitPrice)}</td>
                      )}
                      <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                      {!isAdvisor && (
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtLKR(s.total)}</td>
                      )}
                      <td>
                        <button 
                          className="btn btn-ghost btn-icon btn-sm" 
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => {
                            if(confirm('Remove this service?')) removeServiceMut.mutate(String(s.id))
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isAdvisor && services.length > 0 && (
                    <tr style={{ background: 'var(--bg)' }}>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>Subtotal:</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: 'var(--color-gold-primary)' }}>
                        {fmtLKR(job.subtotal)}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* External Purchases Section */}
          {!isAdvisor && (
            <div className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">External Purchases</div>
                {job.status !== 'COMPLETED' && job.status !== 'DELIVERED' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddExtPurchase(!showAddExtPurchase)}>
                    <Plus size={13} /> Add Purchase
                  </button>
                )}
              </div>

              {/* Add External Purchase Form */}
              {showAddExtPurchase && (
                <div style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '150px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Select Vendor</label>
                    <select className="form-input" value={extVendorId} onChange={e => setExtVendorId(e.target.value)}>
                      <option value="">-- Choose Vendor --</option>
                      {allVendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 2, minWidth: '200px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Description (e.g., Special Paint)</label>
                    <input type="text" className="form-input" value={extDesc} onChange={e => setExtDesc(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ width: 120, marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Amount (Cost)</label>
                    <input type="number" className="form-input" value={extAmount} onChange={e => setExtAmount(e.target.value)} />
                  </div>
                  <button 
                    className="btn btn-primary" 
                    disabled={!extVendorId || !extDesc || !extAmount || addExtPurchaseMut.isPending}
                    onClick={() => addExtPurchaseMut.mutate()}
                    style={{ height: '34px' }}
                  >
                    {addExtPurchaseMut.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button className="btn btn-secondary btn-icon" onClick={() => setShowAddExtPurchase(false)} style={{ height: '34px' }}>
                    ×
                  </button>
                </div>
              )}

              <div className="card-body" style={{ padding: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Total Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!job.purchases || job.purchases.length === 0) ? (
                      <tr>
                        <td colSpan={3}>
                          <div className="empty-state" style={{ padding: '24px' }}>
                            <ShoppingCart size={20} style={{ color: 'var(--text-subtle)' }} />
                            <div className="empty-state-title" style={{ fontSize: 13, marginTop: 8 }}>No external purchases recorded</div>
                          </div>
                        </td>
                      </tr>
                    ) : job.purchases.map((p: any) => (
                      <tr key={p.id}>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text)' }}>{p.vendor?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.purchaseNumber}</div>
                        </td>
                        <td>{p.items?.[0]?.description || 'No description'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtLKR(p.total)}</td>
                      </tr>
                    ))}
                    {job.purchases && job.purchases.length > 0 && (
                      <tr style={{ background: 'var(--bg)' }}>
                        <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, fontSize: 13 }}>External Total:</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 14, fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                          {fmtLKR(job.purchases.reduce((acc: number, p: any) => acc + Number(p.total), 0))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Car size={15} style={{ color: 'var(--color-gold-primary)' }} /> Vehicle Details
            </h3>
            {v ? (
              <div>
                <div style={{ display: 'inline-block', padding: '4px 10px', background: '#FACC15', color: '#000', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, borderRadius: 4, letterSpacing: '0.05em', marginBottom: 12 }}>
                  {v.registration}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Make & Model:</span>
                    <span style={{ fontWeight: 600 }}>{v.make} {v.model}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Year & Colour:</span>
                    <span style={{ fontWeight: 500 }}>{v.year || '—'} {v.colour || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Odometer In:</span>
                    <span style={{ fontWeight: 500 }}>{job.odometer ? `${job.odometer.toLocaleString()} km` : '—'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <span className="neutral">No vehicle</span>
            )}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={15} style={{ color: 'var(--color-gold-primary)' }} /> Customer Details
            </h3>
            {c ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{c.mobile}</div>
                {c.email && <div style={{ color: 'var(--text-muted)' }}>{c.email}</div>}
              </div>
            ) : (
              <span className="neutral">No customer</span>
            )}
          </div>

          {/* Warranty & Periodic Maintenance Reminders */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} style={{ color: 'var(--color-gold-primary)' }} /> Warranty Reminders
              </h3>
              {jobReminders.length > 0 && (
                <span className="badge badge-gold" style={{ fontSize: 11 }}>
                  {jobReminders.length} Scheduled
                </span>
              )}
            </div>

            {jobReminders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {jobReminders.map(r => (
                  <div
                    key={r.id}
                    style={{
                      padding: '8px 10px',
                      background: 'var(--hover)',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="badge badge-outline" style={{ fontSize: 10, fontWeight: 700 }}>{r.intervalLabel}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                          {format(new Date(r.reminderDate), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.serviceName}</div>
                    </div>
                    <span className={`badge ${r.status === 'COMPLETED' ? 'badge-completed' : r.status === 'SCHEDULED' ? 'badge-progress' : 'badge-open'}`} style={{ fontSize: 10 }}>
                      {r.status}
                    </span>
                  </div>
                ))}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/reminders')}
                  style={{ marginTop: 6, width: '100%', justifyContent: 'center' }}
                >
                  Manage in Reminders Center
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  No warranty reminder milestones generated for this vehicle yet. Set up 3-week, 6-month, and annual checkups.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', gap: 6 }}
                  onClick={() => {
                    const sName = job.services?.[0]?.service?.name || 'Ceramic Coating Warranty Maintenance'
                    const sDate = job.date ? format(parseISO(job.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
                    navigate(`/reminders?action=new&jobCardId=${job.id}&customerId=${job.customerId}&vehicleId=${job.vehicleId}&serviceName=${encodeURIComponent(sName)}&startDate=${sDate}`)
                  }}
                >
                  <Bell size={13} /> Set Coating Warranty Schedule
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
