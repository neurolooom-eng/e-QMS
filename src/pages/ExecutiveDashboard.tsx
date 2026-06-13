import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/data'
import { MODULES, getModule } from '../lib/modules/registry'
import { KpiCard } from '../components/charts/KpiCard'
import { ChartCard } from '../components/charts/ChartCard'
import { Icon } from '../components/ui/Icon'
import { useAuth } from '../lib/auth'
import { isOpen, isOverdue } from '../lib/modules/common'
import type { QmsRecord } from '../lib/types'

type DataMap = Record<string, QmsRecord[]>

export function ExecutiveDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DataMap>({})

  useEffect(() => {
    ;(async () => {
      const map: DataMap = {}
      for (const m of MODULES) map[m.slug] = await db().list(m.slug)
      setData(map)
    })()
  }, [])

  const headline = useMemo(() => {
    const all = Object.values(data).flat()
    const get = (slug: string) => data[slug] || []
    return [
      { label: 'Open CAPAs', value: get('capa').filter(isOpen).length, icon: 'Wrench', target: 10, goal: 'lower' as const },
      { label: 'Open Complaints', value: get('complaints').filter(isOpen).length, icon: 'MessageSquareWarning', target: 8, goal: 'lower' as const },
      { label: 'MDR Reportable', value: get('complaints').filter((r) => r.reportable === 'Yes — MDR').length + get('vigilance').filter((r) => r.eventType === 'Serious Incident').length, icon: 'Siren', target: 0, goal: 'lower' as const },
      { label: 'Overdue Actions', value: all.filter(isOverdue).length, icon: 'Clock', target: 0, goal: 'lower' as const },
      { label: 'Open NCRs', value: get('nonconformance').filter(isOpen).length, icon: 'AlertTriangle', target: 6, goal: 'lower' as const },
      { label: 'High Risks', value: get('risk').filter((r) => r.riskLevel === 'High').length, icon: 'ShieldAlert', target: 3, goal: 'lower' as const },
      { label: 'Calibration Overdue', value: get('equipment').filter((r) => r.nextCal && new Date(r.nextCal) < new Date() && r.status !== 'Retired').length, icon: 'Gauge', target: 0, goal: 'lower' as const },
      { label: 'Released Units', value: get('dhr').filter((r) => ['Released', 'Shipped'].includes(r.status)).length, icon: 'PackageCheck' },
    ]
  }, [data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quality Cockpit</h1>
        <p className="text-sm text-muted">
          Welcome back, {user?.name}. Live snapshot across all {MODULES.length} QMS modules — ISO 13485 + EU MDR.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {headline.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {getModule('complaints')?.charts?.[0] && (
          <ChartCard def={getModule('complaints')!.charts![1]} rows={data['complaints'] || []} />
        )}
        {getModule('capa')?.charts?.[0] && (
          <ChartCard def={getModule('capa')!.charts![1]} rows={data['capa'] || []} />
        )}
      </div>

      {/* Module grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">All Modules</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MODULES.map((m) => {
            const rows = data[m.slug] || []
            const primary = m.kpis[0]
            return (
              <Link
                key={m.slug}
                to={`/m/${m.slug}`}
                className="card group flex items-center gap-3 p-4 transition-colors hover:border-primary/50"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Icon name={m.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold group-hover:text-primary">{m.title}</div>
                  <div className="text-xs text-muted">{rows.length} records</div>
                </div>
                {primary && (
                  <div className="text-right">
                    <div className="text-lg font-bold tabular-nums">{primary.compute(rows)}</div>
                    <div className="text-[10px] text-muted">{primary.label}</div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
