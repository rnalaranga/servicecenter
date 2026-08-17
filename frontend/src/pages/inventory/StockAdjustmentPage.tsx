import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, AlertCircle, Search, Check, TrendingUp, PackageMinus, PackagePlus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adjustStock } from '@/api/stock'
import { getProducts } from '@/api/products'
import { useToast } from '@/contexts/ToastContext'

export default function StockAdjustmentPage() {
  const navigate = useNavigate()
  const { success, error } = useToast()
  const queryClient = useQueryClient()

  const [type, setType] = useState<'IN' | 'OUT'>('IN')
  
  const [productId, setProductId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showProdDropdown, setShowProdDropdown] = useState(false)
  const prodWrapperRef = useRef<HTMLDivElement>(null)

  const [quantity, setQuantity] = useState<string>('')
  const [unitCost, setUnitCost] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: getProducts })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prodWrapperRef.current && !prodWrapperRef.current.contains(event.target as Node)) {
        setShowProdDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!productId) e.productId = 'Product is required'
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) e.quantity = 'Valid positive quantity is required'
    if (type === 'IN' && unitCost && (isNaN(Number(unitCost)) || Number(unitCost) < 0)) e.unitCost = 'Cost must be a valid positive number'
    
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const adjustMut = useMutation({
    mutationFn: adjustStock,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      success('Stock Adjusted', `Successfully adjusted stock. Transaction: ${data.txn.txnNumber}`)
      navigate('/stock')
    },
    onError: (err: any) => error('Adjustment Failed', err.response?.data?.error || 'Could not adjust stock.')
  })

  function handleSubmit() {
    if (!validate()) return
    adjustMut.mutate({ 
      productId: Number(productId), 
      type,
      quantity: Number(quantity),
      unitCost: type === 'IN' ? Number(unitCost || 0) : undefined,
      notes
    })
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  )

  const selectedProduct = products.find(p => String(p.id) === productId)

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/stock')} style={{ gap: 6 }}>
          <ArrowLeft size={14} /> Back to Stock
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: type === 'IN' ? '#dcfce7' : '#fee2e2', 
                color: type === 'IN' ? '#16a34a' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {type === 'IN' ? <PackagePlus size={20} /> : <PackageMinus size={20} />}
              </div>
              <div>
                <div className="card-title" style={{ fontSize: 16, marginBottom: 2 }}>
                  {type === 'IN' ? 'Stock In (Add)' : 'Stock Out (Remove)'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {type === 'IN' ? 'Add physical inventory to warehouse' : 'Remove or write-off physical inventory'}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', background: 'var(--hover)', padding: 4, borderRadius: 8, gap: 4, border: '1px solid var(--border)' }}>
              <button 
                className={`btn btn-sm ${type === 'IN' ? 'btn-primary' : 'btn-ghost'}`} 
                onClick={() => setType('IN')}
                style={{ padding: '6px 16px', borderRadius: 6, ...(type === 'IN' ? { background: 'var(--color-success)', borderColor: 'var(--color-success)' } : {}) }}
              >
                Stock In
              </button>
              <button 
                className={`btn btn-sm ${type === 'OUT' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 16px', borderRadius: 6, ...(type === 'OUT' ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : {}) }}
                onClick={() => setType('OUT')}
              >
                Stock Out
              </button>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: '32px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* Product Selection */}
            <div className="form-group" ref={prodWrapperRef} style={{ position: 'relative' }}>
              <label className="form-label required">Product</label>
              <div className="search-box">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className={`form-input ${errors.productId ? 'error' : ''}`} 
                  placeholder="Search by SKU or Name..."
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value)
                    setProductId('')
                    setShowProdDropdown(true)
                  }}
                  onFocus={() => setShowProdDropdown(true)}
                />
              </div>
              {errors.productId && <span className="form-error"><AlertCircle size={11} /> {errors.productId}</span>}

              {showProdDropdown && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 250, overflowY: 'auto',
                  marginTop: 4
                }}>
                  {filteredProducts.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No products found.</div>
                  ) : filteredProducts.map(p => (
                    <div 
                      key={p.id}
                      style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => {
                        setProductId(String(p.id))
                        setProductSearch(`${p.sku} - ${p.name}`)
                        if (type === 'IN') {
                          setUnitCost(String(p.purchaseCost || 0))
                        }
                        setShowProdDropdown(false)
                        if (errors.productId) setErrors(e => { const n={...e}; delete n.productId; return n })
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {productId === String(p.id) ? <Check size={14} style={{ color: 'var(--color-success)' }}/> : <div style={{width: 14}}/>}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Avg Cost: LKR {Number(p.avgCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label required">Quantity</label>
                <input 
                  type="number" 
                  className={`form-input ${errors.quantity ? 'error' : ''}`} 
                  placeholder="0" 
                  min="0.01" step="any"
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)} 
                />
                {errors.quantity && <span className="form-error"><AlertCircle size={11} /> {errors.quantity}</span>}
              </div>
              
              {type === 'IN' && (
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Unit Cost (LKR)</label>
                  <input 
                    type="number" 
                    className={`form-input ${errors.unitCost ? 'error' : ''}`} 
                    placeholder="0.00" 
                    min="0" step="any"
                    value={unitCost} 
                    onChange={e => setUnitCost(e.target.value)} 
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                    Optional. Will recalculate moving average cost.
                  </div>
                  {errors.unitCost && <span className="form-error"><AlertCircle size={11} /> {errors.unitCost}</span>}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Reason</label>
              <textarea 
                className="form-input" 
                placeholder="e.g. New purchase arrival, Damaged goods, Cycle count adjustment..."
                rows={2}
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
              />
            </div>

          </div>
        </div>

        <div className="card-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/stock')}>Cancel</button>
          <button 
            className="btn btn-primary" 
            style={type === 'OUT' ? { background: 'var(--color-danger)', borderColor: 'var(--color-danger)' } : { background: 'var(--color-success)', borderColor: 'var(--color-success)' }}
            onClick={handleSubmit} 
            disabled={adjustMut.isPending}
          >
            {adjustMut.isPending ? 'Processing...' : <><Save size={16} /> Confirm Adjustment</>}
          </button>
        </div>
      </div>
    </div>
  )
}
