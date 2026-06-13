# Architecture

## Principle: one schema → every surface

The system is **schema-driven**. Each QMS module is described once as a
`ModuleSchema` (`src/lib/types.ts`), and the shared system-design components render
all of its surfaces. Add a field to a schema and it appears in the table, the form,
search, sort and CSV export automatically.

```
                ┌──────────────────────────────┐
                │        ModuleSchema           │
                │  fields · workflow · kpis ·   │
                │  charts · seed · clause       │
                └──────────────┬───────────────┘
                               │
     ┌─────────────┬───────────┼────────────┬──────────────┐
     ▼             ▼           ▼            ▼              ▼
 DataTable    FormRenderer   KpiCard    ChartCard    columns.tsx
 (advanced     (form          (KPI       (dashboard   (table cfg
  table)        system)        system)    charts)      builder)
```

### The system-design foundations (built once, reused by all 16 modules)

| Foundation | File | Notes |
|------------|------|-------|
| **Advanced Table** | `components/table/DataTable.tsx` | text-wrap (default/per-column/global), drag-reorder, resize, table-width, sticky header, rows-before-scroll, show/hide, sort, search, CSV, density, saved views (per `tableKey`) |
| **Form System** | `components/form/FormRenderer.tsx` | sectioned, typed inputs (status/select/user/date/number/attachment/signature), required validation |
| **KPI Cards** | `components/charts/KpiCard.tsx` | value + target + RAG status bar |
| **Dashboards** | `components/charts/ChartCard.tsx` + pages | bar/pie/line via Recharts, grouped by any field |
| **Themes** | `lib/theme.tsx` + `styles/themes.css` | 6 medical themes via CSS variables on `data-theme` |
| **Auth + RBAC** | `lib/auth.tsx` | bcrypt login, roles → `can('edit'|'delete'|'admin')` |
| **Audit Trail** | `lib/audit.ts` | append-only log of all mutations & sign-ins |

## Data layer (pluggable)

```
UI ──► db(): DataAdapter
                 ├── LocalAdapter         (localStorage — default, zero setup)
                 └── GoogleSheetsAdapter  (Apps Script Web App — one tab/collection)
```

`DataAdapter` (`src/lib/data/adapter.ts`) is the single interface. The active
adapter is chosen by **Settings ▸ Data Source** and cached by `db()`. The two
adapters are fully interchangeable — the UI never knows which is active.

## RBAC matrix

| Capability | Admin | QA Manager | Engineer | Auditor | Viewer |
|------------|:----:|:----------:|:--------:|:-------:|:------:|
| View modules | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create / edit records | ✅ | ✅ | ✅ | — | — |
| Delete records | ✅ | ✅ | — | — | — |
| Manage users | ✅ | — | — | — | — |
| Change data source | ✅ | — | — | — | — |

## Adding a new module

1. Create a `ModuleSchema` in `src/lib/modules/…`.
2. Add it to the array in `src/lib/modules/registry.ts`.

That's it — routing, sidebar, table, form, KPIs, dashboard, seeding, audit and
RBAC all pick it up automatically.

## Known POC simplifications

- Auth/session is client-side; password checks run in the browser.
- Local adapter stores data per-browser (localStorage).
- Inter-module links (e.g. Complaint → CAPA) are text references, not enforced FKs.
- Attachments/e-signatures are placeholders pending the template/Drive integration.
