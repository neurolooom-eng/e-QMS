import type { ModuleSchema } from '../types'
import { coreComplianceModules } from './coreCompliance'
import { productRiskModules } from './productRisk'
import { operationsModules } from './operations'

export const MODULES: ModuleSchema[] = [
  ...coreComplianceModules,
  ...productRiskModules,
  ...operationsModules,
]

export const MODULE_GROUPS = ['Core Compliance', 'Product & Risk', 'Operations'] as const

export function getModule(slug: string): ModuleSchema | undefined {
  return MODULES.find((m) => m.slug === slug)
}

export function modulesByGroup(group: string): ModuleSchema[] {
  return MODULES.filter((m) => m.group === group)
}

/** Status option lookup for a given module + status value. */
export function statusTone(schema: ModuleSchema, value: string) {
  return schema.workflow.find((w) => w.value === value)?.tone ?? 'neutral'
}
