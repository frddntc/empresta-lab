import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  token: string | null
  role: string | null
  login: (token: string, role: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'))

  const login = (newToken: string, userRole: string) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('role', userRole)
    setToken(newToken)
    setRole(userRole)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setToken(null)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ token, role, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
