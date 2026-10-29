import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, FileText, Plus, Trash2, AlertCircle, X, Check, Search, Car, User, Building2, Landmark, Loader2, Bell, Calendar, Clock, Sparkles } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createDirectInvoice } from '@/api/invoices'
import { getCustomers, createCustomer, type Customer } from '@/api/customers'
import { getVehicles, getVehiclesByCustomerId, createVehicle, updateVehicle, type Vehicle } from '@/api/vehicles'
import { getProducts } from '@/api/products'
import { getServices } from '@/api/services'
import { getSettings } from '@/api/system'
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
        placeholder="e.g. Ceramic Coating 9H, Wash & Vacuum..." 
        value={value} 
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
      />
      {open && value && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto',
          marginTop: 4
        }}>
          {filtered.map(s => (
            <div 
              key={s.id}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => { onSelect(s); setOpen(false) }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{s.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, textTransform: 'uppercase' }}>{s.type}</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>LKR {s.price.toLocaleString()}</span>
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

  // Document Type: Invoice or Quotation
  const [isQuotation, setIsQuotation] = useState(false)

  // Customer & Vehicle State
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustDropdown, setShowCustDropdown] = useState(false)
  const custWrapperRef = useRef<HTMLDivElement>(null)
  const [vehicleId, setVehicleId] = useState<string>('')

  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAdd, setQuickAdd] = useState({ name: '', mobile: '', vehicleReg: '' })
  const [transferVehicleId, setTransferVehicleId] = useState<number | null>(null)

  // Dedicated Vehicle Quick-Add State
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

  // Document Details
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [includeBankDetails, setIncludeBankDetails] = useState(true)
  const [bankDetailsText, setBankDetailsText] = useState('')

  // Financials
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState('CASH')

  // Line items
  const [items, setItems] = useState([{ description: '', quantity: 1, unitPrice: 0, discount: 0 }])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Periodic Maintenance & Coating Warranty Schedule
  const [enableMaintenanceSchedule, setEnableMaintenanceSchedule] = useState(true)
  const [maintenanceServiceName, setMaintenanceServiceName] = useState('')
  const [scheduleIntervals, setScheduleIntervals] = useState<Array<{
    id: string;
    intervalLabel: string;
    reminderDate: string;
    serviceName: string;
    notes: string;
  }>>([])

  const calcFutureDate = (days?: number, months?: number) => {
    const d = new Date()
    if (days) d.setDate(d.getDate() + days)
    if (months) d.setMonth(d.getMonth() + months)
    return d.toISOString().split('T')[0]
  }

  const applyPreset = (presetKey: string) => {
    setEnableMaintenanceSchedule(true)
    const activeService = maintenanceServiceName || items.find(i => i.description.trim())?.description || 'Periodic Coating Maintenance'
    if (!maintenanceServiceName) setMaintenanceServiceName(activeService)

    if (presetKey === '3W_6M_1Y') {
      setScheduleIntervals([
        { id: 'ms_' + Date.now() + '_1', intervalLabel: '3 Weeks', reminderDate: calcFutureDate(21), serviceName: `${activeService} - 3-Week Initial Inspection & Wash`, notes: 'Hydrophobic check & initial wash' },
        { id: 'ms_' + Date.now() + '_2', intervalLabel: '6 Months', reminderDate: calcFutureDate(undefined, 6), serviceName: `${activeService} - 6-Month Booster & Decon Wash`, notes: 'Chemical decontamination & booster top-up' },
        { id: 'ms_' + Date.now() + '_3', intervalLabel: '1 Year', reminderDate: calcFutureDate(undefined, 12), serviceName: `${activeService} - 1-Year Annual Inspection & Re-boost`, notes: 'Annual warranty inspection & gloss check' },
      ])
    } else if (presetKey === '2YR') {
      setScheduleIntervals([
        { id: 'ms_' + Date.now() + '_1', intervalLabel: '3 Weeks', reminderDate: calcFutureDate(21), serviceName: `${activeService} - 3-Week Initial Inspection & Wash`, notes: 'Hydrophobic check & initial wash' },
        { id: 'ms_' + Date.now() + '_2', intervalLabel: '6 Months', reminderDate: calcFutureDate(undefined, 6), serviceName: `${activeService} - 6-Month Booster & Decon Wash`, notes: 'Decon wash & booster' },
        { id: 'ms_' + Date.now() + '_3', intervalLabel: '1 Year', reminderDate: calcFutureDate(undefined, 12), serviceName: `${activeService} - 1-Year Annual Inspection`, notes: '1st Year annual check' },
        { id: 'ms_' + Date.now() + '_4', intervalLabel: '18 Months', reminderDate: calcFutureDate(undefined, 18), serviceName: `${activeService} - 18-Month Maintenance Inspection`, notes: 'Mid-year checkup' },
        { id: 'ms_' + Date.now() + '_5', intervalLabel: '2 Years', reminderDate: calcFutureDate(undefined, 24), serviceName: `${activeService} - 2-Year Final Inspection`, notes: '2nd Year warranty inspection' },
      ])
    } else if (presetKey === '3YR') {
      setScheduleIntervals([
        { id: 'ms_' + Date.now() + '_1', intervalLabel: '3 Weeks', reminderDate: calcFutureDate(21), serviceName: `${activeService} - 3-Week Initial Inspection`, notes: '3-week wash' },
        { id: 'ms_' + Date.now() + '_2', intervalLabel: '6 Months', reminderDate: calcFutureDate(undefined, 6), serviceName: `${activeService} - 6-Month Booster`, notes: 'Booster application' },
        { id: 'ms_' + Date.now() + '_3', intervalLabel: '1 Year', reminderDate: calcFutureDate(undefined, 12), serviceName: `${activeService} - 1-Year Annual Service`, notes: 'Annual checkup' },
        { id: 'ms_' + Date.now() + '_4', intervalLabel: '2 Years', reminderDate: calcFutureDate(undefined, 24), serviceName: `${activeService} - 2-Year Annual Re-boost`, notes: 'Annual re-boost' },
        { id: 'ms_' + Date.now() + '_5', intervalLabel: '3 Years', reminderDate: calcFutureDate(undefined, 36), serviceName: `${activeService} - 3-Year Final Inspection`, notes: '3-Year final inspection' },
      ])
    } else if (presetKey === '5YR') {
      setScheduleIntervals([
        { id: 'ms_' + Date.now() + '_1', intervalLabel: '3 Weeks', reminderDate: calcFutureDate(21), serviceName: `${activeService} - 3-Week Initial Wash`, notes: '3-week check' },
        { id: 'ms_' + Date.now() + '_2', intervalLabel: '6 Months', reminderDate: calcFutureDate(undefined, 6), serviceName: `${activeService} - 6-Month Booster`, notes: '6-month booster' },
        { id: 'ms_' + Date.now() + '_3', intervalLabel: '1 Year', reminderDate: calcFutureDate(undefined, 12), serviceName: `${activeService} - 1-Year Inspection`, notes: 'Annual check' },
        { id: 'ms_' + Date.now() + '_4', intervalLabel: '2 Years', reminderDate: calcFutureDate(undefined, 24), serviceName: `${activeService} - 2-Year Annual Re-boost`, notes: 'Annual check' },
        { id: 'ms_' + Date.now() + '_5', intervalLabel: '3 Years', reminderDate: calcFutureDate(undefined, 36), serviceName: `${activeService} - 3-Year Annual Re-boost`, notes: 'Annual check' },
        { id: 'ms_' + Date.now() + '_6', intervalLabel: '4 Years', reminderDate: calcFutureDate(undefined, 48), serviceName: `${activeService} - 4-Year Annual Re-boost`, notes: 'Annual check' },
        { id: 'ms_' + Date.now() + '_7', intervalLabel: '5 Years', reminderDate: calcFutureDate(undefined, 60), serviceName: `${activeService} - 5-Year Final Warranty Inspection`, notes: 'Final inspection' },
      ])
    } else if (presetKey === 'GENERAL') {
      setScheduleIntervals([
        { id: 'ms_' + Date.now() + '_1', intervalLabel: '3 Months', reminderDate: calcFutureDate(undefined, 3), serviceName: `${activeService} - 3-Month Fluid & Filter Check`, notes: 'Filter and fluid inspection' },
        { id: 'ms_' + Date.now() + '_2', intervalLabel: '6 Months', reminderDate: calcFutureDate(undefined, 6), serviceName: `${activeService} - 6-Month General Maintenance`, notes: 'Comprehensive 6-month service' },
      ])
    }
  }

  const addCustomInterval = (label: string, days?: number, months?: number) => {
    setEnableMaintenanceSchedule(true)
    const activeService = maintenanceServiceName || items.find(i => i.description.trim())?.description || 'Periodic Maintenance'
    if (!maintenanceServiceName) setMaintenanceServiceName(activeService)

    const dateStr = calcFutureDate(days, months)
    setScheduleIntervals(prev => [
      ...prev,
      {
        id: 'ms_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        intervalLabel: label,
        reminderDate: dateStr,
        serviceName: `${activeService} - ${label} Checkup`,
        notes: ''
      }
    ])
  }

  const updateInterval = (id: string, field: string, val: string) => {
    setScheduleIntervals(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item))
  }

  const removeInterval = (id: string) => {
    setScheduleIntervals(prev => prev.filter(item => item.id !== id))
  }

  // Queries
  const { data: settings = {} } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers })
  const { data: allVehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: getVehicles })
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts })
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: getServices })

  // Customer vehicles
  const { data: customerVehicles = [] } = useQuery({
    queryKey: ['vehicles', 'customer', customerId],
    queryFn: () => getVehiclesByCustomerId(customerId),
    enabled: !!customerId
  })

  const selectedCustomer = customers.find(c => String(c.id) === customerId)

  // Initialize terms and bank details from settings
  useEffect(() => {
    if (settings) {
      if (!terms) {
        setTerms(
          isQuotation 
            ? (settings.quotationTerms || '1. This quotation is valid for 14 days from the date of issue.\n2. Prices are subject to vehicle physical inspection upon arrival.\n3. 50% advance payment required upon job confirmation.')
            : (settings.invoiceTerms || '1. All payments are due upon receipt.\n2. Goods & services once delivered and accepted in good order are non-refundable.\n3. Make all cheques payable to the company name.')
        )
      }
      if (!bankDetailsText) {
        const b = [
          settings.bankName ? `Bank: ${settings.bankName}` : '',
          settings.bankAccountName ? `Account Name: ${settings.bankAccountName}` : '',
          settings.bankAccountNumber ? `Account Number: ${settings.bankAccountNumber}` : '',
          settings.bankBranch ? `Branch: ${settings.bankBranch}` : '',
        ].filter(Boolean).join('\n')
        setBankDetailsText(b || 'Bank: Commercial Bank\nAccount Name: Auto Elevate (Pvt) Ltd\nAccount Number: 100012345678\nBranch: Ja-Ela Branch')
      }
    }
  }, [settings, isQuotation])

  // Update terms when switching between Invoice and Quotation if terms were default
  const handleToggleDocType = (quo: boolean) => {
    setIsQuotation(quo)
    if (quo) {
      setTerms(settings.quotationTerms || '1. This quotation is valid for 14 days from the date of issue.\n2. Prices are subject to vehicle physical inspection upon arrival.\n3. 50% advance payment required upon job confirmation.')
    } else {
      setTerms(settings.invoiceTerms || '1. All payments are due upon receipt.\n2. Goods & services once delivered and accepted in good order are non-refundable.\n3. Make all cheques payable to the company name.')
    }
  }

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
    if (!customerId) {
      e.customerId = 'Customer is required. Please select or add a customer.'
      error('Customer Required', 'Please select a customer for this document.')
    }
    
    let hasValidItem = false
    items.forEach((item, idx) => {
      if (item.description.trim()) {
        hasValidItem = true
        if (Number(item.quantity) <= 0) e[`item_${idx}`] = 'Quantity must be > 0'
        if (Number(item.unitPrice) < 0) e[`item_${idx}`] = 'Price cannot be negative'
      }
    })

    if (!hasValidItem) {
      e.items = 'Add at least one valid line item with description'
      error('Items Required', 'Please add at least one line item to the document.')
    }

    if (scheduleIntervals.length > 0) {
      if (!vehicleId) {
        e.vehicleId = 'Please select a vehicle to schedule maintenance reminders'
        error('Vehicle Required', 'A vehicle registration must be selected to schedule maintenance reminders.')
      }
    }

    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: createDirectInvoice,
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      success(
        isQuotation ? 'Quotation Created' : 'Invoice Created', 
        `${isQuotation ? 'Quotation' : 'Invoice'} ${inv.invoiceNumber} has been generated successfully.${enableMaintenanceSchedule ? ' Maintenance reminders have been scheduled.' : ''}`
      )
      navigate(`/invoices/${inv.id}`)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Could not save invoice. Please check the fields and try again.'
      error('Save Failed', msg)
    }
  })

  function handleSubmit() {
    if (!validate()) return
    const validItems = items.filter(i => i.description.trim()).map(i => ({
      description: i.description.trim(),
      quantity: Number(i.quantity) || 1,
      unitPrice: Number(i.unitPrice) || 0,
      discount: Number(i.discount) || 0
    }))

    const maintenanceSchedulePayload = scheduleIntervals.length > 0 ? {
      serviceName: maintenanceServiceName.trim() || validItems[0]?.description || 'Periodic Maintenance',
      intervals: scheduleIntervals.map(i => ({
        intervalLabel: i.intervalLabel.trim(),
        reminderDate: i.reminderDate,
        serviceName: i.serviceName.trim() || undefined,
        notes: i.notes.trim() || undefined
      }))
    } : null

    createMut.mutate({ 
      customerId: Number(customerId),
      vehicleId: vehicleId ? Number(vehicleId) : null,
      notes: notes.trim() || undefined,
      terms: terms.trim() || undefined,
      bankDetails: includeBankDetails ? (bankDetailsText.trim() || undefined) : undefined,
      isQuotation,
      globalDiscount: Number(globalDiscount) || 0,
      paymentAmount: isQuotation ? 0 : (Number(paymentAmount) || 0),
      paymentMethod,
      items: validItems,
      maintenanceSchedule: maintenanceSchedulePayload
    })
  }

  const handleQuickAdd = async () => {
    if (!quickAdd.name || !quickAdd.mobile) {
      error('Missing Fields', 'Name and Mobile number are required.')
      return
    }
    try {
      const newCust = await createCustomer({
        name: quickAdd.name.trim(),
        mobile: quickAdd.mobile.trim(),
        customerType: 'INDIVIDUAL',
        isActive: true,
        creditLimit: 0,
        openingBalance: 0,
      } as any)
      
      let createdVehId: number | null = null
      if (quickAdd.vehicleReg) {
        if (transferVehicleId) {
          await updateVehicle(String(transferVehicleId), { customerId: newCust.id })
          createdVehId = transferVehicleId
        } else {
          const v = await createVehicle({
            registration: quickAdd.vehicleReg.trim().toUpperCase(),
            customerId: newCust.id,
            make: 'Unknown', 
            model: 'Unknown',
            isActive: true,
            year: null, 
            mileage: null,
          } as any)
          createdVehId = v.id
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      success('Customer Added', `${newCust.name} has been added successfully.`)
      setCustomerId(String(newCust.id))
      setCustomerSearch(`${newCust.name} (${newCust.mobile})`)
      if (createdVehId) {
        setVehicleId(String(createdVehId))
      }
      setShowQuickAdd(false)
      setQuickAdd({ name: '', mobile: '', vehicleReg: '' })
      setTransferVehicleId(null)
    } catch (e: any) {
      error('Error', e.response?.data?.error || e.message || 'Failed to add customer')
    }
  }

  const handleQuickAddVehicle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!customerId) {
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
        customerId: Number(customerId),
        registration: newVehicle.registration.trim().toUpperCase(),
        make: newVehicle.make.trim() || 'Unknown',
        model: newVehicle.model.trim() || 'Unknown',
        year: newVehicle.year ? Number(newVehicle.year) : null,
        colour: newVehicle.colour.trim() || null,
        mileage: newVehicle.mileage ? Number(newVehicle.mileage) : null,
        isActive: true
      } as any)

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'customer', customerId] })

      setVehicleId(String(created.id))
      success('Vehicle Added', `Vehicle ${created.registration} added and selected.`)
      setShowAddVehicleModal(false)
      setNewVehicle({ registration: '', make: '', model: '', year: '', colour: '', mileage: '' })
    } catch (err: any) {
      error('Vehicle Save Failed', err?.response?.data?.error || err.message || 'Could not create vehicle')
    } finally {
      setCreatingVehicle(false)
    }
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
  const itemDiscounts = items.reduce((sum, item) => sum + Number(item.discount || 0), 0)
  const totalDiscount = itemDiscounts + (Number(globalDiscount) || 0)
  const total = Math.max(0, subtotal - totalDiscount)
  const balanceDue = Math.max(0, total - (isQuotation ? 0 : (Number(paymentAmount) || 0)))

  const searchQ = customerSearch.toLowerCase()
  const matchingVehicles = allVehicles.filter(v => v.registration.toLowerCase().includes(searchQ))
  const matchingCustomerIds = new Set(matchingVehicles.map(v => v.customerId))

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQ) || 
    c.mobile.includes(searchQ) ||
    matchingCustomerIds.has(c.id)
  )

  return (
    <div style={{ maxWidth: 950, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top action bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Invoices
        </button>
        <div style={{ flex: 1 }} />

        {/* Document Type Selector Toggle */}
        <div style={{ display: 'flex', background: 'var(--hover)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${!isQuotation ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
            onClick={() => handleToggleDocType(false)}
          >
            Tax Invoice
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isQuotation ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
            onClick={() => handleToggleDocType(true)}
          >
            Quotation / Estimate
          </button>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={createMut.isPending} style={{ gap: 6 }}>
          {createMut.isPending ? 'Generating...' : <><Save size={13} /> {isQuotation ? 'Generate Quotation' : 'Generate Invoice'}</>}
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: isQuotation ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' : 'linear-gradient(135deg, #D4AF37, #B8860B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} style={{ color: '#0F1115' }} />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: 16 }}>
                {isQuotation ? 'New Quotation / Price Estimate' : 'New Direct Invoice'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {isQuotation 
                  ? 'Generate a formal price quotation for a customer before starting work' 
                  : 'Create and issue a direct commercial invoice with optional instant payment'}
              </div>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Customer & Vehicle Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              
              {/* Customer Selector */}
              <div className="form-group" ref={custWrapperRef} style={{ position: 'relative' }}>
                <label className="form-label required" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Customer</span>
                  {selectedCustomer && (
                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm" 
                      style={{ padding: 0, height: 'auto', fontSize: 11, color: 'var(--color-primary)' }}
                      onClick={() => {
                        setCustomerId('')
                        setVehicleId('')
                        setCustomerSearch('')
                      }}
                    >
                      Change Customer
                    </button>
                  )}
                </label>

                {selectedCustomer ? (
                  <div style={{
                    padding: '10px 14px', background: 'var(--hover)',
                    border: '1px solid var(--color-gold-primary)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{selectedCustomer.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {selectedCustomer.mobile} {selectedCustomer.code && `· ${selectedCustomer.code}`}
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ gap: 4 }}><Check size={12} /> Selected</span>
                  </div>
                ) : (
                  <>
                    <div className="search-box">
                      <Search size={14} className="search-icon" />
                      <input 
                        type="text" 
                        className={`form-input ${errors.customerId ? 'error' : ''}`} 
                        placeholder="Type customer name, phone, or plate..."
                        value={customerSearch}
                        onChange={e => {
                          setCustomerSearch(e.target.value)
                          setCustomerId('')
                          setVehicleId('')
                          setShowCustDropdown(true)
                        }}
                        onFocus={() => setShowCustDropdown(true)}
                        style={{ paddingLeft: 32 }}
                      />
                    </div>
                    {errors.customerId && <span className="form-error"><AlertCircle size={11} /> {errors.customerId}</span>}

                    {showCustDropdown && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                        background: 'var(--surface, #fff)', border: '1px solid var(--border)', borderRadius: 8,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 260, overflowY: 'auto',
                        marginTop: 4
                      }}>
                        {filteredCustomers.map(c => (
                          <div 
                            key={c.id}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCustomerId(String(c.id));
                              setCustomerSearch(`${c.name} (${c.mobile})`);
                              setShowCustDropdown(false);
                              if (errors.customerId) setErrors(e => { const n={...e}; delete n.customerId; return n });
                            }}
                            onClick={() => {
                              setCustomerId(String(c.id))
                              setCustomerSearch(`${c.name} (${c.mobile})`)
                              setShowCustDropdown(false)
                              if (errors.customerId) setErrors(e => { const n={...e}; delete n.customerId; return n })
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.mobile} {c.companyName && `· ${c.companyName}`}</div>
                            </div>
                            <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{c.code}</span>
                          </div>
                        ))}
                        
                        {/* Quick Add Button inside Dropdown */}
                        <div 
                          style={{ padding: '12px 14px', cursor: 'pointer', background: 'var(--hover)', color: 'var(--color-gold-primary)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQuickAdd(p => ({ ...p, name: customerSearch }));
                            setShowQuickAdd(true);
                            setShowCustDropdown(false);
                          }}
                          onClick={() => {
                            setQuickAdd(p => ({ ...p, name: customerSearch }))
                            setShowQuickAdd(true)
                            setShowCustDropdown(false)
                          }}
                        >
                          <Plus size={14} /> + Quick Add New Customer {customerSearch ? `"${customerSearch}"` : ''}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Vehicle Selector */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="form-label" style={{ margin: 0 }}>Vehicle Registration (Optional)</label>
                  {customerId && (
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
                  <Car size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <select 
                    className="form-input" 
                    value={vehicleId} 
                    onChange={e => setVehicleId(e.target.value)}
                    style={{ paddingLeft: 32, appearance: 'auto' }}
                    disabled={!customerId}
                  >
                    <option value="">{customerId ? '-- Select Customer Vehicle or Over-The-Counter --' : '-- Select a Customer First --'}</option>
                    {customerVehicles.map((v: Vehicle) => (
                      <option key={v.id} value={v.id}>
                        {v.registration} {v.make && v.make !== 'Unknown' ? `- ${v.make} ${v.model}` : ''}
                      </option>
                    ))}
                    {customerId && <option value="">No Vehicle (Over-the-counter / Walk-in sale)</option>}
                  </select>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Vehicle will appear on the printed document header.
                </div>
                {customerId && customerVehicles.length === 0 && (
                  <div style={{
                    marginTop: 8, padding: '10px 14px', background: 'rgba(212, 175, 55, 0.08)',
                    border: '1px dashed var(--color-gold-primary)', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text)' }}>
                      No vehicles registered for this customer.
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

            <div className="divider" style={{ margin: 0 }} />
            
            {/* Line Items Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Particulars / Line Items
                </h4>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                  <Plus size={13} /> Add Item
                </button>
              </div>

              {errors.items && <div className="form-error" style={{ marginBottom: 10 }}><AlertCircle size={12} /> {errors.items}</div>}

              <div className="table-responsive">
                <table className="table" style={{ width: '100%', minWidth: 600 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '38%' }}>Item / Service Description</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Unit Price (LKR)</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Discount (LKR)</th>
                      <th style={{ width: '13%', textAlign: 'right' }}>Line Total</th>
                      <th style={{ width: '40px' }}></th>
                    </tr>
                  </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lTot = Math.max(0, (Number(item.quantity) * Number(item.unitPrice)) - Number(item.discount || 0))
                    return (
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
                          <input 
                            type="number" 
                            className={`form-input ${errors[`item_${idx}`] ? 'error' : ''}`} 
                            min="0.1" 
                            step="any" 
                            value={item.quantity} 
                            onChange={e => updateItem(idx, 'quantity', e.target.value)} 
                            style={{ textAlign: 'center' }}
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="form-input" 
                            min="0" 
                            step="any" 
                            value={item.unitPrice || ''} 
                            onChange={e => updateItem(idx, 'unitPrice', e.target.value)} 
                            style={{ textAlign: 'right' }}
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="form-input" 
                            min="0" 
                            step="any" 
                            value={item.discount || ''} 
                            onChange={e => updateItem(idx, 'discount', e.target.value)} 
                            style={{ textAlign: 'right', color: Number(item.discount) > 0 ? 'var(--color-danger)' : 'inherit' }}
                            placeholder="0.00"
                          />
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                          LKR {lTot.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn btn-ghost btn-icon btn-sm" 
                            onClick={() => removeItem(idx)} 
                            disabled={items.length === 1} 
                            style={{ color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Subtotal:</td>
                    <td colSpan={3} style={{ textAlign: 'right', fontSize: 14, fontFamily: 'monospace' }}>
                      LKR {subtotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {itemDiscounts > 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>Item Discounts:</td>
                      <td colSpan={3} style={{ textAlign: 'right', fontSize: 14, color: 'var(--color-danger)', fontFamily: 'monospace' }}>
                        - LKR {itemDiscounts.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>Special / Global Discount:</td>
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
                    <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700, paddingTop: 14 }}>
                      {isQuotation ? 'QUOTED TOTAL AMOUNT:' : 'TOTAL AMOUNT DUE:'}
                    </td>
                    <td colSpan={3} style={{ textAlign: 'right', paddingTop: 14, fontSize: 20, fontWeight: 800, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                      LKR {total.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </div>

            <div className="divider" style={{ margin: 0 }} />

            {/* ── PERIODIC MAINTENANCE & COATING WARRANTY SCHEDULE BUILDER ── */}
            <div style={{
              background: 'rgba(212, 175, 55, 0.05)',
              border: '2px solid var(--color-gold-primary)',
              borderRadius: 10,
              padding: 20,
              boxShadow: '0 4px 14px rgba(212, 175, 55, 0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0F1115'
                  }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      Periodic Maintenance & Coating Warranty Schedule
                      {scheduleIntervals.length > 0 ? (
                        <span className="badge badge-gold" style={{ fontSize: 11, fontWeight: 700 }}>
                          {scheduleIntervals.length} Reminders Configured
                        </span>
                      ) : (
                        <span className="badge badge-draft" style={{ fontSize: 11 }}>
                          Optional
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Schedule automated milestone checkups (e.g. 3 Weeks, 6 Weeks, 3 Months, 6 Months, 1 Year) for this vehicle upon saving.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {scheduleIntervals.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ color: 'var(--color-danger)' }}
                      onClick={() => setScheduleIntervals([])}
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ gap: 6, fontSize: 12 }}
                    onClick={() => applyPreset('3W_6M_1Y')}
                  >
                    ⚡ Auto-Fill 3W + 6M + 1Y
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                
                {/* Service Package / Job Name */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: 14, alignItems: 'flex-end', marginBottom: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 12, marginBottom: 4 }}>
                      Primary Service / Coating Description for Reminders
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. 9H Ceramic Coating, Graphene Coating, Underbody Protection..."
                      value={maintenanceServiceName}
                      onChange={e => setMaintenanceServiceName(e.target.value)}
                    />
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <label className="form-label" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Quick Presets:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => applyPreset('3W_6M_1Y')}
                        title="3 Weeks inspection + 6 Months booster + 1 Year check"
                      >
                        ⚡ 3W + 6M + 1Y
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => applyPreset('2YR')}
                        title="3W, 6M, 1Y, 18M, 2Y"
                      >
                        2-Year Coating
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => applyPreset('3YR')}
                        title="3W, 6M, 1Y, 2Y, 3Y"
                      >
                        3-Year Coating
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => applyPreset('5YR')}
                        title="3W, 6M, 1Y, 2Y, 3Y, 4Y, 5Y"
                      >
                        5-Year Coating
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-xs"
                        onClick={() => applyPreset('GENERAL')}
                        title="3 Months + 6 Months General Service"
                      >
                        General (3M + 6M)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick Add Custom Random Interval Chips */}
                <div style={{
                  background: 'var(--bg)',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px dashed var(--border)',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                    + Add Flexible Interval:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onClick={() => addCustomInterval('3 Weeks', 21)}
                    >
                      + 3 Weeks
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onClick={() => addCustomInterval('6 Weeks', 42)}
                    >
                      + 6 Weeks
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onClick={() => addCustomInterval('3 Months', undefined, 3)}
                    >
                      + 3 Months
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onClick={() => addCustomInterval('6 Months', undefined, 6)}
                    >
                      + 6 Months
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                      onClick={() => addCustomInterval('1 Year', undefined, 12)}
                    >
                      + 1 Year
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      style={{ background: 'var(--surface)', border: '1px solid var(--color-gold-primary)', color: 'var(--color-gold-primary)' }}
                      onClick={() => addCustomInterval('Custom Checkup', 30)}
                    >
                      + Custom Date
                    </button>
                  </div>
                </div>

                {/* Milestone Interval Rows */}
                {scheduleIntervals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}>
                    <div style={{ marginBottom: 6, fontWeight: 600, color: 'var(--text)' }}>No periodic maintenance milestones added yet.</div>
                    Click <strong>⚡ Auto-Fill 3W + 6M + 1Y</strong> or any of the interval buttons above to add checkups for this vehicle.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 145px 1fr 1fr 36px', gap: 10, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>
                      <div>Milestone Label</div>
                      <div>Target Due Date</div>
                      <div>Task / Service Description</div>
                      <div>Special Notes</div>
                      <div></div>
                    </div>

                    {scheduleIntervals.map((milestone) => (
                      <div
                        key={milestone.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '130px 145px 1fr 1fr 36px',
                          gap: 10,
                          alignItems: 'center',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                          padding: '8px 10px',
                        }}
                      >
                        <div>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: 12, padding: '6px 8px' }}
                            value={milestone.intervalLabel}
                            onChange={e => updateInterval(milestone.id, 'intervalLabel', e.target.value)}
                            placeholder="e.g. 3 Weeks"
                          />
                        </div>
                        <div>
                          <input
                            type="date"
                            className="form-input"
                            style={{ fontSize: 12, padding: '6px 8px' }}
                            value={milestone.reminderDate}
                            onChange={e => updateInterval(milestone.id, 'reminderDate', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: 12, padding: '6px 8px' }}
                            value={milestone.serviceName}
                            onChange={e => updateInterval(milestone.id, 'serviceName', e.target.value)}
                            placeholder="Service or task name"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="form-input"
                            style={{ fontSize: 12, padding: '6px 8px' }}
                            value={milestone.notes}
                            onChange={e => updateInterval(milestone.id, 'notes', e.target.value)}
                            placeholder="Instructions / remarks (optional)"
                          />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() => removeInterval(milestone.id)}
                            title="Remove Milestone"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {scheduleIntervals.length > 0 && !vehicleId && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)', fontSize: 12 }}>
                    <AlertCircle size={14} />
                    <span>Please select a vehicle registration above so these reminders can be attached to the vehicle.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="divider" style={{ margin: 0 }} />
            
            {/* Terms & Conditions and Bank Details Grid */}
            <div className="grid-2">
              
              {/* Terms & Conditions */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>Terms & Conditions</label>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm" 
                    style={{ fontSize: 11, padding: 0, height: 'auto', color: 'var(--color-primary)' }}
                    onClick={() => handleToggleDocType(isQuotation)}
                  >
                    Reset to Default
                  </button>
                </div>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                  placeholder="Terms will be printed at the bottom of the invoice/quotation..."
                  style={{ fontSize: 12, lineHeight: 1.5 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Appears under the TERMS & CONDITIONS block on the printed paper.
                </div>
              </div>

              {/* Bank Details */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Landmark size={14} style={{ color: 'var(--color-gold-primary)' }} />
                    Bank Payment Details
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={includeBankDetails} 
                      onChange={e => setIncludeBankDetails(e.target.checked)} 
                    />
                    <span>Include on Document</span>
                  </label>
                </div>
                <textarea 
                  className="form-input" 
                  rows={4}
                  value={bankDetailsText}
                  onChange={e => setBankDetailsText(e.target.value)}
                  disabled={!includeBankDetails}
                  placeholder="Bank name, account number, branch..."
                  style={{ fontSize: 12, lineHeight: 1.5, background: includeBankDetails ? 'var(--input-bg)' : 'var(--hover)' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Shows customer where to transfer funds via online banking or bank deposit.
                </div>
              </div>

            </div>

            {/* Notes & Optional Payment Section (Payment only if Invoice) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label">Internal / Public Notes & Remarks</label>
                <textarea 
                  className="form-input" 
                  placeholder="Add any specific instructions, job remarks, or customer notes..." 
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {!isQuotation ? (
                <div style={{ background: 'var(--hover)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                    Instant Payment Collection (Optional)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Amount Paid Now (LKR)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder={`e.g. ${total}`}
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value ? Number(e.target.value) : '')}
                        style={{ fontSize: 13 }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: 11 }}>Payment Method</label>
                      <select className="form-input" style={{ appearance: 'auto', fontSize: 13 }} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Credit/Debit Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                  {Number(paymentAmount) > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                      <span>Balance Due:</span>
                      <span style={{ color: balanceDue > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontFamily: 'monospace' }}>
                        LKR {balanceDue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ background: 'rgba(14, 165, 233, 0.08)', padding: 16, borderRadius: 8, border: '1px solid rgba(14, 165, 233, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0284c7', marginBottom: 4 }}>
                    Quotation Validity & Confirmation
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Quotations are non-binding estimates. No financial debit or payment is recorded until you convert this quotation to an active invoice.
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <div className="modal-overlay">
          <div className="modal" style={{ width: 420 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Quick Add Customer</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowQuickAdd(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label required">Customer Name</label>
                <input type="text" className="form-input" value={quickAdd.name} onChange={e => setQuickAdd(p => ({...p, name: e.target.value}))} placeholder="e.g. Kasun Perera" />
              </div>
              <div className="form-group">
                <label className="form-label required">Mobile Number</label>
                <input type="text" className="form-input" value={quickAdd.mobile} onChange={e => setQuickAdd(p => ({...p, mobile: e.target.value}))} placeholder="e.g. 0771234567" />
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
                  ? allVehicles.filter(v => v.registration.toLowerCase().includes(quickAdd.vehicleReg.toLowerCase()))
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
                                setCustomerId(String(owner.id)); setVehicleId(String(v.id)); setCustomerSearch(`${owner.name} (${owner.mobile})`); setShowQuickAdd(false); setQuickAdd({ name: '', mobile: '', vehicleReg: '' }); setTransferVehicleId(null);
                              }}>Select Owner</button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                              <button className={`btn btn-sm ${transferVehicleId === v.id ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1, fontSize: 11 }} onClick={() => setTransferVehicleId(transferVehicleId === v.id ? null : v.id)}>
                                {transferVehicleId === v.id ? <><Check size={12} /> Transfer Ready</> : 'Transfer to New Owner'}
                              </button>
                            </div>
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

      {/* Quick Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Car size={18} style={{ color: 'var(--color-gold-primary)' }} />
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Add Vehicle for {selectedCustomer?.name || 'Customer'}
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
                    Enter official license plate number.
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
