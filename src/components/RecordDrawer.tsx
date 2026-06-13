import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { db } from '../lib/data'
import { genId } from '../lib/seed'
import { logAudit } from '../lib/audit'
import { FormRenderer } from './form/FormRenderer'
import type { ModuleSchema, QmsRecord } from '../lib/types'

interface Props {
  schema: ModuleSchema
  record: QmsRecord | null // null = create new
  nextRecordId: string
  users: string[]
  currentUser: string
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onSaved: () => void
}

export function RecordDrawer({
  schema,
  record,
  nextRecordId,
  users,
  currentUser,
  canEdit,
  canDelete,
  onClose,
  onSaved,
}: Props) {
  const isNew = !record
  const [draft, setDraft] = useState<Record<string, any>>(
    () => record ? { ...record } : { status: schema.workflow[0]?.value ?? '' },
  )
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const set = (key: string, v: any) => {
    setDraft((d) => {
      const next = { ...d, [key]: v }
      if (schema.id === 'risk' && ['severity', 'occurrence', 'detection'].includes(key)) {
        const rpn = Number(next.severity) * Number(next.occurrence) * Number(next.detection)
        if (!Number.isNaN(rpn)) next.rpn = rpn
      }
      return next
    })
  }

  async function save() {
    const missing = schema.fields
      .filter((f) => f.required && f.inForm !== false && !String(draft[f.key] ?? '').trim())
      .map((f) => f.label)
    if (missing.length) {
      setErrors(missing)
      return
    }
    setSaving(true)
    const today = new Date().toISOString().slice(0, 10)
    try {
      if (isNew) {
        const rec: QmsRecord = {
          ...draft,
          id: genId(schema.idPrefix.toLowerCase()),
          recordId: nextRecordId,
          createdAt: today,
          createdBy: currentUser,
          updatedAt: today,
          updatedBy: currentUser,
        }
        await db().create(schema.slug, rec)
        await logAudit(currentUser, 'create', schema.slug, rec.recordId, schema.title)
      } else {
        const patch = { ...draft, updatedAt: today, updatedBy: currentUser }
        await db().update(schema.slug, record!.id, patch)
        await logAudit(currentUser, 'update', schema.slug, record!.recordId, schema.title)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!record) return
    if (!confirm(`Delete ${record.recordId}? This is logged in the audit trail.`)) return
    await db().remove(schema.slug, record.id)
    await logAudit(currentUser, 'delete', schema.slug, record.recordId, schema.title)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-bg shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border bg-surface px-5 py-3">
          <div>
            <div className="text-xs text-muted">{schema.title} · {schema.clause}</div>
            <div className="text-lg font-bold">{isNew ? `New ${schema.title}` : draft.recordId || record?.recordId}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isNew && canDelete && (
              <button className="btn-ghost text-danger" onClick={remove} title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button className="btn-ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="border-b border-danger/30 bg-danger/10 px-5 py-2 text-sm text-danger">
            Required: {errors.join(', ')}
          </div>
        )}
        {!canEdit && (
          <div className="border-b border-border bg-surface-2 px-5 py-2 text-xs text-muted">
            Read-only — your role cannot edit records.
          </div>
        )}

        <div className="flex-1 overflow-auto p-5">
          <FormRenderer schema={schema} value={draft} onChange={set} users={users} readOnly={!canEdit} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          {canEdit && (
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create Record' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
