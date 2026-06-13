import type { AuditEntry, QmsRecord, User } from '../types'

// ============================================================
// DataAdapter — the single interface every storage backend
// implements. Swap Local <-> Google Sheets with zero changes
// to the UI. Each "collection" maps to a module slug (and, in
// Google Sheets, to a tab/worksheet of the same name).
// ============================================================

export interface DataAdapter {
  readonly name: string
  /** list records for a collection (module slug) */
  list(collection: string): Promise<QmsRecord[]>
  get(collection: string, id: string): Promise<QmsRecord | undefined>
  create(collection: string, record: QmsRecord): Promise<QmsRecord>
  update(collection: string, id: string, patch: Partial<QmsRecord>): Promise<QmsRecord>
  remove(collection: string, id: string): Promise<void>

  // users / auth
  listUsers(): Promise<User[]>
  upsertUser(user: User): Promise<User>
  removeUser(id: string): Promise<void>

  // audit trail
  listAudit(): Promise<AuditEntry[]>
  appendAudit(entry: AuditEntry): Promise<void>

  /** Ensure backend has seed data when empty */
  ensureSeed(seedFn: () => Promise<void>): Promise<void>
}

export interface DataSourceConfig {
  mode: 'local' | 'sheets'
  /** Google Apps Script Web App URL (deploy the bundled apps-script/Code.gs) */
  appsScriptUrl?: string
  /** shared token checked by the Apps Script (optional) */
  apiToken?: string
}

export const DATASOURCE_KEY = 'eqms.datasource'

export function loadDataSourceConfig(): DataSourceConfig {
  try {
    const raw = localStorage.getItem(DATASOURCE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return { mode: 'local' }
}

export function saveDataSourceConfig(cfg: DataSourceConfig) {
  localStorage.setItem(DATASOURCE_KEY, JSON.stringify(cfg))
}
