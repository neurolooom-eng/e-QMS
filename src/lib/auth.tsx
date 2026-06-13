import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import bcrypt from 'bcryptjs'
import { db } from './data'
import { ensureSeeded } from './seed'
import type { Role, User } from './types'
import { logAudit } from './audit'

interface AuthState {
  user: Omit<User, 'passwordHash'> | null
  ready: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  can: (action: 'edit' | 'delete' | 'admin') => boolean
}

const SESSION_KEY = 'eqms.session'
const AuthCtx = createContext<AuthState>(null as any)

const EDIT_ROLES: Role[] = ['Admin', 'QA Manager', 'Engineer']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Omit<User, 'passwordHash'> | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      await ensureSeeded()
      try {
        const raw = localStorage.getItem(SESSION_KEY)
        if (raw) setUser(JSON.parse(raw))
      } catch {
        /* ignore */
      }
      setReady(true)
    })()
  }, [])

  const login: AuthState['login'] = async (username, password) => {
    const users = await db().listUsers()
    const u = users.find((x) => x.username.toLowerCase() === username.toLowerCase().trim())
    if (!u) return { ok: false, error: 'Unknown user' }
    if (!u.active) return { ok: false, error: 'Account disabled' }
    const match = u.passwordHash ? bcrypt.compareSync(password, u.passwordHash) : false
    if (!match) return { ok: false, error: 'Incorrect password' }
    const { passwordHash, ...safe } = u
    setUser(safe)
    localStorage.setItem(SESSION_KEY, JSON.stringify(safe))
    await logAudit(safe.name, 'login', 'auth', undefined, `Signed in as ${safe.role}`)
    return { ok: true }
  }

  const logout = () => {
    if (user) logAudit(user.name, 'logout', 'auth')
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const can: AuthState['can'] = (action) => {
    if (!user) return false
    if (action === 'admin') return user.role === 'Admin'
    if (action === 'delete') return user.role === 'Admin' || user.role === 'QA Manager'
    return EDIT_ROLES.includes(user.role) // edit
  }

  return <AuthCtx.Provider value={{ user, ready, login, logout, can }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
