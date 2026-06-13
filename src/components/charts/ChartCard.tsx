import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartDef } from '../../lib/types'

const PALETTE = ['#0d9488', '#0284c7', '#7c3aed', '#d97706', '#dc2626', '#059669', '#db2777', '#0891b2']

function groupCounts(rows: Record<string, any>[], key: string) {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = String(r[key] ?? '—') || '—'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return Array.from(map, ([name, value]) => ({ name, value }))
}

export function ChartCard({ def, rows }: { def: ChartDef; rows: Record<string, any>[] }) {
  const data = groupCounts(rows, def.groupBy)
  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold text-text">{def.label}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {def.type === 'pie' ? (
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          ) : def.type === 'line' ? (
            <LineChart data={data} margin={{ left: -20, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={PALETTE[1]} strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ left: -20, right: 10, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
