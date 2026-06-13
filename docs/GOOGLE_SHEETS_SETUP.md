# Google Sheets Backend — Setup Guide

The e-QMS can use a **Google Sheet** as its database via a small **Apps Script
Web App**. Each module (and `_users`, `_audit`, `_meta`) becomes a worksheet tab.
Records are rows; fields are columns (added automatically) so the data stays
readable directly in Sheets.

## 1. Create the workbook

1. Create a new Google Sheet, e.g. **"e-QMS Data"**.
2. You don't need to pre-create tabs — the backend creates them on first write.

## 2. Add the Apps Script backend

1. In the sheet: **Extensions ▸ Apps Script**.
2. Delete any placeholder code, then paste the full contents of
   [`../apps-script/Code.gs`](../apps-script/Code.gs).
3. *(Optional)* set a shared token at the top:
   ```js
   var SHARED_TOKEN = 'choose-a-secret';
   ```
4. **Save**.

## 3. Deploy as a Web App

1. **Deploy ▸ New deployment**.
2. Select type **Web app**.
3. Configure:
   - **Execute as:** *Me*
   - **Who has access:** *Anyone* (the script still enforces your token if set)
4. **Deploy**, authorise the scopes, and **copy the Web app URL** (ends in `/exec`).

## 4. Connect the app

1. Sign in to e-QMS as **admin**.
2. Go to **Settings ▸ Data Source**.
3. Choose **Google Sheets**.
4. Paste the `/exec` URL (and the token if you set one).
5. Click **Test connection** → expect `✓ Connected successfully.`
6. Click **Save data source**, then **reload the page**.

## 5. Seeding

On first connection the app seeds demo records and the demo users into your
sheet (once — tracked in the `_meta` tab). To re-seed a fresh sheet, clear the
`_meta` tab's `seeded` row.

## How the protocol works

The frontend `GoogleSheetsAdapter` POSTs JSON (as `text/plain`, to avoid CORS
preflight) to the Web App:

| Action | Payload |
|--------|---------|
| `list` | `{ action, collection }` → `{ rows: [...] }` |
| `create` | `{ action, collection, record }` |
| `update` | `{ action, collection, id, patch }` |
| `remove` | `{ action, collection, id }` |
| `upsertUser` | `{ action, user }` |
| `isSeeded` / `markSeeded` | meta flags |

## Security notes (POC)

- *Who has access: Anyone* makes the endpoint publicly callable; protect it with
  `SHARED_TOKEN` and treat the sheet as demo data.
- For production, prefer a service-account + backend proxy, restrict the
  deployment to your domain, and move password verification server-side.
- Passwords are bcrypt-hashed before they ever reach the sheet.
