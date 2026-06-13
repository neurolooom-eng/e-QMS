import bcrypt from 'bcryptjs'
import { db } from './data'
import { MODULES } from './modules/registry'
import type { QmsRecord, User } from './types'

export function genId(prefix = 'rec'): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rnd}`
}

const pad = (n: number) => String(n).padStart(4, '0')

// Demo accounts surfaced on the login screen.
export const DEMO_USERS: Array<Omit<User, 'passwordHash'> & { password: string }> = [
  { id: 'u_admin', username: 'admin', password: 'admin123', name: 'M. Alvarez', email: 'admin@neobreathe.med', role: 'Admin', department: 'Quality Assurance', active: true, createdAt: '2025-01-01' },
  { id: 'u_qa', username: 'qa', password: 'qa123', name: 'R. Kapoor', email: 'qa@neobreathe.med', role: 'QA Manager', department: 'Quality Assurance', active: true, createdAt: '2025-01-01' },
  { id: 'u_eng', username: 'engineer', password: 'eng123', name: 'T. Nguyen', email: 'eng@neobreathe.med', role: 'Engineer', department: 'R&D / Design', active: true, createdAt: '2025-01-01' },
  { id: 'u_aud', username: 'auditor', password: 'aud123', name: 'S. Haas', email: 'auditor@neobreathe.med', role: 'Auditor', department: 'Regulatory Affairs', active: true, createdAt: '2025-01-01' },
  { id: 'u_view', username: 'viewer', password: 'view123', name: 'D. Okafor', email: 'viewer@neobreathe.med', role: 'Viewer', department: 'Manufacturing', active: true, createdAt: '2025-01-01' },
]

async function seedAll() {
  const database = db()

  // Users
  for (const u of DEMO_USERS) {
    const { password, ...rest } = u
    await database.upsertUser({ ...rest, passwordHash: bcrypt.hashSync(password, 8) })
  }

  // Module records
  for (const schema of MODULES) {
    let i = 1
    for (const row of schema.seed) {
      const record: Record<string, any> = {
        id: genId(schema.idPrefix.toLowerCase()),
        recordId: `${schema.idPrefix}-${pad(i++)}`,
        status: row.status ?? schema.workflow[0]?.value ?? '',
        createdAt: new Date(Date.now() - i * 86400000 * 3).toISOString().slice(0, 10),
        createdBy: 'system (seed)',
        updatedAt: new Date().toISOString().slice(0, 10),
        updatedBy: 'system (seed)',
        ...row,
      }
      // derive RPN for risk module if components present
      if (schema.id === 'risk' && record.severity && record.occurrence && record.detection) {
        record.rpn = Number(record.severity) * Number(record.occurrence) * Number(record.detection)
      }
      await database.create(schema.slug, record as QmsRecord)
    }
  }
}

/** Idempotent: only seeds once per backend. Guards against concurrent
 *  calls (e.g. React StrictMode double-invoke) with a shared promise. */
let seedingPromise: Promise<void> | null = null
export async function ensureSeeded() {
  if (!seedingPromise) seedingPromise = db().ensureSeed(seedAll)
  await seedingPromise
}
