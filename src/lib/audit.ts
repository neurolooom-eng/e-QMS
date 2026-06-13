import { db } from './data'
import { genId } from './seed'
import type { AuditEntry } from './types'

/** Append an entry to the immutable audit trail (21 CFR Part 11 flavour). */
export async function logAudit(
  user: string,
  action: AuditEntry['action'],
  module: string,
  recordId?: string,
  detail?: string,
) {
  const entry: AuditEntry = {
    id: genId('aud'),
    ts: new Date().toISOString(),
    user,
    action,
    module,
    recordId,
    detail,
  }
  try {
    await db().appendAudit(entry)
  } catch {
    /* never block UX on audit write */
  }
}
