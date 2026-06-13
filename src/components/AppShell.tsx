import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import {
  Activity,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { MODULE_GROUPS, modulesByGroup } from '../lib/modules/registry'
import { Icon } from './ui/Icon'

function ThemeMenu() {
  const { theme, setTheme, themes } = useTheme()
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button className="btn-ghost" title="Theme" onClick={() => setOpen((o) => !o)}>
        <Palette className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-border bg-surface p-2 shadow-card">
            <div className="mb-1 px-1 text-xs font-semibold text-muted">Color theme</div>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTheme(t.id); setOpen(false) }}
                className={clsx(
                  'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-surface-2',
                  theme === t.id && 'bg-surface-2 font-medium',
                )}
              >
                <span className="h-4 w-4 rounded-full ring-1 ring-border" style={{ background: t.swatch }} />
                {t.name}
                <span className="ml-auto text-[10px] uppercase text-muted">{t.mode}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, can } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation()

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside
        className={clsx(
          'flex flex-col border-r border-border bg-surface transition-all',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg">
            <Activity className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold">e-QMS</div>
              <div className="text-[10px] text-muted">ISO 13485 · MDR</div>
            </div>
          )}
          <button className="btn-ghost ml-auto p-1" onClick={() => setCollapsed((c) => !c)}>
            <ChevronLeft className={clsx('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <NavItem to="/" icon={<LayoutDashboard className="h-4 w-4" />} label="Executive Dashboard" collapsed={collapsed} end />

          {MODULE_GROUPS.map((group) => (
            <div key={group} className="mt-4">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{group}</div>
              )}
              {modulesByGroup(group).map((m) => (
                <NavItem
                  key={m.slug}
                  to={`/m/${m.slug}`}
                  icon={<Icon name={m.icon} className="h-4 w-4" />}
                  label={m.menu}
                  collapsed={collapsed}
                />
              ))}
            </div>
          ))}

          <div className="mt-4">
            {!collapsed && <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">System</div>}
            <NavItem to="/audit-trail" icon={<ShieldCheck className="h-4 w-4" />} label="Audit Trail" collapsed={collapsed} />
            {can('admin') && <NavItem to="/admin/users" icon={<Users className="h-4 w-4" />} label="Users & Access" collapsed={collapsed} />}
            <NavItem to="/settings" icon={<Settings className="h-4 w-4" />} label="Settings" collapsed={collapsed} />
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-2">
          <Menu className="h-4 w-4 text-muted md:hidden" />
          <Breadcrumb path={loc.pathname} />
          <div className="ml-auto flex items-center gap-2">
            <ThemeMenu />
            <div className="flex items-center gap-2 rounded-lg border border-border px-2 py-1">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {user?.name?.split(' ').map((s) => s[0]).join('').slice(0, 2)}
              </div>
              <div className="hidden leading-tight sm:block">
                <div className="text-xs font-semibold">{user?.name}</div>
                <div className="text-[10px] text-muted">{user?.role}</div>
              </div>
              <button className="btn-ghost p-1" title="Sign out" onClick={logout}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

function NavItem({
  to,
  icon,
  label,
  collapsed,
  end,
}: {
  to: string
  icon: ReactNode
  label: string
  collapsed: boolean
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) =>
        clsx(
          'mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-primary/12 font-medium text-primary' : 'text-text hover:bg-surface-2',
          collapsed && 'justify-center px-0',
        )
      }
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

function Breadcrumb({ path }: { path: string }) {
  const segs = path.split('/').filter(Boolean)
  return (
    <div className="flex items-center gap-1 text-sm text-muted">
      <Link to="/" className="hover:text-text">Home</Link>
      {segs.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>/</span>
          <span className="capitalize text-text">{s.replace(/-/g, ' ')}</span>
        </span>
      ))}
    </div>
  )
}
