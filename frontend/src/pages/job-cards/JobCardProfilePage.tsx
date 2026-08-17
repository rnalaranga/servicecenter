import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, CheckCircle2, PackagePlus, Trash2, Printer, Plus, AlertTriangle, Car, User, FileText, Loader2, Play, ShoppingCart } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobCardById, updateJobCard, addServiceToJobCard, removeServiceFromJobCard, getServices, type JobCard } from '@/api/jobcards'
import { getVendors } from '@/api/vendors'
import { createPurchase } from '@/api/purchases'
import { generateInvoiceFromJobCard } from '@/api/invoices'
import { useToast } from '@/contexts/ToastContext'
import { format, parseISO } from 'date-fns'
import clsx from 'clsx'

function fmtLKR(n: number) {
  if (!n) return <span style={{ color: 'var(--text-subtle)' }}>—</span>
  return `LKR ${Number(n).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function JobCardProfilePage() {
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
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

        {job.status === 'COMPLETED' && (!job.invoices || job.invoices.length === 0) && (
          <button className="btn btn-primary btn-sm" onClick={() => invMut.mutate(id!)} disabled={invMut.isPending}>
            {invMut.isPending ? 'Generating...' : 'Generate Invoice'}
          </button>
        )}
        {job.invoices && job.invoices.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/invoices/${job.invoices![0].id}`)}>
            View Invoice
          </button>
        )}

        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/job-cards/${job.id}/edit`)}>
          <Edit2 size={13} /> Edit Details
        </button>
        <button className="btn btn-secondary btn-sm">
          <Printer size={13} /> Print
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'flex-start' }}>
        
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
              <div style={{ padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Select Service</label>
                  <select className="form-input" value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} style={{ appearance: 'auto' }}>
                    <option value="">-- Choose --</option>
                    {allServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - LKR {s.sellingPrice}</option>
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

            <div className="card-body" style={{ padding: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'center' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
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
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtLKR(s.unitPrice)}</td>
                      <td style={{ textAlign: 'center' }}>{s.quantity}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{fmtLKR(s.total)}</td>
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
                  {services.length > 0 && (
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

        </div>
      </div>
    </div>
  )
}
