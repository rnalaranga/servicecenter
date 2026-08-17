import { useState, useRef, useEffect } from 'react'
import { Menu, Sun, Moon, Bell, Search, ChevronDown, LogOut, Settings, User } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, toggleTheme, isDark } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = user?.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'AD'

  const roleBadge: Record<string, string> = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    ACCOUNTANT: 'Accountant',
    CASHIER: 'Cashier',
    STORE_KEEPER: 'Store Keeper',
    TECHNICIAN: 'Technician',
    VIEWER: 'Viewer',
  }

  return (
    <header className="topbar">
      {/* Mobile menu button */}
      <button className="btn btn-ghost btn-icon lg:hidden" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="search-box" style={{ flex: 1, maxWidth: 400 }}>
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder="Search customers, vehicles, job cards..."
          className="form-input"
          style={{ fontSize: '13px', height: '36px' }}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setSearchOpen(false)}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Theme toggle */}
        <button
          className="btn btn-ghost btn-icon"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
          <Bell size={18} />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: 'var(--color-danger)',
            border: '1.5px solid var(--topbar-bg)',
          }} />
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 4px' }} />

        {/* User menu */}
        <div className="dropdown" ref={menuRef}>
          <button
            className={clsx('btn btn-ghost', userMenuOpen && 'bg-hover')}
            style={{ gap: '8px', padding: '4px 8px', height: '40px' }}
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <div className="avatar avatar-sm">{initials}</div>
            <div style={{ textAlign: 'left', display: 'none' }} className="sm:block">
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-gold-primary)', fontWeight: 500 }}>
                {roleBadge[user?.role || 'VIEWER']}
              </div>
            </div>
            <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
          </button>

          {userMenuOpen && (
            <div className="dropdown-menu">
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                  {user?.fullName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {user?.email}
                </div>
              </div>
              <button className="dropdown-item" onClick={() => { navigate('/profile'); setUserMenuOpen(false) }}>
                <User size={14} />
                My Profile
              </button>
              <button className="dropdown-item" onClick={() => { navigate('/settings'); setUserMenuOpen(false) }}>
                <Settings size={14} />
                Settings
              </button>
              <div className="dropdown-separator" />
              <button className="dropdown-item danger" onClick={logout}>
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
