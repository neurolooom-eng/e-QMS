import type { DataColumn } from '../components/table/DataTable'
import { StatusChip } from '../components/ui/StatusChip'
import type { ModuleSchema, QmsRecord } from './types'

/** Build advanced-table columns from a module schema's table fields. */
export function buildColumns(schema: ModuleSchema): DataColumn<QmsRecord>[] {
  const fields = schema.fields.filter((f) => f.inTable)
  // Always lead with the human-readable record id
  const cols: DataColumn<QmsRecord>[] = [
    {
      key: 'recordId',
      header: 'ID',
      width: 110,
      nowrap: true,
      accessor: (r) => r.recordId,
      render: (v) => <span className="font-mono text-xs text-muted">{v}</span>,
      toText: (r) => String(r.recordId ?? ''),
    },
  ]

  for (const f of fields) {
    const optionTone = (val: string) => f.options?.find((o) => o.value === val)?.tone
    cols.push({
      key: f.key,
      header: f.label,
      width: f.width,
      nowrap: f.nowrap,
      accessor: (r) => r[f.key],
      toText: (r) => String(r[f.key] ?? ''),
      render: (v, _r) => {
        if (v === undefined || v === '' || v === null) return <span className="text-muted">—</span>
        if (f.type === 'status') {
          const tone = schema.workflow.find((w) => w.value === v)?.tone
          return <StatusChip value={String(v)} tone={tone} />
        }
        if (f.type === 'select' && optionTone(String(v))) {
          return <StatusChip value={String(v)} tone={optionTone(String(v))} dot={false} />
        }
        if (f.type === 'number') return <span className="tabular-nums">{v}</span>
        return String(v)
      },
    })
  }
  return cols
}
