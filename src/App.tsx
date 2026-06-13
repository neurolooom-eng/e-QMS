import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Activity } from 'lucide-react'
import { AuthProvider, useAuth } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { ExecutiveDashboard } from './pages/ExecutiveDashboard'
import { ModulePage } from './pages/ModulePage'
import { AuditTrailPage } from './pages/AuditTrailPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { SettingsPage } from './pages/SettingsPage'

function Gate() {
  const { user, ready } = useAuth()

  if (!ready) {
    return (
      <div className="grid h-full place-items-center text-muted">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 animate-pulse text-primary" /> Loading e-QMS…
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<ExecutiveDashboard />} />
        <Route path="/m/:slug" element={<ModulePage />} />
        <Route path="/audit-trail" element={<AuditTrailPage />} />
        <Route path="/admin/users" element={user.role === 'Admin' ? <AdminUsersPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
