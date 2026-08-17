import { useState, useRef, useEffect } from 'react'
import { Search, X, Building2 } from 'lucide-react'

interface VendorSearchInputProps {
  vendors: any[]
  value: string
  onChange: (vendorId: string) => void
  placeholder?: string
}

export default function VendorSearchInput({ vendors, value, onChange, placeholder = "Search vendor by name, code or mobile..." }: VendorSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selectedVendor = vendors.find(v => String(v.id) === value)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [wrapperRef])

  const filteredVendors = vendors.filter(v => {
    const term = searchTerm.toLowerCase()
    return v.name.toLowerCase().includes(term) || 
           v.code.toLowerCase().includes(term) ||
           (v.companyName && v.companyName.toLowerCase().includes(term)) ||
           (v.mobile && v.mobile.toLowerCase().includes(term))
  })

  // Show selected vendor name if not open and a vendor is selected
  const displayValue = isOpen ? searchTerm : (selectedVendor ? `${selectedVendor.name} (${selectedVendor.code})` : '')

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Building2 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }} />
        <input
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            if (!e.target.value) onChange('')
          }}
          onClick={() => {
            setIsOpen(true)
            setSearchTerm('')
          }}
          style={{ paddingLeft: 36, paddingRight: 32 }}
        />
        {selectedVendor && !isOpen ? (
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
          {filteredVendors.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: 13 }}>No vendors found</div>
          ) : (
            filteredVendors.map(v => (
              <div
                key={v.id}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 13
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => {
                  onChange(String(v.id))
                  setIsOpen(false)
                  setSearchTerm('')
                }}
              >
                <div style={{ fontWeight: 500, color: 'var(--text)' }}>{v.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Code: {v.code} 
                  {v.companyName ? ` | Company: ${v.companyName}` : ''} 
                  {v.mobile ? ` | Tel: ${v.mobile}` : ''}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
