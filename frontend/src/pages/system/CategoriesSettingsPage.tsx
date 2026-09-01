import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory } from '@/api/products';
import type { ProductCategory 
} from '@/api/products'
import { 
  getServiceCategories, createServiceCategory, updateServiceCategory, deleteServiceCategory } from '@/api/services';
import type { ServiceCategory 
} from '@/api/services'
import { useToast } from '@/contexts/ToastContext'
import { Edit, Trash, Plus, Package, Wrench } from 'lucide-react'

export default function CategoriesSettingsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'services'>('products')

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Categories Master Data</h1>
        <p>Manage categories for products and services</p>
      </div>

      <div className="tabs" style={{ marginBottom: 24 }}>
        <button 
          className={activeTab === 'products' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('products')}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <Package size={14} /> Product Categories
        </button>
        <button 
          className={activeTab === 'services' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('services')}
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <Wrench size={14} /> Service Categories
        </button>
      </div>


      <div className="card">
        <div className="card-body">
          {activeTab === 'products' ? <ProductCategoriesManager /> : <ServiceCategoriesManager />}
        </div>
      </div>
    </div>
  )
}

function ProductCategoriesManager() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['product-categories'],
    queryFn: getProductCategories
  })

  const createMutation = useMutation({
    mutationFn: createProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      success('Product category added')
      setNewName('')
      setIsAdding(false)
    },
    onError: () => error('Failed to add category')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number, name: string }) => updateProductCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      success('Product category updated')
      setEditingId(null)
    },
    onError: () => error('Failed to update category')
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] })
      success('Product category deleted')
    },
    onError: (err: any) => {
      error(err.response?.data?.error || 'Failed to delete category')
    }
  })

  const handleSaveEdit = (id: number) => {
    if (!editName.trim()) return
    updateMutation.mutate({ id, name: editName })
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    createMutation.mutate({ name: newName })
  }

  if (isLoading) return <div style={{ padding : 20 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {!isAdding && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Category Name</th>
            <th style={{ width: 120 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isAdding && (
            <tr style={{ background: 'var(--hover)' }}>
              <td>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="New category name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </td>
              <td>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAdd}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </td>
            </tr>
          )}
          {categories.map((c: ProductCategory) => (
            <tr key={c.id}>
              <td>
                {editingId === c.id ? (
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{c.name}</span>
                )}
              </td>
              <td>
                {editingId === c.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(c.id)}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                      setEditingId(c.id)
                      setEditName(c.name)
                    }}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => {
                      if (confirm('Are you sure you want to delete this category?')) {
                        deleteMutation.mutate(c.id)
                      }
                    }}>
                      <Trash size={14} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {categories.length === 0 && !isAdding && (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                No categories found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function ServiceCategoriesManager() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [newName, setNewName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: getServiceCategories
  })

  const createMutation = useMutation({
    mutationFn: createServiceCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] })
      success('Service category added')
      setNewName('')
      setIsAdding(false)
    },
    onError: () => error('Failed to add category')
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number, name: string }) => updateServiceCategory(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] })
      success('Service category updated')
      setEditingId(null)
    },
    onError: () => error('Failed to update category')
  })

  const deleteMutation = useMutation({
    mutationFn: deleteServiceCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-categories'] })
      success('Service category deleted')
    },
    onError: (err: any) => {
      error(err.response?.data?.error || 'Failed to delete category')
    }
  })

  const handleSaveEdit = (id: number) => {
    if (!editName.trim()) return
    updateMutation.mutate({ id, name: editName })
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    createMutation.mutate({ name: newName })
  }

  if (isLoading) return <div style={{ padding: 20 }}>Loading...</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        {!isAdding && (
          <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
            <Plus size={14} /> Add Category
          </button>
        )}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Category Name</th>
            <th style={{ width: 120 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isAdding && (
            <tr style={{ background: 'var(--hover)' }}>
              <td>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="New category name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </td>
              <td>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleAdd}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
              </td>
            </tr>
          )}
          {categories.map((c: ServiceCategory) => (
            <tr key={c.id}>
              <td>
                {editingId === c.id ? (
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                ) : (
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{c.name}</span>
                )}
              </td>
              <td>
                {editingId === c.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(c.id)}>Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                      setEditingId(c.id)
                      setEditName(c.name)
                    }}>
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => {
                      if (confirm('Are you sure you want to delete this category?')) {
                        deleteMutation.mutate(c.id)
                      }
                    }}>
                      <Trash size={14} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {categories.length === 0 && !isAdding && (
            <tr>
              <td colSpan={2} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                No categories found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
