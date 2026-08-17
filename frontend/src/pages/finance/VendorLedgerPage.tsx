import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, TrendingDown, AlertTriangle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getVendorBalances } from '@/api/vendor-ledger'

export default function VendorLedgerPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: balances = [], isLoading } = useQuery({ 
    queryKey: ['vendor-balances'], 
    queryFn: getVendorBalances 
  })

  // Vendors with a balance > 0 (we owe them money)
  const creditors = balances.filter(b => b.balance > 0)
  
  const filtered = creditors.filter(b => {
    const term = search.toLowerCase()
    return b.name.toLowerCase().includes(term) || 
           b.code.toLowerCase().includes(term) ||
           (b.companyName && b.companyName.toLowerCase().includes(term))
  })

  const totalPayable = creditors.reduce((sum, b) => sum + Number(b.balance), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Vendor Ledger</h1>
          <p className="page-subtitle">Track accounts payable and supplier balances</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Accounts Payable</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-gold-primary)', fontFamily: 'monospace' }}>
                LKR {totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
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
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Suppliers to Pay</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                {creditors.length}
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
              placeholder="Search creditors by name, code or company..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No outstanding vendor balances found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Vendor Code</th>
                <th>Supplier Name</th>
                <th>Company</th>
                <th style={{ textAlign: 'right' }}>Outstanding Balance (LKR)</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="table-row-hover" onClick={() => navigate(`/vendor-ledger/${b.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{b.code}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <Building2 size={14} color="var(--text-muted)" />
                      {b.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{b.companyName || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-danger)' }}>
                    {b.balance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/vendor-ledger/${b.id}`);
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
