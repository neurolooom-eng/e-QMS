// ============================================================
// e-QMS Core Types — the schema-driven model that powers every
// module's table, form, KPIs and dashboard from one definition.
// ============================================================

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'status'
  | 'user'
  | 'boolean'
  | 'currency'
  | 'email'
  | 'tags'
  | 'attachment'
  | 'signature'

export interface SelectOption {
  value: string
  /** Optional semantic colour for status chips */
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary'
}

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: SelectOption[]
  placeholder?: string
  help?: string
  /** Show in the list table by default */
  inTable?: boolean
  /** Show on form */
  inForm?: boolean
  /** Default column width (px) for the table */
  width?: number
  /** Group fields into form sections */
  section?: string
  /** Computed/readonly (e.g. auto IDs, audit stamps) */
  readonly?: boolean
  /** Default value generator */
  default?: () => unknown
  /** For text wrap override per column */
  nowrap?: boolean
}

export interface KpiDef {
  id: string
  label: string
  /** Reduce the records to a single number */
  compute: (rows: Record<string, any>[]) => number
  format?: 'int' | 'percent' | 'currency'
  /** Target value for RAG status */
  target?: number
  /** higher-is-better (default) or lower-is-better */
  goal?: 'higher' | 'lower'
  icon?: string
  /** field to build a trend sparkline from (counts over time by created date) */
  trendByDate?: boolean
}

export interface ChartDef {
  id: string
  label: string
  type: 'bar' | 'pie' | 'line'
  /** group rows by this field key */
  groupBy: string
}

export interface ModuleSchema {
  id: string
  /** Route segment, e.g. "complaints" */
  slug: string
  title: string
  /** Short menu label */
  menu: string
  /** ISO 13485 / MDR clause reference */
  clause: string
  description: string
  icon: string
  /** Sidebar group */
  group: 'Core Compliance' | 'Product & Risk' | 'Operations'
  /** prefix for record IDs e.g. "CMP" -> CMP-0001 */
  idPrefix: string
  fields: FieldDef[]
  /** Workflow states (the status field option set, in order) */
  workflow: SelectOption[]
  kpis: KpiDef[]
  charts?: ChartDef[]
  /** Seed/sample records */
  seed: Record<string, any>[]
}

// ---- Auth / RBAC ----
export type Role = 'Admin' | 'QA Manager' | 'Engineer' | 'Auditor' | 'Viewer'

export interface User {
  id: string
  username: string
  name: string
  email: string
  role: Role
  department: string
  /** bcrypt hash (local adapter) */
  passwordHash?: string
  active: boolean
  createdAt: string
}

export interface AuditEntry {
  id: string
  ts: string
  user: string
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'sign' | 'export'
  module: string
  recordId?: string
  detail?: string
}

export interface QmsRecord {
  id: string
  [key: string]: any
  createdAt?: string
  createdBy?: string
  updatedAt?: string
  updatedBy?: string
}
