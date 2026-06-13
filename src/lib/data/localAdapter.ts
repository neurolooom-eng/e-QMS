import type { AuditEntry, QmsRecord, User } from '../types'
import type { DataAdapter } from './adapter'

// ============================================================
// LocalAdapter — browser localStorage backend. Lets the POC run
// instantly with no credentials. Mirrors the exact shape the
// Google Sheets adapter exposes, so they are interchangeable.
// ============================================================

const NS = 'eqms.local.'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(NS + key, JSON.stringify(value))
}

export class LocalAdapter implements DataAdapter {
  readonly name = 'Local (browser)'

  async list(collection: string): Promise<QmsRecord[]> {
    return read<QmsRecord[]>(`col.${collection}`, [])
  }

  async get(collection: string, id: string) {
    const rows = await this.list(collection)
    return rows.find((r) => r.id === id)
  }

  async create(collection: string, record: QmsRecord) {
    const rows = await this.list(collection)
    rows.unshift(record)
    write(`col.${collection}`, rows)
    return record
  }

  async update(collection: string, id: string, patch: Partial<QmsRecord>) {
    const rows = await this.list(collection)
    const idx = rows.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error(`Record ${id} not found in ${collection}`)
    rows[idx] = { ...rows[idx], ...patch }
    write(`col.${collection}`, rows)
    return rows[idx]
  }

  async remove(collection: string, id: string) {
    const rows = await this.list(collection)
    write(
      `col.${collection}`,
      rows.filter((r) => r.id !== id),
    )
  }

  async listUsers() {
    return read<User[]>('users', [])
  }

  async upsertUser(user: User) {
    const users = await this.listUsers()
    const idx = users.findIndex((u) => u.id === user.id)
    if (idx === -1) users.push(user)
    else users[idx] = user
    write('users', users)
    return user
  }

  async removeUser(id: string) {
    const users = await this.listUsers()
    write(
      'users',
      users.filter((u) => u.id !== id),
    )
  }

  async listAudit() {
    return read<AuditEntry[]>('audit', [])
  }

  async appendAudit(entry: AuditEntry) {
    const log = await this.listAudit()
    log.unshift(entry)
    // keep last 2000 entries
    write('audit', log.slice(0, 2000))
  }

  async ensureSeed(seedFn: () => Promise<void>) {
    if (read<boolean>('seeded', false)) return
    await seedFn()
    write('seeded', true)
  }
}
