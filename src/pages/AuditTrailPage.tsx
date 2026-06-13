import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { db } from '../lib/data'
import { DataTable, type DataColumn } from '../components/table/DataTable'
import { StatusChip } from '../components/ui/StatusChip'
import type { AuditEntry } from '../lib/types'

const actionTone: Record<string, any> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  login: 'primary',
  logout: 'neutral',
  sign: 'warning',
  export: 'neutral',
}

const columns: DataColumn<AuditEntry>[] = [
  { key: 'ts', header: 'Timestamp', width: 180, nowrap: true, accessor: (r) => r.ts, render: (v) => <span className="font-mono text-xs">{new Date(v).toLocaleString()}</span> },
  { key: 'user', header: 'User', width: 140 },
  { key: 'action', header: 'Action', width: 110, render: (v) => <StatusChip value={v} tone={actionTone[v]} dot={false} /> },
  { key: 'module', header: 'Module', width: 150 },
  { key: 'recordId', header: 'Record', width: 120, nowrap: true, render: (v) => v ? <span className="font-mono text-xs">{v}</span> : <span className="text-muted">—</span> },
  { key: 'detail', header: 'Detail', width: 280 },
]

export function AuditTrailPage() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  useEffect(() => {
    db().listAudit().then(setRows)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Audit Trail</h1>
          <p className="text-sm text-muted">Immutable record of all create/update/delete and sign-in events (21 CFR Part 11 style).</p>
        </div>
      </div>
      <DataTable tableKey="audit-trail" columns={columns} data={rows} emptyLabel="No audit events yet." />
    </div>
  )
}
