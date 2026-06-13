# e-QMS — ICU Ventilator Manufacturing

An **elite electronic Quality Management System (e-QMS)** proof-of-concept for an
ICU ventilator manufacturer, aligned to **ISO 13485:2016** and the **EU MDR**
(CE-certified devices).

Built with **React + TypeScript + Vite**, a reusable system-design foundation
(advanced tables, schema-driven forms, KPI cards, dashboards, themes, RBAC) and a
**pluggable data layer** that runs on seeded local data today and on
**Google Sheets** (via an Apps Script Web App) when you flip a switch.

---

## ✨ Highlights

- **16 integrated QMS modules** across 3 tiers (see below)
- **Schema-driven engine** — every module's table, form, KPIs and dashboard are
  generated from one schema, so the system-design foundations are reused everywhere
- **Advanced table system** — text-wrap (default + per-column + global toggle),
  drag-to-reorder columns, resizable widths, table-width fit/natural, sticky header,
  configurable *rows-before-scroll*, show/hide columns, sort, global search,
  CSV export, density toggle, **per-table saved views**
- **Password-protected logins** (bcrypt) with **role-based access control** and
  user-specific permissions
- **21 CFR Part 11–style audit trail** (who / what / when)
- **6 selectable medical color themes** (light + dark), persisted per user
- **Template placeholders** in every record form, ready to wire to your real templates
- **Google Sheets-ready** backend with included Apps Script

## 🧩 Modules

| Tier | Modules |
|------|---------|
| **Core Compliance** | Document Control · CAPA · Nonconformance (NCR) · Complaint Handling · Audit Management |
| **Product & Risk** | Risk Management / FMEA · Design Control (DHF) · Post-Market Surveillance (PMS/PMCF) · Vigilance / FSCA · UDI Management |
| **Operations** | Supplier Management · Training & Competency · Change Control · Equipment & Calibration · Management Review · Device History Record (DHR) |

## 🚀 Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

The app seeds realistic ventilator-domain demo data on first run.

### Demo accounts (also clickable on the login screen)

| Username | Password | Role | Can edit? |
|----------|----------|------|-----------|
| `admin` | `admin123` | Admin | ✅ + users + settings |
| `qa` | `qa123` | QA Manager | ✅ + delete |
| `engineer` | `eng123` | Engineer | ✅ |
| `auditor` | `aud123` | Auditor | 👁 read-only |
| `viewer` | `view123` | Viewer | 👁 read-only |

## 🔌 Switching to Google Sheets

1. Open your e-QMS Google Sheet → **Extensions ▸ Apps Script**
2. Paste [`apps-script/Code.gs`](apps-script/Code.gs) and **Deploy ▸ New deployment ▸ Web app**
   (*Execute as: Me*, *Who has access: Anyone*)
3. Copy the `/exec` URL
4. In the app: **Settings ▸ Data Source ▸ Google Sheets**, paste the URL, *Test connection*, *Save*
5. Reload — every module now reads/writes its own sheet tab.

Full walkthrough: [`docs/GOOGLE_SHEETS_SETUP.md`](docs/GOOGLE_SHEETS_SETUP.md).

## 🏗️ Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). In short:

```
ModuleSchema (fields, workflow, KPIs, charts, seed)
        │
        ├─► DataTable      (advanced table system)
        ├─► FormRenderer   (form system)
        ├─► KpiCard        (KPI system)
        └─► ChartCard      (dashboard system)

DataAdapter  ──►  LocalAdapter (localStorage)  |  GoogleSheetsAdapter (Apps Script)
```

## 📁 Project layout

```
src/
  lib/
    types.ts            # schema-driven type model
    data/               # DataAdapter + Local & Google Sheets adapters
    modules/            # 16 module schemas (the QMS content)
    auth.tsx            # login + RBAC
    theme.tsx           # color themes
    audit.ts seed.ts    # audit trail + seeding
  components/
    table/DataTable.tsx # the advanced table
    form/FormRenderer   # schema-driven forms
    charts/             # KpiCard, ChartCard
    AppShell, RecordDrawer, ui/
  pages/                # dashboard, module, audit, users, settings, login
apps-script/Code.gs     # Google Sheets backend
docs/                   # setup + architecture
```

## 🛣️ Status

This is an approved **POC**. Module breadth and the system-design foundations are
in place; depth (e.g. inter-module linking, e-signature workflows, EUDAMED export)
can be deepened module-by-module on the same engine.

> Scope note: a POC for demonstration — not a validated/released QMS. Validate per
> your software-validation SOP before any GxP use.
