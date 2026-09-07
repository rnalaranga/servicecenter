import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/api/system'
import { getVendorStatement } from '@/api/vendor-ledger'
import { format, parseISO } from 'date-fns'

export default function VendorStatementPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: settings } = useQuery({ 
    queryKey: ['settings'], 
    queryFn: getSettings 
  })
  const { data, isLoading } = useQuery({ 
    queryKey: ['vendor-statement', id], 
    queryFn: () => getVendorStatement(id!) 
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Statement not found</div>

  const { vendor, ledger } = data
  const currentBalance = ledger.length > 0 ? Number(ledger[ledger.length - 1].balance) : Number(vendor.openingBalance || 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }} className="hide-print">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendor-ledger')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Ledger
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => window.print()} style={{ gap: 6 }}>
          <Printer size={14} /> Print Statement
        </button>
      </div>

      <div className="card print-document" style={{ padding: 48 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>VENDOR STATEMENT</h1>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {settings?.companyName || 'Golden Auto Detail'}<br />
              {settings?.companyAddress || '123 Main Street, Colombo 03'}<br />
              Tel: {settings?.companyPhone || '+94 11 234 5678'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 4 }}>DATE GENERATED</div>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{format(new Date(), 'MMM dd, yyyy')}</div>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>SUPPLIER DETAILS</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{vendor.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {vendor.code}
              {vendor.companyName && <div>{vendor.companyName}</div>}
              {vendor.address && <div>{vendor.address}</div>}
              {vendor.mobile && <div>{vendor.mobile}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>OUTSTANDING BALANCE DUE</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: currentBalance > 0 ? 'var(--color-danger)' : 'var(--text)' }}>
              LKR {currentBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <table className="table" style={{ marginBottom: 32, borderTop: '2px solid var(--border)' }}>
          <thead>
            <tr>
              <th style={{ backgroundColor: 'transparent' }}>Date</th>
              <th style={{ backgroundColor: 'transparent' }}>Description</th>
              <th style={{ backgroundColor: 'transparent' }}>Reference</th>
              <th style={{ textAlign: 'right', backgroundColor: 'transparent' }}>Purchases (Credit)</th>
              <th style={{ textAlign: 'right', backgroundColor: 'transparent' }}>Payments (Debit)</th>
              <th style={{ textAlign: 'right', backgroundColor: 'transparent' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(vendor.createdAt), 'MMM dd, yyyy')}</td>
              <td style={{ fontWeight: 500 }}>Opening Balance</td>
              <td style={{ color: 'var(--text-muted)' }}>-</td>
              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(vendor.openingBalance || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            {ledger.map(entry => {
              const debit = Number(entry.debit) // payment made
              const credit = Number(entry.credit) // purchase made
              const balance = Number(entry.balance) // running balance accurately stored in DB
              
              return (
                <tr key={entry.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(entry.date), 'MMM dd, yyyy')}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{entry.description || entry.type}</div>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {entry.refNumber || '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: credit > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                    {credit > 0 ? credit.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', color: debit > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {debit > 0 ? debit.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                    {balance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
