import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'

interface ProductSearchInputProps {
  products: any[]
  value: string
  onChange: (productId: string) => void
  placeholder?: string
}

export default function ProductSearchInput({ products, value, onChange, placeholder = "Search product..." }: ProductSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedProduct = products.find(p => String(p.id) === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase()
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)
  })

  // Show selected product name if not open and a product is selected
  const displayValue = isOpen ? searchTerm : (selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : '')

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            if (!e.target.value) onChange('') // clear if completely erased
          }}
          onClick={() => {
            setIsOpen(true)
            setSearchTerm('') // clear search when opening to see all
          }}
          style={{ paddingRight: 32 }}
        />
        {selectedProduct && !isOpen ? (
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ position: 'absolute', right: 4, top: 4, padding: 4, color: 'var(--text-muted)' }}
            onClick={(e) => {
              e.preventDefault()
              onChange('')
              setSearchTerm('')
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', right: 12, top: 11 }} />
        )}
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          marginTop: 4, background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50,
          maxHeight: 250, overflowY: 'auto'
        }}>
          {filteredProducts.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No products found</div>
          ) : (
            filteredProducts.map(p => (
              <div
                key={p.id}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => {
                  onChange(String(p.id))
                  setIsOpen(false)
                  setSearchTerm('')
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku} | In Stock: {p.stockLevels?.[0]?.quantity || 0}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
