import { useState } from 'react'
import {
  Calendar, Phone, MessageSquare, Clock, AlertTriangle, CheckCircle2,
  Plus, Search, Filter, Trash2, User, Car, X, ShieldAlert,
  ChevronRight, ArrowRight, Check, History, PhoneCall, Send
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReminders,
  createReminderSchedule,
  updateReminder,
  deleteReminder,
  addReminderFollowup,
} from '@/api/reminders'
import type {
  MaintenanceReminder,
  ReminderStatus
} from '@/api/reminders'
import { getCustomers } from '@/api/customers'
import { getVehicles } from '@/api/vehicles'
import { format, parseISO, differenceInDays } from 'date-fns'

const formatDate = (d?: string | null) => {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? d : format(dt, 'MMM dd, yyyy')
  } catch {
    return d
  }
}

export default function RemindersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [timeframeFilter, setTimeframeFilter] = useState<string>('ALL')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [followupReminder, setFollowupReminder] = useState<MaintenanceReminder | null>(null)
  const [historyReminder, setHistoryReminder] = useState<MaintenanceReminder | null>(null)

  // Follow-up form
  const [fChannel, setFChannel] = useState<'PHONE' | 'WHATSAPP' | 'SMS' | 'IN_PERSON'>('PHONE')
  const [fContacted, setFContacted] = useState<boolean>(true)
  const [fResponse, setFResponse] = useState<string>('CONFIRMED_BOOKING')
  const [fScheduledDate, setFScheduledDate] = useState<string>('')
  const [fNotes, setFNotes] = useState<string>('')

  // New Reminder form
  const [newCustomerId, setNewCustomerId] = useState<number>(0)
  const [newVehicleId, setNewVehicleId] = useState<number>(0)
  const [newServiceName, setNewServiceName] = useState('Ceramic Coating 9H Maintenance')
  const [newPreset, setNewPreset] = useState<'COATING_5YR' | 'GENERAL_MAINTENANCE' | 'SINGLE'>('COATING_5YR')
  const [newStartDate, setNewStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newNotes, setNewNotes] = useState('')

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => getReminders(),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers(),
  })

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => getVehicles(),
  })

  const customerVehicles = vehicles.filter(v => v.customerId === newCustomerId)

  const createMut = useMutation({
    mutationFn: (payload: any) => createReminderSchedule(payload),
    onSuccess: (res) => {
      alert(res.message || 'Maintenance schedule generated!')
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setIsCreateModalOpen(false)
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to create reminders')
    }
  })

  const followupMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => addReminderFollowup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setFollowupReminder(null)
      setFScheduledDate('')
      setFNotes('')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to record follow-up')
    }
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteReminder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete reminder')
    }
  })

  const statusUpdateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReminderStatus }) => updateReminder(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })

  const handleOpenFollowup = (r: MaintenanceReminder) => {
    setFollowupReminder(r)
    setFChannel('PHONE')
    setFContacted(true)
    setFResponse('CONFIRMED_BOOKING')
    setFScheduledDate(r.scheduledDate ? format(new Date(r.scheduledDate), 'yyyy-MM-dd') : '')
    setFNotes('')
  }

  const handleSubmitFollowup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!followupReminder) return

    followupMut.mutate({
      id: followupReminder.id,
      payload: {
        channel: fChannel,
        contacted: fContacted,
        response: fResponse,
        scheduledDate: fScheduledDate || null,
        notes: fNotes
      }
    })
  }

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCustomerId || !newVehicleId) {
      alert('Please select both a Customer and a Vehicle')
      return
    }

    createMut.mutate({
      customerId: newCustomerId,
      vehicleId: newVehicleId,
      serviceName: newServiceName,
      preset: newPreset,
      startDate: newStartDate,
      notes: newNotes,
    })
  }

  const handleDelete = (r: MaintenanceReminder) => {
    if (confirm(`Are you sure you want to delete this reminder for ${r.customer?.name} (${r.intervalLabel})?`)) {
      deleteMut.mutate(r.id)
    }
  }

  // Filter calculations
  const overdueCount = reminders.filter(r => r.isOverdue).length
  const dueWeekCount = reminders.filter(r => r.isDueThisWeek && !r.isOverdue).length
  const scheduledCount = reminders.filter(r => r.status === 'SCHEDULED').length
  const totalActive = reminders.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length

  const filteredReminders = reminders.filter(r => {
    const term = search.toLowerCase()
    const matchesSearch =
      r.serviceName.toLowerCase().includes(term) ||
      (r.customer?.name && r.customer.name.toLowerCase().includes(term)) ||
      (r.customer?.mobile && r.customer.mobile.toLowerCase().includes(term)) ||
      (r.vehicle?.registration && r.vehicle.registration.toLowerCase().includes(term)) ||
      (r.intervalLabel && r.intervalLabel.toLowerCase().includes(term))

    if (!matchesSearch) return false

    if (timeframeFilter === 'OVERDUE') return r.isOverdue
    if (timeframeFilter === 'THIS_WEEK') return r.isDueThisWeek || r.isDueToday
    if (timeframeFilter === 'SCHEDULED') return r.status === 'SCHEDULED'

    if (statusFilter !== 'ALL') return r.status === statusFilter

    return true
  })

  return (
    <div style={{ maxWidth: 1250, margin: '0 auto', paddingBottom: 60 }}>
      {/* ── Page Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Maintenance Reminders & Follow-ups</h1>
          <p className="page-subtitle">
            Periodic coating inspections, service checkups, and customer re-engagement management
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setNewCustomerId(customers[0]?.id || 0)
            setIsCreateModalOpen(true)
          }}
          style={{ gap: 8 }}
        >
          <Plus size={18} /> New Maintenance Schedule
        </button>
      </div>

      {/* ── Top Metric Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div
          className="card"
          onClick={() => { setTimeframeFilter('OVERDUE'); setStatusFilter('ALL'); }}
          style={{
            padding: '16px 20px', cursor: 'pointer',
            borderLeft: '4px solid var(--color-danger)',
            background: timeframeFilter === 'OVERDUE' ? 'var(--hover)' : 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overdue Reminders
            </span>
            <AlertTriangle size={18} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
            {overdueCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Requires immediate phone call</div>
        </div>

        <div
          className="card"
          onClick={() => { setTimeframeFilter('THIS_WEEK'); setStatusFilter('ALL'); }}
          style={{
            padding: '16px 20px', cursor: 'pointer',
            borderLeft: '4px solid #f59e0b',
            background: timeframeFilter === 'THIS_WEEK' ? 'var(--hover)' : 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Due This Week
            </span>
            <Clock size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
            {dueWeekCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Upcoming maintenance checkups</div>
        </div>

        <div
          className="card"
          onClick={() => { setTimeframeFilter('SCHEDULED'); setStatusFilter('ALL'); }}
          style={{
            padding: '16px 20px', cursor: 'pointer',
            borderLeft: '4px solid #3b82f6',
            background: timeframeFilter === 'SCHEDULED' ? 'var(--hover)' : 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Confirmed Bookings
            </span>
            <Calendar size={18} color="#3b82f6" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#3b82f6', fontFamily: 'monospace' }}>
            {scheduledCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Customers agreed to visit</div>
        </div>

        <div
          className="card"
          onClick={() => { setTimeframeFilter('ALL'); setStatusFilter('ALL'); }}
          style={{
            padding: '16px 20px', cursor: 'pointer',
            borderLeft: '4px solid var(--color-success)',
            background: timeframeFilter === 'ALL' && statusFilter === 'ALL' ? 'var(--hover)' : 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Schedules
            </span>
            <CheckCircle2 size={18} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>
            {totalActive}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Total trackable vehicle milestones</div>
        </div>
      </div>

      {/* ── Main Reminders Table Card ── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ width: 300 }}>
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Search customer, vehicle, reg #, service..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { val: 'ALL', label: 'All Reminders' },
                { val: 'PENDING', label: 'Pending' },
                { val: 'CONTACTED', label: 'Contacted' },
                { val: 'SCHEDULED', label: 'Scheduled' },
                { val: 'COMPLETED', label: 'Completed' },
              ].map(tab => (
                <button
                  key={tab.val}
                  className={`btn btn-xs ${statusFilter === tab.val && timeframeFilter === 'ALL' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => {
                    setStatusFilter(tab.val)
                    setTimeframeFilter('ALL')
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing <strong>{filteredReminders.length}</strong> of {reminders.length} milestones
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filteredReminders.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No maintenance reminders found matching filters.
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Due Date</th>
                  <th>Customer & Contact</th>
                  <th>Vehicle</th>
                  <th>Maintenance Milestone</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th>Latest Follow-up / Appointment</th>
                  <th style={{ width: 160, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.map(r => {
                  const rawMobile = r.customer?.mobile || ''
                  const cleanPhone = rawMobile.replace(/[^0-9]/g, '')
                  const waNumber = cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone
                  const waMessage = encodeURIComponent(
                    `Hello ${r.customer?.name || 'Customer'},\nThis is Golden Auto Detail regarding your vehicle (${r.vehicle?.registration}). Your ${r.intervalLabel} maintenance checkup (${r.serviceName}) is due. Would you like to schedule an appointment this week?`
                  )

                  return (
                    <tr key={r.id} className="table-row-hover">
                      {/* Due Date */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13, color: r.isOverdue ? 'var(--color-danger)' : 'var(--text)' }}>
                          {formatDate(r.reminderDate)}
                        </div>
                        {r.isOverdue && (
                          <span className="badge badge-danger" style={{ fontSize: 10, padding: '1px 6px', marginTop: 3 }}>
                            Overdue
                          </span>
                        )}
                        {r.isDueToday && (
                          <span className="badge badge-gold" style={{ fontSize: 10, padding: '1px 6px', marginTop: 3 }}>
                            Due Today
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>
                          {r.customer?.name || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          <Phone size={11} /> {r.customer?.mobile || '—'}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${waNumber}?text=${waMessage}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Message on WhatsApp"
                              style={{ color: '#25D366', marginLeft: 4 }}
                            >
                              <Send size={12} />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td>
                        <span className="badge badge-gold" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                          {r.vehicle?.registration || '—'}
                        </span>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.vehicle?.make} {r.vehicle?.model}
                        </div>
                      </td>

                      {/* Service & Milestone */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge badge-outline" style={{ fontWeight: 700, fontSize: 11, background: 'var(--hover)' }}>
                            {r.intervalLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 3, fontWeight: 500 }}>
                          {r.serviceName}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${
                          r.status === 'SCHEDULED' ? 'badge-open' :
                          r.status === 'COMPLETED' ? 'badge-completed' :
                          r.status === 'CONTACTED' ? 'badge-gold' :
                          r.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-draft'
                        }`}>
                          {r.status}
                        </span>
                      </td>

                      {/* Follow-up / Appointment */}
                      <td>
                        {r.scheduledDate ? (
                          <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 12 }}>
                            🗓 Appointment: {formatDate(r.scheduledDate)}
                          </div>
                        ) : null}

                        {r.latestFollowup ? (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            <span style={{ fontWeight: 600 }}>{r.latestFollowup.channel}:</span> {r.latestFollowup.response}
                            {r.latestFollowup.notes && (
                              <div style={{ fontSize: 11, color: 'var(--text-subtle)' }}>"{r.latestFollowup.notes}"</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>No calls logged yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleOpenFollowup(r)}
                            style={{ gap: 4 }}
                          >
                            <PhoneCall size={12} /> Log Call
                          </button>
                          {r.followups && r.followups.length > 0 && (
                            <button
                              className="btn btn-ghost btn-icon btn-xs"
                              title="View History"
                              onClick={() => setHistoryReminder(r)}
                            >
                              <History size={13} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-icon btn-xs"
                            style={{ color: 'var(--color-danger)' }}
                            title="Delete Reminder"
                            onClick={() => handleDelete(r)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── LOG CALL / FOLLOW-UP MODAL ── */}
      {followupReminder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Log Customer Follow-up Call</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {followupReminder.customer?.name} · {followupReminder.vehicle?.registration} ({followupReminder.intervalLabel})
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setFollowupReminder(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitFollowup}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Channel & Contacted */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label required">Contact Channel</label>
                    <select
                      className="form-select"
                      value={fChannel}
                      onChange={e => setFChannel(e.target.value as any)}
                    >
                      <option value="PHONE">Phone Call</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="SMS">SMS Message</option>
                      <option value="IN_PERSON">In-Person Visit</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Answered / Reached?</label>
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="contacted"
                          checked={fContacted}
                          onChange={() => setFContacted(true)}
                        /> Yes
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="contacted"
                          checked={!fContacted}
                          onChange={() => setFContacted(false)}
                        /> No Answer
                      </label>
                    </div>
                  </div>
                </div>

                {/* Response */}
                <div className="form-group">
                  <label className="form-label required">Customer Response Status</label>
                  <select
                    className="form-select"
                    value={fResponse}
                    onChange={e => setFResponse(e.target.value)}
                  >
                    <option value="CONFIRMED_BOOKING">Confirmed Booking (Customer will come)</option>
                    <option value="POSTPONED">Postponed (Busy / Remind next month)</option>
                    <option value="CALL_BACK_LATER">Call Back Later / Thinking</option>
                    <option value="NO_ANSWER">Ringing / Out of Service / No Answer</option>
                    <option value="COMPLETED">Already Serviced / Completed</option>
                    <option value="NOT_INTERESTED">Not Interested / Sold Vehicle</option>
                  </select>
                </div>

                {/* If confirmed booking, ask for date */}
                {(fResponse === 'CONFIRMED_BOOKING' || fResponse === 'POSTPONED') && (
                  <div className="form-group">
                    <label className="form-label required">
                      {fResponse === 'CONFIRMED_BOOKING' ? 'Scheduled Visit Date' : 'Next Call Date'}
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={fScheduledDate}
                      onChange={e => setFScheduledDate(e.target.value)}
                      required={fResponse === 'CONFIRMED_BOOKING'}
                    />
                    <span className="form-hint">Date agreed upon with the customer</span>
                  </div>
                )}

                {/* Staff Notes */}
                <div className="form-group">
                  <label className="form-label">Notes / Customer Remarks</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="e.g. Kasun said he will bring the car Saturday morning at 10 AM for 6-month wash checkup"
                    value={fNotes}
                    onChange={e => setFNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setFollowupReminder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={followupMut.isPending}>
                  {followupMut.isPending ? 'Saving...' : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── NEW SCHEDULE MODAL ── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Create Periodic Maintenance Schedule</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Auto-generates reminder milestones for Ceramic Coating, PPF, or General Service
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setIsCreateModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Customer */}
                <div className="form-group">
                  <label className="form-label required">Customer</label>
                  <select
                    className="form-select"
                    value={newCustomerId}
                    onChange={e => {
                      const cid = Number(e.target.value)
                      setNewCustomerId(cid)
                      const matchingV = vehicles.find(v => v.customerId === cid)
                      setNewVehicleId(matchingV ? matchingV.id : 0)
                    }}
                    required
                  >
                    <option value={0}>-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle */}
                <div className="form-group">
                  <label className="form-label required">Vehicle</label>
                  <select
                    className="form-select"
                    value={newVehicleId}
                    onChange={e => setNewVehicleId(Number(e.target.value))}
                    required
                  >
                    <option value={0}>-- Select Vehicle --</option>
                    {customerVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration} · {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Name */}
                <div className="form-group">
                  <label className="form-label required">Primary Service Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newServiceName}
                    onChange={e => setNewServiceName(e.target.value)}
                    required
                  />
                </div>

                {/* Schedule Preset */}
                <div className="form-group">
                  <label className="form-label required">Periodic Schedule Preset</label>
                  <select
                    className="form-select"
                    value={newPreset}
                    onChange={e => setNewPreset(e.target.value as any)}
                  >
                    <option value="COATING_5YR">5-Year Ceramic Coating / PPF (2 Wks, 3 Mo, then every 6 Mo up to 5 Yrs)</option>
                    <option value="GENERAL_MAINTENANCE">General Maintenance (3 Months, 6 Months)</option>
                    <option value="SINGLE">Single One-Time Reminder</option>
                  </select>
                  <span className="form-hint" style={{ color: 'var(--color-gold-primary)' }}>
                    {newPreset === 'COATING_5YR' && '✨ Creates 12 periodic milestones: 2 weeks checkup, 3 months, and every 6 months up to 5 years!'}
                    {newPreset === 'GENERAL_MAINTENANCE' && '✨ Creates 3-month and 6-month checkup reminders.'}
                    {newPreset === 'SINGLE' && 'Creates a single target reminder.'}
                  </span>
                </div>

                {/* Service Completion Date */}
                <div className="form-group">
                  <label className="form-label required">Service Completion Date (Base Date)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    required
                  />
                  <span className="form-hint">All milestone intervals are calculated starting from this date</span>
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Internal Notes / Warranty Details</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. 9H 5-Year Ceramic Coating applied with 5-year warranty card"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Generating...' : 'Generate Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW FOLLOW-UP HISTORY MODAL ── */}
      {historyReminder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Call & Follow-up History</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {historyReminder.customer?.name} · {historyReminder.vehicle?.registration} ({historyReminder.intervalLabel})
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setHistoryReminder(null)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {historyReminder.followups?.map(f => (
                <div key={f.id} className="card" style={{ padding: 14, background: 'var(--hover)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <span className="badge badge-open" style={{ fontSize: 10 }}>{f.channel}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, marginLeft: 8 }}>{f.response}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{formatDate(f.contactDate)}</span>
                  </div>
                  {f.scheduledDate && (
                    <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600, marginTop: 4 }}>
                      🗓 Agreed Appointment: {formatDate(f.scheduledDate)}
                    </div>
                  )}
                  {f.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 4, fontStyle: 'italic' }}>
                      "{f.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-secondary" onClick={() => setHistoryReminder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
