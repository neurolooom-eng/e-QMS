import { useEffect, useMemo, useRef, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import clsx from 'clsx'
import {
  ArrowDownUp,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  GripVertical,
  Maximize2,
  Rows3,
  Search,
  WrapText,
} from 'lucide-react'

// ============================================================
// DataTable — the shared advanced table used by every module.
// Features: text-wrap (default, per-column + global toggle),
// drag-to-reorder columns, resizable column widths, table width
// control, sticky header, configurable rows-before-scroll,
// column show/hide, sort, global search, CSV export, density.
// View settings (order, sizes, visibility, density, wrap, rows)
// persist per tableKey in localStorage.
// ============================================================

export interface DataColumn<T> {
  key: string
  header: string
  width?: number
  nowrap?: boolean
  accessor?: (row: T) => any
  render?: (value: any, row: T) => React.ReactNode
  /** plain string for CSV/search/sort */
  toText?: (row: T) => string
}

interface DataTableProps<T extends Record<string, any>> {
  tableKey: string
  columns: DataColumn<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  rightToolbar?: React.ReactNode
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

function loadView(key: string): ViewState {
  try {
    return JSON.parse(localStorage.getItem('eqms.view.' + key) || '{}')
  } catch {
    return {}
  }
}
function saveView(key: string, v: ViewState) {
  localStorage.setItem('eqms.view.' + key, JSON.stringify(v))
}

export function DataTable<T extends Record<string, any>>({
  tableKey,
  columns,
  data,
  onRowClick,
  rightToolbar,
  emptyLabel = 'No records',
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

  // keep columnOrder in sync if columns change shape
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
    () =>
      columns.map((c) => ({
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
    data,
    columns: tColumns,
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
      const fi = next.indexOf(from)
      const ti = next.indexOf(targetId)
      next.splice(fi, 1)
      next.splice(ti, 0, from)
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
        const v = def.toText ? def.toText(row.original) : def.accessor ? def.accessor(row.original) : (row.original as any)[c.id]
        const s = String(v ?? '').replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      })
      lines.push(cells.join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tableKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalWidth = table.getTotalSize()

  return (
    <div className="card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search…"
            className="input w-56 pl-8"
          />
        </div>
        <span className="text-xs text-muted">
          {table.getFilteredRowModel().rows.length} / {data.length} rows
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button className="btn-ghost" title="Toggle text wrap" onClick={() => setWrap((w) => !w)}>
            <WrapText className={clsx('h-4 w-4', wrap && 'text-primary')} />
          </button>
          <button
            className="btn-ghost"
            title="Density"
            onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
          >
            <Rows3 className={clsx('h-4 w-4', density === 'compact' && 'text-primary')} />
          </button>
          <button className="btn-ghost" title="Fit width / natural width" onClick={() => setFullWidth((f) => !f)}>
            <Maximize2 className={clsx('h-4 w-4', fullWidth && 'text-primary')} />
          </button>
          <label className="flex items-center gap-1 rounded-md px-2 text-xs text-muted" title="Rows before scroll">
            <ArrowDownUp className="h-3.5 w-3.5" />
            <input
              type="number"
              min={3}
              max={100}
              value={rowsBeforeScroll}
              onChange={(e) => setRowsBeforeScroll(Math.max(3, Number(e.target.value) || 12))}
              className="w-12 rounded border border-border bg-surface px-1 py-0.5 text-center"
            />
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
        <table
          className="border-collapse text-sm"
          style={{ width: fullWidth ? '100%' : totalWidth, minWidth: fullWidth ? totalWidth : undefined }}
        >
          <thead className="sticky top-0 z-[1]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-surface-2">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="group relative border-b border-border px-3 py-2 text-left align-middle font-semibold text-text"
                    draggable
                    onDragStart={() => (dragCol.current = header.column.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => onDrop(header.column.id)}
                  >
                    <div className="flex items-center gap-1">
                      <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted opacity-0 group-hover:opacity-100" />
                      <button
                        className="flex flex-1 items-center gap-1 text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {{ asc: <ChevronUp className="h-3.5 w-3.5" />, desc: <ChevronDown className="h-3.5 w-3.5" /> }[
                          header.column.getIsSorted() as string
                        ] ?? null}
                      </button>
                    </div>
                    {/* resize handle */}
                    <span
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={clsx(
                        'absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none',
                        'opacity-0 group-hover:opacity-100',
                        header.column.getIsResizing() ? 'bg-primary opacity-100' : 'bg-border',
                      )}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={clsx('border-b border-border/60 hover:bg-surface-2/60', onRowClick && 'cursor-pointer')}
              >
                {row.getVisibleCells().map((cell) => {
                  const nowrap = (cell.column.columnDef.meta as any)?.nowrap || !wrap
                  return (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className={clsx(
                        'px-3 align-top text-text',
                        density === 'compact' ? 'py-1.5' : 'py-2.5',
                        nowrap ? 'truncate whitespace-nowrap' : 'whitespace-normal break-words',
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  )
                })}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={table.getVisibleLeafColumns().length} className="p-8 text-center text-muted">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
