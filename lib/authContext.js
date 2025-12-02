'use client'
import { createContext, useContext, useState, useEffect, useLayoutEffect, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'

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
  const [localUser, setLocalUser] = useState(null)
  const [storageReady, setStorageReady] = useState(false)
  const { data: session, status: sessionStatus } = useSession()

  useBrowserLayoutEffect(() => {
    const stored = getStoredUser()
    if (stored && stored.authSource !== 'sso') {
      setLocalUser(stored)
    } else if (stored?.authSource === 'sso') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    setStorageReady(true)

    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return
      try {
        const parsed = event.newValue ? JSON.parse(event.newValue) : null
        if (parsed?.authSource === 'sso') {
          setLocalUser(null)
          return
        }
        setLocalUser(parsed)
      } catch (error) {
        console.error('Failed to parse stored user', error)
        setLocalUser(null)
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const sessionUser = useMemo(() => {
    if (!session?.user) return null
    return { ...session.user, authSource: 'sso' }
  }, [session])

  const user = sessionUser ?? localUser

  const loading = useMemo(() => {
    if (!storageReady) return true
    if (sessionStatus === 'loading' && !sessionUser) return true
    return false
  }, [sessionStatus, sessionUser, storageReady])

  const login = (userData) => {
    const payload = { ...userData, authSource: userData?.authSource ?? 'local' }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    setLocalUser(payload)
  }

  const logout = async () => {
    window.localStorage.removeItem(STORAGE_KEY)
    setLocalUser(null)
    try {
      await signOut({ redirect: false })
    } catch (error) {
      // no-op if signOut fails (e.g. no active SSO session)
      console.warn('Sign-out skipped or failed', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
