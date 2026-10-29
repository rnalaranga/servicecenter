import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, CreditCard, X, CheckCircle2, Clock, Trash2, FileCheck, Car, Plus, Check, Loader2, Bell } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInvoiceById, recordPayment, deleteInvoice, convertQuotationToInvoice, updateInvoice } from '@/api/invoices'
import { getReminders } from '@/api/reminders'
import { getVehiclesByCustomerId, createVehicle, type Vehicle } from '@/api/vehicles'
import { getSettings } from '@/api/system'
import { format, parseISO } from 'date-fns'
import { useToast } from '@/contexts/ToastContext'

function numberToWordsLKR(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Sri Lankan Rupees Zero Only';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertUnderThousand = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
      if (n > 0) str += 'and ';
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  const integerPart = Math.floor(Math.abs(amount));
  const cents = Math.round((Math.abs(amount) - integerPart) * 100);

  let words = '';
  const billions = Math.floor(integerPart / 1000000000);
  const millions = Math.floor((integerPart % 1000000000) / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (billions > 0) words += convertUnderThousand(billions) + ' Billion ';
  if (millions > 0) words += convertUnderThousand(millions) + ' Million ';
  if (thousands > 0) words += convertUnderThousand(thousands) + ' Thousand ';
  if (remainder > 0) words += convertUnderThousand(remainder);

  words = words.trim();
  if (!words) words = 'Zero';

  let result = `Sri Lankan Rupees ${words}`;
  if (cents > 0) {
    result += ` and ${convertUnderThousand(cents)} Cents`;
  }
  return result + ' Only';
}

export default function InvoiceProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('CASH')

  // Vehicle Assignment State
  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [selectedVehId, setSelectedVehId] = useState<string>('')
  const [isCreatingVeh, setIsCreatingVeh] = useState(false)
  const [newVehData, setNewVehData] = useState({
    registration: '',
    make: '',
    model: '',
    year: '',
    colour: '',
    mileage: ''
  })
  const [savingVeh, setSavingVeh] = useState(false)

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => getInvoiceById(id!)
  })

  // Customer vehicles for modal
  const { data: customerVehicles = [] } = useQuery({
    queryKey: ['vehicles', 'customer', invoice?.customerId],
    queryFn: () => getVehiclesByCustomerId(String(invoice!.customerId)),
    enabled: !!invoice?.customerId && showVehicleModal
  })

  const targetVehicleId = invoice?.vehicleId || invoice?.vehicle?.id || invoice?.jobCards?.[0]?.jobCard?.vehicleId
  const { data: invoiceReminders = [] } = useQuery({
    queryKey: ['reminders', 'vehicle', targetVehicleId],
    queryFn: () => getReminders({ vehicleId: targetVehicleId }),
    enabled: !!targetVehicleId
  })

  const assignVehicleMut = useMutation({
    mutationFn: (vehId: number | null) => updateInvoice(id!, { vehicleId: vehId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', id] })
      success('Vehicle Updated', 'Vehicle information updated successfully for this document.')
      setShowVehicleModal(false)
    },
    onError: () => error('Update Failed', 'Failed to update vehicle on this document.')
  })

  const handleCreateAndAssignVehicle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!invoice) return
    if (!newVehData.registration.trim()) {
      return error('Registration Required', 'Please enter a vehicle registration number.')
    }
    setSavingVeh(true)
    try {
      const created = await createVehicle({
        customerId: invoice.customerId,
        registration: newVehData.registration.trim().toUpperCase(),
        make: newVehData.make.trim() || 'Unknown',
        model: newVehData.model.trim() || 'Unknown',
        year: newVehData.year ? Number(newVehData.year) : null,
        colour: newVehData.colour.trim() || null,
        mileage: newVehData.mileage ? Number(newVehData.mileage) : null,
        isActive: true
      } as any)

      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      assignVehicleMut.mutate(created.id)
      setNewVehData({ registration: '', make: '', model: '', year: '', colour: '', mileage: '' })
      setIsCreatingVeh(false)
    } catch (err: any) {
      error('Vehicle Save Failed', err?.response?.data?.error || err.message)
    } finally {
      setSavingVeh(false)
    }
  }

  const payMut = useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      success('Payment Recorded', 'The payment has been successfully recorded.')
      setShowPayModal(false)
      setPayAmount('')
    },
    onError: () => error('Payment Failed', 'Could not record the payment.')
  })

  const deleteMut = useMutation({
    mutationFn: () => deleteInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      success('Document Deleted', 'Document has been successfully deleted.')
      navigate('/invoices')
    },
    onError: () => error('Delete Failed', 'Could not delete document.')
  })

  const convertMut = useMutation({
    mutationFn: () => convertQuotationToInvoice(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      success('Converted to Invoice', data.message || 'Quotation successfully converted to active invoice.')
      if (data.invoice?.id) {
        navigate(`/invoices/${data.invoice.id}`, { replace: true })
      }
    },
    onError: (err: any) => {
      error('Conversion Failed', err?.response?.data?.error || 'Failed to convert quotation to invoice.')
    }
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!invoice) return <div style={{ padding: 40, textAlign: 'center' }}>Invoice not found</div>

  const isQuo = Boolean(invoice.isQuotation || invoice.status === 'QUOTATION' || invoice.invoiceNumber?.startsWith('QUO-'))
  const isPaid = invoice.status === 'PAID'
  const isPartial = invoice.status === 'PARTIALLY_PAID' || (Number(invoice.amountPaid) > 0 && Number(invoice.balance) > 0)

  // Extract vehicle and job card details if available
  const vehicle = invoice.vehicle || invoice.jobCards?.[0]?.jobCard?.vehicle
  const jobCard = invoice.jobCards?.[0]?.jobCard

  const totalDiscountAmount = Number(invoice.discountAmount) || 0
  const subtotalAmount = Number(invoice.subtotal) > 0 ? Number(invoice.subtotal) : (Number(invoice.total) + totalDiscountAmount)

  // Determine bank details string to display
  const effectiveBankDetails = invoice.bankDetails || [
    settings?.bankName ? `Bank: ${settings.bankName}` : '',
    settings?.bankAccountName ? `Account Name: ${settings.bankAccountName}` : '',
    settings?.bankAccountNumber ? `Account Number: ${settings.bankAccountNumber}` : '',
    settings?.bankBranch ? `Branch: ${settings.bankBranch}` : '',
  ].filter(Boolean).join('\n')

  return (
    <>
      <div className="no-print" style={{ maxWidth: 850, margin: '0 auto', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/invoices')} style={{ gap: 6 }}>
            <ArrowLeft size={14} /> Back to Invoices
          </button>
          <div style={{ flex: 1 }} />
          {isQuo && (
            <button 
              className="btn btn-primary btn-sm" 
              style={{ gap: 6, background: '#2563eb', borderColor: '#2563eb' }}
              onClick={() => {
                if (confirm(`Convert Quotation #${invoice.invoiceNumber} into an official Tax Invoice? This will assign an active Invoice number and record receivables.`)) {
                  convertMut.mutate()
                }
              }}
              disabled={convertMut.isPending}
            >
              <FileCheck size={14} /> {convertMut.isPending ? 'Converting...' : 'Convert to Invoice'}
            </button>
          )}
          <button 
            className="btn btn-secondary btn-sm" 
            style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', gap: 6 }}
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${isQuo ? 'quotation' : 'invoice'} #${invoice.invoiceNumber}? All associated records will also be deleted.`)) {
                deleteMut.mutate()
              }
            }}
            disabled={deleteMut.isPending}
          >
            <Trash2 size={14} /> {deleteMut.isPending ? 'Deleting...' : `Delete ${isQuo ? 'Quotation' : 'Invoice'}`}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()} style={{ gap: 6 }}>
            <Printer size={14} /> Print {isQuo ? 'Quotation' : 'Invoice'}
          </button>
          {!isQuo && !isPaid && (
            <button className="btn btn-primary btn-sm" onClick={() => {
              setPayAmount(String(invoice.balance))
              setShowPayModal(true)
            }} style={{ gap: 6 }}>
              <CreditCard size={14} /> Record Payment
            </button>
          )}
        </div>
      </div>

      {/* ── PERIODIC MAINTENANCE & COATING WARRANTY SCHEDULE CARD ── */}
      <div className="no-print card" style={{ maxWidth: 850, margin: '0 auto 20px', padding: 18, border: '1.5px solid var(--color-gold-primary)', background: 'rgba(212, 175, 55, 0.05)', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: invoiceReminders.length > 0 ? 12 : 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#0F1115'
            }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                Periodic Maintenance & Coating Warranty Schedule
                <span className="badge badge-gold" style={{ fontSize: 11, fontWeight: 700 }}>
                  {invoiceReminders.length} Scheduled Checkup(s)
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {vehicle ? `Vehicle: ${vehicle.registration} (${vehicle.make} ${vehicle.model})` : 'Vehicle periodic maintenance reminders'}
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-xs"
            onClick={() => navigate('/reminders')}
            style={{ gap: 4 }}
          >
            Open Reminders Center
          </button>
        </div>

        {invoiceReminders.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 12 }}>
            {invoiceReminders.map(r => (
              <div key={r.id} style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span className="badge badge-outline" style={{ fontWeight: 700, fontSize: 10 }}>
                    {r.intervalLabel}
                  </span>
                  <span className={`badge ${r.status === 'COMPLETED' ? 'badge-completed' : r.status === 'SCHEDULED' ? 'badge-open' : 'badge-draft'}`} style={{ fontSize: 10 }}>
                    {r.status === 'COMPLETED' ? '✅ Done' : r.status === 'SCHEDULED' ? '🗓 Re-scheduled' : '⏳ Pending'}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                  Due: {format(new Date(r.reminderDate), 'MMM dd, yyyy')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.serviceName}
                </div>
                {r.notes && (
                  <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 4, fontStyle: 'italic', background: 'var(--hover)', padding: '2px 6px', borderRadius: 4 }}>
                    "{r.notes}"
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No maintenance reminders scheduled for this vehicle yet.
            </span>
            {vehicle?.id && (
              <button
                className="btn btn-primary btn-xs"
                onClick={() => navigate(`/reminders?action=new&customerId=${invoice.customerId}&vehicleId=${vehicle.id}&serviceName=${encodeURIComponent(invoice.items?.[0]?.description || 'Ceramic Coating Warranty')}`)}
                style={{ gap: 4 }}
              >
                <Plus size={12} /> + Set Up Maintenance Reminders
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sri Lanka IRD Format Invoice Paper */}
      <div className="invoice-paper">
        {/* Header Section */}
        <div className="ird-header">
          <div className="ird-company-info">
            {settings?.invoiceLogo || settings?.logoDark ? (
              <img 
                src={settings?.invoiceLogo || settings?.logoDark} 
                alt="Logo" 
                style={{ maxHeight: 60, maxWidth: 220, objectFit: 'contain', marginBottom: 8 }} 
              />
            ) : null}
            <div className="ird-company-name">{settings?.companyName || 'AUTO ELEVATE'}</div>
            <div className="ird-company-address">{settings?.companyAddress || 'No. 4, Thudella, Ja-Ela, Sri Lanka'}</div>
            <div className="ird-company-contact">
              {settings?.companyPhone ? `Tel: ${settings.companyPhone}` : ''}
              {settings?.companyEmail ? ` | Email: ${settings.companyEmail}` : ''}
            </div>
            
            {/* IRD Identification (TIN & BRN) */}
            <div className="ird-tax-info">
              {settings?.companyTin ? (
                <span><strong>TIN:</strong> {settings.companyTin}</span>
              ) : null}
              {settings?.companyBrn ? (
                <span style={{ marginLeft: settings?.companyTin ? 12 : 0 }}>
                  <strong>BRN:</strong> {settings.companyBrn}
                </span>
              ) : null}
            </div>
          </div>

          <div className="ird-meta-info">
            <div className="ird-title">{isQuo ? 'QUOTATION' : 'INVOICE'}</div>
            <table className="ird-meta-table">
              <tbody>
                <tr>
                  <td className="meta-label">{isQuo ? 'Quotation No:' : 'Invoice No:'}</td>
                  <td className="meta-value highlight">#{invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td className="meta-label">Date:</td>
                  <td className="meta-value">{format(parseISO(invoice.date), 'dd/MM/yyyy')}</td>
                </tr>
                <tr>
                  <td className="meta-label">{isQuo ? 'Validity:' : 'Payment Terms:'}</td>
                  <td className="meta-value">{isQuo ? '14 Days from Date' : 'Due on Receipt'}</td>
                </tr>
                <tr>
                  <td className="meta-label">Status:</td>
                  <td className="meta-value">
                    <span className={`status-pill ${isQuo ? 'quotation' : isPaid ? 'paid' : isPartial ? 'partial' : 'unpaid'}`}>
                      {isQuo ? 'QUOTATION' : isPaid ? 'PAID' : isPartial ? 'PARTIAL' : 'UNPAID'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer & Vehicle Information Box */}
        <div className="ird-parties-grid">
          <div className="party-box">
            <div className="party-title">CUSTOMER (BUYER) DETAILS</div>
            <div className="party-row">
              <span className="party-label">Name:</span>
              <span className="party-value"><strong>{invoice.customer?.name}</strong> {invoice.customer?.code ? `(${invoice.customer.code})` : ''}</span>
            </div>
            {invoice.customer?.companyName && (
              <div className="party-row">
                <span className="party-label">Company:</span>
                <span className="party-value">{invoice.customer.companyName}</span>
              </div>
            )}
            <div className="party-row">
              <span className="party-label">Address:</span>
              <span className="party-value">{invoice.customer?.address || 'N/A'}{invoice.customer?.city ? `, ${invoice.customer.city}` : ''}</span>
            </div>
            <div className="party-row">
              <span className="party-label">Contact:</span>
              <span className="party-value">{invoice.customer?.mobile || 'N/A'}</span>
            </div>
            {invoice.customer?.nicTaxId && (
              <div className="party-row">
                <span className="party-label">NIC / TIN:</span>
                <span className="party-value">{invoice.customer.nicTaxId}</span>
              </div>
            )}
          </div>

          <div className="party-box" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 8 }}>
              <div className="party-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>SERVICE / VEHICLE DETAILS</div>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm no-print" 
                style={{ fontSize: 11, color: '#0284c7', padding: '1px 6px', height: 'auto', gap: 4 }}
                onClick={() => {
                  setSelectedVehId(String(invoice.vehicleId || ''))
                  setIsCreatingVeh(false)
                  setShowVehicleModal(true)
                }}
              >
                <Car size={12} /> {vehicle ? 'Change Vehicle' : '+ Assign Vehicle'}
              </button>
            </div>
            <div className="party-row">
              <span className="party-label">Vehicle No:</span>
              <span className="party-value vehicle-reg">{vehicle?.registration || 'N/A (Over-the-counter)'}</span>
            </div>
            {(vehicle?.make || vehicle?.model) && (
              <div className="party-row">
                <span className="party-label">Make / Model:</span>
                <span className="party-value">{vehicle.make} {vehicle.model}</span>
              </div>
            )}
            {jobCard?.jobNumber && (
              <div className="party-row">
                <span className="party-label">Job Card Ref:</span>
                <span className="party-value">#{jobCard.jobNumber}</span>
              </div>
            )}
            <div className="party-row">
              <span className="party-label">Currency:</span>
              <span className="party-value">LKR (Sri Lankan Rupee)</span>
            </div>
          </div>
        </div>

        {/* Particulars Table */}
        <table className="ird-table">
          <thead>
            <tr>
              <th style={{ width: '5%', textAlign: 'center' }}>#</th>
              <th style={{ width: '45%', textAlign: 'left' }}>DESCRIPTION OF GOODS / SERVICES</th>
              <th style={{ width: '8%', textAlign: 'center' }}>QTY</th>
              <th style={{ width: '14%', textAlign: 'right' }}>UNIT PRICE (LKR)</th>
              <th style={{ width: '14%', textAlign: 'right' }}>DISCOUNT (LKR)</th>
              <th style={{ width: '14%', textAlign: 'right' }}>AMOUNT (LKR)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item: any, index: number) => {
              const qty = Number(item.quantity) || 1
              const unitPrice = Number(item.unitPrice) || Number(item.total) / qty
              const discount = Number(item.discount) || 0
              const lineTotal = Number(item.total) || 0

              return (
                <tr key={item.id || index}>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{index + 1}</td>
                  <td style={{ textAlign: 'left', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#111' }}>{item.description}</div>
                  </td>
                  <td style={{ textAlign: 'center', verticalAlign: 'top' }}>{qty}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                    {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', color: discount > 0 ? '#dc2626' : '#9ca3af', fontWeight: discount > 0 ? 600 : 400 }}>
                    {discount > 0 ? `- ${discount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>
                    {lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Financial Summary & Amount in Words (NO TAX) */}
        <div className="ird-summary-section">
          <div className="ird-summary-left">
            <div className="amount-in-words-box">
              <div className="words-title">AMOUNT IN WORDS:</div>
              <div className="words-content">{numberToWordsLKR(Number(invoice.total))}</div>
            </div>

            {/* Terms and Notes */}
            <div className="ird-notes-box">
              <div className="notes-title">TERMS & CONDITIONS:</div>
              <div className="notes-body">
                {invoice.terms || (isQuo 
                  ? (settings?.quotationTerms || '1. This quotation is valid for 14 days from the date of issue.\n2. Prices are subject to vehicle physical inspection upon arrival.\n3. 50% advance payment required upon job confirmation.')
                  : (settings?.invoiceTerms || '1. All payments are due upon receipt.\n2. Goods & services once delivered and accepted in good order are non-refundable.\n3. Make all cheques payable to the company name.'))}
              </div>
            </div>

            {/* Bank Payment Details */}
            {effectiveBankDetails && (
              <div className="ird-notes-box" style={{ marginTop: 14 }}>
                <div className="notes-title">BANK PAYMENT DETAILS:</div>
                <div className="notes-body" style={{ whiteSpace: 'pre-line' }}>
                  {effectiveBankDetails}
                </div>
              </div>
            )}

            {/* Document Notes */}
            {invoice.notes && (
              <div className="ird-notes-box" style={{ marginTop: 14 }}>
                <div className="notes-title">SPECIAL NOTES / INSTRUCTIONS:</div>
                <div className="notes-body" style={{ whiteSpace: 'pre-line' }}>{invoice.notes}</div>
              </div>
            )}
          </div>

          <div className="ird-summary-right">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td className="tot-label">Subtotal:</td>
                  <td className="tot-value">
                    {subtotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {totalDiscountAmount > 0 && (
                  <tr>
                    <td className="tot-label" style={{ color: '#dc2626', fontWeight: 600 }}>
                      Discount:
                    </td>
                    <td className="tot-value discount" style={{ color: '#dc2626', fontWeight: 700 }}>
                      - {totalDiscountAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
                {/* STRICTLY NO TAX LINE HERE AS REQUESTED */}
                <tr className="grand-total-row">
                  <td className="tot-label">{isQuo ? 'ESTIMATED TOTAL:' : 'TOTAL AMOUNT DUE:'}</td>
                  <td className="tot-value">
                    <span className="currency-unit">LKR</span> {Number(invoice.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                {!isQuo && (
                  <>
                    <tr>
                      <td className="tot-label">Amount Paid:</td>
                      <td className="tot-value">
                        {Number(invoice.amountPaid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr className="balance-row">
                      <td className="tot-label">Balance Due:</td>
                      <td className="tot-value">
                        {Number(invoice.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </>
                )}
                {isQuo && (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', paddingTop: 10, fontStyle: 'italic' }}>
                      * Official Estimate / Quotation — Not a Tax Invoice *
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* IRD Signature & Acknowledgment Blocks */}
        <div className="ird-signatures-grid">
          <div className="sig-block">
            <div className="sig-line"></div>
            <div className="sig-label">{isQuo ? 'Customer Approval / Acceptance' : "Customer's Signature / Received By"}</div>
            <div className="sig-sub">{isQuo ? 'I confirm and accept the estimate terms above' : 'Goods / Services received in good order & condition'}</div>
          </div>

          <div className="sig-block" style={{ textAlign: 'right' }}>
            <div className="sig-line" style={{ marginLeft: 'auto' }}></div>
            <div className="sig-label">Authorized Signatory & Stamp</div>
            <div className="sig-sub">For {settings?.companyName || 'AUTO ELEVATE'}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="ird-footer">
          <div>This is a computer-generated commercial {isQuo ? 'quotation / estimate' : 'invoice'}.</div>
          <div>Thank you for your business!</div>
        </div>
      </div>

      {showPayModal && (
        <div className="modal-overlay no-print">
          <div className="modal" style={{ width: 400 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Record Payment</h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowPayModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Amount to Pay (LKR)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={payAmount} 
                  onChange={e => setPayAmount(e.target.value)}
                  max={Number(invoice.balance)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-input" style={{ appearance: 'auto' }} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Credit/Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) return error('Invalid Amount', 'Please enter a valid amount')
                payMut.mutate({ invoiceId: invoice.id, amount: Number(payAmount), method: payMethod })
              }} disabled={payMut.isPending}>
                {payMut.isPending ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign / Change Vehicle Modal */}
      {showVehicleModal && (
        <div className="modal-overlay no-print">
          <div className="modal" style={{ width: 460 }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Car size={18} style={{ color: 'var(--color-gold-primary)' }} />
                <h3 style={{ margin: 0, fontSize: 16 }}>Vehicle Assignment</h3>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowVehicleModal(false)}><X size={16} /></button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Customer: <strong>{invoice.customer?.name}</strong> {invoice.customer?.mobile ? `(${invoice.customer.mobile})` : ''}
              </div>

              {/* Mode Toggle */}
              <div style={{ display: 'flex', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 6 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${!isCreatingVeh ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setIsCreatingVeh(false)}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isCreatingVeh ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1, fontSize: 12 }}
                  onClick={() => setIsCreatingVeh(true)}
                >
                  <Plus size={13} /> Add New Vehicle
                </button>
              </div>

              {!isCreatingVeh ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Select Customer Vehicle</label>
                    <select
                      className="form-input"
                      value={selectedVehId}
                      onChange={e => setSelectedVehId(e.target.value)}
                      style={{ appearance: 'auto' }}
                    >
                      <option value="">-- No Vehicle (Over-the-counter sale) --</option>
                      {customerVehicles.map((v: Vehicle) => (
                        <option key={v.id} value={v.id}>
                          {v.registration} {v.make && v.make !== 'Unknown' ? `- ${v.make} ${v.model}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {customerVehicles.length === 0 && (
                    <div style={{ fontSize: 12, color: '#b45309', background: '#fef3c7', padding: '10px 12px', borderRadius: 6 }}>
                      This customer has no vehicles registered yet. Switch to "Add New Vehicle" to add one now.
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCreateAndAssignVehicle} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label required">Vehicle Plate / Registration</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. WP CAB-1234, CAR-5566"
                      style={{ textTransform: 'uppercase', fontWeight: 600 }}
                      value={newVehData.registration}
                      onChange={e => setNewVehData(p => ({ ...p, registration: e.target.value.toUpperCase() }))}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Make</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Toyota, Honda"
                        value={newVehData.make}
                        onChange={e => setNewVehData(p => ({ ...p, make: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Model</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Prius, Civic"
                        value={newVehData.model}
                        onChange={e => setNewVehData(p => ({ ...p, model: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Colour</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. White"
                        value={newVehData.colour}
                        onChange={e => setNewVehData(p => ({ ...p, colour: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Year</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 2020"
                        value={newVehData.year}
                        onChange={e => setNewVehData(p => ({ ...p, year: e.target.value }))}
                      />
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowVehicleModal(false)}>Cancel</button>
              {!isCreatingVeh ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => assignVehicleMut.mutate(selectedVehId ? Number(selectedVehId) : null)}
                  disabled={assignVehicleMut.isPending}
                >
                  {assignVehicleMut.isPending ? 'Updating...' : 'Save Vehicle Link'}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateAndAssignVehicle}
                  disabled={savingVeh || !newVehData.registration.trim()}
                >
                  {savingVeh ? <><Loader2 size={13} className="spinner" /> Saving...</> : <><Check size={13} /> Create & Link</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sri Lanka IRD Format Print & Display Styling */}
      <style>{`
        .invoice-paper {
          background: #ffffff;
          width: 100%;
          max-width: 850px;
          margin: 0 auto 40px auto;
          padding: 40px 48px;
          border-radius: 4px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1f2937;
          box-sizing: border-box;
          border: 1px solid #e5e7eb;
        }

        .ird-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #111827;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }

        .ird-company-info {
          flex: 1;
          padding-right: 20px;
        }

        .ird-company-name {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .ird-company-address {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.5;
        }

        .ird-company-contact {
          font-size: 12px;
          color: #4b5563;
          margin-top: 2px;
        }

        .ird-tax-info {
          font-size: 12px;
          color: #111827;
          margin-top: 6px;
          background: #f3f4f6;
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }

        .ird-meta-info {
          text-align: right;
          min-width: 250px;
        }

        .ird-title {
          font-size: 32px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #111827;
          margin-bottom: 12px;
          line-height: 1;
        }

        .ird-meta-table {
          margin-left: auto;
          border-collapse: collapse;
          font-size: 13px;
        }

        .ird-meta-table td {
          padding: 3px 0;
        }

        .meta-label {
          color: #6b7280;
          font-weight: 500;
          padding-right: 12px !important;
          text-align: right;
        }

        .meta-value {
          color: #111827;
          font-weight: 600;
          text-align: right;
        }

        .meta-value.highlight {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }

        .status-pill {
          display: inline-block;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .status-pill.paid { background: #dcfce7; color: #15803d; }
        .status-pill.partial { background: #fef9c3; color: #854d0e; }
        .status-pill.unpaid { background: #fee2e2; color: #b91c1c; }
        .status-pill.quotation { background: #e0f2fe; color: #0284c7; }

        .ird-parties-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .party-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 14px 16px;
          font-size: 12px;
        }

        .party-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }

        .party-row {
          display: flex;
          margin-bottom: 4px;
          line-height: 1.5;
        }

        .party-label {
          width: 90px;
          color: #6b7280;
          flex-shrink: 0;
        }

        .party-value {
          color: #111827;
          flex: 1;
        }

        .party-value.vehicle-reg {
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.5px;
        }

        .ird-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 13px;
        }

        .ird-table thead th {
          background: #f1f5f9;
          color: #0f172a;
          padding: 10px 12px;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          border-top: 2px solid #0f172a;
          border-bottom: 2px solid #0f172a;
          border-left: 1px solid #cbd5e1;
          border-right: 1px solid #cbd5e1;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .ird-table tbody td {
          padding: 12px;
          border: 1px solid #e5e7eb;
          line-height: 1.5;
        }

        .ird-table tbody tr:nth-child(even) {
          background: #f9fafb;
        }

        .ird-summary-section {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          margin-bottom: 32px;
        }

        .amount-in-words-box {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-left: 4px solid #111827;
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .words-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }

        .words-content {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          font-style: italic;
        }

        .ird-notes-box {
          font-size: 11px;
          color: #4b5563;
          line-height: 1.5;
        }

        .notes-title {
          font-weight: 700;
          color: #374151;
          margin-bottom: 4px;
        }

        .notes-body {
          white-space: pre-wrap;
        }

        .totals-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .totals-table td {
          padding: 6px 10px;
        }

        .tot-label {
          text-align: right;
          color: #4b5563;
          font-weight: 500;
        }

        .tot-value {
          text-align: right;
          color: #111827;
          font-weight: 600;
          min-width: 120px;
        }

        .tot-value.discount {
          color: #dc2626;
        }

        .grand-total-row {
          border-top: 2px solid #111827;
          border-bottom: 2px solid #111827;
        }

        .grand-total-row td {
          padding: 10px;
          font-size: 16px;
          font-weight: 800;
          color: #111827;
        }

        .grand-total-row .currency-unit {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
        }

        .balance-row td {
          font-weight: 700;
          color: #0f172a;
          background: #f3f4f6;
          border-top: 1px solid #e5e7eb;
        }

        .ird-signatures-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin-top: 48px;
          padding-top: 20px;
        }

        .sig-block {
          font-size: 12px;
        }

        .sig-line {
          width: 220px;
          border-bottom: 1px dashed #6b7280;
          margin-bottom: 8px;
        }

        .sig-label {
          font-weight: 700;
          color: #111827;
        }

        .sig-sub {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        .ird-footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
        }

        @media screen and (max-width: 768px) {
          .invoice-paper {
            padding: 18px 14px;
            margin: 0 auto 20px auto;
            border-radius: 8px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }
          .ird-header {
            flex-direction: column;
            gap: 16px;
          }
          .ird-meta-block {
            text-align: left;
          }
          .ird-parties-grid {
            grid-template-columns: 1fr !important;
            gap: 12px;
          }
          .ird-bottom-grid {
            grid-template-columns: 1fr !important;
            gap: 16px;
          }
          .ird-signatures {
            grid-template-columns: 1fr !important;
            gap: 28px;
          }
          .ird-table {
            min-width: 580px;
          }
        }

        @media print {
          @page {
            margin: 12mm 15mm;
            size: A4 portrait;
          }
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          .invoice-paper, .invoice-paper * {
            visibility: visible;
          }
          .invoice-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .ird-header {
            border-bottom: 2px solid #000000 !important;
          }
          .ird-table thead th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
            border-top: 2px solid #000000 !important;
            border-bottom: 2px solid #000000 !important;
            border-left: 1px solid #cccccc !important;
            border-right: 1px solid #cccccc !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .grand-total-row {
            border-top: 2px solid #000000 !important;
            border-bottom: 2px solid #000000 !important;
          }
        }
      `}</style>
    </>
  )
}
