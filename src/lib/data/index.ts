import type { DataAdapter } from './adapter'
import { loadDataSourceConfig } from './adapter'
import { LocalAdapter } from './localAdapter'
import { GoogleSheetsAdapter } from './sheetsAdapter'

export * from './adapter'

let instance: DataAdapter | null = null
let instanceMode = ''

/** Returns the active adapter based on saved config (Local or Sheets). */
export function db(): DataAdapter {
  const cfg = loadDataSourceConfig()
  if (instance && instanceMode === cfg.mode) return instance
  instanceMode = cfg.mode
  if (cfg.mode === 'sheets' && cfg.appsScriptUrl) {
    instance = new GoogleSheetsAdapter(cfg)
  } else {
    instance = new LocalAdapter()
  }
  return instance
}

/** Force a re-read of config (after the user changes data source). */
export function resetDb() {
  instance = null
  instanceMode = ''
}
