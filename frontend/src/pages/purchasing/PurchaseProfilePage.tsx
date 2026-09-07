import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, FileText, Printer, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/api/system'
import { getPurchase } from '@/api/purchases'
import { format, parseISO } from 'date-fns'

export default function PurchaseProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: getSettings })
  const { data: purchase, isLoading } = useQuery({ 
    queryKey: ['purchase', id], 
    queryFn: () => getPurchase(id!) 
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
  if (!purchase) return <div style={{ padding: 40, textAlign: 'center' }}>Purchase not found</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }} className="hide-print">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/purchases')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Purchases
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()} style={{ gap: 6 }}>
          <Printer size={14} /> Print PO
        </button>
      </div>

      <div className="card print-document" style={{ padding: 48 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>PURCHASE ORDER</h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {settings?.companyName || 'Golden Auto Detail'}<br />
              {settings?.companyAddress || '123 Main Street, Colombo 03'}<br />
              Tel: {settings?.companyPhone || '+94 11 234 5678'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-gold-primary)', marginBottom: 12 }}>
              {purchase.purchaseNumber}
            </div>
            {purchase.status === 'COMPLETED' ? (
              <span className="badge badge-success" style={{ fontSize: 13, padding: '6px 12px' }}><CheckCircle2 size={14} /> COMPLETED</span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: 13, padding: '6px 12px' }}>DRAFT</span>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>VENDOR DETAILS</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{purchase.vendor?.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {purchase.vendor?.companyName && <div>{purchase.vendor.companyName}</div>}
              {purchase.vendor?.address && <div>{purchase.vendor.address}</div>}
              {purchase.vendor?.mobile && <div>{purchase.vendor.mobile}</div>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>PURCHASE DETAILS</div>
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-muted)', paddingBottom: 4 }}>PO Date:</td>
                  <td style={{ fontWeight: 500, textAlign: 'right' }}>{format(parseISO(purchase.date), 'MMM dd, yyyy')}</td>
                </tr>
                {purchase.dueDate && (
                  <tr>
                    <td style={{ color: 'var(--text-muted)', paddingBottom: 4 }}>Due Date:</td>
                    <td style={{ fontWeight: 500, textAlign: 'right' }}>{format(parseISO(purchase.dueDate), 'MMM dd, yyyy')}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: 'var(--text-muted)', paddingBottom: 4 }}>Warehouse:</td>
                  <td style={{ fontWeight: 500, textAlign: 'right' }}>MAIN</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Items Table */}
        <table className="table" style={{ marginBottom: 32 }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: 'var(--bg)' }}>Item Description</th>
              <th style={{ width: '10%', textAlign: 'center', backgroundColor: 'var(--bg)' }}>Qty</th>
              <th style={{ width: '15%', textAlign: 'right', backgroundColor: 'var(--bg)' }}>Unit Price</th>
              <th style={{ width: '10%', textAlign: 'right', backgroundColor: 'var(--bg)' }}>Tax %</th>
              <th style={{ width: '12%', textAlign: 'right', backgroundColor: 'var(--bg)' }}>Discount</th>
              <th style={{ width: '20%', textAlign: 'right', backgroundColor: 'var(--bg)' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {purchase.items?.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{item.product?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {item.product?.sku}</div>
                </td>
                <td style={{ textAlign: 'center' }}>{Number(item.quantity)}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.unitCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right' }}>{Number(item.taxRate)}%</td>
                <td style={{ textAlign: 'right' }}>{Number(item.discount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(item.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 300 }}>
            <table style={{ width: '100%', fontSize: 14 }}>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-muted)', padding: '8px 0' }}>Subtotal</td>
                  <td style={{ textAlign: 'right', fontWeight: 500 }}>{Number(purchase.subtotal).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)', padding: '8px 0' }}>Total Discount</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, color: 'var(--color-danger)' }}>- {Number(purchase.discountAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>Total Tax</td>
                  <td style={{ textAlign: 'right', fontWeight: 500, borderBottom: '1px solid var(--border)' }}>+ {Number(purchase.taxAmount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, fontSize: 18, padding: '16px 0', color: 'var(--text)' }}>TOTAL DUE</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 18, color: 'var(--color-gold-primary)' }}>
                    LKR {Number(purchase.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {purchase.notes && (
          <div style={{ marginTop: 40, padding: 16, background: 'var(--bg)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>NOTES</div>
            <div style={{ fontSize: 14 }}>{purchase.notes}</div>
          </div>
        )}
      </div>
    </div>
  )
}
