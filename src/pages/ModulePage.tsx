import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, BarChart3, Table2 } from 'lucide-react'
import { getModule } from '../lib/modules/registry'
import { useCollection, useUsers } from '../lib/useCollection'
import { buildColumns } from '../lib/columns'
import { useAuth } from '../lib/auth'
import { DataTable } from '../components/table/DataTable'
import { KpiCard } from '../components/charts/KpiCard'
import { ChartCard } from '../components/charts/ChartCard'
import { RecordDrawer } from '../components/RecordDrawer'
import { Capa8DForm } from '../components/capa/Capa8DForm'
import { Icon } from '../components/ui/Icon'
import type { QmsRecord } from '../lib/types'

export function ModulePage() {
  const { slug = '' } = useParams()
  const schema = getModule(slug)
  const { rows, reload } = useCollection(slug)
  const { users } = useUsers()
  const { user, can } = useAuth()
  const [editing, setEditing] = useState<QmsRecord | null | undefined>(undefined) // undefined=closed, null=new
  const [tab, setTab] = useState<'table' | 'dashboard'>('table')

  const columns = useMemo(() => (schema ? buildColumns(schema) : []), [schema])
  const userNames = useMemo(() => users.map((u) => u.name), [users])

  const nextRecordId = useMemo(() => {
    if (!schema) return ''
    const nums = rows
      .map((r) => Number(String(r.recordId || '').split('-').pop()))
      .filter((n) => !Number.isNaN(n))
    const next = (nums.length ? Math.max(...nums) : 0) + 1
    return `${schema.idPrefix}-${String(next).padStart(4, '0')}`
  }, [rows, schema])

  if (!schema) return <div className="text-muted">Module not found.</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/12 text-primary">
          <Icon name={schema.icon} className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{schema.title}</h1>
          <p className="text-sm text-muted">{schema.description}</p>
          <span className="mt-1 inline-block rounded bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{schema.clause}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              className={`btn ${tab === 'table' ? 'bg-surface-2' : ''}`}
              onClick={() => setTab('table')}
            >
              <Table2 className="h-4 w-4" /> Table
            </button>
            <button
              className={`btn ${tab === 'dashboard' ? 'bg-surface-2' : ''}`}
              onClick={() => setTab('dashboard')}
            >
              <BarChart3 className="h-4 w-4" /> Dashboard
            </button>
          </div>
          {can('edit') && (
            <button className="btn-primary" onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" /> New
            </button>
          )}
        </div>
      </div>

      {/* KPI cards (always visible) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {schema.kpis.map((k) => (
          <KpiCard
            key={k.id}
            label={k.label}
            value={k.compute(rows)}
            format={k.format}
            target={k.target}
            goal={k.goal}
            icon={k.icon}
          />
        ))}
      </div>

      {tab === 'dashboard' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(schema.charts || []).map((c) => (
            <ChartCard key={c.id} def={c} rows={rows} />
          ))}
        </div>
      ) : (
        <DataTable
          tableKey={`mod.${slug}`}
          columns={columns}
          data={rows}
          onRowClick={(r) => setEditing(r)}
          emptyLabel={`No ${schema.menu.toLowerCase()} records yet.`}
        />
      )}

      {editing !== undefined &&
        (schema.slug === 'capa' ? (
          <Capa8DForm
            schema={schema}
            record={editing}
            nextRecordId={nextRecordId}
            users={userNames}
            currentUser={user?.name || 'unknown'}
            canEdit={can('edit')}
            canDelete={can('delete')}
            onClose={() => setEditing(undefined)}
            onSaved={reload}
          />
        ) : (
          <RecordDrawer
            schema={schema}
            record={editing}
            nextRecordId={nextRecordId}
            users={userNames}
            currentUser={user?.name || 'unknown'}
            canEdit={can('edit')}
            canDelete={can('delete')}
            onClose={() => setEditing(undefined)}
            onSaved={reload}
          />
        ))}
    </div>
  )
}
