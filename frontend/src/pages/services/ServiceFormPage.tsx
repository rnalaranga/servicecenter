import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle, Sparkles, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getServiceById, createService, updateService, getServiceCategories } from '@/api/services'

export default function ServiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState({
    code: '', name: '', description: '', categoryId: '',
    sellingPrice: '', estimatedCost: '', estimatedDuration: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: categories = [] } = useQuery({ queryKey: ['service_categories'], queryFn: getServiceCategories })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['services', id],
    queryFn: () => getServiceById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        code: existing.code,
        name: existing.name,
        description: existing.description || '',
        categoryId: existing.categoryId ? String(existing.categoryId) : '',
        sellingPrice: String(existing.sellingPrice),
        estimatedCost: existing.estimatedCost ? String(existing.estimatedCost) : '',
        estimatedDuration: existing.estimatedDuration ? String(existing.estimatedDuration) : '',
      })
    }
  }, [isEdit, existing])

  function set(key: string, value: any) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.code) e.code = 'Code is required'
    if (!form.name) e.name = 'Name is required'
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) e.sellingPrice = 'Valid selling price is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      success('Service Created', 'The service has been successfully created.')
      navigate('/services')
    },
    onError: () => error('Save Failed', 'Could not create service. Ensure Code is unique.')
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => updateService(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] })
      success('Service Updated', 'The service has been successfully updated.')
      navigate('/services')
    },
    onError: () => error('Save Failed', 'Could not update service.')
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      code: form.code,
      name: form.name,
      description: form.description || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      sellingPrice: Number(form.sellingPrice),
      estimatedCost: Number(form.estimatedCost) || 0,
      estimatedDuration: Number(form.estimatedDuration) || null,
    }

    if (isEdit) updateMut.mutate(payload)
    else createMut.mutate(payload)
  }

  const isPending = createMut.isPending || updateMut.isPending
  const hasError = (k: string) => !!errors[k]

  if (isEdit && isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <Loader2 size={32} className="spinner" style={{ color: 'var(--color-gold-primary)' }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/services')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : <><Save size={13} /> Save Service</>}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={16} style={{ color: '#0F1115' }} />
            </div>
            <div>
              <div className="card-title">{isEdit ? 'Edit Service' : 'New Service'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isEdit ? 'Update service details and pricing' : 'Add a new service offering to the catalog'}
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basic Information</h4>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">Service Code</label>
                <input type="text" className={`form-input ${hasError('code') ? 'error' : ''}`} value={form.code} onChange={e => set('code', e.target.value)} disabled={isEdit} placeholder="e.g. SRV-001" />
                {errors.code && <span className="form-error"><AlertCircle size={11} /> {errors.code}</span>}
              </div>
              <div className="form-group">
                <label className="form-label required">Service Name</label>
                <input type="text" className={`form-input ${hasError('name') ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Engine Bay Cleaning" />
                {errors.name && <span className="form-error"><AlertCircle size={11} /> {errors.name}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input" style={{ appearance: 'auto' }} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-input" value={form.description} onChange={e => set('description', e.target.value)} style={{ minHeight: 80, resize: 'vertical' }} placeholder="Detail what is included in this service..." />
            </div>

            <div className="divider" />
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing & Details</h4>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label required">Selling Price (LKR)</label>
                <input type="number" className={`form-input ${hasError('sellingPrice') ? 'error' : ''}`} value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} />
                {errors.sellingPrice && <span className="form-error"><AlertCircle size={11} /> {errors.sellingPrice}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Cost (LKR)</label>
                <input type="number" className="form-input" value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (Minutes)</label>
                <input type="number" className="form-input" value={form.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} placeholder="e.g. 120" />
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  )
}
