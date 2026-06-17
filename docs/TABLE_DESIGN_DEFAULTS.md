# Advanced DataTable — Design Defaults & Drop-in Component

A portable, framework-agnostic-ish (React + Tailwind) reference for a reusable
data table with sensible "elite" defaults. Hand this whole file to Claude on a
new project and say *"implement this table component and use it everywhere."*

---

## 1. Design defaults (the contract)

Every table built from this component ships with these behaviours **by default**:

| Default | Behaviour |
|---|---|
| **Text wrap** | Every cell wraps (`whitespace-normal break-words`) by default. A toolbar toggle flips the whole table to single-line (`truncate`). Any column can force single-line via `nowrap: true`. |
| **Column reorder** | Drag any header onto another to reorder (native HTML5 drag; grip icon on hover). |
| **Column resize** | Drag the right edge of any header; live resize, min width 60px. |
| **Table width** | Toggle between **fit-to-container** (`width:100%`) and **natural width** (sum of column widths, horizontal scroll). |
| **Sticky header** | Header row stays pinned while the body scrolls. |
| **Rows before scroll** | Numeric control; body height = `rows × rowHeight`, then it scrolls. Default **12**. |
| **Show / hide columns** | Per-column checkboxes in a "Columns" menu. |
| **Sort** | Click header to cycle asc / desc / none. |
| **Global search** | Filters across all columns' text. |
| **CSV export** | Exports visible columns, in current sort order, quote-escaped. |
| **Density** | Toggle comfortable (52px rows) / compact (38px rows). |
| **Saved views** | Order, sizes, visibility, density, wrap, rows-before-scroll, width mode all persist per `tableKey` in `localStorage`. |
| **Empty state** | Configurable `emptyLabel`. |
| **Row click** | Optional `onRowClick(row)`. |

**Column model** — define columns declaratively:

```ts
interface DataColumn<T> {
  key: string                                   // unique id + default field accessor
  header: string                                // header label
  width?: number                                // default column width (px), default 160
  nowrap?: boolean                              // force single-line for this column
  accessor?: (row: T) => any                    // custom value getter
  render?: (value: any, row: T) => React.ReactNode  // custom cell renderer (chips, badges…)
  toText?: (row: T) => string                   // plain string used for search / sort / CSV
}
```

---

## 2. Dependencies

```bash
npm i @tanstack/react-table clsx lucide-react
# + Tailwind CSS configured in the project
```

---

## 3. Design tokens & base classes it expects

The component is **theme-driven via CSS variables**, so it works in light/dark and
any palette. Add these once.

### 3a. CSS variables (put on `:root`, swap per theme with `[data-theme="…"]`)

```css
:root {
  --c-bg:        241 245 249;  /* page background  (R G B channels) */
  --c-surface:   255 255 255;  /* card / header bg */
  --c-surface-2: 248 250 252;  /* subtle zebra / hover / header strip */
  --c-border:    226 232 240;
  --c-text:       15  23  42;
  --c-muted:     100 116 139;
  --c-primary:    13 148 136;  /* accent: active toggles, resize handle, sort */
}
```

### 3b. Tailwind config — map tokens to utilities

```js
// tailwind.config.js
const v = (name) => ({ opacityValue }) =>
  opacityValue === undefined ? `rgb(var(${name}))` : `rgb(var(${name}) / ${opacityValue})`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('--c-bg'), surface: v('--c-surface'), 'surface-2': v('--c-surface-2'),
        border: v('--c-border'), text: v('--c-text'), muted: v('--c-muted'),
        primary: v('--c-primary'),
      },
      boxShadow: { card: '0 1px 2px 0 rgb(0 0 0 / .04), 0 1px 3px 0 rgb(0 0 0 / .06)' },
    },
  },
}
```

### 3c. Base component classes (Tailwind `@layer components`)

```css
@layer components {
  .card     { @apply rounded-xl border border-border bg-surface shadow-card; }
  .btn-ghost{ @apply inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5
                     text-sm font-medium text-text transition-colors hover:bg-surface-2; }
  .input    { @apply w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm
                     text-text outline-none placeholder:text-muted
                     focus:border-primary focus:ring-2 focus:ring-primary/30; }
}
```

> If you don't use these utility classes elsewhere, you can inline them — the only
> classes `DataTable` relies on are `card`, `btn-ghost`, `input`, `shadow-card`,
> and the colour utilities `bg-surface(-2)`, `border-border`, `text-text`,
> `text-muted`, `text-primary`, `bg-primary`.

---

## 4. The component — `DataTable.tsx`

```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  useReactTable, type ColumnDef, type SortingState, type VisibilityState,
} from '@tanstack/react-table'
import clsx from 'clsx'
import {
  ArrowDownUp, ChevronDown, ChevronUp, Columns3, Download,
  GripVertical, Maximize2, Rows3, Search, WrapText,
} from 'lucide-react'

export interface DataColumn<T> {
  key: string
  header: string
  width?: number
  nowrap?: boolean
  accessor?: (row: T) => any
  render?: (value: any, row: T) => React.ReactNode
  /** plain string for CSV / search / sort */
  toText?: (row: T) => string
}

interface DataTableProps<T extends Record<string, any>> {
  tableKey: string                 // unique key used to persist this table's view
  columns: DataColumn<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  rightToolbar?: React.ReactNode   // extra buttons on the right of the toolbar
  emptyLabel?: string
}

interface ViewState {
  order?: string[]
  sizes?: Record<string, number>
  visibility?: VisibilityState
  density?: 'comfortable' | 'compact'
  wrap?: boolean
  rowsBeforeScroll?: number
  fullWidth?: boolean
}

const VIEW_PREFIX = 'ui.table.view.' // change to namespace your app

function loadView(key: string): ViewState {
  try { return JSON.parse(localStorage.getItem(VIEW_PREFIX + key) || '{}') } catch { return {} }
}
function saveView(key: string, v: ViewState) {
  localStorage.setItem(VIEW_PREFIX + key, JSON.stringify(v))
}

export function DataTable<T extends Record<string, any>>({
  tableKey, columns, data, onRowClick, rightToolbar, emptyLabel = 'No records',
}: DataTableProps<T>) {
  const saved = useMemo(() => loadView(tableKey), [tableKey])

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(saved.visibility || {})
  const [columnOrder, setColumnOrder] = useState<string[]>(saved.order || columns.map((c) => c.key))
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(saved.sizes || {})
  const [density, setDensity] = useState<'comfortable' | 'compact'>(saved.density || 'comfortable')
  const [wrap, setWrap] = useState<boolean>(saved.wrap ?? true)
  const [rowsBeforeScroll, setRowsBeforeScroll] = useState<number>(saved.rowsBeforeScroll ?? 12)
  const [fullWidth, setFullWidth] = useState<boolean>(saved.fullWidth ?? true)
  const [showColMenu, setShowColMenu] = useState(false)
  const dragCol = useRef<string | null>(null)

  // keep columnOrder in sync if the columns prop changes shape
  useEffect(() => {
    setColumnOrder((prev) => {
      const keys = columns.map((c) => c.key)
      const kept = prev.filter((k) => keys.includes(k))
      const added = keys.filter((k) => !kept.includes(k))
      return [...kept, ...added]
    })
  }, [columns])

  useEffect(() => {
    saveView(tableKey, { order: columnOrder, sizes: columnSizing, visibility: columnVisibility, density, wrap, rowsBeforeScroll, fullWidth })
  }, [tableKey, columnOrder, columnSizing, columnVisibility, density, wrap, rowsBeforeScroll, fullWidth])

  const tColumns = useMemo<ColumnDef<T>[]>(
    () => columns.map((c) => ({
      id: c.key,
      accessorFn: (row) => (c.toText ? c.toText(row) : c.accessor ? c.accessor(row) : (row as any)[c.key]),
      header: c.header,
      size: c.width ?? 160,
      minSize: 60,
      cell: (ctx) => {
        const raw = c.accessor ? c.accessor(ctx.row.original) : (ctx.row.original as any)[c.key]
        return c.render ? c.render(raw, ctx.row.original) : raw ?? <span className="text-muted">—</span>
      },
      meta: { nowrap: c.nowrap },
    })),
    [columns],
  )

  const table = useReactTable({
    data, columns: tColumns,
    state: { sorting, globalFilter, columnVisibility, columnOrder, columnSizing },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing as any,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const rowH = density === 'compact' ? 38 : 52
  const maxBodyHeight = rowsBeforeScroll * rowH

  function onDrop(targetId: string) {
    const from = dragCol.current
    dragCol.current = null
    if (!from || from === targetId) return
    setColumnOrder((prev) => {
      const next = [...prev]
      const fi = next.indexOf(from), ti = next.indexOf(targetId)
      next.splice(fi, 1); next.splice(ti, 0, from)
      return next
    })
  }

  function exportCsv() {
    const cols = table.getVisibleLeafColumns()
    const header = cols.map((c) => columns.find((x) => x.key === c.id)?.header ?? c.id)
    const lines = [header.join(',')]
    for (const row of table.getSortedRowModel().rows) {
      const cells = cols.map((c) => {
        const def = columns.find((x) => x.key === c.id)!
        const val = def.toText ? def.toText(row.original) : def.accessor ? def.accessor(row.original) : (row.original as any)[c.id]
        const s = String(val ?? '').replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      })
      lines.push(cells.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${tableKey}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const totalWidth = table.getTotalSize()

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search…" className="input w-56 pl-8" />
        </div>
        <span className="text-xs text-muted">{table.getFilteredRowModel().rows.length} / {data.length} rows</span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button className="btn-ghost" title="Toggle text wrap" onClick={() => setWrap((w) => !w)}>
            <WrapText className={clsx('h-4 w-4', wrap && 'text-primary')} />
          </button>
          <button className="btn-ghost" title="Density" onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}>
            <Rows3 className={clsx('h-4 w-4', density === 'compact' && 'text-primary')} />
          </button>
          <button className="btn-ghost" title="Fit width / natural width" onClick={() => setFullWidth((f) => !f)}>
            <Maximize2 className={clsx('h-4 w-4', fullWidth && 'text-primary')} />
          </button>
          <label className="flex items-center gap-1 rounded-md px-2 text-xs text-muted" title="Rows before scroll">
            <ArrowDownUp className="h-3.5 w-3.5" />
            <input type="number" min={3} max={100} value={rowsBeforeScroll}
              onChange={(e) => setRowsBeforeScroll(Math.max(3, Number(e.target.value) || 12))}
              className="w-12 rounded border border-border bg-surface px-1 py-0.5 text-center" />
          </label>
          <div className="relative">
            <button className="btn-ghost" title="Columns" onClick={() => setShowColMenu((s) => !s)}>
              <Columns3 className="h-4 w-4" />
            </button>
            {showColMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowColMenu(false)} />
                <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-auto rounded-lg border border-border bg-surface p-2 shadow-card">
                  <div className="mb-1 px-1 text-xs font-semibold text-muted">Toggle columns</div>
                  {table.getAllLeafColumns().map((col) => (
                    <label key={col.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-surface-2">
                      <input type="checkbox" checked={col.getIsVisible()} onChange={col.getToggleVisibilityHandler()} />
                      {columns.find((c) => c.key === col.id)?.header ?? col.id}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          <button className="btn-ghost" title="Export CSV" onClick={exportCsv}>
            <Download className="h-4 w-4" />
          </button>
          {rightToolbar}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto" style={{ maxHeight: maxBodyHeight + rowH }}>
        <table className="border-collapse text-sm"
          style={{ width: fullWidth ? '100%' : totalWidth, minWidth: fullWidth ? totalWidth : undefined }}>
          <thead className="sticky top-0 z-[1]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-surface-2">
                {hg.headers.map((header) => (
                  <th key={header.id} style={{ width: header.getSize() }}
                    className="group relative border-b border-border px-3 py-2 text-left align-middle font-semibold text-text"
                    draggable
                    onDragStart={() => (dragCol.current = header.column.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(header.column.id)}>
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted opacity-0 group-hover:opacity-100" />
                      <button className="flex flex-1 items-center gap-1 text-left" onClick={header.column.getToggleSortingHandler()}>
                        <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {{ asc: <ChevronUp className="h-3.5 w-3.5" />, desc: <ChevronDown className="h-3.5 w-3.5" /> }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    </div>
                    <span onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}
                      className={clsx('absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none opacity-0 group-hover:opacity-100',
                        header.column.getIsResizing() ? 'bg-primary opacity-100' : 'bg-border')} />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} onClick={() => onRowClick?.(row.original)}
                className={clsx('border-b border-border/60 hover:bg-surface-2/60', onRowClick && 'cursor-pointer')}>
                {row.getVisibleCells().map((cell) => {
                  const nowrap = (cell.column.columnDef.meta as any)?.nowrap || !wrap
                  return (
                    <td key={cell.id} style={{ width: cell.column.getSize() }}
                      className={clsx('px-3 align-top text-text', density === 'compact' ? 'py-1.5' : 'py-2.5',
                        nowrap ? 'truncate whitespace-nowrap' : 'whitespace-normal break-words')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={table.getVisibleLeafColumns().length} className="p-8 text-center text-muted">{emptyLabel}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## 5. Usage

```tsx
import { DataTable, type DataColumn } from './DataTable'

type Order = { id: string; customer: string; total: number; status: string }

const columns: DataColumn<Order>[] = [
  { key: 'id', header: 'Order', width: 110, nowrap: true,
    render: (v) => <span className="font-mono text-xs">{v}</span> },
  { key: 'customer', header: 'Customer', width: 220 },
  { key: 'total', header: 'Total', width: 100, nowrap: true,
    accessor: (r) => r.total, render: (v) => `$${v.toFixed(2)}` },
  { key: 'status', header: 'Status', width: 120,
    render: (v) => <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{v}</span> },
]

export function Orders({ rows }: { rows: Order[] }) {
  return (
    <DataTable
      tableKey="orders"               // unique → its own saved view
      columns={columns}
      data={rows}
      onRowClick={(o) => console.log(o)}
      emptyLabel="No orders yet."
    />
  )
}
```

### Notes for the implementer
- **`tableKey` must be unique per table** — it namespaces the saved view in `localStorage`.
- Provide **`toText`** for any column whose `render` returns JSX, so search / sort / CSV use clean text.
- For status/badge cells, return a small chip from `render` (see example).
- To reset a saved view, delete the `localStorage` key `ui.table.view.<tableKey>`.
- Drag-reorder uses native HTML5 DnD (no extra deps). Swap to `@dnd-kit` if you need
  touch-friendly reordering or animated drops.
```
