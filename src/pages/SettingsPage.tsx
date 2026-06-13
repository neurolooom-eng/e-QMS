import { useState } from 'react'
import { Check, Database, Palette, RefreshCw, Sheet } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { loadDataSourceConfig, saveDataSourceConfig, resetDb, db } from '../lib/data'
import { useAuth } from '../lib/auth'

export function SettingsPage() {
  const { theme, setTheme, themes } = useTheme()
  const { can } = useAuth()
  const [cfg, setCfg] = useState(loadDataSourceConfig())
  const [savedMsg, setSavedMsg] = useState('')
  const [testMsg, setTestMsg] = useState('')

  function persist(next = cfg) {
    saveDataSourceConfig(next)
    resetDb()
    setSavedMsg('Saved. Reload the page to apply the data source.')
    setTimeout(() => setSavedMsg(''), 4000)
  }

  async function testConnection() {
    setTestMsg('Testing…')
    try {
      saveDataSourceConfig(cfg)
      resetDb()
      await db().listUsers()
      setTestMsg('✓ Connected successfully.')
    } catch (e: any) {
      setTestMsg('✗ ' + (e?.message || 'Connection failed'))
    }
  }

  function resetLocalData() {
    if (!confirm('Reset all local demo data and re-seed? This clears records, users and audit trail in this browser.')) return
    Object.keys(localStorage)
      .filter((k) => k.startsWith('eqms.local.'))
      .forEach((k) => localStorage.removeItem(k))
    location.reload()
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Theme */}
      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Palette className="h-4 w-4 text-primary" /> Color Theme</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`relative flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${theme === t.id ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:bg-surface-2'}`}
            >
              <span className="h-8 w-8 rounded-full ring-1 ring-border" style={{ background: t.swatch }} />
              <span>
                <span className="block font-medium">{t.name}</span>
                <span className="text-[10px] uppercase text-muted">{t.mode}</span>
              </span>
              {theme === t.id && <Check className="absolute right-2 top-2 h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      {/* Data source */}
      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2 font-semibold"><Database className="h-4 w-4 text-primary" /> Data Source</div>
        {!can('admin') && <p className="mb-3 text-xs text-muted">Only Admins can change the data source.</p>}
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={!can('admin')}
            onClick={() => { const n = { ...cfg, mode: 'local' as const }; setCfg(n); persist(n) }}
            className={`flex items-center gap-2 rounded-lg border p-3 text-left ${cfg.mode === 'local' ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
          >
            <Database className="h-5 w-5 text-primary" />
            <span><span className="block font-medium">Local (browser)</span><span className="text-xs text-muted">Seeded demo data, no setup</span></span>
          </button>
          <button
            disabled={!can('admin')}
            onClick={() => { const n = { ...cfg, mode: 'sheets' as const }; setCfg(n) }}
            className={`flex items-center gap-2 rounded-lg border p-3 text-left ${cfg.mode === 'sheets' ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
          >
            <Sheet className="h-5 w-5 text-success" />
            <span><span className="block font-medium">Google Sheets</span><span className="text-xs text-muted">Apps Script Web App backend</span></span>
          </button>
        </div>

        {cfg.mode === 'sheets' && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="label">Apps Script Web App URL</label>
              <input
                className="input"
                placeholder="https://script.google.com/macros/s/…/exec"
                value={cfg.appsScriptUrl || ''}
                onChange={(e) => setCfg({ ...cfg, appsScriptUrl: e.target.value })}
                disabled={!can('admin')}
              />
            </div>
            <div>
              <label className="label">API Token (optional, must match the script)</label>
              <input className="input" value={cfg.apiToken || ''} onChange={(e) => setCfg({ ...cfg, apiToken: e.target.value })} disabled={!can('admin')} />
            </div>
            <div className="flex items-center gap-2">
              <button className="btn-outline" onClick={testConnection} disabled={!can('admin')}>Test connection</button>
              <button className="btn-primary" onClick={() => persist()} disabled={!can('admin')}>Save data source</button>
              {testMsg && <span className="text-sm text-muted">{testMsg}</span>}
            </div>
            <p className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
              Deploy <code>apps-script/Code.gs</code> (in this repo) as a Web App bound to your workbook, then paste its
              <code> /exec</code> URL above. Each module slug becomes a sheet tab. See <code>docs/GOOGLE_SHEETS_SETUP.md</code>.
            </p>
          </div>
        )}
        {savedMsg && <p className="mt-3 text-sm text-success">{savedMsg}</p>}
      </section>

      {/* Templates */}
      <section className="card p-5">
        <div className="mb-2 font-semibold">Document / Form Templates</div>
        <p className="text-sm text-muted">
          Every module has a <strong>Template</strong> field — a placeholder to link your controlled SOP/form templates.
          Wire these to your Google Drive template library later; the slots are already in each record form.
        </p>
      </section>

      {/* Danger zone */}
      <section className="card border-danger/40 p-5">
        <div className="mb-2 font-semibold text-danger">Reset Local Demo Data</div>
        <p className="mb-3 text-sm text-muted">Clears and re-seeds all records, users and audit trail stored in this browser.</p>
        <button className="btn-danger" onClick={resetLocalData}><RefreshCw className="mr-1 h-4 w-4" /> Reset &amp; Re-seed</button>
      </section>
    </div>
  )
}
