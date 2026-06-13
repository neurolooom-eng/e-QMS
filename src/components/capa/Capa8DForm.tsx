import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { db } from '../../lib/data'
import { genId } from '../../lib/seed'
import { logAudit } from '../../lib/audit'
import { departments, ventilatorProducts } from '../../lib/modules/common'
import type { ModuleSchema, QmsRecord } from '../../lib/types'

// ============================================================
// Capa8DForm — an 8-Disciplines (8D) CAPA form, themed to the
// app's design tokens so it works across every color theme.
// Replaces the generic drawer for the CAPA module. The rich 8D
// structure is persisted as a JSON string on the record's
// `eightD` field, while the flat CAPA fields (title, status,
// source, severity, owner, dueDate, problem, rootCause,
// actionPlan, effectiveness, rpn) are kept in sync so the
// dashboard table, KPIs and charts keep working.
// ============================================================

interface Props {
  schema: ModuleSchema
  record: QmsRecord | null
  nextRecordId: string
  users: string[]
  currentUser: string
  canEdit: boolean
  canDelete: boolean
  onClose: () => void
  onSaved: () => void
}

type Row = Record<string, string>

interface EightD {
  // D1
  teamLeader: string
  qualityRep: string
  members: { name: string; dept: string }[]
  teamRationale: string
  // D2
  problemStatement: string
  what: string
  when: string
  where: string
  who: string
  how: string
  howMany: string
  product: string
  lotSerial: string
  // D3
  containmentDesc: string
  containment: Row[]
  containmentVerifiedBy: string
  regulatoryNotification: string
  // D4
  whys: string[]
  rootCause: string
  rootCauseCategory: string
  sev: string
  occ: string
  det: string
  // D5
  solutionRationale: string
  corrective: Row[]
  // D6
  implDate: string
  implBy: string
  implEvidence: string
  regFlags: Record<string, boolean>
  impactNotes: string
  // D7
  preventiveDesc: string
  preventive: Row[]
  rpnAfter: string
  // D8
  effectiveness: Row[]
  effDate: string
  effOutcome: string
  closureNotes: string
  signOwner: string
  signQuality: string
  signRegulatory: string
  conclusion: string
}

const REG_FLAGS = [
  'Document / Procedure change required',
  'Training update required',
  'Risk file / FMEA update required',
  'Design change / DHF update',
  'Regulatory submission update',
  'Customer / field action required',
]

function emptyRow(keys: string[]): Row {
  return Object.fromEntries(keys.map((k) => [k, '']))
}

function blank8D(): EightD {
  return {
    teamLeader: '', qualityRep: '', members: [{ name: '', dept: '' }, { name: '', dept: '' }, { name: '', dept: '' }], teamRationale: '',
    problemStatement: '', what: '', when: '', where: '', who: '', how: '', howMany: '', product: '', lotSerial: '',
    containmentDesc: '', containment: [emptyRow(['action', 'owner', 'due', 'status', 'evidence'])], containmentVerifiedBy: '', regulatoryNotification: '',
    whys: ['', '', '', '', ''], rootCause: '', rootCauseCategory: '', sev: '', occ: '', det: '',
    solutionRationale: '', corrective: [emptyRow(['action', 'owner', 'due', 'status', 'verification'])],
    implDate: '', implBy: '', implEvidence: '', regFlags: {}, impactNotes: '',
    preventiveDesc: '', preventive: [emptyRow(['action', 'owner', 'due', 'scope', 'status'])], rpnAfter: '',
    effectiveness: [emptyRow(['metric', 'baseline', 'target', 'actual', 'achieved'])], effDate: '', effOutcome: '', closureNotes: '',
    signOwner: '', signQuality: '', signRegulatory: '', conclusion: '',
  }
}

const DISCIPLINES = [
  { n: 'D1', label: 'Team', title: 'Team Formation', desc: 'Define the cross-functional team responsible for this CAPA', tag: 'Required' },
  { n: 'D2', label: 'Problem', title: 'Problem Description', desc: 'Define the problem using 5W2H — What, When, Where, Who, Why, How, How Many', tag: 'Required' },
  { n: 'D3', label: 'Contain', title: 'Containment Actions', desc: 'Immediate actions to contain the problem and protect the customer', tag: 'Required' },
  { n: 'D4', label: 'Root Cause', title: 'Root Cause Analysis', desc: 'Identify and verify the root cause using structured methods — 5-Why + RPN', tag: 'Required' },
  { n: 'D5', label: 'Solutions', title: 'Permanent Corrective Actions — Selected Solutions', desc: 'Choose and validate corrective actions that address the verified root cause', tag: '' },
  { n: 'D6', label: 'Correct', title: 'Implement & Validate Corrective Actions', desc: 'Execute, document evidence, and validate that actions are effective', tag: '' },
  { n: 'D7', label: 'Prevent', title: 'Preventive Actions', desc: 'Systemic actions to prevent recurrence across similar products or processes', tag: '' },
  { n: 'D8', label: 'Close', title: 'Closure, Effectiveness & Recognition', desc: 'Verify effectiveness, close the CAPA, recognise the team', tag: 'Closure' },
] as const

// Priority wording per the 8D form, mapped to the register's severity tones.
const PRIORITY_OPTIONS = [
  'Critical — Patient Safety Risk',
  'Major — Significant QMS Impact',
  'Minor — Low Risk',
]
const PRIORITY_TO_SEVERITY: Record<string, string> = {
  'Critical — Patient Safety Risk': 'Critical',
  'Major — Significant QMS Impact': 'Serious',
  'Minor — Low Risk': 'Minor',
}
function severityToPriority(sev?: string): string {
  return Object.keys(PRIORITY_TO_SEVERITY).find((k) => PRIORITY_TO_SEVERITY[k] === sev) || ''
}

export function Capa8DForm({ schema, record, nextRecordId, users, currentUser, canEdit, canDelete, onClose, onSaved }: Props) {
  const isNew = !record
  const today = new Date().toISOString().slice(0, 10)

  const initial = useMemo(() => {
    const base = blank8D()
    if (record?.eightD) {
      try { Object.assign(base, JSON.parse(record.eightD)) } catch { /* ignore */ }
    }
    // hydrate from flat fields if the 8D blob is empty
    if (record) {
      base.problemStatement ||= record.problem || ''
      base.rootCause ||= record.rootCause || ''
      base.teamLeader ||= record.owner || ''
      base.closureNotes ||= record.effectiveness || ''
    } else {
      base.teamLeader = currentUser
    }
    return base
  }, [record, currentUser])

  const [form, setForm] = useState<EightD>(initial)
  const [meta, setMeta] = useState({
    title: record?.title || '',
    status: record?.status || schema.workflow[0]?.value || 'Open',
    type: record?.type || 'Corrective',
    source: record?.source || '',
    severity: record?.severity || '',
    priority: record?.priority || severityToPriority(record?.severity),
    reference: record?.reference || record?.capaRef || '',
    department: record?.department || '',
    initiatedBy: record?.createdBy && record.createdBy !== 'system (seed)' ? record.createdBy : currentUser,
    initDate: record?.createdAt || today,
    dueDate: record?.dueDate || '',
  })
  const [open, setOpen] = useState<Set<number>>(new Set([1, 2]))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof EightD>(k: K, v: EightD[K]) => setForm((f) => ({ ...f, [k]: v }))
  const setMetaK = (k: keyof typeof meta, v: string) => setMeta((m) => ({ ...m, [k]: v }))

  const rpn = useMemo(() => {
    const s = Number(form.sev), o = Number(form.occ), d = Number(form.det)
    return s && o && d ? s * o * d : 0
  }, [form.sev, form.occ, form.det])
  const rpnTone = rpn >= 100 ? 'text-danger' : rpn >= 50 ? 'text-warning' : rpn ? 'text-success' : 'text-muted'

  // per-discipline completeness for the progress band
  const done = [
    !!form.teamLeader,
    !!meta.title && !!form.problemStatement,
    !!form.containmentDesc || form.containment.some((r) => r.action),
    !!form.rootCause && rpn > 0,
    form.corrective.some((r) => r.action),
    !!form.implDate || !!form.implEvidence,
    form.preventive.some((r) => r.action),
    !!form.effOutcome,
  ]

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function addRow(key: 'containment' | 'corrective' | 'preventive' | 'effectiveness', keys: string[]) {
    set(key, [...(form[key] as Row[]), emptyRow(keys)] as any)
  }
  function removeRow(key: 'containment' | 'corrective' | 'preventive' | 'effectiveness', idx: number) {
    set(key, (form[key] as Row[]).filter((_, i) => i !== idx) as any)
  }
  function setRow(key: 'containment' | 'corrective' | 'preventive' | 'effectiveness', idx: number, field: string, v: string) {
    set(key, (form[key] as Row[]).map((r, i) => (i === idx ? { ...r, [field]: v } : r)) as any)
  }

  async function save(close: boolean) {
    if (!meta.title.trim()) { setError('A CAPA title is required (Meta · Title).'); setOpen((p) => new Set(p).add(2)); return }
    setSaving(true)
    // D8 outcome can drive the lifecycle status
    let status = meta.status
    if (form.effOutcome.startsWith('Effective')) status = 'Closed'
    else if (form.effOutcome.startsWith('Not effective')) status = 'Open'

    const flat = {
      title: meta.title,
      status,
      type: meta.type,
      source: meta.source,
      severity: PRIORITY_TO_SEVERITY[meta.priority] || meta.severity,
      priority: meta.priority,
      reference: meta.reference,
      department: meta.department,
      owner: form.teamLeader,
      dueDate: meta.dueDate,
      problem: form.problemStatement,
      rootCause: form.rootCause,
      actionPlan: form.corrective.map((r) => r.action).filter(Boolean).join(' • '),
      effectiveness: form.closureNotes || form.effOutcome,
      rpn,
      eightD: JSON.stringify(form),
      updatedAt: today,
      updatedBy: currentUser,
    }
    try {
      if (isNew) {
        const rec: QmsRecord = { ...flat, id: genId('capa'), recordId: nextRecordId, createdAt: meta.initDate, createdBy: meta.initiatedBy }
        await db().create(schema.slug, rec)
        await logAudit(currentUser, 'create', schema.slug, rec.recordId, '8D CAPA')
      } else {
        await db().update(schema.slug, record!.id, flat)
        await logAudit(currentUser, 'update', schema.slug, record!.recordId, '8D CAPA')
      }
      onSaved()
      if (close) onClose()
      else setError('')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!record) return
    if (!confirm(`Delete ${record.recordId}? This is logged in the audit trail.`)) return
    await db().remove(schema.slug, record.id)
    await logAudit(currentUser, 'delete', schema.slug, record.recordId, '8D CAPA')
    onSaved(); onClose()
  }

  function clearForm() {
    if (!confirm('Clear all form data?')) return
    setForm(blank8D())
    setMeta((m) => ({ ...m, title: '', source: '', priority: '', severity: '', reference: '' }))
  }

  const capaNo = record?.recordId || nextRecordId

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-5xl flex-col bg-bg shadow-2xl">

        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-surface px-5 py-2.5">
          <div className="flex-1">
            <div className="text-sm font-bold uppercase tracking-wider text-primary">8D · CAPA Form</div>
            <div className="font-mono text-[11px] text-muted">EQMS-CAPA-8D-001 · Rev 00 · {capaNo}</div>
          </div>
          {canEdit && <button className="btn-outline" onClick={() => save(false)} disabled={saving}>Save Draft</button>}
          {canEdit && <button className="btn-primary" onClick={() => save(true)} disabled={saving}>{saving ? 'Saving…' : 'Submit CAPA'}</button>}
          {!isNew && canDelete && <button className="btn-ghost text-danger" onClick={remove} title="Delete"><Trash2 className="h-4 w-4" /></button>}
          <button className="btn-ghost" onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {/* Progress band */}
        <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-5 py-2">
          <div className="font-mono text-[10px] uppercase tracking-wide text-muted">8D Progress</div>
          <div className="flex flex-1 gap-1">
            {DISCIPLINES.map((d, i) => (
              <button key={d.n} onClick={() => setOpen(new Set([i + 1]))} className="flex flex-1 flex-col items-center gap-1" title={`${d.n} ${d.title}`}>
                <div className={clsx('h-[3px] w-full rounded', done[i] ? 'bg-primary' : open.has(i + 1) ? 'bg-primary/50' : 'bg-border')} />
                <div className={clsx('truncate font-mono text-[9px]', done[i] || open.has(i + 1) ? 'text-primary' : 'text-muted')}>
                  {d.n}<span className="hidden md:inline"> {d.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="border-b border-danger/30 bg-danger/10 px-5 py-2 text-sm text-danger">{error}</div>}
        {!canEdit && <div className="border-b border-border bg-surface-2 px-5 py-2 text-xs text-muted">Read-only — your role cannot edit CAPAs.</div>}

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {/* Doc header */}
          <div className="grid grid-cols-1 overflow-hidden rounded-t-xl border border-border bg-surface md:grid-cols-3">
            <div className="border-b border-border p-4 md:border-b-0 md:border-r">
              <DhLabel>Organisation</DhLabel><DhVal>NeoBreathe Medical</DhVal>
              <DhLabel className="mt-2">Department</DhLabel><DhVal>{meta.department || 'Quality Assurance'}</DhVal>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold tracking-wide"><span className="text-primary">CAPA</span> 8D Form</div>
              <div className="text-[11px] text-muted">Eight Disciplines · Corrective &amp; Preventive Action</div>
            </div>
            <div className="border-t border-border p-4 text-right md:border-l md:border-t-0">
              <DhLabel>Form No.</DhLabel><DhVal>EQMS-CAPA-8D-001</DhVal>
              <DhLabel className="mt-2">Effective Date</DhLabel><DhVal>{meta.initDate || today}</DhVal>
            </div>
          </div>

          {/* Meta strip 1 */}
          <MetaStrip>
            <MetaCell label="CAPA No."><input className="meta-in" value={capaNo} readOnly /></MetaCell>
            <MetaCell label="Initiated By *"><input className="meta-in" value={meta.initiatedBy} onChange={(e) => setMetaK('initiatedBy', e.target.value)} disabled={!canEdit} /></MetaCell>
            <MetaCell label="Date Initiated"><input type="date" className="meta-in" value={meta.initDate} onChange={(e) => setMetaK('initDate', e.target.value)} disabled={!canEdit} /></MetaCell>
            <MetaCell label="Target Closure"><input type="date" className="meta-in" value={meta.dueDate} onChange={(e) => setMetaK('dueDate', e.target.value)} disabled={!canEdit} /></MetaCell>
          </MetaStrip>
          {/* Meta strip 2 */}
          <MetaStrip>
            <MetaCell label="Title *"><input className="meta-in" placeholder="Short CAPA title" value={meta.title} onChange={(e) => setMetaK('title', e.target.value)} disabled={!canEdit} /></MetaCell>
            <MetaCell label="Source">
              <select className="meta-in" value={meta.source} onChange={(e) => setMetaK('source', e.target.value)} disabled={!canEdit}>
                <option value="">— Select —</option>
                {schema.fields.find((f) => f.key === 'source')?.options?.map((o) => <option key={o.value}>{o.value}</option>)}
              </select>
            </MetaCell>
            <MetaCell label="Reference No."><input className="meta-in" placeholder="NCR / Complaint / Audit" value={meta.reference} onChange={(e) => setMetaK('reference', e.target.value)} disabled={!canEdit} /></MetaCell>
            <MetaCell label="Priority">
              <select className="meta-in" value={meta.priority} onChange={(e) => setMetaK('priority', e.target.value)} disabled={!canEdit}>
                <option value="">— Select —</option>
                {PRIORITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </MetaCell>
          </MetaStrip>
          {/* Meta strip 3 */}
          <MetaStrip last>
            <MetaCell label="Department">
              <select className="meta-in" value={meta.department} onChange={(e) => setMetaK('department', e.target.value)} disabled={!canEdit}>
                <option value="">— Select —</option>
                {departments.map((d) => <option key={d}>{d}</option>)}
              </select>
            </MetaCell>
            <MetaCell label="CAPA Type">
              <select className="meta-in" value={meta.type} onChange={(e) => setMetaK('type', e.target.value)} disabled={!canEdit}>
                <option>Corrective</option><option>Preventive</option>
              </select>
            </MetaCell>
            <MetaCell label="Status">
              <select className="meta-in" value={meta.status} onChange={(e) => setMetaK('status', e.target.value)} disabled={!canEdit}>
                {schema.workflow.map((o) => <option key={o.value}>{o.value}</option>)}
              </select>
            </MetaCell>
            <MetaCell label="CAPA Owner">
              <select className="meta-in" value={form.teamLeader} onChange={(e) => set('teamLeader', e.target.value)} disabled={!canEdit}>
                <option value="">— Unassigned —</option>
                {users.map((u) => <option key={u}>{u}</option>)}
                {form.teamLeader && !users.includes(form.teamLeader) && <option>{form.teamLeader}</option>}
              </select>
            </MetaCell>
          </MetaStrip>

          {/* Disciplines */}
          <div className="rounded-b-xl border border-t-0 border-border">
            {DISCIPLINES.map((d, i) => {
              const idx = i + 1
              const isOpen = open.has(idx)
              return (
                <div key={d.n} className={clsx('border-t border-border', i === 0 && 'border-t-0')}>
                  <button onClick={() => toggle(idx)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
                    <span className="w-7 text-center text-xl font-bold text-primary">{d.n}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-text">{d.title}</span>
                      <span className="block text-[11px] text-muted">{d.desc}</span>
                    </span>
                    {done[i] && <span className="chip bg-success/15 text-success">✓ Complete</span>}
                    {d.tag && <span className={clsx('chip', d.tag === 'Closure' ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary')}>{d.tag}</span>}
                    <ChevronDown className={clsx('h-4 w-4 text-muted transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-surface-2/40 p-4">
                      {idx === 1 && <D1 form={form} set={set} disabled={!canEdit} users={users} />}
                      {idx === 2 && <D2 form={form} set={set} disabled={!canEdit} />}
                      {idx === 3 && <D3 form={form} set={set} disabled={!canEdit} setRow={setRow} addRow={addRow} removeRow={removeRow} />}
                      {idx === 4 && <D4 form={form} set={set} disabled={!canEdit} rpn={rpn} rpnTone={rpnTone} />}
                      {idx === 5 && <D5 form={form} set={set} disabled={!canEdit} setRow={setRow} addRow={addRow} removeRow={removeRow} />}
                      {idx === 6 && <D6 form={form} set={set} disabled={!canEdit} />}
                      {idx === 7 && <D7 form={form} set={set} disabled={!canEdit} setRow={setRow} addRow={addRow} removeRow={removeRow} />}
                      {idx === 8 && <D8 form={form} set={set} disabled={!canEdit} setRow={setRow} addRow={addRow} removeRow={removeRow} />}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="mt-4 rounded-lg bg-surface-2 p-3 text-[11px] text-muted">
            <strong className="text-text">ISO 13485 §8.5.2 · 21 CFR 820.100 · EU MDR 2017/745 Art. 10</strong><br />
            EQMS-CAPA-8D-001 · Rev 00 · Classification: Controlled · NeoBreathe Quality Assurance
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-border bg-surface px-5 py-3">
          <div className="flex-1 font-mono text-[10px] text-muted">8D Disciplines complete: <strong className="text-text">{done.filter(Boolean).length}/8</strong></div>
          <button className="btn-outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print / PDF</button>
          {canEdit && <button className="btn-outline" onClick={clearForm}>Clear Form</button>}
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          {canEdit && <button className="btn-primary" onClick={() => save(true)} disabled={saving}>{saving ? 'Saving…' : 'Submit CAPA →'}</button>}
        </div>
      </div>

      {/* local styles for compact meta inputs */}
      <style>{`
        .meta-in { width:100%; background:transparent; border:none; outline:none; font-size:12px; color:rgb(var(--c-text)); font-family:inherit; }
        .meta-in:disabled { opacity:.7; }
        .meta-in option { background:rgb(var(--c-surface)); }
      `}</style>
    </div>
  )
}

/* ---------- small presentational helpers ---------- */
function DhLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('font-mono text-[9px] uppercase tracking-wide text-muted', className)}>{children}</div>
}
function DhVal({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-text">{children}</div>
}
function MetaStrip({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <div className={clsx('grid grid-cols-2 border border-t-0 border-border bg-surface md:grid-cols-4', last && '')}>{children}</div>
}
function MetaCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-r border-border p-2.5 last:border-r-0">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-wide text-muted">{label}</div>
      {children}
    </div>
  )
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={clsx('flex flex-col gap-1', full && 'sm:col-span-2')}>
      <label className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</label>
      {children}
    </div>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{children}</div>
}

type DProps = { form: EightD; set: <K extends keyof EightD>(k: K, v: EightD[K]) => void; disabled: boolean }
type DTableProps = DProps & {
  setRow: (k: any, i: number, f: string, v: string) => void
  addRow: (k: any, keys: string[]) => void
  removeRow: (k: any, i: number) => void
}

/* ---------- D1 ---------- */
function D1({ form, set, disabled, users }: DProps & { users: string[] }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Team Leader / CAPA Owner *">
          <select className="select" value={form.teamLeader} onChange={(e) => set('teamLeader', e.target.value)} disabled={disabled}>
            <option value="">— Select —</option>
            {users.map((u) => <option key={u}>{u}</option>)}
            {form.teamLeader && !users.includes(form.teamLeader) && <option>{form.teamLeader}</option>}
          </select>
        </Field>
        <Field label="Quality Representative"><input className="input" value={form.qualityRep} onChange={(e) => set('qualityRep', e.target.value)} disabled={disabled} placeholder="Name & title" /></Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {form.members.map((m, i) => (
          <Field key={i} label={`Member ${i + 1} — Department`}>
            <input className="input" value={m.name} onChange={(e) => set('members', form.members.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} disabled={disabled} placeholder="Name / Dept" />
          </Field>
        ))}
      </div>
      <Field label="Team Justification / Expertise Rationale">
        <textarea className="textarea min-h-[64px]" value={form.teamRationale} onChange={(e) => set('teamRationale', e.target.value)} disabled={disabled} placeholder="Why these members? What expertise do they bring?" />
      </Field>
    </div>
  )
}

/* ---------- D2 ---------- */
function D2({ form, set, disabled }: DProps) {
  const w = (k: keyof EightD, label: string, ph: string) => (
    <Field label={label}><textarea className="textarea min-h-[60px]" value={form[k] as string} onChange={(e) => set(k, e.target.value as any)} disabled={disabled} placeholder={ph} /></Field>
  )
  return (
    <div className="space-y-3">
      <Field label="Problem Statement *">
        <textarea className="textarea min-h-[56px]" value={form.problemStatement} onChange={(e) => set('problemStatement', e.target.value)} disabled={disabled} placeholder="Concise one-paragraph problem statement…" />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {w('what', 'What — What is the defect/failure?', 'Describe the nonconformance or failure…')}
        {w('when', 'When — When was it detected?', 'Date, time, process stage…')}
        {w('where', 'Where — Where did it occur?', 'Process step, machine, location…')}
        {w('who', 'Who — Who detected / is affected?', 'Operator, customer, end user…')}
        {w('how', 'How — How was it detected?', 'Inspection, complaint, audit…')}
        {w('howMany', 'How Many — Quantity / Scope', 'Units affected, lots, frequency…')}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Affected Product / Device">
          <select className="select" value={form.product} onChange={(e) => set('product', e.target.value)} disabled={disabled}>
            <option value="">— Select —</option>
            {ventilatorProducts.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Affected Lot / Batch / Serial"><input className="input" value={form.lotSerial} onChange={(e) => set('lotSerial', e.target.value)} disabled={disabled} placeholder="Lot / serial range" /></Field>
      </div>
    </div>
  )
}

/* ---------- generic editable action table ---------- */
function ActionTable({
  rows, cols, onChange, onAdd, onRemove, disabled,
}: {
  rows: Row[]
  cols: { key: string; label: string; type?: 'text' | 'date' | 'status'; options?: string[]; w?: string }[]
  onChange: (i: number, f: string, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
  disabled: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {cols.map((c) => <th key={c.key} className="border border-border bg-surface-2 px-2 py-1.5 text-left font-mono text-[9px] font-normal uppercase tracking-wide text-muted" style={{ width: c.w }}>{c.label}</th>)}
            <th className="w-8 border border-border bg-surface-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map((c) => (
                <td key={c.key} className="border border-border p-1 align-top">
                  {c.type === 'status' ? (
                    <select className="w-full bg-transparent text-xs text-text outline-none" value={r[c.key]} onChange={(e) => onChange(i, c.key, e.target.value)} disabled={disabled}>
                      <option value="">—</option>
                      {c.options!.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : c.type === 'date' ? (
                    <input type="date" className="w-full bg-transparent text-xs text-text outline-none" value={r[c.key]} onChange={(e) => onChange(i, c.key, e.target.value)} disabled={disabled} />
                  ) : (
                    <textarea rows={1} className="w-full resize-none bg-transparent text-xs text-text outline-none" value={r[c.key]} onChange={(e) => onChange(i, c.key, e.target.value)} disabled={disabled} placeholder="…" />
                  )}
                </td>
              ))}
              <td className="border border-border text-center align-middle">
                {!disabled && rows.length > 1 && <button onClick={() => onRemove(i)} className="text-muted hover:text-danger"><X className="mx-auto h-3.5 w-3.5" /></button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!disabled && (
        <button onClick={onAdd} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-1.5 text-xs text-muted hover:border-primary/50 hover:text-primary">
          <Plus className="h-3.5 w-3.5" /> Add row
        </button>
      )}
    </div>
  )
}

/* ---------- D3 ---------- */
function D3({ form, set, disabled, setRow, addRow, removeRow }: DTableProps) {
  return (
    <div className="space-y-3">
      <Field label="Containment Description *">
        <textarea className="textarea" value={form.containmentDesc} onChange={(e) => set('containmentDesc', e.target.value)} disabled={disabled} placeholder="Describe all immediate containment actions taken…" />
      </Field>
      <ActionTable
        rows={form.containment} disabled={disabled}
        cols={[
          { key: 'action', label: 'Containment Action', w: '32%' },
          { key: 'owner', label: 'Owner', w: '16%' },
          { key: 'due', label: 'Due', type: 'date', w: '16%' },
          { key: 'status', label: 'Status', type: 'status', options: ['Open', 'Complete', 'Verified'], w: '14%' },
          { key: 'evidence', label: 'Evidence / Ref', w: '22%' },
        ]}
        onChange={(i, f, v) => setRow('containment', i, f, v)} onAdd={() => addRow('containment', ['action', 'owner', 'due', 'status', 'evidence'])} onRemove={(i) => removeRow('containment', i)}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Containment Verified By"><input className="input" value={form.containmentVerifiedBy} onChange={(e) => set('containmentVerifiedBy', e.target.value)} disabled={disabled} placeholder="Name & date" /></Field>
        <Field label="Regulatory Notification Required?">
          <select className="select" value={form.regulatoryNotification} onChange={(e) => set('regulatoryNotification', e.target.value)} disabled={disabled}>
            <option value="">— Select —</option>
            <option>Yes — MDR / Vigilance report initiated</option>
            <option>No — below threshold</option>
            <option>Under review</option>
          </select>
        </Field>
      </div>
    </div>
  )
}

/* ---------- D4 ---------- */
function D4({ form, set, disabled, rpn, rpnTone }: DProps & { rpn: number; rpnTone: string }) {
  const opts = Array.from({ length: 10 }, (_, i) => String(i + 1))
  return (
    <div className="space-y-3">
      <SectionTitle>5-Why Analysis</SectionTitle>
      <div className="space-y-2">
        {form.whys.map((w, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border border-primary bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
            <input className="input" value={w} onChange={(e) => set('whys', form.whys.map((x, j) => (j === i ? e.target.value : x)))} disabled={disabled} placeholder={i === 0 ? 'Why did the problem occur?' : i === 4 ? 'Root Cause identified — Why? (answer to Why 4)' : `Why? (answer to Why ${i})`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Root Cause Statement *" full>
          <textarea className="textarea" value={form.rootCause} onChange={(e) => set('rootCause', e.target.value)} disabled={disabled} placeholder="Concise root cause supported by objective evidence…" />
        </Field>
      </div>
      <Field label="Root Cause Category (Ishikawa)">
        <select className="select" value={form.rootCauseCategory} onChange={(e) => set('rootCauseCategory', e.target.value)} disabled={disabled}>
          <option value="">— Select —</option>
          {['Man / People', 'Machine / Equipment', 'Method / Process', 'Material', 'Measurement / Inspection', 'Environment', 'Management / System'].map((o) => <option key={o}>{o}</option>)}
        </select>
      </Field>

      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="mb-3 text-[13px] font-semibold text-text">Risk Priority Number (RPN) — before corrective action</div>
        <div className="grid grid-cols-3 items-end gap-3 sm:grid-cols-4">
          {([['sev', 'Severity (S)'], ['occ', 'Occurrence (O)'], ['det', 'Detection (D)']] as const).map(([k, label]) => (
            <Field key={k} label={`${label} 1–10`}>
              <select className="select" value={form[k] as string} onChange={(e) => set(k, e.target.value as any)} disabled={disabled}>
                <option value="">—</option>
                {opts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </Field>
          ))}
          <div className="grid place-items-center rounded-lg border border-border bg-surface-2 px-4 py-2">
            <div className="font-mono text-[9px] uppercase tracking-wide text-muted">RPN</div>
            <div className={clsx('text-2xl font-bold', rpnTone)}>{rpn || '—'}</div>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-muted">≥100 high · 50–99 medium · &lt;50 low</div>
      </div>
    </div>
  )
}

/* ---------- D5 ---------- */
function D5({ form, set, disabled, setRow, addRow, removeRow }: DTableProps) {
  return (
    <div className="space-y-3">
      <Field label="Selected Solution Rationale">
        <textarea className="textarea" value={form.solutionRationale} onChange={(e) => set('solutionRationale', e.target.value)} disabled={disabled} placeholder="Why was this corrective action chosen over alternatives?" />
      </Field>
      <ActionTable
        rows={form.corrective} disabled={disabled}
        cols={[
          { key: 'action', label: 'Corrective Action', w: '35%' },
          { key: 'owner', label: 'Owner', w: '15%' },
          { key: 'due', label: 'Due', type: 'date', w: '15%' },
          { key: 'status', label: 'Status', type: 'status', options: ['Planned', 'In Progress', 'Complete', 'Verified'], w: '15%' },
          { key: 'verification', label: 'Verification Method', w: '20%' },
        ]}
        onChange={(i, f, v) => setRow('corrective', i, f, v)} onAdd={() => addRow('corrective', ['action', 'owner', 'due', 'status', 'verification'])} onRemove={(i) => removeRow('corrective', i)}
      />
    </div>
  )
}

/* ---------- D6 ---------- */
function D6({ form, set, disabled }: DProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Implementation Date"><input type="date" className="input" value={form.implDate} onChange={(e) => set('implDate', e.target.value)} disabled={disabled} /></Field>
        <Field label="Implemented By"><input className="input" value={form.implBy} onChange={(e) => set('implBy', e.target.value)} disabled={disabled} placeholder="Name(s)" /></Field>
      </div>
      <Field label="Implementation / Objective Evidence References">
        <textarea className="textarea" value={form.implEvidence} onChange={(e) => set('implEvidence', e.target.value)} disabled={disabled} placeholder="Records, test results, updated documents, training records…" />
      </Field>
      <SectionTitle>Regulatory &amp; Quality Impact Assessment</SectionTitle>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REG_FLAGS.map((f) => {
          const checked = !!form.regFlags[f]
          return (
            <button key={f} type="button" disabled={disabled} onClick={() => set('regFlags', { ...form.regFlags, [f]: !checked })}
              className={clsx('flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs', checked ? 'border-primary/50 bg-primary/10 text-text' : 'border-border bg-surface text-muted hover:border-border')}>
              <span className={clsx('grid h-4 w-4 flex-shrink-0 place-items-center rounded-[4px] border', checked ? 'border-primary bg-primary text-primary-fg' : 'border-border')}>{checked && '✓'}</span>
              {f}
            </button>
          )
        })}
      </div>
      <Field label="Impact Notes"><textarea className="textarea" value={form.impactNotes} onChange={(e) => set('impactNotes', e.target.value)} disabled={disabled} placeholder="Detail regulatory, design or documentation impacts…" /></Field>
    </div>
  )
}

/* ---------- D7 ---------- */
function D7({ form, set, disabled, setRow, addRow, removeRow }: DTableProps) {
  return (
    <div className="space-y-3">
      <Field label="Systemic Preventive Action Description">
        <textarea className="textarea" value={form.preventiveDesc} onChange={(e) => set('preventiveDesc', e.target.value)} disabled={disabled} placeholder="What systemic changes prevent recurrence elsewhere?" />
      </Field>
      <ActionTable
        rows={form.preventive} disabled={disabled}
        cols={[
          { key: 'action', label: 'Preventive Action', w: '35%' },
          { key: 'owner', label: 'Owner', w: '15%' },
          { key: 'due', label: 'Due', type: 'date', w: '15%' },
          { key: 'scope', label: 'Scope (products/processes)', w: '20%' },
          { key: 'status', label: 'Status', type: 'status', options: ['Planned', 'In Progress', 'Complete'], w: '15%' },
        ]}
        onChange={(i, f, v) => setRow('preventive', i, f, v)} onAdd={() => addRow('preventive', ['action', 'owner', 'due', 'scope', 'status'])} onRemove={(i) => removeRow('preventive', i)}
      />
      <Field label="RPN After Actions (target)"><input className="input" value={form.rpnAfter} onChange={(e) => set('rpnAfter', e.target.value)} disabled={disabled} placeholder="Revised S × O × D =" /></Field>
    </div>
  )
}

/* ---------- D8 ---------- */
function D8({ form, set, disabled, setRow, addRow, removeRow }: DTableProps) {
  return (
    <div className="space-y-3">
      <SectionTitle>Effectiveness Verification</SectionTitle>
      <ActionTable
        rows={form.effectiveness} disabled={disabled}
        cols={[
          { key: 'metric', label: 'Metric / KPI', w: '30%' },
          { key: 'baseline', label: 'Baseline', w: '16%' },
          { key: 'target', label: 'Target', w: '16%' },
          { key: 'actual', label: 'Actual (post-action)', w: '20%' },
          { key: 'achieved', label: 'Achieved?', type: 'status', options: ['Yes', 'No', 'Partial'], w: '14%' },
        ]}
        onChange={(i, f, v) => setRow('effectiveness', i, f, v)} onAdd={() => addRow('effectiveness', ['metric', 'baseline', 'target', 'actual', 'achieved'])} onRemove={(i) => removeRow('effectiveness', i)}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Effectiveness Check Date"><input type="date" className="input" value={form.effDate} onChange={(e) => set('effDate', e.target.value)} disabled={disabled} /></Field>
        <Field label="Effectiveness Outcome">
          <select className="select" value={form.effOutcome} onChange={(e) => set('effOutcome', e.target.value)} disabled={disabled}>
            <option value="">— Select —</option>
            <option>Effective — CAPA closed</option>
            <option>Partially effective — extended</option>
            <option>Not effective — re-opened</option>
          </select>
        </Field>
      </div>
      <p className="text-[11px] text-muted">Selecting an outcome auto-sets the CAPA status on save (Effective → Closed, Not effective → Open).</p>
      <Field label="Closure Notes"><textarea className="textarea" value={form.closureNotes} onChange={(e) => set('closureNotes', e.target.value)} disabled={disabled} placeholder="Summary of what was achieved, lessons learned…" /></Field>

      <SectionTitle>Approval Signatures</SectionTitle>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([['signOwner', 'CAPA Owner / Team Leader'], ['signQuality', 'Quality Manager'], ['signRegulatory', 'Regulatory Affairs']] as const).map(([k, label]) => (
          <div key={k} className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-wide text-muted">{label}</div>
            <div className="flex items-center gap-1 border-b border-border pb-1 text-primary">✎ <input className="w-full bg-transparent text-sm text-text outline-none" value={form[k] as string} onChange={(e) => set(k, e.target.value as any)} disabled={disabled} placeholder="Type name to e-sign" /></div>
          </div>
        ))}
      </div>
      <Field label="8D Conclusion Statement"><textarea className="textarea" value={form.conclusion} onChange={(e) => set('conclusion', e.target.value)} disabled={disabled} placeholder="Final narrative — what was found, what was done, how effectiveness was confirmed…" /></Field>
    </div>
  )
}
