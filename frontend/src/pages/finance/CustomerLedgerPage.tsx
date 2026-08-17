import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getCustomerBalances } from '@/api/customer-ledger'

export default function CustomerLedgerPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: balances = [], isLoading } = useQuery({ 
    queryKey: ['customer-balances'], 
    queryFn: getCustomerBalances 
  })

  // Customers with a balance > 0 (they owe us money)
  const debtors = balances.filter(b => b.balance > 0)
  
  const filtered = debtors.filter(b => {
    const term = search.toLowerCase()
    return b.name.toLowerCase().includes(term) || 
           b.code.toLowerCase().includes(term) ||
           b.mobile.includes(term)
  })

  const totalReceivable = debtors.reduce((sum, b) => sum + Number(b.balance), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Customer Ledger</h1>
          <p className="page-subtitle">Track accounts receivable and customer balances</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Accounts Receivable</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                LKR {totalReceivable.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Customers in Debt</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                {debtors.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-box" style={{ width: 350 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search debtors by name, code or mobile..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No outstanding customer balances found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Customer Code</th>
                <th>Customer Name</th>
                <th>Mobile Number</th>
                <th style={{ textAlign: 'right' }}>Outstanding Balance (LKR)</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="table-row-hover" onClick={() => navigate(`/customer-ledger/${b.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{b.code}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <Users size={14} color="var(--text-muted)" />
                      {b.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.mobile}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                    {b.balance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/customer-ledger/${b.id}`);
                    }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
