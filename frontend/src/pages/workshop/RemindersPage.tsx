import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Calendar, Phone, MessageSquare, Clock, AlertTriangle, CheckCircle2,
  Plus, Search, Filter, Trash2, User, Car, X, ShieldAlert, Shield,
  ChevronRight, ArrowRight, Check, History, PhoneCall, Send, Sparkles
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

const getMilestonePreview = (preset: string, baseDateStr: string, serviceName: string) => {
  const base = new Date(baseDateStr || new Date())
  if (isNaN(base.getTime())) return []

  const presetsMap: Record<string, { days?: number; months?: number; label: string; desc: string }[]> = {
    FOLLOWUP_1WK: [
      { days: 7, label: '1 Week', desc: '1-Week Initial Follow-up & Hydrophobic Inspection' }
    ],
    FOLLOWUP_2WK: [
      { days: 14, label: '2 Weeks', desc: '2-Weeks Follow-up Inspection & Wash' }
    ],
    COATING_1YR: [
      { days: 21, label: '3 Weeks', desc: '3-Week Initial Inspection & Wash' },
      { months: 6, label: '6 Months', desc: '6-Month Booster & Decon Wash' },
      { months: 12, label: '1 Year', desc: '1-Year Annual Inspection & Warranty Validation' },
    ],
    COATING_2YR: [
      { days: 21, label: '3 Weeks', desc: '3-Week Initial Inspection & Wash' },
      { months: 6, label: '6 Months', desc: '6-Month Booster & Decon Wash' },
      { months: 12, label: '1 Year', desc: '1-Year Annual Inspection & Re-boost' },
      { months: 18, label: '18 Months', desc: '18-Month Maintenance Inspection' },
      { months: 24, label: '2 Years', desc: '2-Year Warranty Inspection & Final Top-up' },
    ],
    COATING_3YR: [
      { days: 21, label: '3 Weeks', desc: '3-Week Initial Inspection & Wash' },
      { months: 6, label: '6 Months', desc: '6-Month Booster & Decon Wash' },
      { months: 12, label: '1 Year', desc: '1-Year Annual Inspection & Re-boost' },
      { months: 18, label: '18 Months', desc: '18-Month Maintenance Inspection' },
      { months: 24, label: '2 Years', desc: '2-Year Annual Re-boost' },
      { months: 30, label: '30 Months', desc: '30-Month Maintenance Inspection' },
      { months: 36, label: '3 Years', desc: '3-Year Warranty Inspection & Final Top-up' },
    ],
    COATING_5YR: [
      { days: 21, label: '3 Weeks', desc: '3-Week Initial Inspection & Wash' },
      { months: 6, label: '6 Months', desc: '6-Month Booster & Decon Wash' },
      { months: 12, label: '1 Year', desc: '1-Year Annual Inspection & Re-boost' },
      { months: 18, label: '18 Months', desc: '18-Month Maintenance Inspection' },
      { months: 24, label: '2 Years', desc: '2-Year Annual Re-boost' },
      { months: 30, label: '30 Months', desc: '30-Month Maintenance Inspection' },
      { months: 36, label: '3 Years', desc: '3-Year Annual Re-boost' },
      { months: 42, label: '42 Months', desc: '42-Month Maintenance Inspection' },
      { months: 48, label: '4 Years', desc: '4-Year Annual Re-boost' },
      { months: 54, label: '54 Months', desc: '54-Month Maintenance Inspection' },
      { months: 60, label: '5 Years', desc: '5-Year Final Warranty Inspection' },
    ],
    GENERAL_MAINTENANCE: [
      { months: 3, label: '3 Months', desc: '3-Month Fluid & Filter Check' },
      { months: 6, label: '6 Months', desc: '6-Month General Maintenance Service' },
    ],
    SINGLE: [
      { days: 30, label: '1 Month', desc: 'One-Time Follow-up' },
    ],
  }

  const items = presetsMap[preset] || []
  return items.map(item => {
    const d = new Date(base)
    if (item.days) d.setDate(d.getDate() + item.days)
    else if (item.months) d.setMonth(d.getMonth() + item.months)
    return {
      label: item.label,
      date: format(d, 'MMM dd, yyyy'),
      desc: `${serviceName} - ${item.desc}`,
    }
  })
}

export default function RemindersPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [timeframeFilter, setTimeframeFilter] = useState<string>('ALL')

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [followupReminder, setFollowupReminder] = useState<MaintenanceReminder | null>(null)
  const [historyReminder, setHistoryReminder] = useState<MaintenanceReminder | null>(null)
  
  // Quick Action Modals (Done / Re-schedule)
  const [completeModalReminder, setCompleteModalReminder] = useState<MaintenanceReminder | null>(null)
  const [completeNotes, setCompleteNotes] = useState('')

  const [rescheduleModalReminder, setRescheduleModalReminder] = useState<MaintenanceReminder | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')

  // Follow-up form
  const [fChannel, setFChannel] = useState<'PHONE' | 'WHATSAPP' | 'SMS' | 'IN_PERSON'>('PHONE')
  const [fContacted, setFContacted] = useState<boolean>(true)
  const [fResponse, setFResponse] = useState<string>('CONFIRMED_BOOKING')
  const [fScheduledDate, setFScheduledDate] = useState<string>('')
  const [fNotes, setFNotes] = useState<string>('')

  // New Reminder form
  const [newJobCardId, setNewJobCardId] = useState<number | null>(null)
  const [newCustomerId, setNewCustomerId] = useState<number>(0)
  const [newVehicleId, setNewVehicleId] = useState<number>(0)
  const [newServiceName, setNewServiceName] = useState('Ceramic Coating 9H Warranty')
  const [newPreset, setNewPreset] = useState<'FOLLOWUP_1WK' | 'FOLLOWUP_2WK' | 'COATING_1YR' | 'COATING_2YR' | 'COATING_3YR' | 'COATING_5YR' | 'GENERAL_MAINTENANCE' | 'SINGLE'>('COATING_1YR')
  const [newStartDate, setNewStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newNotes, setNewNotes] = useState('')

  // Handle URL search params (e.g. from Job Card "Set Warranty Reminders")
  useEffect(() => {
    const action = searchParams.get('action')
    const cid = searchParams.get('customerId')
    const vid = searchParams.get('vehicleId')
    const sName = searchParams.get('serviceName')
    const jid = searchParams.get('jobCardId')
    const sDate = searchParams.get('startDate')

    if (action === 'new' || cid || vid) {
      if (cid) setNewCustomerId(Number(cid))
      if (vid) setNewVehicleId(Number(vid))
      if (sName) setNewServiceName(sName)
      if (jid) setNewJobCardId(Number(jid))
      if (sDate) setNewStartDate(sDate)
      setIsCreateModalOpen(true)
    }
  }, [searchParams])

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

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<MaintenanceReminder> }) => updateReminder(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setCompleteModalReminder(null)
      setRescheduleModalReminder(null)
      setCompleteNotes('')
      setRescheduleDate('')
      setRescheduleNotes('')
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to update reminder')
    }
  })

  const handleOpenCompleteModal = (r: MaintenanceReminder) => {
    setCompleteModalReminder(r)
    setCompleteNotes('')
  }

  const handleConfirmComplete = (e: React.FormEvent) => {
    e.preventDefault()
    if (!completeModalReminder) return
    updateMut.mutate({
      id: completeModalReminder.id,
      payload: {
        status: 'COMPLETED',
        notes: completeNotes.trim() || 'Maintenance service completed'
      }
    })
  }

  const handleOpenRescheduleModal = (r: MaintenanceReminder) => {
    setRescheduleModalReminder(r)
    const existingDate = r.scheduledDate 
      ? format(new Date(r.scheduledDate), 'yyyy-MM-dd') 
      : (r.reminderDate ? format(new Date(r.reminderDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setRescheduleDate(existingDate)
    setRescheduleNotes('')
  }

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleModalReminder) return
    updateMut.mutate({
      id: rescheduleModalReminder.id,
      payload: {
        status: 'SCHEDULED',
        scheduledDate: rescheduleDate,
        reminderDate: rescheduleDate,
        notes: rescheduleNotes.trim() || 'Re-scheduled by customer request'
      }
    })
  }

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
      jobCardId: newJobCardId,
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
  const completedCount = reminders.filter(r => r.status === 'COMPLETED').length
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
            borderLeft: '4px solid var(--color-gold-primary)',
            background: timeframeFilter === 'ALL' && statusFilter === 'ALL' ? 'var(--hover)' : 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gold-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Schedules
            </span>
            <Clock size={18} color="var(--color-gold-primary)" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace' }}>
            {totalActive}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Total trackable vehicle milestones</div>
        </div>

        <div
          className="card"
          onClick={() => { setTimeframeFilter('ALL'); setStatusFilter('COMPLETED'); }}
          style={{
            padding: '16px 20px', cursor: 'pointer',
            borderLeft: '4px solid #10b981',
            background: statusFilter === 'COMPLETED' ? 'var(--hover)' : 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Done / Completed
            </span>
            <CheckCircle2 size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
            {completedCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 2 }}>Services finished & verified</div>
        </div>
      </div>

      {/* ── Main Reminders Table Card ── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-box" style={{ width: 280 }}>
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
                { val: 'PENDING', label: '⏳ Pending' },
                { val: 'SCHEDULED', label: '🗓 Re-scheduled' },
                { val: 'COMPLETED', label: '✅ Done' },
                { val: 'CONTACTED', label: '📞 Contacted' },
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
                  <th style={{ width: 130 }}>Status</th>
                  <th>Appointment & Follow-up Notes</th>
                  <th style={{ width: 250, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.map(r => {
                  const rawMobile = r.customer?.mobile || ''
                  const cleanPhone = rawMobile.replace(/[^0-9]/g, '')
                  const waNumber = cleanPhone.startsWith('0') ? '94' + cleanPhone.slice(1) : cleanPhone
                  const waMessage = encodeURIComponent(
                    `Hello ${r.customer?.name || 'Customer'},\nThis is Auto Elevate regarding your vehicle (${r.vehicle?.registration}).\n\nYour ${r.intervalLabel} periodic maintenance checkup (${r.serviceName}) is due on ${formatDate(r.reminderDate)}.\n\nRegular scheduled checkups ensure your coating warranty remains fully active and preserve maximum gloss.\n\nWould you like us to schedule an appointment for you this week?`
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
                        }`} style={{ fontWeight: 700, fontSize: 11 }}>
                          {r.status === 'COMPLETED' ? '✅ Done' :
                           r.status === 'SCHEDULED' ? '🗓 Re-scheduled' :
                           r.status === 'CONTACTED' ? '📞 Contacted' :
                           r.status === 'CANCELLED' ? '❌ Cancelled' : '⏳ Pending'}
                        </span>
                      </td>

                      {/* Follow-up / Appointment & Notes */}
                      <td>
                        {r.scheduledDate ? (
                          <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: 12 }}>
                            🗓 Appointment: {formatDate(r.scheduledDate)}
                          </div>
                        ) : null}

                        {r.notes && (
                          <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 2, background: 'var(--hover)', padding: '2px 6px', borderRadius: 4 }}>
                            <span style={{ color: 'var(--color-gold-primary)', fontWeight: 600 }}>Note:</span> {r.notes}
                          </div>
                        )}

                        {r.latestFollowup ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                            <span style={{ fontWeight: 600 }}>{r.latestFollowup.channel}:</span> {r.latestFollowup.response}
                            {r.latestFollowup.notes && r.latestFollowup.notes !== r.notes && (
                              <span style={{ color: 'var(--text-subtle)' }}> · "{r.latestFollowup.notes}"</span>
                            )}
                          </div>
                        ) : (!r.notes && (
                          <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>No calls or notes logged yet</span>
                        ))}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {r.status !== 'COMPLETED' && (
                            <button
                              className="btn btn-xs"
                              style={{ background: '#10b981', color: '#fff', borderColor: '#10b981', gap: 4 }}
                              onClick={() => handleOpenCompleteModal(r)}
                              title="Mark this maintenance task as Done"
                            >
                              <CheckCircle2 size={12} /> Done
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-xs"
                            style={{ color: '#3b82f6', borderColor: '#3b82f6', gap: 4 }}
                            onClick={() => handleOpenRescheduleModal(r)}
                            title="Re-schedule Checkup Date"
                          >
                            <Calendar size={12} /> Re-schedule
                          </button>
                          <button
                            className="btn btn-primary btn-xs"
                            onClick={() => handleOpenFollowup(r)}
                            style={{ gap: 4 }}
                            title="Log Call / Contact Customer"
                          >
                            <PhoneCall size={12} /> Call
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

      {/* ── MARK AS DONE (COMPLETED) MODAL ── */}
      {completeModalReminder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={20} /> Mark Maintenance as Done
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {completeModalReminder.customer?.name} · {completeModalReminder.vehicle?.registration} ({completeModalReminder.intervalLabel})
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setCompleteModalReminder(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmComplete}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label required">Completion Notes / Work Carried Out</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="e.g. Customer brought vehicle in today. Completed 3-week wash, hydrophobic check performed, coating in excellent condition."
                    value={completeNotes}
                    onChange={e => setCompleteNotes(e.target.value)}
                    required
                  />
                  <span className="form-hint">Record what inspection or work was completed for this vehicle</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCompleteModalReminder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }} disabled={updateMut.isPending}>
                  {updateMut.isPending ? 'Updating...' : 'Confirm Completed (Done)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RE-SCHEDULE MODAL ── */}
      {rescheduleModalReminder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Calendar size={20} /> Re-schedule Maintenance Checkup
                </h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {rescheduleModalReminder.customer?.name} · {rescheduleModalReminder.vehicle?.registration} ({rescheduleModalReminder.intervalLabel})
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRescheduleModalReminder(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label required">New Target / Appointment Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    required
                  />
                  <span className="form-hint">Select the new agreed checkup date with the customer</span>
                </div>

                <div className="form-group">
                  <label className="form-label required">Reason for Re-scheduling / Customer Note</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="e.g. Customer requested postponement by 2 weeks because they are travelling abroad."
                    value={rescheduleNotes}
                    onChange={e => setRescheduleNotes(e.target.value)}
                    required
                  />
                  <span className="form-hint">Reason or remarks for changing the appointment</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setRescheduleModalReminder(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} disabled={updateMut.isPending}>
                  {updateMut.isPending ? 'Updating...' : 'Save Re-schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label required">Primary Service Name</label>
                    {newJobCardId && (
                      <span className="badge badge-gold" style={{ fontSize: 10 }}>
                        Linked to Job Card #{newJobCardId}
                      </span>
                    )}
                  </div>
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
                  <label className="form-label required">Periodic Warranty / Maintenance Schedule</label>
                  <select
                    className="form-select"
                    value={newPreset}
                    onChange={e => setNewPreset(e.target.value as any)}
                  >
                    <option value="FOLLOWUP_1WK">⚡ 1-Week Follow-up Check & Hydrophobic Wash</option>
                    <option value="FOLLOWUP_2WK">⚡ 2-Weeks Follow-up Inspection & Wash</option>
                    <option value="COATING_1YR">🛡️ 1-Year Coating Warranty (3 Weeks, 6 Months, 1 Year)</option>
                    <option value="COATING_2YR">🛡️ 2-Year Coating Warranty (3 Weeks, 6 Months, 1 Yr, 18 Mo, 2 Yrs)</option>
                    <option value="COATING_3YR">🛡️ 3-Year Coating Warranty (3 Weeks, 6 Months, 1 Yr, 18 Mo, 2 Yrs, 30 Mo, 3 Yrs)</option>
                    <option value="COATING_5YR">🛡️ 5-Year Coating Warranty (3 Weeks, 6 Months, then every 6 Months up to 5 Yrs)</option>
                    <option value="GENERAL_MAINTENANCE">🚗 General Periodic Maintenance (3 Months, 6 Months)</option>
                    <option value="SINGLE">🎯 Single One-Time Reminder</option>
                  </select>
                  <span className="form-hint" style={{ color: 'var(--color-gold-primary)' }}>
                    {newPreset === 'FOLLOWUP_1WK' && '✨ Creates a reminder 1 week (7 days) after service completion.'}
                    {newPreset === 'FOLLOWUP_2WK' && '✨ Creates a reminder 2 weeks (14 days) after service completion.'}
                    {newPreset === 'COATING_1YR' && '✨ Creates 3 milestones: 3-Week Initial Inspection, 6-Month Booster Wash, and 1-Year Annual Inspection.'}
                    {newPreset === 'COATING_2YR' && '✨ Creates 5 milestones: 3 Weeks, 6 Months, 1 Year, 18 Months, and 2 Years.'}
                    {newPreset === 'COATING_3YR' && '✨ Creates 7 milestones covering up to 3 Years.'}
                    {newPreset === 'COATING_5YR' && '✨ Creates 11 milestones covering the full 5-Year Warranty period.'}
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

                {/* Live Milestone Schedule Preview */}
                {(() => {
                  const milestones = getMilestonePreview(newPreset, newStartDate, newServiceName)
                  if (!milestones.length) return null
                  return (
                    <div style={{
                      background: 'var(--hover)',
                      borderRadius: 8,
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-gold-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} /> Schedule Preview ({milestones.length} Periodic Milestones):
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {milestones.map((m, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              <span className="badge badge-gold" style={{ fontSize: 10, padding: '2px 6px', flexShrink: 0 }}>{m.label}</span>
                              <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.desc}</span>
                            </div>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-subtle)', flexShrink: 0 }}>{m.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Notes */}
                <div className="form-group">
                  <label className="form-label">Internal Notes / Warranty Details</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. 9H Ceramic Coating applied with Warranty Card #WC-8891"
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
