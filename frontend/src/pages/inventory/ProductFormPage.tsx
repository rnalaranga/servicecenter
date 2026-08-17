import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle, Package, Loader2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProductById, createProduct, updateProduct, getProductCategories, getProductUnits } from '@/api/products'

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const isEdit = !!id

  const [form, setForm] = useState({
    sku: '', name: '', brand: '', categoryId: '', unitId: '',
    purchaseCost: '', sellingPrice: '', minStock: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: categories = [] } = useQuery({ queryKey: ['product_categories'], queryFn: getProductCategories })
  const { data: units = [] } = useQuery({ queryKey: ['product_units'], queryFn: getProductUnits })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['products', id],
    queryFn: () => getProductById(id!),
    enabled: isEdit,
  })

  useEffect(() => {
    if (isEdit && existing) {
      setForm({
        sku: existing.sku,
        name: existing.name,
        brand: existing.brand || '',
        categoryId: existing.categoryId ? String(existing.categoryId) : '',
        unitId: existing.unitId ? String(existing.unitId) : '',
        purchaseCost: String(existing.purchaseCost),
        sellingPrice: String(existing.sellingPrice),
        minStock: String(existing.minStock),
      })
    }
  }, [isEdit, existing])

  function set(key: string, value: any) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.sku) e.sku = 'SKU is required'
    if (!form.name) e.name = 'Name is required'
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) e.sellingPrice = 'Valid selling price is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const createMut = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      success('Product Created', 'The product has been successfully created.')
      navigate('/products')
    },
    onError: () => error('Save Failed', 'Could not create product. Ensure SKU is unique.')
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => updateProduct(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      success('Product Updated', 'The product has been successfully updated.')
      navigate(`/products/${id}`)
    },
    onError: () => error('Save Failed', 'Could not update product.')
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      sku: form.sku,
      name: form.name,
      brand: form.brand || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      unitId: form.unitId ? Number(form.unitId) : null,
      purchaseCost: Number(form.purchaseCost) || 0,
      sellingPrice: Number(form.sellingPrice),
      minStock: Number(form.minStock) || 0,
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
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(isEdit ? `/products/${id}` : '/products')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isPending}>
          {isPending ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : <><Save size={13} /> Save Product</>}
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
              <Package size={16} style={{ color: '#0F1115' }} />
            </div>
            <div>
              <div className="card-title">{isEdit ? 'Edit Product' : 'New Product'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {isEdit ? 'Update product details and pricing' : 'Add a new product to inventory'}
              </div>
            </div>
          </div>
        </div>

        <div className="card-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Basic Information</h4>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label required">SKU / Item Code</label>
                <input type="text" className={`form-input ${hasError('sku') ? 'error' : ''}`} value={form.sku} onChange={e => set('sku', e.target.value)} disabled={isEdit} />
                {errors.sku && <span className="form-error"><AlertCircle size={11} /> {errors.sku}</span>}
              </div>
              <div className="form-group">
                <label className="form-label required">Product Name</label>
                <input type="text" className={`form-input ${hasError('name') ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} />
                {errors.name && <span className="form-error"><AlertCircle size={11} /> {errors.name}</span>}
              </div>
            </div>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input type="text" className="form-input" value={form.brand} onChange={e => set('brand', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" style={{ appearance: 'auto' }} value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">Select Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select className="form-input" style={{ appearance: 'auto' }} value={form.unitId} onChange={e => set('unitId', e.target.value)}>
                  <option value="">Select Unit...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              </div>
            </div>

            <div className="divider" />
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing & Inventory</h4>

            <div className="grid-3">
              <div className="form-group">
                <label className="form-label required">Selling Price (LKR)</label>
                <input type="number" className={`form-input ${hasError('sellingPrice') ? 'error' : ''}`} value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} />
                {errors.sellingPrice && <span className="form-error"><AlertCircle size={11} /> {errors.sellingPrice}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Cost Price (LKR)</label>
                <input type="number" className="form-input" value={form.purchaseCost} onChange={e => set('purchaseCost', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Minimum Stock Alert</label>
                <input type="number" className="form-input" value={form.minStock} onChange={e => set('minStock', e.target.value)} />
              </div>
            </div>

          </div>
        </div>
      </form>
    </div>
  )
}
