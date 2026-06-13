import type { AuditEntry, QmsRecord, User } from '../types'
import type { DataAdapter, DataSourceConfig } from './adapter'

// ============================================================
// GoogleSheetsAdapter — talks to the bundled Apps Script Web App
// (apps-script/Code.gs). Each collection is a worksheet/tab.
//
// Protocol (all via the single Web App URL):
//   GET  ?action=list&collection=complaints
//   POST {action:'create'|'update'|'remove'|..., collection, ...}
//
// To avoid CORS preflight, POSTs use text/plain bodies — the
// Apps Script parses JSON from e.postData.contents.
// ============================================================

export class GoogleSheetsAdapter implements DataAdapter {
  readonly name = 'Google Sheets'
  private url: string
  private token?: string

  constructor(cfg: DataSourceConfig) {
    if (!cfg.appsScriptUrl) throw new Error('Google Sheets URL not configured')
    this.url = cfg.appsScriptUrl
    this.token = cfg.apiToken
  }

  private async call(payload: Record<string, any>): Promise<any> {
    const res = await fetch(this.url, {
      method: 'POST',
      // text/plain dodges CORS preflight against Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, token: this.token }),
    })
    if (!res.ok) throw new Error(`Sheets backend HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.error) throw new Error(data.error)
    return data
  }

  async list(collection: string): Promise<QmsRecord[]> {
    const data = await this.call({ action: 'list', collection })
    return data.rows ?? []
  }

  async get(collection: string, id: string) {
    const rows = await this.list(collection)
    return rows.find((r) => r.id === id)
  }

  async create(collection: string, record: QmsRecord) {
    await this.call({ action: 'create', collection, record })
    return record
  }

  async update(collection: string, id: string, patch: Partial<QmsRecord>) {
    const data = await this.call({ action: 'update', collection, id, patch })
    return data.record ?? { id, ...patch }
  }

  async remove(collection: string, id: string) {
    await this.call({ action: 'remove', collection, id })
  }

  async listUsers() {
    const data = await this.call({ action: 'list', collection: '_users' })
    return (data.rows ?? []) as User[]
  }

  async upsertUser(user: User) {
    await this.call({ action: 'upsertUser', user })
    return user
  }

  async removeUser(id: string) {
    await this.call({ action: 'remove', collection: '_users', id })
  }

  async listAudit() {
    const data = await this.call({ action: 'list', collection: '_audit' })
    return (data.rows ?? []) as AuditEntry[]
  }

  async appendAudit(entry: AuditEntry) {
    await this.call({ action: 'create', collection: '_audit', record: entry })
  }

  async ensureSeed(seedFn: () => Promise<void>) {
    const data = await this.call({ action: 'isSeeded' })
    if (!data.seeded) {
      await seedFn()
      await this.call({ action: 'markSeeded' })
    }
  }
}
