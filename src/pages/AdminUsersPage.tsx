import { useMemo, useState } from 'react'
import bcrypt from 'bcryptjs'
import { Plus, Users, X } from 'lucide-react'
import { db } from '../lib/data'
import { genId } from '../lib/seed'
import { useUsers } from '../lib/useCollection'
import { useAuth } from '../lib/auth'
import { logAudit } from '../lib/audit'
import { DataTable, type DataColumn } from '../components/table/DataTable'
import { StatusChip } from '../components/ui/StatusChip'
import { departments } from '../lib/modules/common'
import type { Role, User } from '../lib/types'

const ROLES: Role[] = ['Admin', 'QA Manager', 'Engineer', 'Auditor', 'Viewer']
const roleTone: Record<Role, any> = {
  Admin: 'danger',
  'QA Manager': 'primary',
  Engineer: 'info',
  Auditor: 'warning',
  Viewer: 'neutral',
}

export function AdminUsersPage() {
  const { users, reload } = useUsers()
  const { user: me } = useAuth()
  const [editing, setEditing] = useState<Partial<User> | null>(null)
  const [password, setPassword] = useState('')

  const columns = useMemo<DataColumn<User>[]>(
    () => [
      { key: 'name', header: 'Name', width: 160 },
      { key: 'username', header: 'Username', width: 130, nowrap: true, render: (v) => <span className="font-mono text-xs">{v}</span> },
      { key: 'email', header: 'Email', width: 200, nowrap: true },
      { key: 'role', header: 'Role', width: 130, render: (v) => <StatusChip value={v} tone={roleTone[v as Role]} dot={false} /> },
      { key: 'department', header: 'Department', width: 170 },
      { key: 'active', header: 'Status', width: 100, render: (v) => <StatusChip value={v ? 'Active' : 'Disabled'} tone={v ? 'success' : 'neutral'} /> },
    ],
    [],
  )

  async function save() {
    if (!editing?.name || !editing?.username) return
    const existing = users.find((u) => u.id === editing.id)
    const rec: User = {
      id: editing.id || genId('u'),
      name: editing.name!,
      username: editing.username!,
      email: editing.email || '',
      role: (editing.role as Role) || 'Viewer',
      department: editing.department || departments[0],
      active: editing.active ?? true,
      createdAt: existing?.createdAt || new Date().toISOString().slice(0, 10),
      passwordHash: password
        ? bcrypt.hashSync(password, 8)
        : existing?.passwordHash || bcrypt.hashSync('changeme', 8),
    }
    await db().upsertUser(rec)
    await logAudit(me?.name || 'admin', existing ? 'update' : 'create', 'users', rec.username, `User ${rec.role}`)
    setEditing(null)
    setPassword('')
    reload()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Users &amp; Access</h1>
          <p className="text-sm text-muted">Manage accounts, roles and access. Passwords are bcrypt-hashed.</p>
        </div>
        <button className="btn-primary ml-auto" onClick={() => { setEditing({ active: true, role: 'Viewer' }); setPassword('') }}>
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <DataTable tableKey="admin-users" columns={columns} data={users} onRowClick={(u) => { setEditing(u); setPassword('') }} />

      {editing && (
        <div className="fixed inset-0 z-40 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="card relative w-full max-w-lg p-5">
            <div className="mb-4 flex items-center">
              <h2 className="text-lg font-bold">{editing.id ? 'Edit User' : 'New User'}</h2>
              <button className="btn-ghost ml-auto" onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Full Name</label><input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label className="label">Username</label><input className="input" value={editing.username || ''} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">Email</label><input className="input" value={editing.email || ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div>
                <label className="label">Role</label>
                <select className="select" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select className="select" value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })}>
                  {departments.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div><label className="label">Password {editing.id && <span className="text-muted">(blank = keep)</span>}</label><input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
