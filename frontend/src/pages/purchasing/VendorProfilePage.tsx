import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit, Building2, Phone, Mail, MapPin, Hash, CheckCircle2, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getVendor } from '@/api/vendors'
import { format, parseISO } from 'date-fns'

export default function VendorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: vendor, isLoading } = useQuery({ 
    queryKey: ['vendor', id], 
    queryFn: () => getVendor(id!) 
  })

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
  if (!vendor) return <div style={{ padding: 40, textAlign: 'center' }}>Vendor not found</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Vendors
        </button>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/vendors/${id}/edit`)} style={{ gap: 6 }}>
          <Edit size={14} /> Edit Vendor
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: 32 }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          <div style={{ 
            width: 80, height: 80, borderRadius: 16, 
            background: 'var(--hover)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Building2 size={40} />
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text)' }}>{vendor.name}</h1>
                <div style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 12 }}>{vendor.companyName}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {vendor.isActive ? (
                    <span className="badge badge-success"><CheckCircle2 size={12} /> Active Vendor</span>
                  ) : (
                    <span className="badge badge-danger"><XCircle size={12} /> Inactive</span>
                  )}
                  <span className="badge badge-outline" style={{ fontFamily: 'monospace' }}>{vendor.code}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Opening Balance</div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'monospace', color: Number(vendor.openingBalance) > 0 ? 'var(--color-danger)' : 'var(--text)' }}>
                  LKR {Number(vendor.openingBalance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Terms: {vendor.creditTerms ? `${vendor.creditTerms} Days` : 'Cash'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Contact Information</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CONTACT PERSON</div>
                  <div style={{ fontSize: 14 }}>{vendor.contactPerson || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>MOBILE</div>
                  <div style={{ fontSize: 14 }}>{vendor.mobile || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>EMAIL</div>
                  <div style={{ fontSize: 14 }}>{vendor.email || '-'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Business Details</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>ADDRESS</div>
                  <div style={{ fontSize: 14 }}>{vendor.address || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TAX ID / BRN</div>
                  <div style={{ fontSize: 14 }}>{vendor.taxId || '-'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="var(--text-muted)" />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED ON</div>
                  <div style={{ fontSize: 14 }}>{format(parseISO(vendor.createdAt), 'MMM dd, yyyy')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {vendor.notes && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Notes</h3>
          </div>
          <div className="card-body">
            <p style={{ margin: 0, color: 'var(--text)' }}>{vendor.notes}</p>
          </div>
        </div>
      )}
    </div>
  )
}
