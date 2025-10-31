'use client'
import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'

const STORAGE_KEY = 'rainmaker_user'

const AuthContext = createContext()

const getStoredUser = () => {
  if (typeof window === 'undefined') return null
  try {
    const storedUser = window.localStorage.getItem(STORAGE_KEY)
    return storedUser ? JSON.parse(storedUser) : null
  } catch (error) {
    console.error('Failed to read stored user', error)
    return null
  }
}

const useBrowserLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useBrowserLayoutEffect(() => {
    const stored = getStoredUser()
    if (stored) setUser(stored)
    setLoading(false)

    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return
      try {
        setUser(event.newValue ? JSON.parse(event.newValue) : null)
      } catch (error) {
        console.error('Failed to parse stored user', error)
        setUser(null)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const login = (userData) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    setUser(userData)
  }

  const logout = () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
