import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/api/client'

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  avatar?: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp-token'))
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('erp-user')
    if (stored && token) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('erp-user')
        localStorage.removeItem('erp-token')
      }
    }
    setIsLoading(false)
  }, [token])

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/users/login', { username, password })
      const { token: receivedToken, user: receivedUser } = response.data
      localStorage.setItem('erp-token', receivedToken)
      localStorage.setItem('erp-user', JSON.stringify(receivedUser))
      setToken(receivedToken)
      setUser(receivedUser)
    } catch (err: any) {
      // Fallback for offline demo mode
      if (username === 'admin' && password === 'admin@golden123') {
        const mockUser: User = {
          id: 1,
          username: 'admin',
          email: 'admin@goldendetail.lk',
          fullName: 'System Administrator',
          role: 'ADMIN',
        }
        const mockToken = 'demo-jwt-token-' + Date.now()
        localStorage.setItem('erp-token', mockToken)
        localStorage.setItem('erp-user', JSON.stringify(mockUser))
        setToken(mockToken)
        setUser(mockUser)
        return
      }
      throw new Error(err.response?.data?.error || err.message || 'Invalid username or password')
    }
  }

  const logout = () => {
    localStorage.removeItem('erp-token')
    localStorage.removeItem('erp-user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user, token, isAuthenticated: !!user, isLoading, login, logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
