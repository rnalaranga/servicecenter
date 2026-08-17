import { useState } from 'react'
import { Eye, EyeOff, Loader2, Car } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/contexts/ToastContext'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { error } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      error('Login Failed', err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(212,175,55,0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(212,175,55,0.04) 0%, transparent 50%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(212,175,55,0.3)',
            fontSize: '26px',
            fontWeight: '800',
            color: '#0F1115',
          }}>
            G
          </div>
          <h1 style={{
            fontSize: '22px',
            fontWeight: '700',
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}>
            Golden Auto Detail ERP
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Sign in to your workspace
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-body">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label required">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label required">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: '40px' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '4px' }}
                disabled={loading || !username || !password}
              >
                {loading ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Demo credentials */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(212,175,55,0.08)',
          border: '1px solid rgba(212,175,55,0.2)',
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-gold-primary)', marginBottom: '4px' }}>
            Demo Credentials
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Username: <span style={{ color: 'var(--text)', fontWeight: 600 }}>admin</span>
            &nbsp;&nbsp;Password: <span style={{ color: 'var(--text)', fontWeight: 600 }}>admin@golden123</span>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--text-subtle)' }}>
          © 2025 Golden Auto Detail ERP · All rights reserved
        </p>
      </div>
    </div>
  )
}
