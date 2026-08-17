import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Building2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getVendor, createVendor, updateVendor } from '@/api/vendors'
import type { Vendor } from '@/api/vendors'
import { useToast } from '@/contexts/ToastContext'

export default function VendorFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    taxId: '',
    openingBalance: '',
    creditTerms: '',
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => getVendor(id!),
    enabled: isEditing
  })

  useEffect(() => {
    if (vendor) {
      setFormData({
        name: vendor.name,
        companyName: vendor.companyName || '',
        contactPerson: vendor.contactPerson || '',
        mobile: vendor.mobile || '',
        email: vendor.email || '',
        address: vendor.address || '',
        taxId: vendor.taxId || '',
        openingBalance: String(vendor.openingBalance),
        creditTerms: vendor.creditTerms ? String(vendor.creditTerms) : '',
        notes: vendor.notes || '',
      })
    }
  }, [vendor])

  const saveMut = useMutation({
    mutationFn: (data: Partial<Vendor>) => isEditing ? updateVendor(id!, data) : createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      if (isEditing) queryClient.invalidateQueries({ queryKey: ['vendor', id] })
      success('Success', `Vendor ${isEditing ? 'updated' : 'created'} successfully`)
      navigate('/vendors')
    },
    onError: (err: any) => {
      if (err.response?.data?.details) {
        const e: Record<string, string> = {}
        err.response.data.details.forEach((d: any) => e[d.path[0]] = d.message)
        setErrors(e)
      } else {
        error('Error', err.response?.data?.error || 'Failed to save vendor')
      }
    }
  })

  function validate() {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = 'Vendor Name is required'
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) e.email = 'Invalid email'
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    saveMut.mutate({
      ...formData,
      openingBalance: Number(formData.openingBalance) || 0,
      creditTerms: formData.creditTerms ? Number(formData.creditTerms) : null
    })
  }

  if (isEditing && isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vendors')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Vendors
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={20} />
            </div>
            <div>
              <div className="card-title" style={{ fontSize: 16, marginBottom: 2 }}>{isEditing ? 'Edit Vendor' : 'Add New Vendor'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supplier information and credit terms</div>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: '32px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label required">Vendor Name</label>
              <input 
                type="text" 
                className={`form-input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Business Name or Individual Name"
              />
              {errors.name && <span className="form-error"><AlertCircle size={11} /> {errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.companyName}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Legal Company Name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Person</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.contactPerson}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.mobile}
                onChange={e => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className={`form-input ${errors.email ? 'error' : ''}`}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              {errors.email && <span className="form-error"><AlertCircle size={11} /> {errors.email}</span>}
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Address</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Tax ID / BRN</label>
              <input 
                type="text" 
                className="form-input"
                value={formData.taxId}
                onChange={e => setFormData({ ...formData, taxId: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Credit Terms (Days)</label>
              <input 
                type="number" 
                className="form-input"
                placeholder="e.g. 30"
                value={formData.creditTerms}
                onChange={e => setFormData({ ...formData, creditTerms: e.target.value })}
              />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Leave blank if Cash on Delivery</div>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Opening Balance (LKR)</label>
              <input 
                type="number" 
                className="form-input"
                value={formData.openingBalance}
                onChange={e => setFormData({ ...formData, openingBalance: e.target.value })}
                disabled={isEditing}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea 
                className="form-input"
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

          </div>
        </div>
        
        <div className="card-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/vendors')}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving...' : <><Save size={16} /> {isEditing ? 'Update Vendor' : 'Create Vendor'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
