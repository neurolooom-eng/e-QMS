import { useState } from 'react'
import { Activity, Lock, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { DEMO_USERS } from '../lib/seed'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(u = username, p = password) {
    setBusy(true)
    setError('')
    const res = await login(u, p)
    if (!res.ok) setError(res.error || 'Login failed')
    setBusy(false)
  }

  return (
    <div className="grid min-h-full place-items-center bg-bg p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border shadow-card md:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden flex-col justify-between bg-primary p-8 text-primary-fg md:flex">
          <div className="flex items-center gap-2">
            <Activity className="h-7 w-7" />
            <span className="text-lg font-bold">e-QMS</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">ICU Ventilator Quality Management</h1>
            <p className="mt-2 text-sm opacity-90">
              Electronic QMS aligned to ISO 13485:2016 and EU MDR for CE-certified ventilator manufacturing.
            </p>
            <ul className="mt-6 space-y-2 text-sm opacity-90">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> 21 CFR Part 11–style audit trail</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> 16 integrated QMS modules</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Role-based access control</li>
            </ul>
          </div>
          <div className="text-xs opacity-70">POC · Local demo data · Google Sheets-ready</div>
        </div>

        {/* Form panel */}
        <div className="bg-surface p-8">
          <h2 className="text-xl font-bold">Sign in</h2>
          <p className="mb-6 text-sm text-muted">Password-protected access to your quality system.</p>

          <form
            onSubmit={(e) => { e.preventDefault(); submit() }}
            className="space-y-3"
          >
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className="input pl-8" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input type="password" className="input pl-8" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>
            {error && <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>

          <div className="mt-6">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts — click to sign in</div>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setUsername(u.username); setPassword(u.password); submit(u.username, u.password) }}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {u.name.split(' ').map((s) => s[0]).join('')}
                  </span>
                  <span className="font-medium">{u.username}</span>
                  <span className="text-muted">/ {u.password}</span>
                  <span className="ml-auto rounded bg-surface-2 px-2 py-0.5 text-[10px] text-muted">{u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
