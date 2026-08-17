import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit, Car, Calendar, Gauge, Droplet, ClipboardList, Plus, Eye, Wrench, Settings, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getVehicleById } from '@/api/vehicles'
import { getCustomerById } from '@/api/customers'
import { getJobCards } from '@/api/jobcards'
import { format, parseISO } from 'date-fns'

// ── Helpers ───────────────────────────────────────────────────────────────────
const FUEL_LABELS: Record<string, string> = { PETROL: 'Petrol', DIESEL: 'Diesel', HYBRID: 'Hybrid', ELECTRIC: 'Electric', OTHER: 'Other' }
const TRANS_LABELS: Record<string, string> = { MANUAL: 'Manual', AUTOMATIC: 'Automatic', CVT: 'CVT', OTHER: 'Other' }

function JobStatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    DRAFT: 'badge-draft', OPEN: 'badge-open', IN_PROGRESS: 'badge-progress',
    COMPLETED: 'badge-completed', DELIVERED: 'badge-delivered', CANCELLED: 'badge-cancelled',
  }
  const labels: Record<string, string> = {
    DRAFT: 'Draft', OPEN: 'Open', IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed', DELIVERED: 'Delivered', CANCELLED: 'Cancelled',
  }
  return <span className={`badge ${map[s] || 'badge-draft'}`}>{labels[s] || s}</span>
}
function PriBadge({ p }: { p: string }) {
  const m: Record<string, string> = { LOW: 'badge-low', NORMAL: 'badge-normal', HIGH: 'badge-high', URGENT: 'badge-urgent' }
  return <span className={`badge ${m[p] || 'badge-normal'}`}>{p}</span>
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VehicleProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const { data: vehicle, isLoading: isLoadingVehicle } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => getVehicleById(id!),
  })

  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['customers', vehicle?.customerId],
    queryFn: () => getCustomerById(String(vehicle!.customerId)),
    enabled: !!vehicle?.customerId,
  })

  const { data: jobCards = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobcards', 'vehicle', id],
    queryFn: () => getJobCards(id),
  })

  if (isLoadingVehicle) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-gold-primary)' }} />
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-state-title">Vehicle not found</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/vehicles')}>Back to Vehicles</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vehicles')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Vehicles
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/vehicles/${id}/edit`)}>
          <Edit size={13} /> Edit Vehicle
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/job-cards/new')}>
          <Plus size={13} /> New Job Card
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'flex-start' }}>
        
        {/* ── Left Column: Details ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Main Card */}
          <div className="card">
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 16 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(184,134,11,0.08))',
                  border: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <Car size={32} style={{ color: 'var(--color-gold-primary)' }} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
                  {vehicle.make} {vehicle.model}
                </div>
                {vehicle.variant && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{vehicle.variant}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className="badge badge-gold" style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontSize: 13, padding: '4px 10px' }}>
                    {vehicle.registration}
                  </span>
                  <span className={`badge ${vehicle.isActive ? 'badge-completed' : 'badge-cancelled'}`}>
                    {vehicle.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="divider" style={{ margin: '12px 0' }} />

              {/* Customer Link */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 4 }}>Owner</div>
                <div
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--color-gold-primary)', cursor: 'pointer', padding: '4px 8px', borderRadius: 4, background: 'rgba(212,175,55,0.08)' }}
                  onClick={() => navigate(`/customers/${vehicle.customerId}`)}
                >
                  {customer?.name || 'Unknown'}
                  <Eye size={13} />
                </div>
              </div>

              {/* Specs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <SpecRow icon={<Calendar size={13} />} label="Year" value={vehicle.year || 'N/A'} />
                <SpecRow icon={<Droplet size={13} />} label="Colour" value={vehicle.colour || 'N/A'} />
                <SpecRow icon={<Gauge size={13} />} label="Fuel" value={vehicle.fuelType ? FUEL_LABELS[vehicle.fuelType] : 'N/A'} />
                <SpecRow icon={<Settings size={13} />} label="Trans" value={vehicle.transmission ? TRANS_LABELS[vehicle.transmission] : 'N/A'} />
                <SpecRow icon={<Wrench size={13} />} label="Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} km` : 'N/A'} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Job History ── */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={16} style={{ color: 'var(--text-muted)' }} />
              Job History
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/job-cards/new')}>
              <Plus size={13} /> Log New Job
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Job #</th>
                  <th>Date</th>
                  <th>Mileage</th>
                  <th>Services</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoadingJobs ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <Loader2 size={24} className="spinner" style={{ margin: '0 auto', color: 'var(--color-gold-primary)' }} />
                    </td>
                  </tr>
                ) : jobCards.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state" style={{ padding: '40px 20px' }}>
                        <div className="empty-state-icon"><ClipboardList size={20} /></div>
                        <div className="empty-state-title">No jobs recorded</div>
                      </div>
                    </td>
                  </tr>
                ) : jobCards.map(j => (
                  <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/job-cards/${j.id}`)}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-gold-primary)', fontWeight: 600 }}>{j.jobNumber}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{format(parseISO(j.date), 'yyyy-MM-dd')}</td>
                    <td style={{ fontSize: 12, color: 'var(--text)' }}>{j.odometer ? `${j.odometer.toLocaleString()} km` : '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }} className="truncate">
                      {j.services?.length ? j.services.map(s => s.service?.name).join(', ') : j.complaint || '—'}
                    </td>
                    <td><PriBadge p={j.priority} /></td>
                    <td><JobStatusBadge s={j.status} /></td>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>LKR {Number(j.total).toLocaleString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={e => { e.stopPropagation(); navigate(`/job-cards/${j.id}`) }}>
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

function SpecRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text-subtle)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  )
}
