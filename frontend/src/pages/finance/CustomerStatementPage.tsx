import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '@/api/system'
import { getCustomerStatement } from '@/api/customer-ledger'
import { format, parseISO } from 'date-fns'

export default function CustomerStatementPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: settings } = useQuery({ 
    queryKey: ['settings'], 
    queryFn: getSettings 
  })
  const { data, isLoading } = useQuery({ 
    queryKey: ['customer-statement', id], 
    queryFn: () => getCustomerStatement(id!) 
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center' }}>Statement not found</div>

  const { customer, ledger } = data
  
  let currentBalance = Number(customer.openingBalance || 0)
  ledger.forEach((entry: any) => {
    currentBalance += Number(entry.debit)
    currentBalance -= Number(entry.credit)
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }} className="hide-print">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/customer-ledger')} style={{ gap: 6 }}>
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
            <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text)' }}>CUSTOMER STATEMENT</h1>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 8 }}>PREPARED FOR</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{customer.name}</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {customer.code}
              {customer.companyName && <div>{customer.companyName}</div>}
              {customer.address && <div>{customer.address}</div>}
              {customer.mobile && <div>{customer.mobile}</div>}
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
              <th style={{ textAlign: 'right', backgroundColor: 'transparent' }}>Charges (Debit)</th>
              <th style={{ textAlign: 'right', backgroundColor: 'transparent' }}>Payments (Credit)</th>
              <th style={{ textAlign: 'right', backgroundColor: 'transparent' }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(customer.createdAt), 'MMM dd, yyyy')}</td>
              <td style={{ fontWeight: 500 }}>Opening Balance</td>
              <td style={{ color: 'var(--text-muted)' }}>-</td>
              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
              <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(customer.openingBalance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
            </tr>
            {(() => {
              let runningBalance = Number(customer.openingBalance || 0);
              return ledger.map(entry => {
                const debit = Number(entry.debit)
                const credit = Number(entry.credit)
                runningBalance = runningBalance + debit - credit;
                
                return (
                  <tr key={entry.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{format(parseISO(entry.date), 'MMM dd, yyyy')}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{entry.description || entry.type}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {entry.refNumber || entry.invoice?.invoiceNumber || entry.payment?.paymentNumber || '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: debit > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                      {debit > 0 ? debit.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', color: credit > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {credit > 0 ? credit.toLocaleString('en-LK', { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                      {runningBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )
              })
            })()}
          </tbody>
        </table>
        
        {currentBalance > 0 && (
          <div style={{ marginTop: 40, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: '#fafafa', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Please remit payment for the outstanding balance to:</div>
            <div style={{ fontWeight: 600 }}>{settings?.companyName || 'Golden Auto Detail'} - A/C 123456789 - Bank Name</div>
          </div>
        )}
      </div>
    </div>
  )
}
