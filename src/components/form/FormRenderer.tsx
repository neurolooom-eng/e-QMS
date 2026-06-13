import clsx from 'clsx'
import { Paperclip, PenLine } from 'lucide-react'
import type { FieldDef, ModuleSchema } from '../../lib/types'

interface FormRendererProps {
  schema: ModuleSchema
  value: Record<string, any>
  onChange: (key: string, v: any) => void
  users: string[]
  readOnly?: boolean
}

function fieldsBySection(schema: ModuleSchema) {
  const formFields = schema.fields.filter((f) => f.inForm !== false)
  const sections = new Map<string, FieldDef[]>()
  for (const f of formFields) {
    const s = f.section || 'General'
    if (!sections.has(s)) sections.set(s, [])
    sections.get(s)!.push(f)
  }
  return sections
}

export function FormRenderer({ schema, value, onChange, users, readOnly }: FormRendererProps) {
  const sections = fieldsBySection(schema)

  const renderField = (f: FieldDef) => {
    const v = value[f.key] ?? ''
    const disabled = readOnly || f.readonly
    const common = 'input'

    const options =
      f.type === 'status' ? schema.workflow : f.options || []

    switch (f.type) {
      case 'textarea':
        return (
          <textarea
            className="textarea min-h-[80px]"
            value={v}
            disabled={disabled}
            placeholder={f.placeholder}
            onChange={(e) => onChange(f.key, e.target.value)}
          />
        )
      case 'select':
      case 'status':
        return (
          <select className="select" value={v} disabled={disabled} onChange={(e) => onChange(f.key, e.target.value)}>
            <option value="">—</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value}
              </option>
            ))}
          </select>
        )
      case 'user':
        return (
          <select className="select" value={v} disabled={disabled} onChange={(e) => onChange(f.key, e.target.value)}>
            <option value="">— Unassigned —</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            {v && !users.includes(v) && <option value={v}>{v}</option>}
          </select>
        )
      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            className={common}
            value={v}
            disabled={disabled}
            onChange={(e) => onChange(f.key, e.target.value === '' ? '' : Number(e.target.value))}
          />
        )
      case 'date':
        return (
          <input type="date" className={common} value={v || ''} disabled={disabled} onChange={(e) => onChange(f.key, e.target.value)} />
        )
      case 'boolean':
        return (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!v} disabled={disabled} onChange={(e) => onChange(f.key, e.target.checked)} />
            {f.help || 'Yes'}
          </label>
        )
      case 'attachment':
        return (
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted" />
            <input
              className={common}
              value={v}
              disabled={disabled}
              placeholder="Paste link to template / file (placeholder)"
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          </div>
        )
      case 'signature':
        return (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-surface-2 px-3 py-2">
            <PenLine className="h-4 w-4 text-primary" />
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              value={v}
              disabled={disabled}
              placeholder="Type name to e-sign (placeholder)"
              onChange={(e) => onChange(f.key, e.target.value)}
            />
          </div>
        )
      default:
        return (
          <input
            className={common}
            value={v}
            disabled={disabled}
            placeholder={f.placeholder}
            onChange={(e) => onChange(f.key, e.target.value)}
          />
        )
    }
  }

  return (
    <div className="space-y-5">
      {Array.from(sections, ([section, fields]) => (
        <fieldset key={section} className="card p-4">
          <legend className="px-1 text-sm font-semibold text-primary">{section}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={clsx(f.type === 'textarea' && 'sm:col-span-2')}>
                <label className="label">
                  {f.label}
                  {f.required && <span className="text-danger"> *</span>}
                </label>
                {renderField(f)}
                {f.help && <p className="mt-0.5 text-[11px] text-muted">{f.help}</p>}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
