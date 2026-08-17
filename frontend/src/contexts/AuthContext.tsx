import React, { createContext, useContext, useState, useEffect } from 'react'

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
    // Demo login - will be replaced with real API call
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
    } else {
      throw new Error('Invalid username or password')
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
