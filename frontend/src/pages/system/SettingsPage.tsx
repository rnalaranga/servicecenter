import { useState, useEffect } from 'react'
import { Save, Building2, Banknote, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '@/api/system'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  
  const [formData, setFormData] = useState<Record<string, string>>({
    companyName: 'Golden Auto Detail ERP',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    currency: 'LKR',
    taxRate: '0',
    invoicePrefix: 'INV-',
    invoiceTerms: 'Thank you for your business. Payment is due upon receipt.'
  })

  const { data: settings = {}, isLoading } = useQuery({ 
    queryKey: ['settings'], 
    queryFn: getSettings 
  })

  // Load existing settings into state
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      setFormData(prev => ({ ...prev, ...settings }))
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      alert('Settings saved successfully!')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Group mappings
    const payload: Record<string, { value: string, group: string }> = {
      companyName: { value: formData.companyName, group: 'GENERAL' },
      companyPhone: { value: formData.companyPhone, group: 'GENERAL' },
      companyEmail: { value: formData.companyEmail, group: 'GENERAL' },
      companyAddress: { value: formData.companyAddress, group: 'GENERAL' },
      currency: { value: formData.currency, group: 'FINANCIAL' },
      taxRate: { value: formData.taxRate, group: 'FINANCIAL' },
      invoicePrefix: { value: formData.invoicePrefix, group: 'INVOICE' },
      invoiceTerms: { value: formData.invoiceTerms, group: 'INVOICE' },
    }

    mutation.mutate(payload)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure application defaults, company details, and preferences</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSubmit} 
          disabled={mutation.isPending}
          style={{ gap: 8 }}
        >
          <Save size={18} /> {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24 }}>
          
          {/* Tabs Sidebar */}
          <div className="card" style={{ padding: 8 }}>
            <button 
              className={`btn btn-ghost ${activeTab === 'general' ? 'active' : ''}`} 
              style={{ width: '100%', justifyContent: 'flex-start', gap: 12, marginBottom: 4, background: activeTab === 'general' ? 'var(--hover)' : 'transparent' }}
              onClick={() => setActiveTab('general')}
            >
              <Building2 size={18} /> General Info
            </button>
            <button 
              className={`btn btn-ghost ${activeTab === 'financial' ? 'active' : ''}`} 
              style={{ width: '100%', justifyContent: 'flex-start', gap: 12, marginBottom: 4, background: activeTab === 'financial' ? 'var(--hover)' : 'transparent' }}
              onClick={() => setActiveTab('financial')}
            >
              <Banknote size={18} /> Financial Defaults
            </button>
            <button 
              className={`btn btn-ghost ${activeTab === 'invoice' ? 'active' : ''}`} 
              style={{ width: '100%', justifyContent: 'flex-start', gap: 12, background: activeTab === 'invoice' ? 'var(--hover)' : 'transparent' }}
              onClick={() => setActiveTab('invoice')}
            >
              <FileText size={18} /> Invoice Settings
            </button>
          </div>

          {/* Tab Content */}
          <div className="card" style={{ padding: 24 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {activeTab === 'general' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>Company Information</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Company Name</label>
                    <input type="text" className="form-input" name="companyName" value={formData.companyName} onChange={handleChange} required />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>This name appears on all receipts and invoices.</div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">Contact Phone</label>
                      <input type="text" className="form-input" name="companyPhone" value={formData.companyPhone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Contact Email</label>
                      <input type="email" className="form-input" name="companyEmail" value={formData.companyEmail} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Business Address</label>
                    <textarea className="form-input" name="companyAddress" value={formData.companyAddress} onChange={handleChange} rows={3} />
                  </div>
                </div>
              )}

              {activeTab === 'financial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>Financial Defaults</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group">
                      <label className="form-label">System Currency</label>
                      <select className="form-input" name="currency" value={formData.currency} onChange={handleChange}>
                        <option value="LKR">LKR (Sri Lankan Rupee)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Default Tax Rate (%)</label>
                      <input type="number" step="0.01" min="0" max="100" className="form-input" name="taxRate" value={formData.taxRate} onChange={handleChange} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'invoice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>Invoice Configuration</h3>
                  
                  <div className="form-group" style={{ maxWidth: 300 }}>
                    <label className="form-label">Invoice Number Prefix</label>
                    <input type="text" className="form-input" name="invoicePrefix" value={formData.invoicePrefix} onChange={handleChange} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>e.g., INV-2024-001</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Default Terms & Conditions</label>
                    <textarea className="form-input" name="invoiceTerms" value={formData.invoiceTerms} onChange={handleChange} rows={4} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>This text will be appended to the bottom of all generated invoices.</div>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}
    </div>
  )
}
