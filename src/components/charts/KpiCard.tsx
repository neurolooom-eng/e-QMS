import clsx from 'clsx'
import { Icon } from '../ui/Icon'

export interface KpiCardProps {
  label: string
  value: number
  format?: 'int' | 'percent' | 'currency'
  target?: number
  goal?: 'higher' | 'lower'
  icon?: string
}

function fmt(value: number, format?: KpiCardProps['format']) {
  if (format === 'percent') return `${value}%`
  if (format === 'currency') return `€${value.toLocaleString()}`
  return value.toLocaleString()
}

/** Red/Amber/Green status vs target. */
function rag({ value, target, goal = 'higher' }: KpiCardProps): 'green' | 'amber' | 'red' | null {
  if (target === undefined) return null
  const good = goal === 'higher' ? value >= target : value <= target
  if (good) return 'green'
  const near = goal === 'higher' ? value >= target * 0.8 : value <= target * 1.25
  return near ? 'amber' : 'red'
}

const ragStyle: Record<string, string> = {
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-danger',
}
const ragBar: Record<string, string> = {
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-danger',
}

export function KpiCard(props: KpiCardProps) {
  const status = rag(props)
  return (
    <div className="card relative overflow-hidden p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{props.label}</div>
          <div className={clsx('mt-1 text-3xl font-bold tabular-nums', status && ragStyle[status])}>
            {fmt(props.value, props.format)}
          </div>
          {props.target !== undefined && (
            <div className="mt-0.5 text-xs text-muted">
              Target {props.goal === 'lower' ? '≤' : '≥'} {fmt(props.target, props.format)}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon name={props.icon} className="h-5 w-5" />
        </div>
      </div>
      {status && <div className={clsx('absolute inset-x-0 bottom-0 h-1', ragBar[status])} />}
    </div>
  )
}
