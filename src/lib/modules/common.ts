import type { FieldDef, SelectOption } from '../types'

// Shared option sets & helpers for ventilator-domain module schemas.

export const opt = (value: string, tone?: SelectOption['tone']): SelectOption => ({ value, tone })

export const severityOptions: SelectOption[] = [
  opt('Negligible', 'neutral'),
  opt('Minor', 'info'),
  opt('Serious', 'warning'),
  opt('Critical', 'danger'),
]

export const priorityOptions: SelectOption[] = [
  opt('Low', 'neutral'),
  opt('Medium', 'info'),
  opt('High', 'warning'),
  opt('Urgent', 'danger'),
]

export const yesNo: SelectOption[] = [opt('Yes', 'success'), opt('No', 'neutral')]

export const departments = [
  'Quality Assurance',
  'Regulatory Affairs',
  'R&D / Design',
  'Manufacturing',
  'Service & Field',
  'Supply Chain',
  'Clinical Affairs',
]

export const ventilatorProducts = [
  'NeoBreathe V300 (ICU Ventilator)',
  'NeoBreathe V500 (ICU Ventilator)',
  'NeoBreathe T100 (Transport Ventilator)',
  'AeroFlow Humidifier Module',
  'OxyBlend O2 Mixer',
]

/** Fields every record carries — audit stamps + the human-readable ID. */
export const baseFields: FieldDef[] = [
  {
    key: 'recordId',
    label: 'ID',
    type: 'text',
    inTable: true,
    inForm: false,
    readonly: true,
    width: 120,
    nowrap: true,
  },
]

/** Audit/meta fields appended to every form's "Record" section. */
export const metaFields: FieldDef[] = [
  { key: 'createdBy', label: 'Created By', type: 'text', readonly: true, inForm: true, inTable: false, section: 'Audit & Trace' },
  { key: 'createdAt', label: 'Created At', type: 'date', readonly: true, inForm: true, inTable: false, section: 'Audit & Trace' },
  { key: 'updatedBy', label: 'Last Updated By', type: 'text', readonly: true, inForm: true, inTable: false, section: 'Audit & Trace' },
  { key: 'updatedAt', label: 'Last Updated At', type: 'date', readonly: true, inForm: true, inTable: false, section: 'Audit & Trace' },
]

export const owner = (label = 'Owner'): FieldDef => ({
  key: 'owner',
  label,
  type: 'user',
  inTable: true,
  inForm: true,
  width: 150,
  section: 'Assignment',
})

export const dueDate: FieldDef = {
  key: 'dueDate',
  label: 'Due Date',
  type: 'date',
  inTable: true,
  inForm: true,
  width: 120,
  section: 'Assignment',
}

// KPI helpers
export const countWhere = (pred: (r: any) => boolean) => (rows: any[]) => rows.filter(pred).length
export const isOpen = (r: any) =>
  !['Closed', 'Completed', 'Approved', 'Effective', 'Released', 'Verified', 'Done', 'Archived'].includes(
    r.status,
  )
export const isOverdue = (r: any) =>
  r.dueDate && isOpen(r) && new Date(r.dueDate) < new Date()

export function pct(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}
