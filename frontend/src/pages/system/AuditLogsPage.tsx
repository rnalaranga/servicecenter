import { useState } from 'react'
import { Search, Filter, Shield, Clock, User as UserIcon, Activity, Database } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getAuditLogs } from '@/api/system'
import type { AuditLog } from '@/api/system'
import { getUsers } from '@/api/users'
import { format } from 'date-fns'

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    search: '',
    module: '',
    action: '',
    userId: ''
  })

  const { data: logs = [], isLoading } = useQuery({ 
    queryKey: ['audit-logs', filters], 
    queryFn: () => getAuditLogs({
      search: filters.search || undefined,
      module: filters.module || undefined,
      action: filters.action || undefined,
      userId: filters.userId ? Number(filters.userId) : undefined
    })
  })

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <span className="badge badge-success" style={{ minWidth: 70, justifyContent: 'center' }}>{action}</span>
      case 'UPDATE': return <span className="badge badge-warning" style={{ minWidth: 70, justifyContent: 'center' }}>{action}</span>
      case 'DELETE':
      case 'CANCEL': return <span className="badge badge-danger" style={{ minWidth: 70, justifyContent: 'center' }}>{action}</span>
      case 'APPROVE': return <span className="badge badge-primary" style={{ minWidth: 70, justifyContent: 'center' }}>{action}</span>
      default: return <span className="badge" style={{ minWidth: 70, justifyContent: 'center' }}>{action}</span>
    }
  }

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'INVOICE': return <Activity size={14} />
      case 'USER': return <UserIcon size={14} />
      default: return <Database size={14} />
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Security trail of all system activities and record changes</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div className="search-box" style={{ maxWidth: 300, flex: 1 }}>
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="form-input"
              placeholder="Search reference or value..." 
              value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
            />
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select 
              className="form-input" 
              value={filters.userId} 
              onChange={e => setFilters({...filters, userId: e.target.value})}
            >
              <option value="">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
            <select 
              className="form-input" 
              value={filters.module} 
              onChange={e => setFilters({...filters, module: e.target.value})}
            >
              <option value="">All Modules</option>
              <option value="INVOICE">Invoices</option>
              <option value="JOB_CARD">Job Cards</option>
              <option value="PRODUCT">Products</option>
              <option value="CUSTOMER">Customers</option>
              <option value="USER">Users</option>
              <option value="EXPENSE">Expenses</option>
            </select>
            <select 
              className="form-input" 
              value={filters.action} 
              onChange={e => setFilters({...filters, action: e.target.value})}
            >
              <option value="">All Actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="CANCEL">CANCEL</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Reference</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No audit logs found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                      </td>
                      <td>
                        {log.user ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--text)' }}>
                              {log.user.fullName.charAt(0).toUpperCase()}
                            </div>
                            {log.user.fullName}
                          </div>
                        ) : <span style={{ color: 'var(--text-muted)' }}>System</span>}
                      </td>
                      <td>{getActionBadge(log.action)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                          {getModuleIcon(log.module)}
                          {log.module}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{log.recordRef || '-'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setSelectedLog(log) }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Audit Log Details</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedLog(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              <div style={{ display: 'flex', gap: 40, background: 'var(--hover)', padding: 16, borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Timestamp</div>
                  <div style={{ fontWeight: 600 }}>{format(new Date(selectedLog.createdAt), 'PPpp')}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>User</div>
                  <div style={{ fontWeight: 600 }}>{selectedLog.user?.fullName || 'System User'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>IP Address</div>
                  <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{selectedLog.ipAddress || '127.0.0.1'}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Action</div>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Module & Record</div>
                  <div style={{ fontWeight: 600 }}>{selectedLog.module} #{selectedLog.recordRef || selectedLog.recordId}</div>
                </div>
              </div>

              {selectedLog.action === 'UPDATE' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, marginBottom: 8 }}>OLD VALUE</div>
                    <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0, fontFamily: 'monospace' }}>
                      {selectedLog.oldValue ? JSON.stringify(JSON.parse(selectedLog.oldValue), null, 2) : 'null'}
                    </pre>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600, marginBottom: 8 }}>NEW VALUE</div>
                    <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0, fontFamily: 'monospace' }}>
                      {selectedLog.newValue ? JSON.stringify(JSON.parse(selectedLog.newValue), null, 2) : 'null'}
                    </pre>
                  </div>
                </div>
              )}

              {selectedLog.action === 'CREATE' && selectedLog.newValue && (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Created Data Payload</div>
                  <pre style={{ background: 'var(--hover)', padding: 16, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', color: 'var(--text)', margin: 0, fontFamily: 'monospace' }}>
                    {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                  </pre>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
