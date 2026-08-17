import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Search, Building2, Phone, Mail } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getVendors } from '@/api/vendors'

export default function VendorsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: getVendors })

  const filtered = vendors.filter(v => {
    const term = search.toLowerCase()
    return v.name.toLowerCase().includes(term) || 
           v.companyName?.toLowerCase().includes(term) ||
           v.mobile?.toLowerCase().includes(term) ||
           v.code.toLowerCase().includes(term)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Manage suppliers and purchasing contacts</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/vendors/new')} style={{ gap: 8 }}>
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 24 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Total Vendors</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>{vendors.length}</div>
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
              placeholder="Search by name, company, or mobile..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            No vendors found. Click "Add Vendor" to create one.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Vendor Details</th>
                <th>Contact Person</th>
                <th>Contact Info</th>
                <th>Credit Terms</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="table-row-hover" onClick={() => navigate(`/vendors/${v.id}`)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{v.code}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.companyName || '-'}</div>
                  </td>
                  <td>{v.contactPerson || '-'}</td>
                  <td>
                    {v.mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 2 }}><Phone size={12} color="var(--text-muted)" /> {v.mobile}</div>}
                    {v.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><Mail size={12} color="var(--text-muted)" /> {v.email}</div>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {v.creditTerms ? `${v.creditTerms} Days` : 'Cash'}
                  </td>
                  <td>
                    <Link to={`/vendors/${v.id}`} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>View</Link>
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
