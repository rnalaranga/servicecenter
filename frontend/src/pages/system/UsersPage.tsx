import { useState } from 'react'
import { Plus, Search, Edit2, Shield, UserX, UserCheck, Key } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, toggleUserStatus } from '@/api/users'
import type { User } from '@/api/users'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'VIEWER',
    phone: '',
    password: '',
    changePassword: false
  })

  const { data: users = [], isLoading } = useQuery({ 
    queryKey: ['users'], 
    queryFn: getUsers 
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      closeModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: { id: number, user: Partial<User> & { password?: string } }) => updateUser(data.id, data.user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      closeModal()
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (data: { id: number, isActive: boolean }) => toggleUserStatus(data.id, data.isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  })

  const filteredUsers = users.filter(user => 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const openModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone || '',
        password: '',
        changePassword: false
      })
    } else {
      setEditingUser(null)
      setFormData({
        username: '',
        email: '',
        fullName: '',
        role: 'VIEWER',
        phone: '',
        password: '',
        changePassword: true
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const payload: any = {
      email: formData.email,
      fullName: formData.fullName,
      role: formData.role,
      phone: formData.phone
    }

    if (formData.changePassword && formData.password) {
      payload.password = formData.password
    }

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, user: payload })
    } else {
      payload.username = formData.username
      if (!payload.password) return alert('Password is required for new users')
      createMutation.mutate(payload)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'var(--color-danger)'
      case 'MANAGER': return 'var(--color-primary)'
      case 'CASHIER': return 'var(--color-success)'
      case 'TECHNICIAN': return 'var(--color-warning)'
      default: return 'var(--text-muted)'
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Users & Roles</h1>
          <p className="page-subtitle">Manage system access and staff accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()} style={{ gap: 8 }}>
          <Plus size={18} /> Add User
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <div className="search-box" style={{ maxWidth: 400, flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="form-input"
              placeholder="Search by name, username or email..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} style={{ opacity: user.isActive ? 1 : 0.5 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--color-gold-primary)' }}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{user.fullName}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace' }}>@{user.username}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: getRoleBadgeColor(user.role), border: `1px solid ${getRoleBadgeColor(user.role)}` }}>
                          <Shield size={12} style={{ marginRight: 4 }} />
                          {user.role}
                        </span>
                      </td>
                      <td>
                        {user.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-danger">Inactive</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button 
                            className="btn btn-ghost btn-sm btn-icon" 
                            title="Edit User"
                            onClick={() => openModal(user)}
                          >
                            <Edit2 size={16} />
                          </button>
                          
                          {user.isActive ? (
                            <button 
                              className="btn btn-ghost btn-sm btn-icon" 
                              title="Deactivate"
                              style={{ color: 'var(--color-danger)' }}
                              onClick={() => {
                                if (confirm(`Are you sure you want to deactivate ${user.fullName}?`)) {
                                  toggleStatusMutation.mutate({ id: user.id, isActive: false })
                                }
                              }}
                            >
                              <UserX size={16} />
                            </button>
                          ) : (
                            <button 
                              className="btn btn-ghost btn-sm btn-icon" 
                              title="Activate"
                              style={{ color: 'var(--color-success)' }}
                              onClick={() => toggleStatusMutation.mutate({ id: user.id, isActive: true })}
                            >
                              <UserCheck size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    required 
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      disabled={!!editingUser}
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select 
                      className="form-input" 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="CASHIER">CASHIER</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      className="form-input" 
                      required 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                {editingUser && !formData.changePassword ? (
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm" 
                    onClick={() => setFormData({...formData, changePassword: true})}
                    style={{ alignSelf: 'flex-start', gap: 8 }}
                  >
                    <Key size={14} /> Change Password
                  </button>
                ) : (
                  <div className="form-group" style={{ background: 'var(--hover)', padding: 16, borderRadius: 8 }}>
                    <label className="form-label">
                      {editingUser ? 'New Password' : 'Password'}
                    </label>
                    <input 
                      type="password" 
                      className="form-input" 
                      required={!editingUser}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                    {editingUser && (
                      <button 
                        type="button" 
                        className="btn btn-ghost btn-sm" 
                        style={{ marginTop: 8 }}
                        onClick={() => setFormData({...formData, changePassword: false, password: ''})}
                      >
                        Cancel Password Change
                      </button>
                    )}
                  </div>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
